/**
 * auth.js — Sistema de autenticación FIS FIBER
 * Almacena la sesión en sessionStorage (se borra al cerrar el navegador).
 */

const FIS_SESSION_KEY = 'fis_session';

/**
 * Verifica si hay sesión activa.
 * Si no la hay, redirige a login. Retorna el objeto de usuario actual.
 */
function fisCheckAuth() {
  const raw = sessionStorage.getItem(FIS_SESSION_KEY);
  if (!raw) {
    window.location.replace('index.html');
    return null;
  }
  return JSON.parse(raw);
}

/**
 * Hace login: valida credenciales y guarda sesión.
 * Retorna { ok, error }
 */
function fisLogin(username, password) {
  const u = (username || '').trim().toLowerCase();
  const cfg = FIS_USERS[u];
  if (!cfg || cfg.password !== password) {
    return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  }
  const session = { username: u, name: cfg.name, modules: cfg.modules };
  sessionStorage.setItem(FIS_SESSION_KEY, JSON.stringify(session));
  return { ok: true, session };
}

/** Cierra sesión y redirige a login. */
function fisLogout() {
  sessionStorage.removeItem(FIS_SESSION_KEY);
  window.location.replace('index.html');
}

/**
 * Aplica restricciones de módulo en el sidebar:
 * - Oculta items sin acceso
 * - Muestra nombre del usuario
 * - Muestra solo la primera área accesible al abrir
 */
function fisApplyModuleRestrictions(user) {
  document.querySelectorAll('.nav-item[data-module]').forEach(item => {
    const mod = item.getAttribute('data-module');
    if (!user.modules.includes(mod)) {
      item.style.display = 'none';
    }
  });

  const nameEl = document.getElementById('fis-user-name');
  if (nameEl) nameEl.textContent = user.name;
}

/**
 * Verifica si el usuario actual tiene acceso a un módulo dado.
 */
function fisHasModule(key) {
  const raw = sessionStorage.getItem(FIS_SESSION_KEY);
  if (!raw) return false;
  return JSON.parse(raw).modules.includes(key);
}
