/**
 * Configuración de usuarios y privilegios por módulo.
 * role: 'admin' → puede ver el Resumen general + todos sus módulos
 * role: 'user'  → va directo a su primer módulo, sin Resumen
 *
 * Para agregar un usuario: copia un bloque y ajusta usuario, password, role y modules.
 */
const FIS_USERS = {
  'admin': {
    password: 'fis2026',
    name: 'Administrador',
    role: 'admin',
    modules: ['maquilas', 'ventas', 'logistica', 'operaciones', 'vigilancia', 'almacen']
  },
  'gerencia': {
    password: 'ger2026',
    name: 'Gerencia',
    role: 'admin',
    modules: ['maquilas', 'ventas', 'logistica', 'operaciones', 'vigilancia', 'almacen']
  },
  'logistica': {
    password: 'log2026',
    name: 'Logística',
    role: 'user',
    modules: ['logistica']
  },
  'operaciones': {
    password: 'ops2026',
    name: 'Operaciones',
    role: 'user',
    modules: ['operaciones', 'logistica']
  },
  'vigilancia': {
    password: 'vig2026',
    name: 'Vigilancia',
    role: 'user',
    modules: ['vigilancia']
  },
  'almacen': {
    password: 'alm2026',
    name: 'Almacén MP',
    role: 'user',
    modules: ['almacen']
  }
};
