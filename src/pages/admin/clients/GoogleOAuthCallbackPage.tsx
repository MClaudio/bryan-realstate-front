import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { alertError, toastSuccess } from '../../../utils/alerts';

export const GoogleOAuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        alertError('Autenticación cancelada', 'No se concedieron permisos de Google Contacts.');
        navigate('/admin/clientes', { replace: true });
        return;
      }

      if (!code) {
        alertError('Error de autenticación', 'No se recibió el código de autorización de Google.');
        navigate('/admin/clientes', { replace: true });
        return;
      }

      try {
        await api.post('/sync/google-auth-callback', { code });
        toastSuccess('Google Contacts conectado correctamente');
        navigate('/admin/clientes?google_connected=1', { replace: true });
      } catch (requestError: any) {
        const message =
          requestError.response?.data?.message ||
          'No se pudo completar la autenticación con Google Contacts.';

        alertError('Error de autenticación', message);
        navigate('/admin/clientes', { replace: true });
      }
    };

    void handleGoogleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-md rounded-xl p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Conectando Google Contacts</h1>
        <p className="text-gray-600 text-sm">Estamos procesando la autorización, espera un momento...</p>
      </div>
    </div>
  );
};
