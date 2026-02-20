import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Trash2, FileText, Download, Search, X } from 'lucide-react';
import { alertConfirm, alertError, toastSuccess } from '../../../utils/alerts';

interface File {
  id: string;
  originalName: string;
  fileName: string;
  path: string;
  size: number;
  description: string;
  createdAt: string;
}

export const FilesManagementPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await api.get('/files');
      const files = response.data;
      const withUrls = await Promise.all(
        files.map(async (f: any) => {
          try {
            const urlResp = await api.get(`/files/${f.id}/url`);
            return { ...f, path: urlResp.data.url };
          } catch {
            return f;
          }
        })
      );
      setFiles(withUrls);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await alertConfirm('Eliminar archivo', '¿Estás seguro de eliminar este archivo?');
    if (!confirm.isConfirmed) return;
    try {
      await api.delete(`/files/${id}`);
      toastSuccess('Archivo eliminado');
      fetchFiles();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      const msg = error.response?.data?.message || 'No se pudo eliminar el archivo.';
      alertError('Error al eliminar', msg);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (name: string) => {
    return name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  };

  // Filtrar archivos por término de búsqueda
  const filteredFiles = files.filter(file =>
    file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchInput('');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Archivos</h1>
        
        {/* Buscador */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar archivos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors w-64"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
          
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Resultados de búsqueda */}
      {searchTerm && (
        <div className="mb-4 text-sm text-gray-600">
          Mostrando {filteredFiles.length} de {files.length} archivos 
          {searchTerm && `para "${searchTerm}"`}
        </div>
      )}

      {loading ? (
        <div className="text-center p-8 text-gray-500">Cargando archivos...</div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl shadow-sm">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            {searchTerm ? 'No se encontraron archivos' : 'No hay archivos'}
          </h3>
          <p className="mt-2 text-gray-500">
            {searchTerm 
              ? 'Intenta con otro término de búsqueda' 
              : 'Los archivos subidos aparecerán aquí.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredFiles.map((file) => (
            <div key={file.id} className="bg-white rounded-xl shadow-sm overflow-hidden group hover:shadow-md transition">
              <div className="aspect-square bg-gray-100 relative flex items-center justify-center">
                {isImage(file.originalName) ? (
                  <img 
                    src={file.path} 
                    alt={file.originalName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText size={48} className="text-gray-400" />
                )}
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                  <a 
                    href={file.path} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600"
                    title="Ver/Descargar"
                  >
                    <Download size={20} />
                  </a>
                  <button 
                    onClick={() => handleDelete(file.id)}
                    className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                <p className="font-medium text-gray-800 truncate" title={file.originalName}>
                  {file.originalName}
                </p>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{formatSize(file.size)}</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
                {file.description && (
                  <p className="text-xs text-gray-400 mt-2 truncate">
                    {file.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};