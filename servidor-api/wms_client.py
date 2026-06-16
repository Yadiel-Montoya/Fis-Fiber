"""
wms_client.py — Cliente del WMS de FIS FIBER

Encapsula toda la comunicación con el WMS:
  - login (con re-login automático si expira la sesión)
  - listado de folios
  - extracción de pedidos reprogramados (en paralelo)

Si en el futuro necesitas más datos del WMS, agrega aquí un método nuevo
(ej. get_pedidos_foraneos) y regístralo como dataset en app.py.
"""
import json
import logging
import threading
from concurrent.futures import ThreadPoolExecutor

import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

log = logging.getLogger("wms")


class WMSClient:
    def __init__(self, base, email, password, workers=10, max_folios=300):
        self.base = base.rstrip("/")
        self.email = email
        self.password = password
        self.workers = workers
        self.max_folios = max_folios
        self._session = None
        self._lock = threading.Lock()

    # ── Sesión ──────────────────────────────────────────
    def _login(self):
        s = requests.Session()
        s.verify = False  # el WMS usa certificado DuckDNS / auto-firmado
        s.headers.update({"User-Agent": "FIS-Fiber-API/1.0"})
        r = s.post(f"{self.base}/Login/validarUsuario",
                   data={"email": self.email, "password": self.password},
                   timeout=15)
        r.raise_for_status()
        if r.text.strip().startswith("<"):
            raise RuntimeError("Login WMS falló — credenciales o WMS no disponible")
        log.info("✓ Login WMS OK")
        return s

    def _ensure_session(self):
        if self._session is None:
            self._session = self._login()
        return self._session

    def _post(self, path, data, timeout=25):
        """POST con re-login automático si la sesión expiró."""
        s = self._ensure_session()
        try:
            r = s.post(f"{self.base}{path}", data=data, timeout=timeout)
            r.raise_for_status()
            return r
        except Exception as e:
            log.warning(f"Reintentando {path} tras: {e}")
            self._session = self._login()
            r = self._session.post(f"{self.base}{path}", data=data, timeout=timeout)
            r.raise_for_status()
            return r

    # ── Folios ──────────────────────────────────────────
    @staticmethod
    def _extract_folios(resp_json):
        items = resp_json.get("data", resp_json.get("Data", []))
        out = []
        for item in (items if isinstance(items, list) else []):
            for key in ("Folio", "folio", "NumPlan", "PlanEmb", "planEmb", "NoPlan"):
                if item.get(key):
                    out.append(str(item[key]).strip())
                    break
        return out

    def listar_folios(self):
        r1 = self._post("/PlanEmb/GetPlanesEmbGenerados",
                        {"draw": "1", "start": "0", "length": str(self.max_folios)})
        r2 = self._post("/PlanEmb/GetPlanesEmbarques",
                        {"draw": "1", "start": "0", "length": "5"})
        folios = self._extract_folios(r1.json()) + self._extract_folios(r2.json())
        return list(dict.fromkeys(folios))  # sin duplicados, orden preservado

    # ── Detalles / reprogramados ────────────────────────
    def _reprogramados_de_folio(self, folio):
        try:
            r = self._post("/PlanEmb/GetPlanEmbGeneradosDetails",
                           {"folio": folio, "draw": "1", "start": "0", "length": "500"})
            raw = r.json().get("Data", "[]")
            pedidos = json.loads(raw) if isinstance(raw, str) else raw
            out = []
            for p in pedidos:
                if str(p.get("NumeroViaje", "")).strip().lower() == "reprogramado":
                    p["_folio"] = folio
                    out.append(p)
            return out
        except Exception as e:
            log.warning(f"  Folio {folio}: {e}")
            return []

    def get_reprogramados(self):
        """Recorre todos los folios en paralelo y devuelve los reprogramados."""
        with self._lock:  # una recolección a la vez (la sesión es compartida)
            folios = self.listar_folios()
            log.info(f"Procesando {len(folios)} folios ({self.workers} hilos)…")
            resultado = []
            with ThreadPoolExecutor(max_workers=self.workers) as ex:
                for parte in ex.map(self._reprogramados_de_folio, folios):
                    resultado.extend(parte)
            log.info(f"✓ {len(resultado)} reprogramados")
            return resultado
