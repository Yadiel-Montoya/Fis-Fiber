/**
 * config.js — URLs de Google Sheets (fuentes de datos)
 * Para agregar/modificar fuentes, editar SOLO este archivo.
 * Cada URL debe ser un CSV público de Google Sheets
 * (Archivo → Publicar en la web → CSV).
 */

/* ── LOGÍSTICA: CASETAS ── */
const CASETAS_MENSUAL_URL     = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSb8jHJ_Fqmp-Pxvy1Y8Frwc_uj49tWkcgVydTBUe1kBK7e1xte_1s5YLvx1UXetA/pub?gid=1168469221&single=true&output=csv';
const CASETAS_COMPARATIVO_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSb8jHJ_Fqmp-Pxvy1Y8Frwc_uj49tWkcgVydTBUe1kBK7e1xte_1s5YLvx1UXetA/pub?gid=439879445&single=true&output=csv';

/* ── LOGÍSTICA: CARGAS ANTICIPADAS ── */
const SHEETS_URL              = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSgRgBjIySNNLYySfwSdEXuHJcu-vwg1ZK-mQb6HQZm8xXAex31UOtJaVZlnwzZGA/pub?gid=241439534&single=true&output=csv';

/* ── LOGÍSTICA: COLABORADORES ── */
const VIAJES_URL              = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQXHv7eviqTWjlZLJLhnvKtACyFtBMYT2LbnahX5qzju4y_5rB0crQB1LC6QfpCWw/pub?gid=1801163127&single=true&output=csv';

/* ── LOGÍSTICA: VIAJES Y PIEZAS ── */
const VIAJES_PIEZAS_URL       = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSQzitwppssIay9_bVy3L56qe8VqQoJJgP5Rv9-d6-El5seGkMVWTNG00UDvgzmgQ/pub?output=csv';

/* ── VENTAS ──
   Cada hoja del libro de Ventas se publica por separado (output=csv).
   La URL sin gid exporta la primera hoja (Ventas general).
   Para Fieltro/Fiberbond/Pedidos, publica cada hoja y pega su URL (con &gid=).
   Si una URL queda vacía, ese submódulo usa los datos embebidos de respaldo. */
const VENTAS_GENERAL_URL   = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTllAuaaQnpxD0DE_eINa5vZq4Ifrquv14cu1v-l5Zl3ZsZpy7jwbYvWpULJeOOjw/pub?output=csv';
const VENTAS_FIELTRO_URL   = '';
const VENTAS_FIBERBOND_URL = '';
const VENTAS_PEDIDOS_URL   = '';

/* ── AGREGAR NUEVAS FUENTES AQUÍ ── */

/* ── LOGÍSTICA: EMBARQUES REPROGRAMADOS ── */
/* Apunta a la API de FIS FIBER (carpeta servidor-api/, corre en tu servidor).
   Cambia esta URL por la dirección pública/red donde la tengas montada.   */
const EMBARQUES_PROXY_URL = 'http://TU-SERVIDOR:3001';
