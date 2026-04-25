import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Public Pages
import { LoginPage } from './pages/public/LoginPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/public/ResetPasswordPage';

// Admin Pages
import { DashboardPage } from './pages/admin/DashboardPage';
import { PropertiesManagementPage } from './pages/admin/properties/PropertiesManagementPage';
import { PropertyFormPage } from './pages/admin/properties/PropertyFormPage';
import { PropertyViewPage } from './pages/admin/properties/PropertyViewPage';
import { ProcessesPage } from './pages/admin/processes/ProcessesPage';
import { UsersManagementPage } from './pages/admin/users/UsersManagementPage';
import { UserFormPage } from './pages/admin/users/UserFormPage';
import { ClientsManagementPage } from './pages/admin/clients/ClientsManagementPage';
import { ClientFormPage } from './pages/admin/clients/ClientFormPage';
import { ConfigurationPage } from './pages/admin/configuration/ConfigurationPage';
import { FilesManagementPage } from './pages/admin/files/FilesManagementPage';
import { BlacklistManagementPage } from './pages/admin/blacklist/BlacklistManagementPage';
import { BlacklistFormPage } from './pages/admin/blacklist/BlacklistFormPage';
import { ProfilePage } from './pages/admin/ProfilePage';

function App() {
  return (
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

          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<DashboardPage />} />
              
              {/* Users Management Routes */}
              <Route path="/admin/usuarios" element={<UsersManagementPage />} />
              <Route path="/admin/usuarios/nuevo" element={<UserFormPage />} />
              <Route path="/admin/usuarios/editar/:id" element={<UserFormPage />} />

              {/* Clients Management Routes */}
              <Route path="/admin/clientes" element={<ClientsManagementPage />} />
              <Route path="/admin/clientes/nuevo" element={<ClientFormPage />} />
              <Route path="/admin/clientes/editar/:id" element={<ClientFormPage />} />
              
              {/* Properties Management Routes */}
              <Route path="/admin/propiedades/gestion" element={<PropertiesManagementPage />} />
              <Route path="/admin/propiedades/nueva" element={<PropertyFormPage />} />
              <Route path="/admin/propiedades/editar/:id" element={<PropertyFormPage />} />
              <Route path="/admin/propiedades/ver/:id" element={<PropertyViewPage />} />
              <Route path="/admin/propiedades/procesos/:propertyId" element={<ProcessesPage />} />
              
              <Route path="/admin/archivos" element={<FilesManagementPage />} />
              <Route path="/admin/configuracion" element={<ConfigurationPage />} />

              {/* Blacklist Routes */}
              <Route path="/admin/lista-negra" element={<BlacklistManagementPage />} />
              <Route path="/admin/lista-negra/nuevo" element={<BlacklistFormPage />} />
              <Route path="/admin/lista-negra/editar/:id" element={<BlacklistFormPage />} />

              {/* Profile Route */}
              <Route path="/admin/mi-perfil" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
