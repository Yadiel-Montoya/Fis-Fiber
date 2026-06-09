/**
 * almacen.js — Módulo Almacén Materia Prima
 * Depende de: config.js, utils.js
 * Para activar: agrega ALMACEN_URL en config.js y conecta el Sheet.
 */

async function renderAlmacen(container) {
  // Cuando esté listo el Sheet, llama a loadData() aquí
  container.innerHTML = `
    <div class="page-eyebrow">Almacén · Materia Prima</div>
    <div class="page-title">Almacén <span>Materia Prima</span></div>
    <div class="page-sub">Control de entradas, salidas y existencias de materia prima</div>
    <div class="empty-state" style="margin-top:1.5rem">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
      </div>
      <div class="empty-title">Módulo listo · Pendiente de datos</div>
      <div class="empty-desc">
        Agrega la URL de Google Sheets en <code>js/config.js</code> como<br>
        <code>const ALMACEN_URL = 'https://docs.google.com/...'</code>
      </div>
    </div>`;
}
