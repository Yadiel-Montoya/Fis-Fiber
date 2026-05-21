/**
 * Configuración de usuarios y privilegios por módulo.
 * Módulos disponibles: maquilas, ventas, logistica, operaciones, vigilancia
 *
 * Para agregar un usuario: copia un bloque y cambia usuario, password y modules.
 * Para quitar acceso a un módulo: elimina su key del array modules[].
 */
const FIS_USERS = {
  'admin': {
    password: 'fis2026',
    name: 'Administrador',
    modules: ['maquilas', 'ventas', 'logistica', 'operaciones', 'vigilancia']
  },
  'logistica': {
    password: 'log2026',
    name: 'Logística',
    modules: ['logistica']
  },
  'gerencia': {
    password: 'ger2026',
    name: 'Gerencia',
    modules: ['maquilas', 'ventas', 'logistica', 'operaciones', 'vigilancia']
  },
  'operaciones': {
    password: 'ops2026',
    name: 'Operaciones',
    modules: ['operaciones', 'logistica']
  },
  'vigilancia': {
    password: 'vig2026',
    name: 'Vigilancia',
    modules: ['vigilancia']
  }
};
