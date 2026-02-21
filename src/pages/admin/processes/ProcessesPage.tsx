import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../../services/api';
import { FileUpload } from '../../../components/common/FileUpload';
import {
  ArrowLeft, Plus, X, Clock, ChevronRight, Trash2, Edit,
  DollarSign, FileText, User, Briefcase, Download,
} from 'lucide-react';
import { alertConfirm, alertError, toastSuccess, toastError } from '../../../utils/alerts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Expense { amount: number; description: string }
interface ProcessFile { file: { id: string; originalName: string; path: string; size: number } }
interface Process {
  id: string;
  title: string;
  type: 'Comprador' | 'Vendedor';
  description: string;
  expenses: Expense[];
  approximateTime?: string;
  nextStep?: string;
  createdAt: string;
  files: ProcessFile[];
  property?: { code: string; address: string };
}

type FormData = {
  title: string;
  type: 'Comprador' | 'Vendedor';
  description: string;
  expenses: Expense[];
  approximateTime: string;
  nextStep: string;
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({
  process,
  onClose,
  onEdit,
  onDelete,
}: {
  process: Process;
  onClose: () => void;
  onEdit: (p: Process) => void;
  onDelete: (id: string) => void;
}) => {
  const [fileUrls, setFileUrls] = useState<{ id: string; name: string; url: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const results = await Promise.all(
        (process.files || []).map(async (pf) => {
          try {
            const r = await api.get(`/files/${pf.file.id}/url`);
            return { id: pf.file.id, name: pf.file.originalName, url: r.data.url };
          } catch {
            return { id: pf.file.id, name: pf.file.originalName, url: '' };
          }
        })
      );
      setFileUrls(results);
    };
    load();
  }, [process]);

  const expenses: Expense[] = Array.isArray(process.expenses) ? process.expenses : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${process.type === 'Comprador' ? 'bg-blue-100' : 'bg-emerald-100'}`}>
              {process.type === 'Comprador'
                ? <User size={20} className="text-blue-600" />
                : <Briefcase size={20} className="text-emerald-600" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{process.title}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                process.type === 'Comprador' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
              }`}>{process.type}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(process)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
              <Edit size={18} />
            </button>
            <button onClick={() => onDelete(process.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Descripción</h3>
            <p className="text-gray-800 whitespace-pre-line">{process.description}</p>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            {process.approximateTime && (
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                <Clock size={16} className="text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Tiempo Aproximado</div>
                  <div className="text-sm font-medium">{process.approximateTime}</div>
                </div>
              </div>
            )}
            {process.nextStep && (
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                <ChevronRight size={16} className="text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Siguiente Paso</div>
                  <div className="text-sm font-medium">{process.nextStep}</div>
                </div>
              </div>
            )}
          </div>

          {/* Expenses */}
          {expenses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Gastos</h3>
              <div className="space-y-2">
                {expenses.map((e, i) => (
                  <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
                    <span className="text-sm text-gray-700">{e.description}</span>
                    <span className="font-semibold text-amber-700">${Number(e.amount).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-end pt-1">
                  <span className="text-sm font-bold text-gray-900">
                    Total: ${expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Files */}
          {fileUrls.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Archivos</h3>
              <div className="space-y-2">
                {fileUrls.map((f) => (
                  <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-700 truncate">{f.name}</span>
                    </div>
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-gray-100 transition-colors">
                        <Download size={14} /> Descargar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 pt-2">
            Registrado el {new Date(process.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Form Modal ───────────────────────────────────────────────────────────────
const FormModal = ({
  propertyId,
  editProcess,
  onClose,
  onSaved,
}: {
  propertyId: string;
  editProcess: Process | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [saving, setSaving] = useState(false);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [initialFiles, setInitialFiles] = useState<{ id: string; url: string; name: string }[]>([]);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      title: '', type: 'Comprador', description: '',
      expenses: [], approximateTime: '', nextStep: '',
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'expenses' });

  useEffect(() => {
    if (!editProcess) return;

    reset({
      title: editProcess.title,
      type: editProcess.type,
      description: editProcess.description,
      expenses: Array.isArray(editProcess.expenses) ? editProcess.expenses : [],
      approximateTime: editProcess.approximateTime || '',
      nextStep: editProcess.nextStep || '',
    });

    // Fetch signed URLs first, then populate FileUpload with proper URLs
    const loadFiles = async () => {
      const results = await Promise.all(
        (editProcess.files || []).map(async (pf) => {
          try {
            const r = await api.get(`/files/${pf.file.id}/url`);
            return { id: pf.file.id, url: r.data.url, name: pf.file.originalName };
          } catch {
            return { id: pf.file.id, url: pf.file.path, name: pf.file.originalName };
          }
        })
      );
      setInitialFiles(results);
      setFileIds(results.map((f) => f.id));
    };

    loadFiles();
  }, [editProcess, reset]);

  const handleFilesChange = useCallback((files: Array<{ id: string }>) => {
    setFileIds(files.map((f) => f.id).filter((id) => id && id.length === 36));
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      setSaving(true);
      const payload = { ...data, propertyId, fileIds };
      if (editProcess) {
        await api.patch(`/processes/${editProcess.id}`, payload);
        toastSuccess('Proceso actualizado');
      } else {
        await api.post('/processes', payload);
        toastSuccess('Proceso registrado');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      alertError('Error', err.response?.data?.message || 'No se pudo guardar el proceso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {editProcess ? 'Editar Proceso' : 'Nuevo Proceso'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Title + Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                type="text"
                {...register('title', { required: 'El título es requerido' })}
                className={`w-full p-2 border rounded-lg ${errors.title ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Ej: Revisión de documentos"
              />
              {errors.title && <span className="text-red-500 text-xs">{errors.title.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select
                {...register('type', { required: true })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Comprador">Comprador</option>
                <option value="Vendedor">Vendedor</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
            <textarea
              rows={3}
              {...register('description', { required: 'La descripción es requerida' })}
              className={`w-full p-2 border rounded-lg ${errors.description ? 'border-red-300' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="Describe el proceso..."
            />
            {errors.description && <span className="text-red-500 text-xs">{errors.description.message}</span>}
          </div>

          {/* Expenses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Lista de Gastos</label>
              <button
                type="button"
                onClick={() => append({ amount: 0, description: '' })}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus size={14} /> Agregar gasto
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <div className="relative w-28 shrink-0">
                    <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`expenses.${index}.amount`, { required: true, min: 0 })}
                      className="w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <input
                    type="text"
                    {...register(`expenses.${index}.description`, { required: true })}
                    className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Descripción del gasto"
                  />
                  <button type="button" onClick={() => remove(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ))}
              {fields.length === 0 && (
                <p className="text-xs text-gray-400 italic">Sin gastos registrados</p>
              )}
            </div>
          </div>

          {/* Time + Next Step */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo Aproximado</label>
              <input
                type="text"
                {...register('approximateTime')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 3-5 días hábiles"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Siguiente Paso</label>
              <input
                type="text"
                {...register('nextStep')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Firmar el contrato"
              />
            </div>
          </div>

          {/* Files */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Archivos</label>
            <FileUpload
              onFilesChange={handleFilesChange}
              initialFiles={initialFiles}
              accept="*/*"
              multiple
              showPreview={true}
              displayMode="list"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-2">
              {saving && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
              {editProcess ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const ProcessesPage = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [property, setProperty] = useState<{ code: string; address: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProcess, setEditProcess] = useState<Process | null>(null);
  const [detailProcess, setDetailProcess] = useState<Process | null>(null);

  const fetchProcesses = useCallback(async () => {
    if (!propertyId) return;
    try {
      setLoading(true);
      const [procRes, propRes] = await Promise.all([
        api.get(`/processes?propertyId=${propertyId}`),
        api.get(`/properties/${propertyId}`),
      ]);
      setProcesses(procRes.data);
      setProperty({ code: propRes.data.code, address: propRes.data.address });
    } catch {
      toastError('Error al cargar los procesos');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { fetchProcesses(); }, [fetchProcesses]);

  const handleDelete = async (id: string) => {
    const confirm = await alertConfirm('Eliminar proceso', '¿Estás seguro de eliminar este proceso?');
    if (!confirm.isConfirmed) return;
    try {
      await api.delete(`/processes/${id}`);
      toastSuccess('Proceso eliminado');
      setDetailProcess(null);
      fetchProcesses();
    } catch {
      alertError('Error', 'No se pudo eliminar el proceso');
    }
  };

  const handleEdit = (p: Process) => {
    setDetailProcess(null);
    setEditProcess(p);
    setShowForm(true);
  };

  const handleNewProcess = () => {
    setEditProcess(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditProcess(null);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/propiedades/gestion" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Procesos</h1>
          {property && (
            <p className="text-sm text-gray-500 truncate">
              {property.code} — {property.address}
            </p>
          )}
        </div>
        <button
          onClick={handleNewProcess}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors shadow-sm"
        >
          <Plus size={18} /> Nuevo Proceso
        </button>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : processes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Sin procesos registrados</h3>
          <p className="text-gray-400 text-sm mb-4">Registra el primer proceso para esta propiedad</p>
          <button onClick={handleNewProcess}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Nuevo Proceso
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {processes.map((proc, idx) => {
              const expenses: Expense[] = Array.isArray(proc.expenses) ? proc.expenses : [];
              const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
              const isComprador = proc.type === 'Comprador';

              return (
                <div key={proc.id} className="relative pl-16">
                  {/* Circle indicator */}
                  <div className={`absolute left-3.5 top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${isComprador ? 'bg-blue-600 border-blue-600' : 'bg-emerald-500 border-emerald-500'}`}>
                    <span className="text-white text-xs font-bold">{idx + 1}</span>
                  </div>

                  {/* Card */}
                  <button
                    type="button"
                    onClick={() => setDetailProcess(proc)}
                    className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all p-5 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isComprador ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {proc.type}
                          </span>
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {proc.title}
                          </h3>
                        </div>

                        {/* Description snippet */}
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{proc.description}</p>

                        {/* Meta chips */}
                        <div className="flex flex-wrap gap-2">
                          {expenses.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 rounded-full">
                              <DollarSign size={12} /> {expenses.length} gasto{expenses.length !== 1 ? 's' : ''} · ${total.toLocaleString()}
                            </span>
                          )}
                          {proc.approximateTime && (
                            <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              <Clock size={12} /> {proc.approximateTime}
                            </span>
                          )}
                          {proc.nextStep && (
                            <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full">
                              <ChevronRight size={12} /> {proc.nextStep}
                            </span>
                          )}
                          {proc.files?.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              <FileText size={12} /> {proc.files.length} archivo{proc.files.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEdit(proc); }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(proc.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                      {new Date(proc.createdAt).toLocaleDateString('es-EC', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && propertyId && (
        <FormModal
          propertyId={propertyId}
          editProcess={editProcess}
          onClose={handleFormClose}
          onSaved={fetchProcesses}
        />
      )}
      {detailProcess && (
        <DetailModal
          process={detailProcess}
          onClose={() => setDetailProcess(null)}
          onEdit={handleEdit}
          onDelete={(id) => handleDelete(id)}
        />
      )}
    </div>
  );
};
