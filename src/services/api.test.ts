import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('api interceptor (401)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/admin/dashboard');
    vi.restoreAllMocks();
  });

  it('renueva token con refresh y reintenta la request original', async () => {
    vi.resetModules();
    vi.doMock('../utils/alerts', () => ({ toastError: vi.fn() }));

    const { default: api, navigation } = await import('./api');

    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('refresh_token', 'refresh-1');

    const mockApi = new MockAdapter(api);
    const mockAxios = new MockAdapter(axios);

    mockApi.onGet('/protected').replyOnce(401);
    mockAxios.onPost(/\/api\/auth\/refresh$/).replyOnce(200, {
      access_token: 'new-access',
      refresh_token: 'refresh-2',
    });
    mockApi.onGet('/protected').replyOnce(200, { ok: true });

    const res = await api.get('/protected');

    expect(res.data).toEqual({ ok: true });
    expect(localStorage.getItem('token')).toBe('new-access');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-2');

    mockApi.restore();
    mockAxios.restore();
  });

  it('si el refresh falla, limpia storage y redirige a login', async () => {
    vi.resetModules();
    vi.doMock('../utils/alerts', () => ({ toastError: vi.fn() }));

    const { default: api, navigation } = await import('./api');
    const alerts = await import('../utils/alerts');

    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('refresh_token', 'refresh-1');
    localStorage.setItem('user', JSON.stringify({ id: '1' }));

    const toLoginMock = vi.fn();
    navigation.toLogin = toLoginMock;

    const mockApi = new MockAdapter(api);
    const mockAxios = new MockAdapter(axios);

    mockApi.onGet('/protected').replyOnce(401);
    mockAxios.onPost(/\/api\/auth\/refresh$/).replyOnce(401, { message: 'expired' });

    await expect(api.get('/protected')).rejects.toBeTruthy();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(alerts.toastError).toHaveBeenCalledTimes(1);
    expect(toLoginMock).toHaveBeenCalledTimes(1);

    mockApi.restore();
    mockAxios.restore();
  });

  it('no intenta refresh en rutas de auth (evita loops)', async () => {
    vi.resetModules();
    vi.doMock('../utils/alerts', () => ({ toastError: vi.fn() }));

    const { default: api, navigation } = await import('./api');

    localStorage.setItem('token', 'any');
    localStorage.setItem('refresh_token', 'refresh-1');
    localStorage.setItem('user', JSON.stringify({ id: '1' }));

    const toLoginMock = vi.fn();
    navigation.toLogin = toLoginMock;

    const mockApi = new MockAdapter(api);
    const mockAxios = new MockAdapter(axios);

    mockApi.onPost('/auth/login').replyOnce(401, { message: 'Credenciales inválidas' });

    await expect(api.post('/auth/login', { username: 'x', password: 'y' })).rejects.toBeTruthy();

    expect(toLoginMock).not.toHaveBeenCalled();
    expect(mockAxios.history.post.length).toBe(0);

    mockApi.restore();
    mockAxios.restore();
  });
});
