/**
 * vigilancia.js — Módulo Vigilancia (placeholder)
 * Conecta aquí la hoja de Google Sheets de Vigilancia cuando esté lista.
 * La función renderVigilancia(container) es llamada por navigation.js.
 */

async function renderVigilancia(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div class="empty-title">Módulo pendiente</div>
      <div class="empty-desc">Conecta una hoja de Google Sheets para activar <strong>Vigilancia</strong>.</div>
    </div>`;
}
