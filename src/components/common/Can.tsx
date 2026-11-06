import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { PermissionAction } from '../../types/permissions';

interface CanProps {
  module: string;
  action: PermissionAction;
  /** Acciones alternativas: basta con tener la principal o cualquiera de estas. */
  orActions?: PermissionAction[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** Renderiza `children` solo si el perfil tiene `action` sobre `module`. */
export const Can = ({ module, action, orActions = [], children, fallback = null }: CanProps) => {
  const { can } = useAuth();
  return <>{[action, ...orActions].some((a) => can(module, a)) ? children : fallback}</>;
};
