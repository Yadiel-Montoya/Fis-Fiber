/**
 * slideshow.js — Motor de presentaciones FIS FIBER
 * Controla la superposición de diapositivas, navegación y gráficas SS.
 * Depende de: utils.js (CI, DC)
 */

/* ── ESTADO DEL SLIDESHOW ── */
let ssCurrentSlide = 0;
let ssSlides = [];

/* ── CONSTANTES DE ESTILO PARA GRÁFICAS EN PRESENTACIÓN ── */
const SS_MF = 'JetBrains Mono';
const SS_GC = 'rgba(255,255,255,0.06)';
const SS_TC = 'rgba(255,255,255,0.28)';

/** Opciones base para todas las gráficas dentro del slideshow */
function ssChartDefaults() {
  return { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false } };
}

/* ── APERTURA ── */
/**
 * Inicializa y abre el slideshow con los slides definidos en `ssSlides`.
 * @param {string} titulo - HTML del título mostrado en la topbar
 */
function _abrirSS(titulo) {
  document.getElementById('ss-brand-name').innerHTML = titulo;
  const stage = document.getElementById('ssStage');
  stage.innerHTML = ssSlides.join('');
  document.getElementById('ssPills').innerHTML = ssSlides.map((_, i) =>
    `<div class="ss-pill${i === 0 ? ' active' : ''}" onclick="ssGoTo(${i})"></div>`
  ).join('');
  document.getElementById('ssCounter').textContent = `1 / ${ssSlides.length}`;
  ssCurrentSlide = 0;
  const o = document.getElementById('ssOverlay');
  o.classList.add('open');
  requestAnimationFrame(() => o.classList.add('visible'));
}

/* ── NAVEGACIÓN ── */
/** Avanza o retrocede un slide relativo a la posición actual */
function ssNav(dir) {
  const n = ssCurrentSlide + dir;
  if (n < 0 || n >= ssSlides.length) return;
  ssGoTo(n);
}

/** Salta directamente al slide con índice `n` */
function ssGoTo(n) {
  const cur = document.getElementById(`ss-slide-${ssCurrentSlide}`);
  if (cur) {
    cur.classList.remove('active');
    cur.classList.add('exit-left');
    setTimeout(() => cur.classList.remove('exit-left'), 400);
  }
  ssCurrentSlide = n;
  const next = document.getElementById(`ss-slide-${n}`);
  if (next) {
    next.style.transform = 'translateX(40px)';
    next.style.opacity   = '0';
    next.classList.add('active');
    requestAnimationFrame(() => { next.style.transform = ''; next.style.opacity = ''; });
  }
  document.querySelectorAll('.ss-pill').forEach((p, i) => p.classList.toggle('active', i === n));
  document.getElementById('ssCounter').textContent = `${n + 1} / ${ssSlides.length}`;
}

/* ── CIERRE ── */
function cerrarSlideshow() {
  const o = document.getElementById('ssOverlay');
  o.classList.remove('visible');
  setTimeout(() => {
    o.classList.remove('open');
    // Destruir todas las gráficas creadas dentro del slideshow
    Object.keys(CI).filter(k => k.startsWith('ss-')).forEach(DC);
  }, 350);
}

/* ── TECLADO ── */
document.addEventListener('keydown', e => {
  if (!document.getElementById('ssOverlay').classList.contains('open')) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') ssNav(1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   ssNav(-1);
  if (e.key === 'Escape') cerrarSlideshow();
});

/* ── HELPERS DE FORMATO PARA SLIDES ── */
/** Formatea número como $1,234 */
function ss$(n) {
  if (!n && n !== 0) return '—';
  return '$' + Math.abs(n).toLocaleString('es-MX');
}

/** Genera HTML de tendencia con flecha (↑ rojo = más gasto, ↓ verde = ahorro) */
function ssTrend(n) {
  if (!n) return `<span class="trend-neu">—</span>`;
  return `<span class="${n > 0 ? 'trend-up' : 'trend-down'}">${n > 0 ? '▲' : '▼'} $${Math.abs(n).toLocaleString('es-MX')}</span>`;
}

/** Genera HTML de variación porcentual entre a y b */
function ssPct(a, b) {
  if (!b) return '';
  const p = ((a - b) / b * 100);
  return `<span class="${p > 0 ? 'trend-up' : 'trend-down'}">${p > 0 ? '+' : ''}${p.toFixed(1)}%</span>`;
}
