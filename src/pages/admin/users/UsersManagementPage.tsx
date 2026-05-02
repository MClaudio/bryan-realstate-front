import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, User, Shield, Briefcase } from 'lucide-react';
import api from '../../../services/api';
import { Link } from 'react-router-dom';
import { alertConfirm, alertError, toastSuccess } from '../../../utils/alerts';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  type: 'ADMIN' | 'ACCOUNTING' | 'EMPLOYEE';
  phone: string;
  ruc: string;
  isActive: boolean;
}

export const UsersManagementPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await alertConfirm('Desactivar usuario', '¿Estás seguro de desactivar este usuario? No podrá acceder al sistema.');
    if (!confirm.isConfirmed) return;
    try {
      await api.delete(`/users/${id}`);
      toastSuccess('Usuario desactivado');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      const msg = error.response?.data?.message || 'No se pudo desactivar el usuario.';
      alertError('Error al desactivar', msg);
    }
  };

  const filteredUsers = users.filter(user => 
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700';
      case 'ACCOUNTING': return 'bg-green-100 text-green-700';
      case 'EMPLOYEE': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
        <Link 
          to="/admin/usuarios/nuevo" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} /> Nuevo Usuario
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, usuario o email..." 
              className="w-full pl-10 p-2 border rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Usuario</th>
                <th className="p-4 font-semibold text-gray-600">Nombre Completo</th>
                <th className="p-4 font-semibold text-gray-600">Email</th>
                <th className="p-4 font-semibold text-gray-600">Rol</th>
                <th className="p-4 font-semibold text-gray-600">Estado</th>
                <th className="p-4 font-semibold text-gray-600">Teléfono</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">Cargando...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">No se encontraron usuarios</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 ${!user.isActive ? 'opacity-60 bg-gray-50' : ''}`}>
                    <td className="p-4 font-medium flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                        <User size={16} />
                      </div>
                      {user.username}
                    </td>
                    <td className="p-4">{user.firstName} {user.lastName}</td>
                    <td className="p-4 text-gray-600">{user.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${getTypeColor(user.type)}`}>
                        {user.type === 'ADMIN' && <Shield size={12} />}
                        {user.type === 'EMPLOYEE' && <Briefcase size={12} />}
                        {user.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{user.phone || '-'}</td>
                    <td className="p-4 text-right space-x-2">
                      <Link to={`/admin/usuarios/editar/${user.id}`} className="text-blue-500 hover:text-blue-700 inline-block" title="Editar">
                        <Edit size={18} />
                      </Link>
                      {user.isActive && (
                        <button 
                          className="text-red-500 hover:text-red-700" 
                          title="Desactivar"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 size={18} />
                        </button>
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
