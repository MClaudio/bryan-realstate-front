import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import { Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { alertError, toastSuccess } from '../../../utils/alerts';
import { formatPhoneNumber, validatePhoneNumber } from '../../../utils/phoneFormatter';

export const ClientFormPage = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phoneFormatted, setPhoneFormatted] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      ruc: '',
      birthDate: '',
      notes: '',
      interestDescription: ''
    }
  });

  const phoneValue = watch('phone');

  // Actualizar preview del teléfono formateado en tiempo real
  useEffect(() => {
    if (phoneValue && phoneValue.trim()) {
      const { formatted, isValid } = formatPhoneNumber(phoneValue);
      setPhoneFormatted(formatted);
      setPhoneError(isValid ? '' : 'El número debe tener código de país y al menos 7 dígitos');
    } else {
      setPhoneFormatted('');
      setPhoneError('');
    }
  }, [phoneValue]);

  useEffect(() => {
    if (isEditMode) {
      const fetchClient = async () => {
        try {
          const response = await api.get(`/clients/${id}`);
          const { password, birthDate, ...clientData } = response.data;
          
          // Format date for input type="date"
          const formattedDate = birthDate ? new Date(birthDate).toISOString().split('T')[0] : '';
          
          reset({
            ...clientData,
            birthDate: formattedDate
          });
        } catch (error) {
          console.error('Error fetching client:', error);
        }
      };
      fetchClient();
    }
  }, [id, isEditMode, reset]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Validar y formatear teléfono
      if (!data.phone || !data.phone.trim()) {
        alertError('Error de validación', 'El teléfono es requerido');
        setLoading(false);
        return;
      }

      if (!validatePhoneNumber(data.phone)) {
        alertError('Error de validación', 'El número telefónico debe tener al menos 7 dígitos y debe incluir código de país');
        setLoading(false);
        return;
      }

      const { formatted: formattedPhone } = formatPhoneNumber(data.phone);

      // Prepare payload
      const payload: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: formattedPhone,
      };

      if (data.email && data.email.trim().length > 0) {
        payload.email = data.email.trim();
      }
      if (data.address && data.address.trim().length > 0) {
        payload.address = data.address.trim();
      }
      if (data.ruc && data.ruc.trim().length > 0) {
        payload.ruc = data.ruc.trim();
      }
      
      // Handle password
      if (isEditMode) {
        if (data.password && data.password.trim().length > 0) {
          payload.password = data.password.trim();
        }
      } else {
        if (data.password && data.password.trim().length > 0) {
          payload.password = data.password.trim();
        }
      }
      
      // Handle date
      if (data.birthDate && String(data.birthDate).trim().length > 0) {
        payload.birthDate = new Date(data.birthDate).toISOString();
      }

      // Optional text fields
      if (data.notes && data.notes.trim().length > 0) {
        payload.notes = data.notes.trim();
      }
      if (data.interestDescription && data.interestDescription.trim().length > 0) {
        payload.interestDescription = data.interestDescription.trim();
      }

      if (isEditMode) {
        await api.patch(`/clients/${id}`, payload);
      } else {
        await api.post('/clients', payload);
      }
      toastSuccess('Cliente guardado correctamente');
      navigate('/admin/clientes');
    } catch (error: any) {
      console.error('Error saving client:', error);
      const msg =
        error.response?.data?.message ||
        (Array.isArray(error.response?.data?.errors) ? error.response.data.errors.join(', ') : 'Error al guardar el cliente. Revisa los datos.');
      alertError('Error al guardar', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/clientes')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm p-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              {...register('firstName', { required: 'El nombre es requerido' })}
              className={`w-full p-2 border rounded-md ${errors.firstName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
            />
            {errors.firstName && <span className="text-red-500 text-xs">{errors.firstName.message as string}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
            <input
              type="text"
              {...register('lastName', { required: 'El apellido es requerido' })}
              className={`w-full p-2 border rounded-md ${errors.lastName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
            />
            {errors.lastName && <span className="text-red-500 text-xs">{errors.lastName.message as string}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
            <input
              type="text"
              {...register('phone', { 
                required: 'El teléfono es requerido',
                minLength: { value: 7, message: 'Mínimo 7 dígitos' }
              })}
              className={`w-full p-2 border rounded-md ${errors.phone || phoneError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              placeholder="ej: 0978961341 o +593978961341"
            />
            {errors.phone && <span className="text-red-500 text-xs">{errors.phone.message as string}</span>}
            {phoneError && <span className="text-red-500 text-xs">{phoneError}</span>}
            {phoneFormatted && !phoneError && (
              <span className="text-xs text-green-600 mt-1 block">
                Formato guardado: <strong>{phoneFormatted}</strong>
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full p-2 border rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RUC / CI</label>
            <input
              type="text"
              {...register('ruc', {
                minLength: { value: 10, message: 'Mínimo 10 caracteres' },
                maxLength: { value: 13, message: 'Máximo 13 caracteres' }
              })}
              className={`w-full p-2 border rounded-md ${errors.ruc ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
            />
            {errors.ruc && <span className="text-red-500 text-xs">{errors.ruc.message as string}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
            <input
              type="date"
              {...register('birthDate')}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              {...register('address')}
              className="w-full p-2 border rounded-md"
            />
          </div>

          {/* Notes & Interests */}
          <div className="md:col-span-2 border-t pt-4 mt-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Información Adicional</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota</label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  placeholder="Ej: No llamar antes de las 12pm..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Intereses</label>
                <textarea
                  {...register('interestDescription')}
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  placeholder="Ej: Busca una propiedad de 500m² en el centro..."
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 border-t pt-4 mt-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Acceso al Sistema (Opcional)</h3>
            <p className="text-sm text-gray-500 mb-4">
              Si deseas que el cliente pueda iniciar sesión, establece una contraseña.
            </p>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register('password', { 
                    minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                  })}
                  className={`w-full p-2 border rounded-md pr-10 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  placeholder={isEditMode ? "Dejar en blanco para mantener" : "Opcional"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="text-red-500 text-xs">{errors.password.message as string}</span>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/admin/clientes')}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-blue-400"
          >
            <Save size={20} />
            {loading ? 'Guardando...' : 'Guardar Cliente'}
          </button>
        </div>
      </form>
    </div>
  );
};
