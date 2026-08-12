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

/**
 * Base URL del backend API.
 *
 * REGLA: Siempre que sea posible usamos rutas relativas (empiezan por `/api` o `/uploads`)
 * para que NUNCA dependamos de un hostname/dominio externo que pueda fallar por
 * resolución DNS (el típico error `net::ERR_NAME_NOT_RESOLVED` en producción tras un deploy).
 *
 * - Producción (Nginx): `/api` y `/uploads` se sirven por `location ^~ /api/` y `/uploads/`
 *   del propio nginx.conf → reverse proxy al contenedor NestJS.
 * - Desarrollo (vite dev server): `/api` y `/uploads` se sirven por el `server.proxy` de
 *   vite.config.ts → reverse proxy a `http://localhost:3000`.
 * - Solo si el usuario define explícitamente `VITE_API_URL` con un dominio distinto
 *   (ej: un backend público separado del frontend) se usa ese valor.
 */
const DEFAULT_API_BASE = '/api';
const ENV_API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const API_BASE = ENV_API_BASE && ENV_API_BASE.length > 0 ? ENV_API_BASE : DEFAULT_API_BASE;

// Garantizamos que no termine en `/` para no generar rutas con `//`.
const normalizedBase = API_BASE.replace(/\/+$/, '');

export const getApiBaseUrl = (): string => normalizedBase;

/** Resuelve una URL que empiece por `/uploads/...` contra la base correcta. */
export const resolveAssetUrl = (relativePath: string): string => {
  if (!relativePath || typeof relativePath !== 'string') return relativePath ?? '';
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  // Si la ruta empieza por `/uploads/...` y la API base es un dominio completo,
  // resolvemos contra ese mismo dominio (backend hostea uploads desde la misma raíz).
  if (relativePath.startsWith('/uploads/') && /^https?:\/\//i.test(normalizedBase)) {
    try {
      const u = new URL(normalizedBase);
      return `${u.protocol}//${u.host}${relativePath}`;
    } catch {
      /* noop */
    }
  }
  return relativePath;
};

/**
 * Resuelve la URL para un endpoint público de archivos del backend.
 *
 * IMPORTANTE: el backend tiene `setGlobalPrefix('api')`, así que
 * `PublicFilesController` se sirve en `/api/public/files/{id}`, NO en
 * `/public/files/{id}`.
 *
 * - Si la API base es relativa (por defecto `/api`): devolvemos
 *   `/api/public/files/{id}`.
 * - Si la API base es un dominio completo (VITE_API_URL=https://backend.example.com/api):
 *   construye `https://backend.example.com/api/public/files/{id}`.
 */
export const resolvePublicFileUrl = (fileId: string | null | undefined): string => {
  if (!fileId) return '';
  const rawId = String(fileId).trim();
  if (!rawId) return '';
  if (/^https?:\/\//i.test(normalizedBase)) {
    try {
      const u = new URL(normalizedBase);
      // Asegurar que el path termine con /api/public/files/:id
      const basePath = u.pathname.replace(/\/$/, '') || '/api';
      return `${u.protocol}//${u.host}${basePath}/public/files/${encodeURIComponent(rawId)}`;
    } catch {
      /* noop */
    }
  }
  return `/api/public/files/${encodeURIComponent(rawId)}`;
};

/**
 * Resuelve inteligentemente la URL de un archivo a partir de su objeto `file`
 * (estructura típica del backend: `{ id, path, originalName, ... }`).
 *
 * El backend NO garantiza que `file.path` sea siempre una URL S3 absoluta:
 * - A veces devuelve la URL presignada de Amazon completa (https://...s3.amazonaws.com/...).
 * - A veces devuelve el path relativo crudo de la DB (`uploads/uuid.ext` o `/uploads/uuid.ext`).
 * - En local dev puede ser también `/uploads/uuid.ext` servido estáticamente.
 *
 * Esta función:
 * 1. Si `file.path` YA es una URL absoluta (http/https) → la usa directamente (mejor perf, sin redirect).
 * 2. Si `file.path` es relativo o desconocido, pero tenemos `file.id` → usa `/public/files/{id}` que
 *    hace un 302 redirect en el backend a la URL S3 presignada.
 * 3. Fallback: devuelve `resolveAssetUrl(file.path)` por si acaso el path es `/uploads/...` local.
 */
export const resolveFileUrl = (
  file: { id?: string | number | null; path?: string | null } | null | undefined,
): string => {
  if (!file) return '';
  const p = typeof file.path === 'string' ? file.path.trim() : '';
  // Caso 1: URL absoluta (S3 presignada). La usamos directamente, sin roundtrip extra.
  if (/^https?:\/\//i.test(p)) return p;
  // Caso 2: tenemos id, mejor pasar por el controller /public/files/:id que hace redirect a S3
  // (o sirve el archivo local si no hay S3).
  if (file.id !== null && file.id !== undefined && String(file.id).trim() !== '') {
    return resolvePublicFileUrl(String(file.id));
  }
  // Caso 3: sin id pero con path relativo (ej: `/uploads/...` local).
  if (p) return resolveAssetUrl(p);
  return '';
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
  baseURL: normalizedBase,
  timeout: DEFAULT_TIMEOUT_MS,
  // Allow unlimited body sizes for large file uploads. Browser enforces
  // network-level limits, but axios historically had restrictive defaults.
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  // Signal upload progress reliably even when the connection is slow.
  transitional: {
    silentJSONParsing: true,
    forcedJSONParsing: true,
    clarifyTimeoutError: true,
  },
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
