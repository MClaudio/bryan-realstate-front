import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { PropertiesPage } from './pages/public/PropertiesPage';
import { ContactPage } from './pages/public/ContactPage';
import { LoginPage } from './pages/public/LoginPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/public/ResetPasswordPage';
import { PropertyDetailPage } from './pages/public/PropertyDetailPage';

// Admin Pages
import { DashboardPage } from './pages/admin/DashboardPage';
import { PropertiesManagementPage } from './pages/admin/properties/PropertiesManagementPage';
import { PropertyFormPage } from './pages/admin/properties/PropertyFormPage';
import { PropertyViewPage } from './pages/admin/properties/PropertyViewPage';
import { UsersManagementPage } from './pages/admin/users/UsersManagementPage';
import { UserFormPage } from './pages/admin/users/UserFormPage';
import { ClientsManagementPage } from './pages/admin/clients/ClientsManagementPage';
import { ClientFormPage } from './pages/admin/clients/ClientFormPage';
import { ConfigurationPage } from './pages/admin/configuration/ConfigurationPage';
import { FilesManagementPage } from './pages/admin/files/FilesManagementPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            {/* <Route path="/" element={<HomePage />} />
            <Route path="/propiedades" element={<PropertiesPage />} />
            <Route path="/propiedades/:id" element={<PropertyDetailPage />} />
            <Route path="/contacto" element={<ContactPage />} /> */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Users Management Routes */}
              <Route path="/usuarios" element={<UsersManagementPage />} />
              <Route path="/usuarios/nuevo" element={<UserFormPage />} />
              <Route path="/usuarios/editar/:id" element={<UserFormPage />} />

              {/* Clients Management Routes */}
              <Route path="/clientes" element={<ClientsManagementPage />} />
              <Route path="/clientes/nuevo" element={<ClientFormPage />} />
              <Route path="/clientes/editar/:id" element={<ClientFormPage />} />
              
              {/* Properties Management Routes */}
              <Route path="/propiedades/gestion" element={<PropertiesManagementPage />} />
              <Route path="/propiedades/nueva" element={<PropertyFormPage />} />
              <Route path="/propiedades/editar/:id" element={<PropertyFormPage />} />
              <Route path="/propiedades/ver/:id" element={<PropertyViewPage />} />
              
              <Route path="/archivos" element={<FilesManagementPage />} />
              <Route path="/configuracion" element={<ConfigurationPage />} />
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
