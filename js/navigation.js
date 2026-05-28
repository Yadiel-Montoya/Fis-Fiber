/**
 * navigation.js — Enrutador de áreas y sub-módulos FIS FIBER
 * Depende de: utils.js (CI, DC, toggleSidebar), auth.js (fisHasModule)
 * Depende de: todos los archivos js/areas/*.js y js/areas/logistica/*.js
 *
 * Para añadir un nuevo módulo en el futuro:
 *  1. Crea js/areas/<nombre>.js con una función render<Nombre>(container)
 *  2. Agrega la entrada en el objeto `areas` aquí abajo
 *  3. Agrega el <script src="..."> en app.html (en orden, antes de navigation.js)
 *  4. Agrega el botón en la barra lateral de app.html con data-module="<nombre>"
 */

/* ── ESTADO GLOBAL DE TIMERS ── */
// Limpia todos los timers de auto-refresco al cambiar de módulo
function _clearAllTimers() {
  if (window._timerCargas)   { clearInterval(window._timerCargas);   window._timerCargas   = null; }
  if (window._timerColab)    { clearInterval(window._timerColab);    window._timerColab    = null; }
  if (window._timerCasetas)  { clearInterval(window._timerCasetas);  window._timerCasetas  = null; }
  if (window._timerVP)       { clearInterval(window._timerVP);       window._timerVP       = null; }
}

/* ── PLACEHOLDER PARA MÓDULOS SIN DATOS ── */
function renderEmpty(name) {
  return container => {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="empty-title">Módulo pendiente</div>
        <div class="empty-desc">Conecta una hoja de Google Sheets para activar <strong>${name}</strong>.</div>
      </div>`;
  };
}

/* ══════════════════════════════════════════════════
   MAPA DE ÁREAS
   Cada área tiene:
     name     → texto del encabezado
     submods  → array de { id, label, render }
                si está vacío → usa el render del archivo del área
     render   → función render<Nombre>(container) para áreas sin sub-módulos
   Para añadir sub-módulos: empuja un objeto al array submods.
══════════════════════════════════════════════════ */
const areas = {
  maquilas: {
    name: 'Maquilas',
    submods: [],
    render: renderMaquilas,
  },
  ventas: {
    name: 'Ventas',
    submods: [],
    render: renderVentas,
  },
  logistica: {
    name: 'Logística',
    submods: [
      { id: 'cargas',   label: '📦 Cargas anticipadas',           render: renderCargas },
      { id: 'colab',    label: '👥 Participación colaboradores',  render: renderColaboradores },
      { id: 'casetas',  label: '🛣️ Gastos casetas',              render: renderCasetas },
      { id: 'viajespz', label: '🚛 Viajes y Piezas',              render: renderViajesPiezas },
    ],
  },
  operaciones: {
    name: 'Operaciones especiales',
    submods: [],
    render: renderOperaciones,
  },
  vigilancia: {
    name: 'Vigilancia',
    submods: [],
    render: renderVigilancia,
  },
};

/* ── HELPERS DE NAVEGACIÓN ── */
function setNav(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

/* ── PÁGINA DE INICIO ── */
function showHome() {
  setNav('nav-home');
  document.getElementById('page-home').classList.add('active');
  document.getElementById('page-detail').classList.remove('active');
  document.getElementById('docControlBox').style.display = 'none';
  document.getElementById('bc-current').textContent = 'Resumen general';
  _clearAllTimers();
  Object.keys(CI).forEach(DC);
  if (window.innerWidth < 900) toggleSidebar();
}

/* ── ABRIR ÁREA ── */
function openArea(key) {
  if (!fisHasModule(key)) return;      // control de acceso

  const area = areas[key];
  if (!area) return;

  setNav('nav-' + key);
  document.getElementById('docControlBox').style.display = key === 'logistica' ? 'block' : 'none';
  document.getElementById('detail-name').textContent = area.name;
  document.getElementById('bc-current').textContent = area.name;

  // Limpiar timers y gráficas previas
  _clearAllTimers();
  Object.keys(CI).forEach(DC);

  let body = '';
  if (area.submods && area.submods.length) {
    const tabs   = area.submods.map((s, i) =>
      `<button class="submod-tab${i === 0 ? ' active' : ''}" onclick="switchTab('${key}','${s.id}',this)">${s.label}</button>`
    ).join('');
    const panels = area.submods.map((s, i) =>
      `<div class="submod-panel${i === 0 ? ' active' : ''}" id="panel-${s.id}"></div>`
    ).join('');
    body = `<div class="submod-tabs">${tabs}</div>${panels}`;
  }

  document.getElementById('detail-body').innerHTML = body;

  if (area.submods && area.submods.length) {
    // Renderiza el primer sub-módulo
    const first = area.submods[0];
    first.render(document.getElementById(`panel-${first.id}`));
  } else if (area.render) {
    // Área sin sub-módulos: usa su render propio
    area.render(document.getElementById('detail-body'));
  } else {
    renderEmpty(area.name)(document.getElementById('detail-body'));
  }

  document.getElementById('page-home').classList.remove('active');
  document.getElementById('page-detail').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (window.innerWidth < 900) toggleSidebar();
}

/* ── CAMBIO DE SUB-MÓDULO (TAB) ── */
function switchTab(areaKey, subId, btn) {
  document.querySelectorAll('#detail-body > .submod-tabs .submod-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#detail-body > .submod-panel').forEach(p => p.classList.remove('active'));

  btn.classList.add('active');
  const panel = document.getElementById(`panel-${subId}`);
  if (panel) {
    panel.classList.add('active');
    // Render lazy: solo si el panel está vacío
    if (!panel.innerHTML.trim()) {
      const sub = areas[areaKey]?.submods.find(s => s.id === subId);
      if (sub) sub.render(panel);
    }
  }
}
