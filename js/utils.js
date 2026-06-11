/**
 * utils.js — Utilidades compartidas de FIS FIBER
 * Funciones de uso general disponibles en todos los módulos.
 */

/* ── CONSTANTES DE FECHA ── */
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

/* ── REGISTRO DE GRÁFICAS (para destruir antes de re-renderizar) ── */
const CI = {};
/** Destruye una gráfica por su ID de canvas */
function DC(id) {
  if (CI[id]) { CI[id].destroy(); delete CI[id]; }
}

/* ── RELOJ Y FECHA ── */
function updateClock() {
  const n = new Date();
  const clockEl = document.getElementById('clock');
  const dateEl  = document.getElementById('topbar-date');
  if (clockEl) clockEl.textContent = n.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  if (dateEl)  dateEl.textContent  = n.toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}

/* ── SIDEBAR MÓVIL ── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}

/* ── FORMATO DE DIFERENCIA MONETARIA ── */
/**
 * Devuelve HTML con diferencia resaltada en rojo (positivo = más gasto)
 * o verde (negativo = ahorro).
 */
function fmtDif(n) {
  if (n === 0) return '<span style="color:var(--ink3)">$0</span>';
  const cls  = n > 0 ? 'dif-positive' : 'dif-negative';
  const sign = n > 0 ? '+' : '-';
  return `<span class="${cls}">${sign}$${Math.abs(n).toLocaleString('es-MX')}</span>`;
}

/* ── PARSEO DE CSV ── */
/**
 * Convierte texto CSV en array de objetos usando la primera fila como encabezados.
 * Maneja comillas y comas dentro de campos.
 */
function parseCSV(txt) {
  const lines = txt.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }  // comilla escapada ""
        else inQ = !inQ;
      }
      else if (c === ',' && !inQ) { vals.push(cur.trim().replace(/^"|"$/g, '')); cur = ''; }
      else cur += c;
    }
    vals.push(cur.trim().replace(/^"|"$/g, ''));
    const o = {}; headers.forEach((h, i) => o[h] = vals[i] || '');
    return o;
  });
}

/* ── NORMALIZACIÓN DE FECHAS ── */
/**
 * Acepta fechas en múltiples formatos y devuelve 'YYYY-MM-DD' o null.
 * Soporta: serial Excel, ISO, DD/MM/YYYY, MM/DD/YYYY, texto.
 */
function normDate(raw) {
  if (!raw) return null;
  const s = raw.toString().trim().replace(/["'\r]/g, '');
  if (!s || /^(fecha|date)$/i.test(s)) return null;
  // Serial Excel
  if (/^\d{5}$/.test(s)) {
    const d = new Date((parseInt(s) - 25569) * 86400000);
    if (!isNaN(d) && d.getFullYear() > 2000)
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  }
  // YYYY-M-D
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y,m,d] = s.split('-');
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // Separadores / o -
  const sep = s.includes('/') ? '/' : s.includes('-') ? '-' : null;
  if (sep) {
    const p = s.split(sep);
    if (p.length === 3) {
      const [a,b,c] = p;
      if (a.length === 4) return `${a}-${b.padStart(2,'0')}-${c.substring(0,2).padStart(2,'0')}`;
      if (c.length === 4) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
      if (c.length === 2) return `20${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
    }
  }
  const d = new Date(s);
  if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return null;
}

/* ── PARSEO DE DINERO ── */
/**
 * Convierte cadenas monetarias ($1,234.56 / $1.234,56 / etc.) a número.
 * Maneja separadores de miles y decimales en ambas convenciones.
 */
function parseMoney(v) {
  if (!v && v !== 0) return 0;
  let s = (v || '0').toString().trim().replace(/[$\s]/g, '').replace(/\r/g, '');
  const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
  if (lastDot > -1 && lastComma > -1) {
    if (lastComma > lastDot) { s = s.replace(/\./g,'').replace(',','.'); }
    else { s = s.replace(/,/g,''); }
  } else if (lastComma > -1) {
    const afterComma = s.substring(lastComma + 1);
    if (afterComma.length === 3 && !s.substring(0, lastComma).includes('.')) { s = s.replace(/,/g,''); }
    else { s = s.replace(',','.'); }
  } else if (lastDot > -1) {
    const afterDot = s.substring(lastDot + 1);
    if (afterDot.length === 3 && s.replace(/[^.]/g,'').length === 1) { s = s.replace('.',''); }
  }
  return parseFloat(s) || 0;
}

/* ── PARSEO DE ESTATUS ── */
/** Devuelve 'Ahorro' o 'Gasto' a partir de texto del campo. */
function parseEstatus(v) {
  return /ahorro/i.test((v || '').toString()) ? 'Ahorro' : 'Gasto';
}

/* ── GETTER FLEXIBLE DE CAMPOS CSV ── */
/**
 * Devuelve una función `get(...terminos)` que busca en una fila CSV
 * por coincidencia exacta primero y luego por inclusión de texto.
 * Útil cuando los encabezados varían ligeramente entre hojas.
 */
function makeGet(r) {
  const keys = Object.keys(r);
  return function get(...terms) {
    for (const term of terms) {
      const tl = term.trim().toLowerCase().replace(/\s+/g,' ');
      const exact = keys.find(h => h.trim().toLowerCase().replace(/\s+/g,' ') === tl);
      if (exact !== undefined && r[exact] !== undefined && r[exact] !== '') return r[exact];
      const sub = keys.find(h => h.trim().toLowerCase().replace(/\s+/g,' ').includes(tl));
      if (sub !== undefined && r[sub] !== undefined && r[sub] !== '') return r[sub];
    }
    return '';
  };
}
