/**
 * ventas.js — Módulo Ventas (placeholder)
 * Conecta aquí la hoja de Google Sheets de Ventas cuando esté lista.
 * La función renderVentas(container) es llamada por navigation.js.
 */

async function renderVentas(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      </div>
      <div class="empty-title">Módulo pendiente</div>
      <div class="empty-desc">Conecta una hoja de Google Sheets para activar <strong>Ventas</strong>.</div>
    </div>`;
}
