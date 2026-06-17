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
  },
  /* Motivos de reprogramación (último mes) */
  motivos: [
    { motivo:'Solicitud del cliente', valor:2 },
    { motivo:'Administrativo',        valor:4 },
    { motivo:'Fabricado',             valor:0 },
  ]
};

/* ── TOPS DE CLIENTES (análisis por comportamiento) ──
   4 categorías que vienen en cada hoja de producto. Respaldo embebido;
   parseTopsClientes() los extrae en vivo del CSV. */
const VENTAS_TOP_SECCIONES = [
  { key:'inactivos',    match:'compras inactiva',  titulo:'Compras inactivas',     desc:'clientes inactivos', color:'var(--blue)',  positivo:true  },
  { key:'baja',         match:'a la baja',         titulo:'Consumo a la baja',     desc:'clientes que bajaron', color:'var(--red)',  positivo:false },
  { key:'reactivacion', match:'reactivaci',        titulo:'Reactivación de compra',desc:'clientes reactivados', color:'var(--teal)', positivo:true  },
  { key:'incremento',   match:'incremento compra', titulo:'Incremento de compra',  desc:'clientes que subieron', color:'var(--green)',positivo:true },
];

const VENTAS_FIELTRO_TOPS = {
  inactivos: [ {cliente:'SINTEPLAST',valor:1536.22},{cliente:'JYRSA PPE',valor:695.68},{cliente:'SPECIALITY WEAR & ACCESORIES',valor:585.29},{cliente:'WORLD EMBLEM DE MEXICO',valor:292.80},{cliente:'OCTAVIO JIMENEZ ALARCON',valor:14.10} ],
  baja: [ {cliente:'OPLEX',valor:-9503.15},{cliente:'SAGE AUTOMOTIVE INTERIORS DE MEXICO',valor:-1496.97},{cliente:'Adient US Enterprises LP',valor:-1350.49},{cliente:'DECORPLAST DE MEXICO',valor:-1145.50},{cliente:'JAIME VERDIN SALDANA',valor:-802.77},{cliente:'L G MANUFACTURERA',valor:-185.33} ],
  reactivacion: [ {cliente:'GUSTAVO GORDILLO CENTENO',valor:5871.10},{cliente:'AP MASCARILLAS',valor:2293.42},{cliente:'BLANCOS MILENIUM',valor:586.98},{cliente:'RAMAKAT',valor:323.17} ],
  incremento: [ {cliente:'Lear Mexican Seating Corporation',valor:3123.90},{cliente:'VFMX DE MEXICO',valor:863.95},{cliente:'PLASTICOS POLA',valor:328.03},{cliente:'PIELES SINTETICAS',valor:258.09} ],
};

const VENTAS_FIBERBOND_TOPS = {
  inactivos: [ {cliente:'LOGAN & MASON TEXTILE COMPANY',valor:23799.48},{cliente:'FORDEPRO',valor:2452.49},{cliente:'DISTRIBUIDORA SPRINGHOUSE',valor:2051.64},{cliente:'DALFIORI',valor:1662.67},{cliente:'D SOL A SOL INTERNATIONAL',valor:1447.22} ],
  baja: [ {cliente:'TEJIDOS Y BLANCOS DE LA CASA',valor:-4561.86},{cliente:'TRIM SYSTEMS OPERATING CORPORATION',valor:-4089.29},{cliente:'GRUPO GEITANI TEXTIL',valor:-2888.73},{cliente:'BLANCOS MILENIUM',valor:-2486.72},{cliente:'SPRING AIR MEXICO',valor:-2080.86},{cliente:'DISENOS MAYRO',valor:-1069.72} ],
  reactivacion: [ {cliente:'TELAS Y LONAS VALDES',valor:1309.03},{cliente:'TELAS DE VERDAD',valor:1082.32},{cliente:'THE DREAM STORE',valor:1010.76},{cliente:'DISTRIBUIDORA MAYORISTA DE ARTICULOS PELETEROS',valor:618.57},{cliente:'JUAN GARDUNO CHIMAL',valor:303.73} ],
  incremento: [ {cliente:'FABRI-QUILT INC.',valor:15152.40},{cliente:'COLCHONES MASTER',valor:3654.18},{cliente:'INDUSTRIAS D K',valor:2827.20},{cliente:'INGENIERIA AMBIENTAL INDUSTRIAL',valor:1664.38},{cliente:'RAUL CRUZ ROMERO',valor:985.41} ],
};

/**
 * Extrae los tops de clientes del CSV (formato reporte).
 * Se ancla a los títulos "Análisis de …" y recoge pares cliente/valor
 * de las columnas laterales (≥13). Devuelve {inactivos,baja,reactivacion,incremento}.
 */
function parseTopsClientes(filas) {
  const out = { inactivos:[], baja:[], reactivacion:[], incremento:[] };
  let cur = null;
  for (const c of filas) {
    const joined = c.join(' ').toLowerCase();
    if (joined.includes('nálisis') || joined.includes('analisis')) {
      const sec = VENTAS_TOP_SECCIONES.find(s => joined.includes(s.match));
      if (sec) { cur = sec.key; continue; }
    }
    if (cur) {
      for (let j = 13; j < Math.min(c.length - 1, 20); j++) {
        const t = (c[j] || '').trim();
        if (t.length > 2 && /[a-záéíóúñ]/i.test(t) && t !== 'Medición:' && t !== 'Descripción:') {
          const v = parseMoney(c[j+1]);
          if (v) out[cur].push({ cliente: t, valor: v });
          break;
        }
      }
    }
  }
  return out;
}

/** Extrae los motivos de reprogramación del CSV de Pedidos. */
function parseMotivos(filas) {
  const claves = ['solicitud del cliente','administrativo','fabricado'];
  const out = [];
  for (const c of filas) {
    for (let j = 13; j < Math.min(c.length - 1, 20); j++) {
      const t = (c[j] || '').trim();
      if (claves.includes(t.toLowerCase())) {
        out.push({ motivo: t, valor: parseMoney(c[j+1]) });
        break;
      }
    }
  }
  return out.length ? out : VENTAS_PEDIDOS.motivos;
}

/** Devuelve el HTML de la sección "Tops de clientes" (4 tarjetas). */
function renderTopsHTML(tops, producto) {
  tops = tops || {};
  const card = (sec) => {
    const items = (tops[sec.key] || []).slice()
      .sort((a,b) => Math.abs(b.valor) - Math.abs(a.valor)).slice(0, 6);
    const rows = items.length ? items.map((it, i) => `
      <div style="display:flex;align-items:center;gap:9px;padding:7px 2px;border-bottom:1px solid var(--border)">
        <span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;background:var(--off);color:var(--ink3);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace">${i+1}</span>
        <span style="flex:1;font-size:12.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${it.cliente}">${it.cliente}</span>
        <span class="pill ${it.valor>=0?'pill-green':'pill-red'}" style="flex-shrink:0">${it.valor>=0?'+':''}${Math.round(it.valor).toLocaleString('es-MX')} kg</span>
      </div>`).join('') : '<div style="color:var(--ink3);font-size:13px;padding:12px 0;text-align:center">Sin datos</div>';
    return `<div class="chart-box">
      <div class="chart-title" style="border-left:3px solid ${sec.color};padding-left:9px">${sec.titulo} <span class="chart-badge">${sec.desc}</span></div>
      <div style="margin-top:6px">${rows}</div>
    </div>`;
  };
  return `<div class="section-divider"><span>Tops de clientes · ${producto}</span></div>
    <div class="charts-grid">${VENTAS_TOP_SECCIONES.map(card).join('')}</div>`;
}
