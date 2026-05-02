import axios from 'axios';
import { toastError } from '../utils/alerts';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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
      | (typeof error.config & { _retry?: boolean })
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
      if (!didShowSessionExpiredToast) {
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
      if (!didShowSessionExpiredToast) {
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
          .post(refreshUrl, { refresh_token: storedRefreshToken })
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
      if (!didShowSessionExpiredToast) {
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
