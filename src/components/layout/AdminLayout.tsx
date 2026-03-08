import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  UserCircle
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export const AdminLayout = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

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
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
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
            <Home className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-lg text-gray-800">Bryan RealState</span>
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
              <div className={`absolute bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 ${
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
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};