export const PERMISSION_ACTIONS = ['access', 'create', 'edit', 'delete', 'view', 'print', 'download'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const ACTION_LABELS: Record<PermissionAction, string> = {
  access: 'Acceso',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar',
  view: 'Ver',
  print: 'Imprimir',
  download: 'Descargar',
};

export interface ModuleDef {
  key: string;
  label: string;
  path: string;
  icon: string;
  inMenu: boolean;
  order: number;
  actions: PermissionAction[];
}

export type ModulePermissions = Partial<Record<PermissionAction, boolean>>;
export type ProfilePermissions = Record<string, ModulePermissions>;

export interface Profile {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissions: ProfilePermissions;
  _count?: { users: number };
}

// El catálogo de módulos vive en backend/src/profiles/modules.json y llega por /auth/me (ver AuthContext).
