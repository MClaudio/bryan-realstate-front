import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PermissionRoute } from './components/common/PermissionRoute';

// Public Pages
import { LoginPage } from './pages/public/LoginPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/public/ResetPasswordPage';

// Admin Pages
import { DashboardPage } from './pages/admin/DashboardPage';
import { PropertiesManagementPage } from './pages/admin/properties/PropertiesManagementPage';
import { PropertyFormPage } from './pages/admin/properties/PropertyFormPage';
import { PropertyViewPage } from './pages/admin/properties/PropertyViewPage';
// Legacy free-form processes: data kept in the DB, screen disabled for now.
// import { ProcessesPage } from './pages/admin/processes/ProcessesPage';
import { SaleProcessesPage } from './pages/admin/processes/SaleProcessesPage';
import { SaleProcessEditPage } from './pages/admin/processes/SaleProcessEditPage';
import { UsersManagementPage } from './pages/admin/users/UsersManagementPage';
import { UserFormPage } from './pages/admin/users/UserFormPage';
import { ClientsManagementPage } from './pages/admin/clients/ClientsManagementPage';
import { ClientFormPage } from './pages/admin/clients/ClientFormPage';
import { GoogleOAuthCallbackPage } from './pages/admin/clients/GoogleOAuthCallbackPage';
import { ConfigurationPage } from './pages/admin/configuration/ConfigurationPage';
import { FilesManagementPage } from './pages/admin/files/FilesManagementPage';
import { BlacklistManagementPage } from './pages/admin/blacklist/BlacklistManagementPage';
import { BlacklistFormPage } from './pages/admin/blacklist/BlacklistFormPage';
import { ProfilePage } from './pages/admin/ProfilePage';
import { NotificationsPage } from './pages/admin/NotificationsPage';
import { NoAccessPage } from './pages/admin/NoAccessPage';
import { ProfilesManagementPage } from './pages/admin/profiles/ProfilesManagementPage';
import { ProfileFormPage } from './pages/admin/profiles/ProfileFormPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Navigate to="/admin/login" replace />} />
              {/* <Route path="/propiedades" element={<PropertiesPage />} /> */}
              {/* <Route path="/propiedades/:id" element={<PropertyDetailPage />} /> */}
              {/* <Route path="/contacto" element={<ContactPage />} /> */}
            </Route>

            {/* Admin Auth Routes (no layout) */}
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/oauth/google/callback" element={<GoogleOAuthCallbackPage />} />

            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                {/* Dashboard: siempre accesible; la propia página se muestra bloqueada sin permiso */}
                <Route path="/admin/dashboard" element={<DashboardPage />} />
                <Route path="/admin/sin-acceso" element={<NoAccessPage />} />

                {/* Users Management Routes */}
                <Route element={<PermissionRoute module="users" />}>
                  <Route path="/admin/usuarios" element={<UsersManagementPage />} />
                  <Route element={<PermissionRoute module="users" action="create" />}>
                    <Route path="/admin/usuarios/nuevo" element={<UserFormPage />} />
                  </Route>
                  <Route element={<PermissionRoute module="users" action="edit" />}>
                    <Route path="/admin/usuarios/editar/:id" element={<UserFormPage />} />
                  </Route>
                </Route>

                {/* Profiles Routes */}
                <Route element={<PermissionRoute module="profiles" />}>
                  <Route path="/admin/perfiles" element={<ProfilesManagementPage />} />
                  <Route element={<PermissionRoute module="profiles" action="create" />}>
                    <Route path="/admin/perfiles/nuevo" element={<ProfileFormPage />} />
                  </Route>
                  <Route element={<PermissionRoute module="profiles" action="view" orActions={["edit"]} />}>
                    <Route path="/admin/perfiles/editar/:id" element={<ProfileFormPage />} />
                  </Route>
                </Route>

                {/* Clients Management Routes */}
                <Route element={<PermissionRoute module="clients" />}>
                  <Route path="/admin/clientes" element={<ClientsManagementPage />} />
                  <Route element={<PermissionRoute module="clients" action="create" />}>
                    <Route path="/admin/clientes/nuevo" element={<ClientFormPage />} />
                  </Route>
                  <Route element={<PermissionRoute module="clients" action="edit" />}>
                    <Route path="/admin/clientes/editar/:id" element={<ClientFormPage />} />
                  </Route>
                </Route>

                {/* Properties Management Routes */}
                <Route element={<PermissionRoute module="properties" />}>
                  <Route path="/admin/propiedades/gestion" element={<PropertiesManagementPage />} />
                  <Route element={<PermissionRoute module="properties" action="create" />}>
                    <Route path="/admin/propiedades/nueva" element={<PropertyFormPage />} />
                  </Route>
                  <Route element={<PermissionRoute module="properties" action="edit" />}>
                    <Route path="/admin/propiedades/editar/:id" element={<PropertyFormPage />} />
                  </Route>
                  <Route element={<PermissionRoute module="properties" action="view" orActions={["edit"]} />}>
                    <Route path="/admin/propiedades/ver/:id" element={<PropertyViewPage />} />
                  </Route>
                  {/* <Route path="/admin/propiedades/procesos/:propertyId" element={<ProcessesPage />} /> */}
                </Route>

                <Route element={<PermissionRoute module="processes" />}>
                  <Route path="/admin/procesos" element={<SaleProcessesPage />} />
                  <Route element={<PermissionRoute module="processes" action="view" orActions={["edit"]} />}>
                    <Route path="/admin/procesos/:propertyId" element={<SaleProcessEditPage />} />
                  </Route>
                </Route>

                <Route element={<PermissionRoute module="files" />}>
                  <Route path="/admin/archivos" element={<FilesManagementPage />} />
                </Route>
                <Route element={<PermissionRoute module="notifications" />}>
                  <Route path="/admin/notificaciones" element={<NotificationsPage />} />
                </Route>
                <Route element={<PermissionRoute module="configuration" />}>
                  <Route path="/admin/configuracion" element={<ConfigurationPage />} />
                </Route>

                {/* Blacklist Routes */}
                <Route element={<PermissionRoute module="blacklist" />}>
                  <Route path="/admin/lista-negra" element={<BlacklistManagementPage />} />
                  <Route element={<PermissionRoute module="blacklist" action="create" />}>
                    <Route path="/admin/lista-negra/nuevo" element={<BlacklistFormPage />} />
                  </Route>
                  <Route element={<PermissionRoute module="blacklist" action="edit" />}>
                    <Route path="/admin/lista-negra/editar/:id" element={<BlacklistFormPage />} />
                  </Route>
                </Route>

                {/* Profile Route */}
                <Route path="/admin/mi-perfil" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
