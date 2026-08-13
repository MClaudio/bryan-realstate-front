import { useState, useEffect } from 'react';
import api, { resolveFileUrl } from '../../../services/api';
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
      // /files endpoint NOW RETURNS ENRICHED URLs (S3 presigned or placeholder)
      // via backend `enrichFile()`. No need for 2nd call `/files/:id/url`.
      setFiles(files);
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
                    src={resolveFileUrl(file)} 
                    alt={file.originalName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileText size={48} className="text-gray-400" />
                )}
                
                <div className="absolute inset-0 bg-black/50 opacity-0 md:group-hover:opacity-100 transition hidden md:flex items-center justify-center gap-5 pointer-events-none">
                  <a
                    href={resolveFileUrl(file)}
                    target="_blank"
                    rel="noreferrer"
                    title="Ver/Descargar"
                    aria-label="Ver o descargar archivo"
                    pointer-events="auto"
                    className="flex flex-none items-center justify-center !h-12 !w-12 p-0 m-0 border-0 !rounded-full bg-white text-gray-700 hover:text-blue-600 shadow-md transition-colors"
                    style={{ aspectRatio: '1 / 1' }}
                  >
                    <Download size={22} strokeWidth={2.25} className="block" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(file.id)}
                    title="Eliminar"
                    aria-label="Eliminar archivo"
                    pointer-events="auto"
                    className="flex flex-none items-center justify-center !h-12 !w-12 p-0 m-0 border-0 !rounded-full bg-white text-gray-700 hover:text-red-600 shadow-md transition-colors"
                    style={{ aspectRatio: '1 / 1' }}
                  >
                    <Trash2 size={22} strokeWidth={2.25} className="block" />
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
                <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
                  <a
                    href={resolveFileUrl(file)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg active:scale-[0.98] transition"
                  >
                    <Download size={16} />
                    Descargar
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(file.id)}
                    className="inline-flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg active:scale-[0.98] transition"
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};