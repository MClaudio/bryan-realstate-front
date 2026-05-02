import { useState, useRef, useEffect, memo } from 'react';
import { Upload, X, File as FileIcon, Download } from 'lucide-react';
import api from '../../services/api';
import { alertError, alertConfirm } from '../../utils/alerts';

interface FileData {
  id: string;
  url: string;
  name: string;
  size?: number;
}

interface FileUploadProps {
  onFilesChange: (files: FileData[]) => void;
  initialFiles?: FileData[];
  multiple?: boolean;
  accept?: string;
  title?: string;
  showPreview?: boolean;
  displayMode?: 'grid' | 'list';
}

const FileUploadComponent = ({ onFilesChange, initialFiles = [], multiple = true, accept = 'image/*', title, showPreview = true, displayMode = 'grid' }: FileUploadProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Serialize initialFiles to track meaningful changes
  const initialFilesKey = JSON.stringify(initialFiles.map(f => f.id).sort());

  useEffect(() => {
    // Update when initialFiles changes (based on file IDs)
    if (initialFiles.length > 0) {
      setUploadedFiles(initialFiles);
      onFilesChange(initialFiles);
    } else if (initialFiles.length === 0 && uploadedFiles.length > 0) {
      // Reset if initialFiles becomes empty explicitly
      setUploadedFiles([]);
      onFilesChange([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilesKey]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const filesToUpload = Array.from(e.target.files);
    setUploading(true);

    try {
      const newUploadedFiles = [];

      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', `Uploaded from property form`);

        const response = await api.post('/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const fileId = response.data.id;
        const urlResp = await api.get(`/files/${fileId}/url`);
        newUploadedFiles.push({
          id: fileId,
          url: urlResp.data.url,
          name: response.data.originalName,
          size: response.data.size,
        });
      }

      const updatedFiles = multiple 
        ? [...uploadedFiles, ...newUploadedFiles]
        : newUploadedFiles;

      setUploadedFiles(updatedFiles);
      onFilesChange(updatedFiles);
    } catch (error) {
      console.error('Error uploading files:', error);
      const msg = (error as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Error al subir archivos. Intente nuevamente.';
      alertError('Error al subir archivos', msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = async (id: string) => {
    const confirm = await alertConfirm('Eliminar archivo', '¿Estás seguro de eliminar este archivo?');
    if (!confirm.isConfirmed) return;
    const updatedFiles = uploadedFiles.filter(f => f.id !== id);
    setUploadedFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const isImage = (name: string) => {
    return name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Desconocido';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleDownload = (file: FileData) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-sm text-gray-500">Subiendo archivos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">{title || 'Haz clic para subir archivos'}</p>
            <p className="text-xs text-gray-500 mt-1">
              {accept.includes('image') ? 'Soporta: JPG, PNG, WEBP' : 'Soporta: PDF, DOCX, XLSX, imágenes'}
            </p>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple={multiple} 
          accept={accept}
          onChange={handleFileSelect}
        />
      </div>

      {showPreview && uploadedFiles.length > 0 && (
        displayMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square">
                {isImage(file.name) ? (
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FileIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileIcon className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Descargar"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Eliminar"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

// Custom comparison function for memo to prevent unnecessary re-renders
const arePropsEqual = (prevProps: FileUploadProps, nextProps: FileUploadProps) => {
  // Compare initialFiles by IDs only
  const prevIds = prevProps.initialFiles?.map(f => f.id).sort().join(',') || '';
  const nextIds = nextProps.initialFiles?.map(f => f.id).sort().join(',') || '';
  
  return (
    prevProps.onFilesChange === nextProps.onFilesChange &&
    prevIds === nextIds &&
    prevProps.multiple === nextProps.multiple &&
    prevProps.accept === nextProps.accept &&
    prevProps.title === nextProps.title &&
    prevProps.showPreview === nextProps.showPreview &&
    prevProps.displayMode === nextProps.displayMode
  );
};

// Export memoized version to prevent unnecessary re-renders
export const FileUpload = memo(FileUploadComponent, arePropsEqual);
export default FileUpload;
