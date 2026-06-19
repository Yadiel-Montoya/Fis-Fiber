/* =====================================================================
   query_almacen.sql — Existencia de Materia Prima desde SAP B1
   ---------------------------------------------------------------------
   Fuente real (de las consultas guardadas en SAP):
     OIBT = lotes/pacas en stock. Almacén 02 = Materia Prima, 42 = tránsito.
   Da por fibra: # de pacas, kilos, grupo SAP y kilos en tránsito.
   La familia se deriva del nombre del grupo SAP.
   Mín/Máx salen de OITW (si SAP los tiene capturados; hoy vienen en 0).
   ===================================================================== */
SELECT
    CASE
        WHEN T2.ItmsGrpNam LIKE '%guata%'    THEN 'GUATA'
        WHEN T2.ItmsGrpNam LIKE '%fieltr%'   THEN 'FIELTRO'
        WHEN T2.ItmsGrpNam LIKE '%almohada%' THEN 'ALMOHADA'
        WHEN T2.ItmsGrpNam LIKE '%hilo%'     THEN 'HILOS'
        ELSE ISNULL(T2.ItmsGrpNam, 'OTROS')
    END                                   AS familia,
    T2.ItmsGrpNam                         AS grupo,
    T1.ItemName                           AS [desc],
    COUNT(T0.ItemCode)                    AS pacas,
    CAST(SUM(T0.Quantity) AS INT)         AS inv,
    CAST(MAX(W.MinStock) AS INT)          AS [min],
    CAST(MAX(W.MaxStock) AS INT)          AS [max],
    CAST(ISNULL((
        SELECT SUM(B2.Quantity) FROM OIBT B2
        WHERE B2.ItemCode = T1.ItemCode AND B2.WhsCode = '42'
    ), 0) AS INT)                         AS transito
FROM OIBT T0
INNER JOIN OITM T1 ON T0.ItemCode = T1.ItemCode
LEFT  JOIN OITB T2 ON T1.ItmsGrpCod = T2.ItmsGrpCod
LEFT  JOIN OITW W  ON W.ItemCode = T0.ItemCode AND W.WhsCode = '02'
WHERE T0.WhsCode = '02' AND T0.Quantity > 0
GROUP BY T1.ItemCode, T1.ItemName, T2.ItmsGrpNam
ORDER BY familia, inv DESC;
