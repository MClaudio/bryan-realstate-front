import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import { Save, ArrowLeft } from 'lucide-react';
import { alertError, toastSuccess } from '../../../utils/alerts';

interface BlacklistFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  reason: string;
}

export const BlacklistFormPage = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BlacklistFormValues>({
    defaultValues: { firstName: '', lastName: '', phone: '', reason: '' },
  });

  useEffect(() => {
    if (isEditMode) {
      api
        .get(`/blacklist/${id}`)
        .then((res) => reset({ ...res.data, reason: res.data.reason ?? '' }))
        .catch(console.error);
    }
  }, [id, isEditMode, reset]);

  const onSubmit = async (data: BlacklistFormValues) => {
    setLoading(true);
    try {
      const payload: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      };
      if (data.reason && data.reason.trim().length > 0) {
        payload.reason = data.reason.trim();
      }

      if (isEditMode) {
        await api.patch(`/blacklist/${id}`, payload);
      } else {
        await api.post('/blacklist', payload);
      }

      toastSuccess('Registro guardado correctamente');
      navigate('/admin/lista-negra');
    } catch (error: any) {
      console.error('Error saving blacklist entry:', error);
      const msg =
        error.response?.data?.message ||
        (Array.isArray(error.response?.data?.errors)
          ? error.response.data.errors.join(', ')
          : 'Error al guardar el registro.');
      alertError('Error al guardar', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/lista-negra')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditMode ? 'Editar Registro' : 'Nuevo Registro — Lista Negra'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              className={`w-full p-2 border rounded-md ${errors.firstName ? 'border-red-500' : ''}`}
              {...register('firstName', { required: 'El nombre es obligatorio' })}
            />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
            <input
              type="text"
              className={`w-full p-2 border rounded-md ${errors.lastName ? 'border-red-500' : ''}`}
              {...register('lastName', { required: 'El apellido es obligatorio' })}
            />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de Celular *</label>
            <input
              type="text"
              className={`w-full p-2 border rounded-md ${errors.phone ? 'border-red-500' : ''}`}
              placeholder="0991234567"
              {...register('phone', { required: 'El número de celular es obligatorio' })}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>

          {/* Reason */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
            <textarea
              rows={3}
              className="w-full p-2 border rounded-md"
              placeholder="Describe el motivo por el que se agrega a la lista negra..."
              {...register('reason')}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-60"
          >
            <Save size={18} />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/lista-negra')}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};
