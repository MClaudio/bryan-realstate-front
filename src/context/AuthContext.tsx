import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import type { ModuleDef, PermissionAction, Profile } from '../types/permissions';

interface User {
  id: string;
  username: string;
  type: 'ADMIN' | 'ACCOUNTING' | 'EMPLOYEE';
  firstName: string;
  lastName: string;
  hasChangedDefaultPassword?: boolean;
}

/** Perfil tal como lo devuelve /auth/login y /auth/me (sin datos de gestión). */
export type SessionProfile = Pick<Profile, 'id' | 'name' | 'isSystem' | 'isActive' | 'permissions'>;

interface AuthContextType {
  user: User | null;
  profile: SessionProfile | null;
  /** Catálogo de módulos (fuente: backend/src/profiles/modules.json), ordenado. */
  modules: ModuleDef[];
  token: string | null;
  refreshToken: string | null;
  login: (
    token: string,
    user: User,
    refreshToken?: string,
    profile?: SessionProfile | null,
    modules?: ModuleDef[],
  ) => void;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
  refreshSession: () => Promise<void>;
  /** ¿El perfil tiene `action` sobre `moduleKey`? */
  can: (moduleKey: string, action: PermissionAction) => boolean;
  canAccess: (moduleKey: string) => boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [modules, setModules] = useState<ModuleDef[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const storeProfile = (p: SessionProfile | null) => {
    if (p) localStorage.setItem('profile', JSON.stringify(p));
    else localStorage.removeItem('profile');
    setProfile(p);
  };

  const storeModules = (list: ModuleDef[] | undefined) => {
    const sorted = (list ?? []).slice().sort((a, b) => a.order - b.order);
    localStorage.setItem('modules', JSON.stringify(sorted));
    setModules(sorted);
  };

  /** Vuelve a pedir usuario + perfil al backend para aplicar cambios de permisos sin re-login. */
  const refreshSession = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    if (data?.user) {
      setUser((prev) => {
        const merged = { ...(prev ?? {}), ...data.user } as User;
        localStorage.setItem('user', JSON.stringify(merged));
        return merged;
      });
    }
    storeProfile(data?.profile ?? null);
    if (data?.modules) storeModules(data.modules);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedRefreshToken = localStorage.getItem('refresh_token');
        const storedUser = localStorage.getItem('user');
        const storedProfile = localStorage.getItem('profile');
        const storedModules = localStorage.getItem('modules');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setRefreshToken(storedRefreshToken);
          setUser(JSON.parse(storedUser));
          if (storedProfile) setProfile(JSON.parse(storedProfile));
          if (storedModules) setModules(JSON.parse(storedModules));

          // Sin perfil o módulos guardados (sesión previa) hay que esperar al backend.
          // Con ambos guardados se refresca en segundo plano.
          const refresh = refreshSession().catch((err) => {
            console.error('Error refreshing session:', err);
          });
          if (!storedProfile || !storedModules) await refresh;
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('profile');
        localStorage.removeItem('modules');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    restore();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const login = (
    newToken: string,
    newUser: User,
    newRefreshToken?: string,
    newProfile?: SessionProfile | null,
    newModules?: ModuleDef[],
  ) => {
    localStorage.setItem('token', newToken);
    if (newRefreshToken) {
      localStorage.setItem('refresh_token', newRefreshToken);
    }
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setRefreshToken(newRefreshToken ?? null);
    setUser(newUser);
    storeProfile(newProfile ?? null);
    storeModules(newModules);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    localStorage.removeItem('modules');
    setModules([]);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setProfile(null);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const can = useCallback(
    (moduleKey: string, action: PermissionAction) => {
      if (!profile || !profile.isActive) return false;
      if (profile.isSystem) return true;
      const perms = profile.permissions?.[moduleKey];
      return !!perms?.access && perms[action] === true;
    },
    [profile],
  );

  const canAccess = useCallback((moduleKey: string) => can(moduleKey, 'access'), [can]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        modules,
        token,
        refreshToken,
        login,
        logout,
        updateUser,
        refreshSession,
        can,
        canAccess,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
