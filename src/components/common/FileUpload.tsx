import { useState, useRef, useEffect, memo } from 'react';
import { Upload, X, File as FileIcon } from 'lucide-react';
import api, {
  MAX_UPLOAD_MB,
  MAX_UPLOAD_BYTES,
  formatFileSizeMb,
  humanizeAxiosError,
} from '../../services/api';
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
  allowReorder?: boolean;
}

const FileUploadComponent = ({
  onFilesChange,
  initialFiles = [],
  multiple = true,
  accept = 'image/*',
  title,
  showPreview = true,
  displayMode = 'grid',
  allowReorder = false,
}: FileUploadProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Serialize initialFiles to track meaningful changes
  const initialFilesKey = JSON.stringify(initialFiles.map((f) => f.id));

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

    const allSelected = Array.from(e.target.files);
    const toUpload: File[] = [];
    let rejectedMessage: string | null = null;

    for (const file of allSelected) {
      if (file.size > MAX_UPLOAD_BYTES) {
        const sizeStr = formatFileSizeMb(file.size);
        rejectedMessage =
          rejectedMessage === null
            ? `"${file.name}" pesa ${sizeStr}. El límite máximo es ${MAX_UPLOAD_MB} MB por archivo.`
            : `${rejectedMessage}\n"${file.name}" pesa ${sizeStr}.`;
        continue;
      }
      toUpload.push(file);
    }

    if (rejectedMessage) {
      alertError(
        toUpload.length === 0
          ? 'Todos los archivos exceden el tamaño permitido'
          : `Algunos archivos superan ${MAX_UPLOAD_MB} MB y no se subirán`,
        rejectedMessage,
      );
    }

    if (toUpload.length === 0) {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploading(true);

    try {
      const newUploadedFiles: FileData[] = [];

      for (const file of toUpload) {
        setUploadProgress({ current: 0, total: file.size });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('description', `Uploaded from property form`);

        const response = await api.post('/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total ?? file.size;
            const loaded = progressEvent.loaded ?? 0;
            setUploadProgress({ current: loaded, total });
          },
        });

        setUploadProgress({ current: file.size, total: file.size });

        const fileId = response.data.id;
        // POST /files/upload now RETURNS enriched data (with signed S3 URL
        // or inline SVG placeholder in path). No 2nd /files/:id/url call needed.
        newUploadedFiles.push({
          id: fileId,
          url: (response.data.path as string) || '',
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
      const pretty = humanizeAxiosError(error);
      alertError(pretty.title, pretty.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = async (id: string) => {
    const confirm = await alertConfirm('Eliminar archivo', '¿Estás seguro de eliminar este archivo?');
    if (!confirm.isConfirmed) return;
    const updatedFiles = uploadedFiles.filter((f) => f.id !== id);
    setUploadedFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const isImage = (name: string) => {
    return name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Desconocido';
    return formatFileSizeMb(bytes);
  };

  const moveFile = (fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;

    setUploadedFiles((prevFiles) => {
      const fromIndex = prevFiles.findIndex((f) => f.id === fromId);
      const toIndex = prevFiles.findIndex((f) => f.id === toId);

      if (fromIndex < 0 || toIndex < 0) return prevFiles;

      const reordered = [...prevFiles];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      onFilesChange(reordered);
      return reordered;
    });
  };

  const canReorder = allowReorder && displayMode === 'grid' && uploadedFiles.length > 1;

  const progressPct =
    uploadProgress && uploadProgress.total > 0
      ? Math.max(0, Math.min(100, Math.round((uploadProgress.current / uploadProgress.total) * 100)))
      : 0;

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => !uploading && fileInputRef.current?.click()}
        aria-disabled={uploading}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm font-medium text-gray-700">Subiendo archivos...</p>
            <div className="w-full max-w-sm h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-200 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {uploadProgress && uploadProgress.total > 0 && (
              <p className="text-xs text-gray-500">
                {formatSize(uploadProgress.current)} / {formatSize(uploadProgress.total)} ({progressPct}%)
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">{title || 'Haz clic para subir archivos'}</p>
            <p className="text-xs text-gray-500 mt-1">
              {accept.includes('image') ? 'Soporta: JPG, PNG, WEBP' : 'Soporta: PDF, DOCX, XLSX, imágenes'}
              {` · Máx. ${MAX_UPLOAD_MB} MB por archivo`}
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
            {uploadedFiles.map((file, index) => (
              <div
                key={file.id}
                className={`relative group bg-gray-100 rounded-lg overflow-hidden aspect-square ${canReorder ? 'cursor-grab active:cursor-grabbing' : ''}`}
                draggable={canReorder}
                onDragStart={(e) => {
                  setDraggedFileId(file.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', file.id);
                }}
                onDragOver={(e) => {
                  if (!canReorder) return;
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  if (!canReorder) return;
                  e.preventDefault();
                  const sourceId = draggedFileId || e.dataTransfer.getData('text/plain');
                  if (!sourceId) return;
                  moveFile(sourceId, file.id);
                  setDraggedFileId(null);
                }}
                onDragEnd={() => setDraggedFileId(null)}
              >
                {isImage(file.name) ? (
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FileIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}

                <div
                  className="absolute top-2 left-2 text-xs font-semibold rounded-full w-7 h-7 flex items-center justify-center shadow-md select-none"
                  style={{ backgroundColor: '#ffffff', color: '#000000' }}
                >
                  {index + 1}
                </div>

                <div className="absolute top-2 right-2 md:hidden">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    className="bg-red-600 text-white rounded-full p-1 shadow-lg hover:bg-red-700 active:scale-95 transition flex items-center justify-center h-8 w-8"
                    aria-label="Quitar imagen"
                    title="Quitar imagen"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="absolute top-2 right-2 hidden md:flex md:opacity-0 md:group-hover:opacity-100 transition-opacity items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    className="bg-white/95 rounded-full p-1.5 shadow-md text-gray-700 hover:text-red-600 hover:bg-white transition flex items-center justify-center h-8 w-8"
                    aria-label="Quitar imagen"
                  >
                    <X size={16} strokeWidth={2.25} />
                  </button>
                </div>
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
                    <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition active:scale-95"
                    title="Quitar archivo"
                    aria-label="Quitar archivo"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {canReorder && (
        <p className="text-xs text-gray-500">Arrastra las imágenes para definir el orden de visualización.</p>
      )}
    </div>
  );
};

// Custom comparison function for memo to prevent unnecessary re-renders
const arePropsEqual = (prevProps: FileUploadProps, nextProps: FileUploadProps) => {
  // Compare initialFiles by IDs only
  const prevIds = prevProps.initialFiles?.map((f) => f.id).join(',') || '';
  const nextIds = nextProps.initialFiles?.map((f) => f.id).join(',') || '';

  return (
    prevProps.onFilesChange === nextProps.onFilesChange &&
    prevIds === nextIds &&
    prevProps.multiple === nextProps.multiple &&
    prevProps.accept === nextProps.accept &&
    prevProps.title === nextProps.title &&
    prevProps.showPreview === nextProps.showPreview &&
    prevProps.displayMode === nextProps.displayMode &&
    prevProps.allowReorder === nextProps.allowReorder
  );
};

// Export memoized version to prevent unnecessary re-renders
export const FileUpload = memo(FileUploadComponent, arePropsEqual);
export default FileUpload;
