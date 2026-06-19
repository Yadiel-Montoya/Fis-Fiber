"""
descubrir_sap.py — Explora el esquema de SAP para mapear el almacén de MP.

Corre esto UNA VEZ en el servidor (con el .env configurado) y pásame la
salida. Con eso escribo el query exacto de Materia Prima.

  python descubrir_sap.py

Solo hace SELECT de catálogos (no modifica nada).
"""
import logging
from sap_client import SAPClient

logging.basicConfig(level=logging.INFO, format="%(message)s")
sap = SAPClient()
ES_HANA = sap.engine == "hana"
LIMIT = '' if ES_HANA else 'TOP 25'
LIMIT_END = 'LIMIT 25' if ES_HANA else ''

def show(titulo, sql):
    print("\n" + "=" * 60)
    print(titulo)
    print("=" * 60)
    try:
        filas = sap.query(sql)
        for f in filas:
            print("  " + " | ".join(f"{k}={v}" for k, v in f.items()))
        print(f"  ({len(filas)} filas)")
    except Exception as e:
        print(f"  ERROR: {e}")

if not sap.configurado():
    print("Falta configurar SAP_* en .env"); raise SystemExit(1)

# 1) Almacenes (para saber cuál es Materia Prima)
show("ALMACENES (OWHS)",
     'SELECT "WhsCode","WhsName" FROM OWHS' if ES_HANA
     else "SELECT WhsCode, WhsName FROM OWHS")

# 2) Grupos de artículos (¿familia = grupo?)
show("GRUPOS DE ARTÍCULOS (OITB)",
     'SELECT "ItmsGrpCod","ItmsGrpNam" FROM OITB' if ES_HANA
     else "SELECT ItmsGrpCod, ItmsGrpNam FROM OITB")

# 3) Muestra de stock por artículo/almacén (OITW + OITM)
show("MUESTRA STOCK (OITM + OITW)",
     (f'SELECT {LIMIT} T0."ItemCode", T0."ItemName", T1."WhsCode", '
      f'T1."OnHand", T1."MinStock", T1."MaxStock", T0."ItmsGrpCod" '
      f'FROM OITM T0 INNER JOIN OITW T1 ON T0."ItemCode"=T1."ItemCode" '
      f'WHERE T1."OnHand" > 0 {LIMIT_END}') if ES_HANA
     else ("SELECT TOP 25 T0.ItemCode, T0.ItemName, T1.WhsCode, "
           "T1.OnHand, T1.MinStock, T1.MaxStock, T0.ItmsGrpCod "
           "FROM OITM T0 INNER JOIN OITW T1 ON T0.ItemCode=T1.ItemCode "
           "WHERE T1.OnHand > 0"))

# 4) ¿Hay campos definidos por el usuario (UDF) en artículos? (familia propia)
show("CAMPOS DE USUARIO EN OITM (UDF U_...)",
     ("SELECT \"AliasID\",\"Descr\" FROM CUFD WHERE \"TableID\"='OITM'") if ES_HANA
     else "SELECT AliasID, Descr FROM CUFD WHERE TableID='OITM'")

print("\nListo. Copia toda esta salida y pásamela.")
