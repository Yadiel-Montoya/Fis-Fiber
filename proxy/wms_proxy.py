#!/usr/bin/env python3
"""
WMS Proxy — FIS FIBER · Embarques Reprogramados
Expone /api/reprogramados con datos del plan de embarques WMS.

El WMS solo es accesible desde la red de la oficina, por eso este proxy
debe correr en una máquina de esa red (el navegador la llama directo).

Instalar: pip install requests
Ejecutar: python wms_proxy.py   (o doble clic en arrancar.bat)
Puerto:   3001
"""
import json, logging, threading, time
from concurrent.futures import ThreadPoolExecutor
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ── CONFIGURACIÓN ───────────────────────────────────────
WMS_BASE   = 'https://fisfiberwms.duckdns.org'
WMS_EMAIL  = 'ymontoya@fisfiber.com.mx'
WMS_PASS   = '7895'
PORT       = 3001
CACHE_TTL  = 300        # segundos entre refrescos (5 min)
MAX_FOLIOS = 300        # máximo de folios a consultar
WORKERS    = 10         # folios consultados en paralelo
# ────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s  %(message)s',
                    datefmt='%H:%M:%S')
log = logging.getLogger()

_lock    = threading.Lock()
_session = None
_cache   = {'data': None, 'ts': 0, 'error': None}

# ── FUNCIONES WMS ────────────────────────────────────────

def new_session():
    s = requests.Session()
    s.verify = False        # el WMS usa certificado DuckDNS / auto-firmado
    s.headers.update({'User-Agent': 'FIS-Fiber-Proxy/1.0'})
    r = s.post(f'{WMS_BASE}/Login/validarUsuario',
               data={'email': WMS_EMAIL, 'password': WMS_PASS},
               timeout=15)
    r.raise_for_status()
    if r.text.strip().startswith('<'):
        raise RuntimeError('Login WMS falló — credenciales incorrectas o WMS no disponible')
    log.info('✓ Login WMS OK')
    return s

def extract_folios(resp_json):
    """Extrae folios de la respuesta (varios nombres de campo posibles)."""
    items = resp_json.get('data', resp_json.get('Data', []))
    found = []
    for item in (items if isinstance(items, list) else []):
        for key in ('Folio', 'folio', 'NumPlan', 'PlanEmb', 'planEmb', 'NoPlan'):
            v = item.get(key)
            if v:
                found.append(str(v).strip())
                break
    return found

def folio_reprogramados(session, folio):
    """Devuelve los pedidos reprogramados de un folio (lista, posible vacía)."""
    try:
        r = session.post(f'{WMS_BASE}/PlanEmb/GetPlanEmbGeneradosDetails',
                         data={'folio': folio, 'draw': '1', 'start': '0', 'length': '500'},
                         timeout=25)
        raw = r.json().get('Data', '[]')
        pedidos = json.loads(raw) if isinstance(raw, str) else raw
        out = []
        for p in pedidos:
            if str(p.get('NumeroViaje', '')).strip().lower() == 'reprogramado':
                p['_folio'] = folio
                out.append(p)
        return out
    except Exception as e:
        log.warning(f'  Folio {folio}: {e}')
        return []

def fetch_reprogramados():
    global _session
    if not _session:
        _session = new_session()

    def listar_folios():
        r1 = _session.post(f'{WMS_BASE}/PlanEmb/GetPlanesEmbGenerados',
                           data={'draw': '1', 'start': '0', 'length': str(MAX_FOLIOS)}, timeout=25)
        r2 = _session.post(f'{WMS_BASE}/PlanEmb/GetPlanesEmbarques',
                           data={'draw': '1', 'start': '0', 'length': '5'}, timeout=20)
        return extract_folios(r1.json()), extract_folios(r2.json())

    try:
        cerrados, activos = listar_folios()
    except Exception as e:
        log.warning(f'Re-login por: {e}')
        _session = new_session()
        cerrados, activos = listar_folios()

    all_folios = list(dict.fromkeys(cerrados + activos))
    log.info(f'Procesando {len(all_folios)} folios en paralelo ({WORKERS} hilos)…')

    reprogramados = []
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for res in ex.map(lambda f: folio_reprogramados(_session, f), all_folios):
            reprogramados.extend(res)

    log.info(f'✓ {len(reprogramados)} reprogramados encontrados')
    return reprogramados

# ── SERVIDOR HTTP ────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass   # silenciar log HTTP nativo

    def send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors()
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_cors()
            self.end_headers()
            self.wfile.write(b'OK')
            return

        if not self.path.startswith('/api/reprogramados'):
            self.send_response(404)
            self.end_headers()
            return

        now = time.time()
        with _lock:
            if _cache['data'] is None or (now - _cache['ts']) > CACHE_TTL:
                try:
                    _cache['data']  = fetch_reprogramados()
                    _cache['ts']    = now
                    _cache['error'] = None
                except Exception as e:
                    _cache['error'] = str(e)
                    log.error(f'Error fetching: {e}')

            data  = _cache['data'] or []
            err   = _cache['error']
            ts    = _cache['ts']
            age   = round(now - ts) if ts else 0

        if err and not data:
            body = json.dumps({'error': err}).encode('utf-8')
            code = 500
        else:
            body = json.dumps({
                'reprogramados': data,
                'total': len(data),
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(ts)),
                'cache_age': age
            }).encode('utf-8')
            code = 200

        self.send_response(code)
        self.send_cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    srv = ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    log.info('=' * 52)
    log.info(f'WMS Proxy escuchando en  http://0.0.0.0:{PORT}')
    log.info(f'Endpoint:                http://[IP-MAQUINA]:{PORT}/api/reprogramados')
    log.info(f'Health check:            http://[IP-MAQUINA]:{PORT}/health')
    log.info(f'WMS destino:             {WMS_BASE}')
    log.info('=' * 52)
    srv.serve_forever()
