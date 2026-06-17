/**
 * datos-ventas.js — Datos de los indicadores de Ventas
 * Fuente: DG_Medicion_Ventas_YM.xlsx (corte Mayo 2026)
 *
 * Para actualizar cada mes: reemplaza los valores de Alcanzado/General/FIS
 * del mes correspondiente. Cuando se publique el Excel como Google Sheets
 * CSV, estos arreglos se podrán reemplazar por una carga en vivo.
 */

const MESES_VENTAS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/* ── 1. VENTAS GENERALES (millones de pesos) ── */
/* meta/alcanzado/cumplimiento por año. cumplimiento 0–1 */
const VENTAS_GENERAL = {
  metaAnual: 24.9,
  meses: [
    /* mes,        v2023, v2024, meta25, alc25, cump25, meta26, alc26, cump26 */
    { mes:'Enero',      a2023:27.5, a2024:28.0, meta25:27.75, alc25:29.2,  cump25:1.00, meta26:28.23, alc26:25.17, cump26:0.80 },
    { mes:'Febrero',    a2023:26.8, a2024:22.6, meta25:24.70, alc25:23.5,  cump25:0.95, meta26:25.75, alc26:23.95, cump26:0.90 },
    { mes:'Marzo',      a2023:32.1, a2024:22.0, meta25:24.85, alc25:25.04, cump25:1.00, meta26:28.48, alc26:23.15, cump26:0.80 },
    { mes:'Abril',      a2023:21.8, a2024:23.5, meta25:24.85, alc25:23.4,  cump25:0.94, meta26:23.33, alc26:23.67, cump26:1.00 },
    { mes:'Mayo',       a2023:29.3, a2024:22.2, meta25:25.75, alc25:24.45, cump25:0.95, meta26:27.52, alc26:24.92, cump26:0.90 },
    { mes:'Junio',      a2023:27.0, a2024:20.4, meta25:23.70, alc25:25.44, cump25:1.00, meta26:25.35, alc26:null,  cump26:null },
    { mes:'Julio',      a2023:27.31,a2024:22.7, meta25:25.00, alc25:25.5,  cump25:1.00, meta26:26.16, alc26:null,  cump26:null },
    { mes:'Agosto',     a2023:30.0, a2024:24.3, meta25:27.15, alc25:25.13, cump25:0.93, meta26:28.57, alc26:null,  cump26:null },
    { mes:'Septiembre', a2023:28.1, a2024:22.0, meta25:25.05, alc25:26.86, cump25:1.00, meta26:26.58, alc26:null,  cump26:null },
    { mes:'Octubre',    a2023:30.9, a2024:26.8, meta25:28.85, alc25:31.82, cump25:1.00, meta26:29.88, alc26:null,  cump26:null },
    { mes:'Noviembre',  a2023:28.3, a2024:26.4, meta25:27.35, alc25:26.15, cump25:0.96, meta26:27.83, alc26:null,  cump26:null },
    { mes:'Diciembre',  a2023:24.1, a2024:24.9, meta25:24.90, alc25:28.3,  cump25:1.00, meta26:24.50, alc26:null,  cump26:null },
  ]
};

/* ── 2. VENTAS FIELTRO (kilos) · General vs FIS ── */
const VENTAS_FIELTRO = [
  /* mes,        g2024,      f2024,      g2025,      f2025,      g2026,      f2026 */
  { mes:'Enero',      g2024:140783.61, f2024:115691.75, g2025:163701.12, f2025:101741.13, g2026:136676.27, f2026:84417.77 },
  { mes:'Febrero',    g2024:108116.53, f2024:93496.12,  g2025:159541.00, f2025:94413.78,  g2026:132602.33, f2026:100146.63 },
  { mes:'Marzo',      g2024:132566.91, f2024:129082.91, g2025:137348.22, f2025:106295.22, g2026:118171.84, f2026:84169.50 },
  { mes:'Abril',      g2024:189995.98, f2024:93545.98,  g2025:163830.28, f2025:103010.68, g2026:126203.08, f2026:84833.18 },
  { mes:'Mayo',       g2024:158281.60, f2024:64331.60,  g2025:134047.69, f2025:76165.89,  g2026:134277.46, f2026:84671.46 },
];

/* ── 3. VENTAS FIBERBOND (kilos) · General vs FIS ── */
const VENTAS_FIBERBOND = [
  /* mes,        g2024,      g2025,      g2026,      f2026 */
  { mes:'Enero',   g2024:469266.97, g2025:439187.98, g2026:392627.05, f2026:352765.25 },
  { mes:'Febrero', g2024:356991.94, g2025:330905.55, g2026:373093.01, f2026:333567.08 },
  { mes:'Marzo',   g2024:247954.93, g2025:357760.42, g2026:383000.05, f2026:339311.22 },
  { mes:'Abril',   g2024:342131.08, g2025:309126.67, g2026:321352.72, f2026:294405.30 },
  { mes:'Mayo',    g2024:380626.08, g2025:333438.75, g2026:356638.52, f2026:325292.64 },
];

/* ── 4. PEDIDOS REPROGRAMADOS (conteo mensual) ── */
const VENTAS_PEDIDOS = {
  meses: [
    { mes:'Enero',      a2024:176, a2025:173, a2026:85   },
    { mes:'Febrero',    a2024:77,  a2025:80,  a2026:88   },
    { mes:'Marzo',      a2024:74,  a2025:36,  a2026:77   },
    { mes:'Abril',      a2024:55,  a2025:41,  a2026:76   },
    { mes:'Mayo',       a2024:74,  a2025:47,  a2026:104  },
    { mes:'Junio',      a2024:37,  a2025:45,  a2026:null },
    { mes:'Julio',      a2024:32,  a2025:38,  a2026:null },
    { mes:'Agosto',     a2024:136, a2025:81,  a2026:null },
    { mes:'Septiembre', a2024:128, a2025:101, a2026:null },
    { mes:'Octubre',    a2024:159, a2025:86,  a2026:null },
    { mes:'Noviembre',  a2024:196, a2025:94,  a2026:null },
    { mes:'Diciembre',  a2024:273, a2025:119, a2026:null },
  ],
  /* Desglose del último mes (Mayo 2026) por días de retraso */
  desgloseUltimoMes: {
    mes: 'Mayo',
    rangos: [
      { rango:'1 a 3 días',    valor:62 },
      { rango:'4 a 10 días',   valor:33 },
      { rango:'Más de 10 días',valor:9  },
    ],
    total: 104
  }
};
