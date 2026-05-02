import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ShieldX, Phone } from 'lucide-react';
import api from '../../../services/api';
import { Link } from 'react-router-dom';
import { alertConfirm, alertError, toastSuccess } from '../../../utils/alerts';

interface BlacklistEntry {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  reason: string | null;
  createdAt: string;
}

export const BlacklistManagementPage = () => {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await api.get('/blacklist');
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching blacklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await alertConfirm('Eliminar registro', '¿Estás seguro de eliminar este registro de la lista negra?');
    if (!confirm.isConfirmed) return;
    try {
      await api.delete(`/blacklist/${id}`);
      toastSuccess('Registro eliminado');
      fetchEntries();
    } catch (error: any) {
      console.error('Error deleting blacklist entry:', error);
      const msg = error.response?.data?.message || 'No se puede eliminar el registro.';
      alertError('Error al eliminar', msg);
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.phone.includes(searchTerm) ||
    (entry.reason && entry.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Lista Negra</h1>
        <Link
          to="/admin/lista-negra/nuevo"
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
        >
          <Plus size={20} /> Agregar Registro
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o motivo..."
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
                <th className="p-4 font-semibold text-gray-600">Nombre Completo</th>
                <th className="p-4 font-semibold text-gray-600">Teléfono</th>
                <th className="p-4 font-semibold text-gray-600">Motivo</th>
                <th className="p-4 font-semibold text-gray-600">Fecha Registro</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">Cargando...</td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No se encontraron registros</td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                        <ShieldX size={16} />
                      </div>
                      {entry.firstName} {entry.lastName}
                    </td>
                    <td className="p-4 text-gray-600">
                      <span className="flex items-center gap-1">
                        <Phone size={14} /> {entry.phone}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 text-sm max-w-xs truncate">
                      {entry.reason || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="p-4 text-gray-600 text-sm">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Link
                        to={`/admin/lista-negra/editar/${entry.id}`}
                        className="text-blue-500 hover:text-blue-700 inline-block"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        className="text-red-500 hover:text-red-700"
                        title="Eliminar"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 size={18} />
                      </button>
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
