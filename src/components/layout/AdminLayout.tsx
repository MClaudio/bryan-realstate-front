import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  UserCheck, 
  FolderOpen, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Home,
  ShieldX,
  UserCircle,
  ExternalLink,
  Sun,
  Moon,
  Monitor,
  Check,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { io, type Socket } from 'socket.io-client';

interface AppConfig {
  businessName: string | null;
  logo?: { id: string; path: string } | null;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  path?: string | null;
  isRead: boolean;
  createdAt: string;
}

export const AdminLayout = () => {
  const { logout, user, token } = useAuth();
  const { theme, resolvedTheme, setTheme, themeClass } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingUnread, setLoadingUnread] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const fetchUnreadNotifications = async () => {
    try {
      setLoadingUnread(true);
      const res = await api.get('/notifications?unreadOnly=true&limit=20');
      const items = Array.isArray(res.data) ? (res.data as NotificationItem[]) : [];
      setUnreadNotifications(items);
      setUnreadCount(items.length);
    } catch {
      // non-critical
    } finally {
      setLoadingUnread(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setUnreadNotifications((prev) => prev.filter((item) => item.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // non-critical
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    await markNotificationAsRead(notification.id);
    setNotificationsOpen(false);

    if (notification.path) {
      navigate(`${notification.path}?notificationId=${notification.id}`);
    }
  };

  const openNotifications = async () => {
    setNotificationsOpen(true);
    await fetchUnreadNotifications();
  };

  useEffect(() => {
    if (!token) return;

    const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
    const socketBaseUrl = String(apiBase).replace(/\/api\/?$/, '');

    const socket: Socket = io(`${socketBaseUrl}/notifications`, {
      transports: ['websocket'],
      auth: {
        token,
      },
    });

    socket.on('notification.created', async (notification: NotificationItem) => {
      window.dispatchEvent(
        new CustomEvent('app:notification', { detail: notification }),
      );

      setUnreadNotifications((prev) => [notification, ...prev].slice(0, 20));
      setUnreadCount((prev) => prev + 1);

      const result = await Swal.fire({
        title: notification?.title || 'Nueva notificación',
        text: notification?.message || '',
        icon: 'info',
        toast: true,
        position: 'top-end',
        timer: 10000,
        timerProgressBar: true,
        showConfirmButton: !!notification?.path,
        confirmButtonText: 'Ver',
        showCloseButton: true,
      });

      if (result.isConfirmed && notification?.path) {
        await markNotificationAsRead(notification.id);
        const target = notification?.id
          ? `${notification.path}?notificationId=${notification.id}`
          : notification.path;
        navigate(target);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [navigate, token]);

  // Fetch company configuration once on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/configuration');
        const config: AppConfig = res.data;
        setAppConfig(config);
        if (config?.logo?.id) {
          const urlRes = await api.get(`/files/${config.logo.id}/url`);
          setLogoUrl(urlRes.data.url ?? null);
        }
      } catch {
        // Non-critical — keep defaults
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchUnreadNotifications();
  }, [token]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // En desktop, abrir sidebar por defecto, en mobile cerrado
      if (!mobile && window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Manejar clics fuera del menú de usuario
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    };

    if (userMenuOpen || themeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen, themeMenuOpen]);

  // Cerrar menú al cambiar de ruta - handled by click-outside listener

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/usuarios', icon: Users, label: 'Usuarios', allowed: ['ADMIN'] },
    { path: '/admin/clientes', icon: UserCheck, label: 'Clientes' },
    { path: '/admin/propiedades/gestion', icon: Building2, label: 'Propiedades' },
    { path: '/admin/archivos', icon: FolderOpen, label: 'Archivos' },
    { path: '/admin/lista-negra', icon: ShieldX, label: 'Lista Negra' },
    { path: '/admin/configuracion', icon: Settings, label: 'Configuración' },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.allowed || item.allowed.includes(user?.type as string)
  );

  return (
    <div className={`flex h-screen bg-gray-50 ${themeClass}`}>
      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Notifications Overlay */}
      {notificationsOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setNotificationsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${
          isMobile 
            ? `fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : `${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300`
        }
        bg-white border-r border-gray-200 flex flex-col
      `}>
        {/* Logo and Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Link to="/admin/dashboard" className={`flex items-center gap-2 ${!isSidebarOpen && !isMobile ? 'hidden' : 'flex'}`}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-8 h-8 object-contain rounded"
              />
            ) : (
              <Home className="w-6 h-6 text-blue-600" />
            )}
            <span className="font-bold text-lg text-gray-800 truncate">
              {appConfig?.businessName || 'Bryan Realstate'}
            </span>
          </Link>
          {/* Botón toggle solo visible en desktop */}
          {!isMobile && (
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isSidebarOpen ? 'Contraer' : 'Expandir'}
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {filteredMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => isMobile && setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className={`${!isSidebarOpen && !isMobile ? 'hidden' : 'block'}`}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`flex items-center w-full p-3 hover:bg-gray-50 rounded-lg transition-colors ${
                !isSidebarOpen && !isMobile ? 'justify-center' : 'gap-3'
              }`}
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold shrink-0">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div className={`text-left flex-1 min-w-0 ${!isSidebarOpen && !isMobile ? 'hidden' : 'block'}`}>
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.type?.toLowerCase()}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 ${!isSidebarOpen && !isMobile ? 'hidden' : 'block'}`} />
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <div className={`dropdown-panel absolute bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 ${
                !isSidebarOpen && !isMobile
                  ? 'bottom-0 left-full ml-2 w-48'
                  : 'bottom-full left-0 right-0 mb-2'
              }`}>
                <Link
                  to="/admin/mi-perfil"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <UserCircle className="w-4 h-4 shrink-0" />
                  <span>Mi Perfil</span>
                </Link>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Botón hamburguesa solo en mobile */}
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl font-semibold text-gray-800 capitalize">
              {location.pathname.split('/').filter(Boolean).pop()?.replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative" ref={themeMenuRef}>
              <button
                onClick={() => setThemeMenuOpen((prev) => !prev)}
                className="relative p-2 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-white/5 group"
                title={
                  theme === 'system'
                    ? `Tema del sistema (${resolvedTheme === 'dark' ? 'oscuro' : 'claro'})`
                    : theme === 'dark'
                      ? 'Modo oscuro'
                      : 'Modo claro'
                }
                aria-label="Cambiar tema"
              >
                {resolvedTheme === 'dark' ? (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-200 group-hover:text-amber-500 transition-colors" />
                )}
                {theme === 'system' && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[8px] leading-3.5 flex items-center justify-center font-bold shadow">
                    A
                  </span>
                )}
              </button>
              {themeMenuOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-surface-elevated shadow-xl overflow-hidden">
                  <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-gray-500 dark:text-ink-subtle border-b border-gray-100 dark:border-white/5">
                    Aspecto
                  </div>
                  {([
                    { mode: 'light', label: 'Claro', Icon: Sun },
                    { mode: 'dark', label: 'Oscuro', Icon: Moon },
                    { mode: 'system', label: 'Sistema', Icon: Monitor },
                  ] as const).map(({ mode, label, Icon }) => {
                    const active = theme === mode;
                    return (
                      <button
                        key={mode}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setTheme(mode);
                          setThemeMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                          active
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                            : 'text-gray-700 hover:bg-gray-50 dark:text-ink dark:hover:bg-white/5'
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            active
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/25 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-ink-muted'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="flex-1 text-left font-medium">
                          {label}
                        </span>
                        {active && (
                          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={openNotifications}
              className="relative p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-200" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] leading-5 font-bold text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Notifications Sidebar */}
      <aside
        className={`dropdown-panel fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white border-l border-gray-200 shadow-2xl z-50 transform transition-transform duration-300 ${
          notificationsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-16 px-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Notificaciones</h3>
            <p className="text-xs text-gray-500">No leídas</p>
          </div>
          <button
            onClick={() => setNotificationsOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <button
            onClick={() => {
              setNotificationsOpen(false);
              navigate('/admin/notificaciones');
            }}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="w-4 h-4" /> Ver todo
          </button>
        </div>

        <div className="h-[calc(100%-8.5rem)] overflow-y-auto p-4 space-y-3">
          {loadingUnread ? (
            <p className="text-sm text-gray-500">Cargando notificaciones...</p>
          ) : unreadNotifications.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-500 border border-dashed rounded-lg">
              No tienes notificaciones no leídas.
            </div>
          ) : (
            unreadNotifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="w-full text-left rounded-xl border border-gray-200 bg-blue-50/40 hover:bg-blue-50 p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{notification.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  </div>
                  <span className="mt-1 inline-block w-2.5 h-2.5 rounded-full bg-blue-600" />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(notification.createdAt).toLocaleString('es-EC')}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};