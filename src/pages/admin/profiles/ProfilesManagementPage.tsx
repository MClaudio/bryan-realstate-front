import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, ShieldCheck, Lock } from 'lucide-react';
import api from '../../../services/api';
import { alertConfirm, alertError, toastSuccess } from '../../../utils/alerts';
import { Can } from '../../../components/common/Can';
import type { Profile } from '../../../types/permissions';

export const ProfilesManagementPage = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProfiles = async () => {
    try {
      const response = await api.get('/profiles');
      setProfiles(response.data);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleDelete = async (profile: Profile) => {
    const confirm = await alertConfirm('Eliminar perfil', `¿Eliminar el perfil "${profile.name}"?`);
    if (!confirm.isConfirmed) return;
    try {
      await api.delete(`/profiles/${profile.id}`);
      toastSuccess('Perfil eliminado');
      fetchProfiles();
    } catch (error: any) {
      alertError('Error al eliminar', error.response?.data?.message || 'No se pudo eliminar el perfil.');
    }
  };

  const filtered = profiles.filter((p) =>
    `${p.name} ${p.description ?? ''}`.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const countModules = (p: Profile) =>
    p.isSystem && p.name === 'ADMIN'
      ? 'Todos'
      : Object.values(p.permissions ?? {}).filter((m) => m.access).length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Perfiles de Acceso</h1>
        <Can module="profiles" action="create">
          <Link
            to="/admin/perfiles/nuevo"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} /> Nuevo Perfil
          </Link>
        </Can>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar perfil..."
              className="w-full pl-10 p-2 border rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Perfil</th>
                <th className="p-4 font-semibold text-gray-600">Descripción</th>
                <th className="p-4 font-semibold text-gray-600">Módulos con acceso</th>
                <th className="p-4 font-semibold text-gray-600">Usuarios</th>
                <th className="p-4 font-semibold text-gray-600">Estado</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No se encontraron perfiles</td></tr>
              ) : (
                filtered.map((profile) => (
                  <tr key={profile.id} className={`hover:bg-gray-50 ${!profile.isActive ? 'opacity-60' : ''}`}>
                    <td className="p-4 font-medium">
                      <span className="flex items-center gap-2">
                        <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700">
                          <ShieldCheck size={16} />
                        </span>
                        {profile.name}
                        {profile.isSystem && (
                          <span title="Perfil de sistema" className="text-gray-400"><Lock size={14} /></span>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{profile.description || '-'}</td>
                    <td className="p-4 text-gray-600">{countModules(profile)}</td>
                    <td className="p-4 text-gray-600">{profile._count?.users ?? 0}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        profile.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {profile.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Can module="profiles" action="view" orActions={["edit"]}>
                        <Link
                          to={`/admin/perfiles/editar/${profile.id}`}
                          className="text-blue-500 hover:text-blue-700 inline-block"
                          title={profile.isSystem ? 'Ver' : 'Editar'}
                        >
                          <Edit size={18} />
                        </Link>
                      </Can>
                      {!profile.isSystem && (
                        <Can module="profiles" action="delete">
                          <button
                            className="text-red-500 hover:text-red-700"
                            title="Eliminar"
                            onClick={() => handleDelete(profile)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </Can>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
