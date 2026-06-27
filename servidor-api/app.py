"""
app.py — API de Indicadores FIS FIBER

API independiente y siempre viva. Vive en tu servidor, junta los datos del
WMS en segundo plano y los sirve al instante al dashboard.

  GET /api/reprogramados   → embarques reprogramados (cacheados)
  GET /api/estado          → estado de todos los datasets (cuándo se actualizó)
  GET /health              → "OK"
  POST /api/refrescar      → fuerza una actualización ahora (requiere REFRESH_TOKEN)

Actualización automática:
  - Al arrancar (carga inicial)
  - Cada REFRESH_MIN minutos (default 30) → cubre la actualización de cada mañana
  - Sirve siempre el último dato bueno aunque el WMS falle un momento

PARA AGREGAR MÁS DATOS EN EL FUTURO:
  1. Crea la función que los obtiene (ej. en wms_client.py o un módulo nuevo)
  2. Llama register('nombre', funcion) abajo
  3. Queda disponible en GET /api/nombre, con caché y refresco automático

Ejecutar:  python app.py     (o con gunicorn, ver README.md)
"""
import os
import json
import time
import threading
import logging
from datetime import datetime

# ── Cargar .env (sin dependencias externas) ──
def _cargar_env():
    ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(ruta):
        return
    with open(ruta, encoding="utf-8") as fh:
        for linea in fh:
            linea = linea.strip()
            if not linea or linea.startswith("#") or "=" not in linea:
                continue
            clave, valor = linea.split("=", 1)
            clave, valor = clave.strip(), valor.strip().strip('"').strip("'")
            if clave and clave not in os.environ:   # no pisa variables ya definidas
                os.environ[clave] = valor
_cargar_env()

from flask import Flask, jsonify, request
from flask_cors import CORS

from wms_client import WMSClient

# ── CONFIGURACIÓN (vía variables de entorno, con valores por defecto) ──
PORT          = int(os.environ.get("PORT", 3001))
REFRESH_MIN   = int(os.environ.get("REFRESH_MIN", 30))
CACHE_FILE    = os.environ.get("CACHE_FILE", "cache.json")
REFRESH_TOKEN = os.environ.get("REFRESH_TOKEN", "")   # vacío = endpoint /refrescar abierto en red interna

WMS_BASE   = os.environ.get("WMS_BASE",  "https://fisfiberwms.duckdns.org")
WMS_EMAIL  = os.environ.get("WMS_EMAIL", "ymontoya@fisfiber.com.mx")
WMS_PASS   = os.environ.get("WMS_PASS",  "7895")
# ──────────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s  %(levelname)s  %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("api")

app = Flask(__name__)
CORS(app)  # permite que el dashboard (otro dominio) consuma la API

wms = WMSClient(WMS_BASE, WMS_EMAIL, WMS_PASS)

# ── REGISTRO DE DATASETS ───────────────────────────────────────────────
# Cada dataset: { fetch, data, ts, error }. Para añadir uno nuevo: register(...)
DATASETS = {}

def register(nombre, fetch_fn):
    DATASETS[nombre] = {"fetch": fetch_fn, "data": None, "ts": 0, "error": None}

register("reprogramados", wms.get_reprogramados)

# ── ALMACÉN MATERIA PRIMA (SAP SQL) ────────────────────────────────────
# Solo se activa si hay credenciales SAP_* en .env. Corre el query de
# query_almacen.sql y calcula la alerta (inventario < mínimo → Solicitar OC).
from sap_client import SAPClient
_sap = SAPClient()

def get_almacen():
    sql_path = os.path.join(os.path.dirname(__file__), "query_almacen.sql")
    with open(sql_path, encoding="utf-8") as fh:
        sql = fh.read()
    filas = _sap.query(sql)
    for r in filas:
        inv = r.get("inv") or 0
        mn  = r.get("min") or 0
        r["totalGral"] = inv + (r.get("transito") or 0)
        # Alerta solo si hay mínimo capturado en SAP; si no, "Sin mínimo"
        r["alerta"] = ("Solicitar OC" if inv < mn else "Cubierta") if mn > 0 else "Sin mínimo"
    return filas

if _sap.configurado():
    register("almacen", get_almacen)
    log.info("Dataset 'almacen' activado (SAP configurado)")
else:
    log.info("Dataset 'almacen' inactivo — configura SAP_* en .env para activarlo")

# ── PERSISTENCIA EN DISCO (sobrevive reinicios) ────────────────────────
_cache_lock = threading.Lock()
def guardar_cache():
    try:
        with _cache_lock:
            snapshot = {n: {"data": d["data"], "ts": d["ts"]} for n, d in DATASETS.items()}
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, ensure_ascii=False)
    except Exception as e:
        log.warning(f"No se pudo guardar caché: {e}")

def cargar_cache():
    if not os.path.exists(CACHE_FILE):
        return
    try:
        with open(CACHE_FILE, encoding="utf-8") as f:
            snapshot = json.load(f)
        for n, d in snapshot.items():
            if n in DATASETS:
                DATASETS[n]["data"] = d.get("data")
                DATASETS[n]["ts"]   = d.get("ts", 0)
        log.info("Caché previo cargado de disco")
    except Exception as e:
        log.warning(f"No se pudo cargar caché: {e}")

# ── REFRESCO ───────────────────────────────────────────────────────────
def refrescar(nombre):
    ds = DATASETS[nombre]
    try:
        ds["data"]  = ds["fetch"]()
        ds["ts"]    = time.time()
        ds["error"] = None
        guardar_cache()
    except Exception as e:
        ds["error"] = str(e)
        log.error(f"Error al refrescar '{nombre}': {e}")

def refrescar_todo():
    # Cada dataset en su propio hilo: uno lento (WMS) no bloquea a otro (SAP)
    hilos = [threading.Thread(target=refrescar, args=(n,), daemon=True) for n in DATASETS]
    for h in hilos: h.start()
    for h in hilos: h.join()

def planificador():
    """Hilo en segundo plano: refresca al arrancar y cada REFRESH_MIN minutos."""
    while True:
        refrescar_todo()
        time.sleep(REFRESH_MIN * 60)

# ── RUTAS ──────────────────────────────────────────────────────────────
def _respuesta(nombre):
    ds = DATASETS.get(nombre)
    if ds is None:
        return jsonify({"error": f"dataset '{nombre}' no existe"}), 404
    data = ds["data"]
    if data is None and ds["error"]:
        return jsonify({"error": ds["error"]}), 503
    edad = round(time.time() - ds["ts"]) if ds["ts"] else None
    return jsonify({
        nombre: data or [],
        "total": len(data) if isinstance(data, list) else None,
        "timestamp": (datetime.fromtimestamp(ds["ts"]).isoformat() if ds["ts"] else None),
        "cache_age": edad,
        "error": ds["error"],
    })

@app.get("/api/reprogramados")
def reprogramados():
    return _respuesta("reprogramados")

@app.get("/api/<nombre>")
def dataset_generico(nombre):
    return _respuesta(nombre)

@app.get("/api/estado")
def estado():
    return jsonify({
        n: {
            "registros": len(d["data"]) if isinstance(d["data"], list) else None,
            "ultima_actualizacion": (datetime.fromtimestamp(d["ts"]).isoformat() if d["ts"] else None),
            "edad_seg": round(time.time() - d["ts"]) if d["ts"] else None,
            "error": d["error"],
        } for n, d in DATASETS.items()
    })

@app.post("/api/refrescar")
def forzar_refresco():
    if REFRESH_TOKEN and request.args.get("token") != REFRESH_TOKEN:
        return jsonify({"error": "token inválido"}), 403
    threading.Thread(target=refrescar_todo, daemon=True).start()
    return jsonify({"ok": True, "mensaje": "Refresco iniciado en segundo plano"})

@app.get("/health")
def health():
    return "OK", 200

# ── ARRANQUE ───────────────────────────────────────────────────────────
cargar_cache()
threading.Thread(target=planificador, daemon=True).start()

if __name__ == "__main__":
    log.info("=" * 56)
    log.info(f"API FIS FIBER escuchando en http://0.0.0.0:{PORT}")
    log.info(f"WMS: {WMS_BASE} · refresco cada {REFRESH_MIN} min")
    log.info(f"Datasets: {', '.join(DATASETS)}")
    log.info("=" * 56)
    app.run(host="0.0.0.0", port=PORT, threaded=True)
