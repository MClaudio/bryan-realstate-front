import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const NoAccessPage = () => {
  const { canAccess, modules } = useAuth();
  const firstAllowed = modules.find((m) => m.inMenu && canAccess(m.key));

  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-4">
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <ShieldAlert className="w-10 h-10 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">No tienes acceso</h1>
      <p className="text-gray-600 max-w-md mb-6">
        Tu perfil no tiene permisos para ver esta sección. Si crees que es un error, contacta al administrador.
      </p>
      {firstAllowed && (
        <Link
          to={firstAllowed.path}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Ir a {firstAllowed.label}
        </Link>
      )}
    </div>
  );
};
