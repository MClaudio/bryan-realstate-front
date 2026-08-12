import axios from 'axios';
import { toastError } from '../utils/alerts';

const DEFAULT_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes for large uploads

const ONE_MB = 1024 * 1024;
export const MAX_UPLOAD_MB = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * ONE_MB;

export const formatFileSizeMb = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  if (bytes < ONE_MB) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < ONE_MB * 1024) return `${(bytes / ONE_MB).toFixed(2)} MB`;
  return `${(bytes / (ONE_MB * 1024)).toFixed(2)} GB`;
};

export const humanizeAxiosError = (error: unknown): { title: string; message: string } => {
  const anyErr = error as
    | {
        code?: string;
        message?: string;
        response?: {
          status?: number;
          data?: { message?: string; error?: string };
        };
        request?: unknown;
      }
    | undefined;

  if (anyErr?.code === 'ECONNABORTED' || anyErr?.code === 'ETIMEDOUT') {
    return {
      title: 'Tiempo de espera agotado',
      message:
        'La subida tardó demasiado. Comprueba tu conexión o intenta con una imagen más pequeña.',
    };
  }

  const msg = anyErr?.response?.data?.message || anyErr?.response?.data?.error || anyErr?.message;
  if (typeof msg === 'string' && msg.trim().length > 0) {
    return {
      title: 'Error al subir el archivo',
      message: msg,
    };
  }

  const status = anyErr?.response?.status;
  if (status === 413) {
    return {
      title: 'Archivo demasiado grande',
      message: `El servidor rechazó el archivo por tamaño. El límite máximo es ${MAX_UPLOAD_MB} MB por imagen.`,
    };
  }
  if (status === 401 || status === 403) {
    return {
      title: 'Sesión inválida',
      message: 'No tienes permisos o tu sesión ha expirado. Recarga la página e inicia sesión de nuevo.',
    };
  }
  if (anyErr?.request && !anyErr?.response) {
    return {
      title: 'Error de conexión',
      message: 'No se pudo contactar con el servidor. Revisa tu red y vuelve a intentarlo.',
    };
  }

  return {
    title: 'Error al subir el archivo',
    message: 'Inténtalo nuevamente. Si el problema persiste contacta a soporte.',
  };
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: DEFAULT_TIMEOUT_MS,
});

const AUTH_ROUTES = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];
const LOGIN_ROUTE = '/admin/login';

export const navigation = {
  toLogin: () => window.location.assign(LOGIN_ROUTE),
};

const getStoredToken = () => localStorage.getItem('token') ?? sessionStorage.getItem('token');
const getStoredRefreshToken = () =>
  localStorage.getItem('refresh_token') ?? sessionStorage.getItem('refresh_token');

const clearStoredSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('user');
};

const setStoredTokens = (accessToken: string, refreshToken?: string) => {
  localStorage.setItem('token', accessToken);
  if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
};

let isRedirectingToLogin = false;
let didShowSessionExpiredToast = false;
let refreshPromise: Promise<{ accessToken: string; refreshToken?: string }> | null = null;

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Extend timeout for file upload endpoints (large payloads).
    const url = String(config.url ?? '');
    const method = String(config.method ?? '').toLowerCase();
    const isUpload =
      (url.includes('/files/upload') && (config.data instanceof FormData)) ||
      (method === 'post' && url.includes('/files'));
    if (isUpload) {
      config.timeout = config.timeout && config.timeout > UPLOAD_TIMEOUT_MS
        ? config.timeout
        : UPLOAD_TIMEOUT_MS;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config as
      | (typeof error.config & { _retry?: boolean; _silent?: boolean })
      | undefined;

    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = String(originalRequest.url ?? '');
    const isAuthRoute = AUTH_ROUTES.some((route) => requestUrl.includes(route));

    if (import.meta.env.DEV) {
      console.warn('[api] 401 detectado', { url: requestUrl, isAuthRoute });
    }

    if (isAuthRoute) {
      clearStoredSession();
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      if (import.meta.env.DEV) {
        console.warn('[api] 401 tras retry; cerrando sesión', { url: requestUrl });
      }
      clearStoredSession();
      if (!didShowSessionExpiredToast && !originalRequest._silent) {
        didShowSessionExpiredToast = true;
        toastError('Tu sesión ha expirado. Inicia sesión nuevamente.');
      }
      if (!isRedirectingToLogin && window.location.pathname !== LOGIN_ROUTE) {
        isRedirectingToLogin = true;
        navigation.toLogin();
      }
      return Promise.reject(error);
    }

    const storedRefreshToken = getStoredRefreshToken();
    if (!storedRefreshToken) {
      clearStoredSession();
      if (!didShowSessionExpiredToast && !originalRequest._silent) {
        didShowSessionExpiredToast = true;
        toastError('Tu sesión ha expirado. Inicia sesión nuevamente.');
      }
      if (!isRedirectingToLogin && window.location.pathname !== LOGIN_ROUTE) {
        isRedirectingToLogin = true;
        navigation.toLogin();
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        const refreshUrl = `${api.defaults.baseURL}/auth/refresh`;
        refreshPromise = axios
          .post(refreshUrl, { refresh_token: storedRefreshToken }, { timeout: DEFAULT_TIMEOUT_MS })
          .then((res) => {
            const accessToken = res.data?.access_token as string | undefined;
            const newRefreshToken = res.data?.refresh_token as string | undefined;
            if (!accessToken) {
              throw new Error('Refresh sin access_token');
            }
            setStoredTokens(accessToken, newRefreshToken);
            if (import.meta.env.DEV) {
              console.debug('[api] token renovado');
            }
            return { accessToken, refreshToken: newRefreshToken };
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const { accessToken } = await refreshPromise;
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api.request(originalRequest);
    } catch (refreshError) {
      if (import.meta.env.DEV) {
        console.warn('[api] refresh falló; cerrando sesión');
      }
      clearStoredSession();
      if (!didShowSessionExpiredToast && !originalRequest._silent) {
        didShowSessionExpiredToast = true;
        toastError('Tu sesión ha expirado. Inicia sesión nuevamente.');
      }
      if (!isRedirectingToLogin && window.location.pathname !== LOGIN_ROUTE) {
        isRedirectingToLogin = true;
        navigation.toLogin();
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
