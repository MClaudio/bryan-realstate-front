import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { PermissionAction } from '../../types/permissions';

interface PermissionRouteProps {
  module: string;
  action?: PermissionAction;
  /** Acciones alternativas: basta con tener la principal o cualquiera de estas. */
  orActions?: PermissionAction[];
}

/**
 * Guard de ruta por perfil. Se anida dentro de ProtectedRoute/AdminLayout.
 * Además de la acción pedida exige acceso al módulo (el módulo debe estar en el menú del perfil).
 */
export const PermissionRoute = ({ module, action = 'access', orActions = [] }: PermissionRouteProps) => {
  const { can, canAccess } = useAuth();
  const allowed = canAccess(module) && [action, ...orActions].some((a) => can(module, a));
  return allowed ? <Outlet /> : <Navigate to="/admin/sin-acceso" replace />;
};
