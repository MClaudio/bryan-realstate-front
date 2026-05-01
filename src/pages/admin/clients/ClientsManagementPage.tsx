import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, User, Phone, Mail, Calendar, RefreshCcw, X, ContactRound } from 'lucide-react';
import api from '../../../services/api';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { alertConfirm, alertError, toastSuccess } from '../../../utils/alerts';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  ruc: string | null;
  lastLogin: boolean;
  notes: string | null;
  interestDescription: string | null;
  googleContactId: string | null;
  createdAt: string;
}

interface GooglePreviewContact {
  candidateId: string;
  googleContactId: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  biography: string | null;
}

type GoogleContactSyncPayload = Omit<GooglePreviewContact, 'candidateId'>;
type GoogleContactExclusionPayload = Pick<GooglePreviewContact, 'candidateId' | 'googleContactId'>;

interface GooglePreviewResponse {
  contacts: GooglePreviewContact[];
  summary: {
    totalFromGoogle: number;
    candidates: number;
    skippedWithoutIdentifier: number;
    skippedWithoutPhone: number;
    skippedDuplicates: number;
    skippedExcluded: number;
  };
  lastSyncAt: string | null;
}

interface SyncResult {
  imported: number;
  duplicatesIgnored: number;
  excludedIgnored: number;
  invalidIgnored: number;
  exclusionsStored: number;
}

export const ClientsManagementPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authUrlLoading, setAuthUrlLoading] = useState(false);
  const [googleAuthUrl, setGoogleAuthUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [previewData, setPreviewData] = useState<GooglePreviewResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

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

  const openSyncModal = async () => {
    setSyncModalOpen(true);
    setSyncResult(null);
    await fetchPreview();
  };

  const openGoogleAuthModal = async () => {
    setAuthUrlLoading(true);
    try {
      const response = await api.get<{ authUrl: string }>('/sync/google-auth-url');
      setGoogleAuthUrl(response.data.authUrl);
      setAuthModalOpen(true);
    } catch (error: any) {
      console.error('Error loading Google auth URL:', error);
      const msg = error.response?.data?.message || 'No se pudo iniciar la autenticación con Google.';
      alertError('Error de autenticación', msg);
    } finally {
      setAuthUrlLoading(false);
    }
  };

  const fetchPreview = async () => {
    setPreviewLoading(true);
    try {
      const response = await api.get<GooglePreviewResponse>('/sync/google-preview');
      setPreviewData(response.data);
      setSelectedIds(new Set(response.data.contacts.map((contact) => contact.candidateId)));
    } catch (error: any) {
      console.error('Error loading google contacts preview:', error);
      const msg = error.response?.data?.message || 'No se pudo obtener la previsualización de Google Contacts.';

      if (String(msg).includes('Google no está conectado')) {
        setSyncModalOpen(false);
        await openGoogleAuthModal();
        return;
      }

      alertError('Error de sincronización', msg);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('google_connected') !== '1') return;

    params.delete('google_connected');
    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    );

    void openSyncModal();
  }, [location.pathname, location.search, navigate]);

  const toggleSelected = (candidateId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!previewData) return;
    setSelectedIds(new Set(previewData.contacts.map((contact) => contact.candidateId)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const confirmSync = async () => {
    if (!previewData) return;

    const selectedContacts: GoogleContactSyncPayload[] = previewData.contacts
      .filter((contact) => selectedIds.has(contact.candidateId))
      .map(({ candidateId: _candidateId, ...contact }) => contact);

    const excludedContacts: GoogleContactExclusionPayload[] = previewData.contacts
      .filter((contact) => !selectedIds.has(contact.candidateId))
      .map(({ candidateId, googleContactId }) => ({ candidateId, googleContactId }));

    setSyncing(true);
    try {
      const response = await api.post<SyncResult>('/sync/google-to-db', {
        selectedContacts,
        excludedContacts,
      });

      setSyncResult(response.data);
      toastSuccess('Sincronización completada');
      await Promise.all([fetchClients(), fetchPreview()]);
    } catch (error: any) {
      console.error('Error syncing google contacts:', error);
      const msg = error.response?.data?.message || 'No se pudo completar la sincronización.';
      alertError('Error de sincronización', msg);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Clientes</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={openSyncModal}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <RefreshCcw size={18} /> Sincronizar contactos
          </button>
          <Link 
            to="/admin/clientes/nuevo" 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} /> Nuevo Cliente
          </Link>
        </div>
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
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5">
                          {client.firstName} {client.lastName}
                          {client.googleContactId && (
                            <span title="Sincronizado con Google Contacts">
                              <ContactRound size={13} className="text-emerald-500 shrink-0" />
                            </span>
                          )}
                        </span>
                        {(client.notes || client.interestDescription) && (
                          <div className="flex gap-1 mt-1">
                            {client.notes && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded" title="Nota guardada">Nota</span>}
                            {client.interestDescription && <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded" title="Intereses guardados">Intereses</span>}
                          </div>
                        )}
                      </div>
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

      {syncModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Sincronizar contactos de Google</h2>
                <p className="text-sm text-gray-500">
                  Selecciona los contactos que deseas importar al sistema.
                </p>
              </div>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setSyncModalOpen(false)}
                title="Cerrar"
              >
                <X size={22} />
              </button>
            </div>

            <div className="px-6 p-4 border-b bg-gray-50">
              {previewLoading ? (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <svg className="animate-spin h-4 w-4 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Cargando previsualización desde Google...
                </div>
              ) : previewData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                  <span>Total Google: <strong>{previewData.summary.totalFromGoogle}</strong></span>
                  <span>Candidatos: <strong>{previewData.summary.candidates}</strong></span>
                  <span>Duplicados ignorados: <strong>{previewData.summary.skippedDuplicates}</strong></span>
                  <span>Sin identificador: <strong>{previewData.summary.skippedWithoutIdentifier}</strong></span>
                  <span>Sin teléfono: <strong>{previewData.summary.skippedWithoutPhone}</strong></span>
                  <span>Excluidos previos: <strong>{previewData.summary.skippedExcluded}</strong></span>
                  <span>
                    Última sincronización:{' '}
                    <strong>
                      {previewData.lastSyncAt
                        ? new Date(previewData.lastSyncAt).toLocaleString()
                        : 'No disponible'}
                    </strong>
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-600">Sin datos para mostrar.</p>
              )}
            </div>

            <div className="px-6 py-3 border-b flex flex-wrap items-center gap-3">
              <button
                onClick={selectAll}
                disabled={!previewData || previewData.contacts.length === 0}
                className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Seleccionar todo
              </button>
              <button
                onClick={deselectAll}
                disabled={!previewData || previewData.contacts.length === 0}
                className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Deseleccionar todo
              </button>
              <button
                onClick={fetchPreview}
                disabled={previewLoading}
                className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Actualizar previsualización
              </button>
              <span className="text-sm text-gray-600">
                Seleccionados: <strong>{selectedIds.size}</strong>
              </span>
            </div>

            <div className="overflow-auto px-6 pb-4 flex-1">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
                  <svg className="animate-spin h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span className="text-sm">Obteniendo contactos de Google...</span>
                </div>
              ) : !previewData || previewData.contacts.length === 0 ? (
                <div className="text-center text-gray-500 py-10">No hay contactos candidatos para importar.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 w-12">Sel.</th>
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Teléfono</th>
                      <th className="p-3">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.contacts.map((contact) => (
                      <tr key={contact.candidateId} className="hover:bg-gray-50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(contact.candidateId)}
                            onChange={() => toggleSelected(contact.candidateId)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="p-3">{contact.fullName || `${contact.firstName} ${contact.lastName}`.trim()}</td>
                        <td className="p-3">{contact.email || '-'}</td>
                        <td className="p-3">{contact.phone || '-'}</td>
                        <td className="p-3 max-w-xs">
                          {contact.biography ? (
                            <span className="text-gray-500 text-xs line-clamp-2" title={contact.biography}>
                              {contact.biography}
                            </span>
                          ) : <span className="text-gray-300">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {syncResult && (
              <div className="px-6 py-3 border-t bg-emerald-50 text-sm text-emerald-800">
                Importados: <strong>{syncResult.imported}</strong> | Duplicados ignorados:{' '}
                <strong>{syncResult.duplicatesIgnored}</strong> | Excluidos ignorados:{' '}
                <strong>{syncResult.excludedIgnored}</strong> | Excluidos guardados:{' '}
                <strong>{syncResult.exclusionsStored}</strong>
              </div>
            )}

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setSyncModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cerrar
              </button>
              <button
                onClick={confirmSync}
                disabled={syncing || !previewData || previewData.contacts.length === 0}
                className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300"
              >
                {syncing ? 'Sincronizando...' : 'Confirmar sincronización'}
              </button>
            </div>
          </div>
        </div>
      )}

      {authModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Conectar Google Contacts</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setAuthModalOpen(false)}
                title="Cerrar"
              >
                <X size={22} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3 text-sm text-gray-700">
              <p>
                Tu cuenta aún no está autenticada con Google. Debes autorizar acceso a contactos
                para continuar con la sincronización.
              </p>
              <p className="text-gray-500">
                Al autorizar, volverás automáticamente al sistema.
              </p>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setAuthModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                onClick={() => window.location.assign(googleAuthUrl)}
                disabled={authUrlLoading || !googleAuthUrl}
                className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300"
              >
                {authUrlLoading ? 'Preparando...' : 'Autenticar con Google'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
