/**
 * operaciones.js — Módulo Operaciones especiales (placeholder)
 * Conecta aquí la hoja de Google Sheets de Operaciones cuando esté lista.
 * La función renderOperaciones(container) es llamada por navigation.js.
 */

async function renderOperaciones(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        </svg>
      </div>
      <div class="empty-title">Módulo pendiente</div>
      <div class="empty-desc">Conecta una hoja de Google Sheets para activar <strong>Operaciones especiales</strong>.</div>
    </div>`;
}
