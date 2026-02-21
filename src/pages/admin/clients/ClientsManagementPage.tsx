import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, User, Phone, Mail, Calendar } from 'lucide-react';
import api from '../../../services/api';
import { Link } from 'react-router-dom';
import { alertConfirm, alertError, toastSuccess } from '../../../utils/alerts';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  ruc: string | null;
  lastLogin: boolean;
  createdAt: string;
}

export const ClientsManagementPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await alertConfirm('Eliminar cliente', '¿Estás seguro de eliminar este cliente?');
    if (!confirm.isConfirmed) return;
    try {
      await api.delete(`/clients/${id}`);
      toastSuccess('Cliente eliminado');
      fetchClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      const msg = error.response?.data?.message || 'No se puede eliminar el cliente.';
      alertError('Error al eliminar', msg);
    }
  };

  const filteredClients = clients.filter(client => 
    client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    client.phone.includes(searchTerm)
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Clientes</h1>
        <Link 
          to="/admin/clientes/nuevo" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} /> Nuevo Cliente
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, email o teléfono..." 
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
                <th className="p-4 font-semibold text-gray-600">Contacto</th>
                <th className="p-4 font-semibold text-gray-600">RUC/CI</th>
                <th className="p-4 font-semibold text-gray-600">Fecha Registro</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">Cargando...</td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No se encontraron clientes</td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                        <User size={16} />
                      </div>
                      {client.firstName} {client.lastName}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col text-sm text-gray-600">
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} /> {client.email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Phone size={12} /> {client.phone}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{client.ruc || '-'}</td>
                    <td className="p-4 text-gray-600 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(client.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Link to={`/admin/clientes/editar/${client.id}`} className="text-blue-500 hover:text-blue-700 inline-block" title="Editar">
                        <Edit size={18} />
                      </Link>
                      <button 
                        className="text-red-500 hover:text-red-700" 
                        title="Eliminar"
                        onClick={() => handleDelete(client.id)}
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
