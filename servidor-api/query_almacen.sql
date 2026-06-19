/* =====================================================================
   query_almacen.sql — Materia Prima desde SAP B1   (BORRADOR)
   ---------------------------------------------------------------------
   Sintaxis SQL Server. Para HANA hay que entrecomillar identificadores
   ("OITM"."ItemCode") y usar comillas dobles.

   AJUSTAR antes de usar (lo afinamos con la salida de descubrir_sap.py):
     - @almacen  : código del almacén de Materia Prima (de OWHS)
     - familia   : de momento usa el nombre del grupo (OITB). Si la familia
                   (GUATA/FIELTRO/FIELTROTEX) está en un campo de usuario,
                   cambiar T0.ItmsGrpCod por T0.U_xxxxx
     - El query devuelve columnas con EXACTAMENTE estos alias, que el
       dashboard ya entiende: familia, grupo, desc, inv, min, max, transito
   ===================================================================== */

DECLARE @almacen NVARCHAR(20) = 'MP';   -- TODO: poner el código real del almacén

SELECT
    G.ItmsGrpNam              AS familia,      -- grupo de artículos (¿= familia?)
    T0.ItemName               AS [desc],       -- descripción del material
    CAST(T1.OnHand  AS INT)   AS inv,          -- inventario en almacén
    CAST(T1.MinStock AS INT)  AS [min],        -- mínimo en almacén
    CAST(T1.MaxStock AS INT)  AS [max],        -- máximo en almacén
    /* tránsito = piezas en órdenes de compra abiertas (aún no recibidas) */
    CAST(ISNULL((
        SELECT SUM(P1.OpenInvQty)
        FROM POR1 P1
        INNER JOIN OPOR P ON P.DocEntry = P1.DocEntry
        WHERE P1.ItemCode = T0.ItemCode
          AND P.DocStatus = 'O'                 -- abierta
    ), 0) AS INT)             AS transito
FROM OITM T0
INNER JOIN OITW T1 ON T1.ItemCode = T0.ItemCode
LEFT  JOIN OITB G  ON G.ItmsGrpCod = T0.ItmsGrpCod
WHERE T1.WhsCode = @almacen
  AND T0.validFor = 'Y'                         -- artículo activo
ORDER BY familia, [desc];
