/**
 * maquilas.js — Módulo Maquilas (placeholder)
 * Conecta aquí la hoja de Google Sheets de Maquilas cuando esté lista.
 * La función renderMaquilas(container) es llamada por navigation.js.
 */

async function renderMaquilas(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        </svg>
      </div>
      <div class="empty-title">Módulo pendiente</div>
      <div class="empty-desc">Conecta una hoja de Google Sheets para activar <strong>Maquilas</strong>.</div>
    </div>`;
}
