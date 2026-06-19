"""
sap_client.py — Conexión de solo lectura a la base de datos de SAP Business One

Soporta SAP B1 sobre SQL Server (pyodbc) o HANA (hdbcli), según la variable
de entorno SAP_ENGINE. Las credenciales se leen del entorno (.env) — NUNCA
van en el código.

Variables de entorno (ver .env.example):
  SAP_ENGINE   mssql | hana
  SAP_HOST     servidor (ej. 192.168.1.10  o  192.168.1.10\\SQLEXPRESS)
  SAP_PORT     puerto (mssql: 1433 · hana: 30015)  — opcional
  SAP_DB       nombre de la base (ej. SBO_FISFIBER)
  SAP_USER     usuario de SOLO LECTURA de la base de datos
  SAP_PASS     contraseña
"""
import os
import logging

log = logging.getLogger("sap")


class SAPClient:
    def __init__(self):
        self.engine = (os.environ.get("SAP_ENGINE", "mssql") or "mssql").lower()
        self.host = os.environ.get("SAP_HOST", "")
        self.port = os.environ.get("SAP_PORT", "")
        self.db   = os.environ.get("SAP_DB", "")
        self.user = os.environ.get("SAP_USER", "")
        self.pwd  = os.environ.get("SAP_PASS", "")
        self._conn = None

    def configurado(self):
        return bool(self.host and self.db and self.user)

    # ── Conexión ────────────────────────────────────────
    def _connect(self):
        if self.engine == "hana":
            from hdbcli import dbapi   # pip install hdbcli
            return dbapi.connect(
                address=self.host,
                port=int(self.port or 30015),
                user=self.user,
                password=self.pwd,
                databaseName=self.db or None,
            )
        # SQL Server (default)
        import pyodbc                  # pip install pyodbc  (+ ODBC Driver 17/18)
        driver = os.environ.get("SAP_ODBC_DRIVER", "ODBC Driver 17 for SQL Server")
        server = self.host + ((',' + self.port) if self.port else '')
        cs = (f"DRIVER={{{driver}}};SERVER={server};DATABASE={self.db};"
              f"UID={self.user};PWD={self.pwd};TrustServerCertificate=yes;")
        return pyodbc.connect(cs, timeout=15)

    def _ensure(self):
        if self._conn is None:
            if not self.configurado():
                raise RuntimeError("SAP no configurado (faltan variables SAP_* en .env)")
            log.info(f"Conectando a SAP ({self.engine}) {self.host}/{self.db}…")
            self._conn = self._connect()
        return self._conn

    # ── Consulta ────────────────────────────────────────
    def query(self, sql, params=None):
        """Ejecuta un SELECT y devuelve lista de dicts. Reconecta si la sesión cayó."""
        try:
            cur = self._ensure().cursor()
            cur.execute(sql, params or [])
        except Exception as e:
            log.warning(f"Reconectando a SAP tras: {e}")
            self._conn = None
            cur = self._ensure().cursor()
            cur.execute(sql, params or [])
        cols = [d[0] for d in cur.description]
        filas = [dict(zip(cols, row)) for row in cur.fetchall()]
        cur.close()
        return filas
