import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { Save, Eye, EyeOff, User } from 'lucide-react';
import { alertError, toastSuccess } from '../../utils/alerts';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  ACCOUNTING: 'Contabilidad',
  EMPLOYEE: 'Empleado',
};

export const ProfilePage = () => {
  const { user: currentUser, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      ruc: '',
    },
  });

  useEffect(() => {
    if (currentUser?.id) {
      const fetchProfile = async () => {
        try {
          const response = await api.get(`/users/${currentUser.id}`);
          const { firstName, lastName, email, phone, address, ruc } = response.data;
          reset({
            firstName: firstName ?? '',
            lastName: lastName ?? '',
            email: email ?? '',
            phone: phone ?? '',
            address: address ?? '',
            ruc: ruc ?? '',
          });
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      };
      fetchProfile();
    }
  }, [currentUser?.id, reset]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const payload: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        ruc: data.ruc,
      };
      if (data.phone && data.phone.trim().length > 0) payload.phone = data.phone.trim();
      if (data.address && data.address.trim().length > 0) payload.address = data.address.trim();

      const response = await api.patch(`/users/${currentUser!.id}`, payload);

      // Update local auth context with new name
      updateUser({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
      });

      toastSuccess('Perfil actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const msg =
        error.response?.data?.message ||
        (Array.isArray(error.response?.data?.errors)
          ? error.response.data.errors.join(', ')
          : 'Error al actualizar el perfil.');
      alertError('Error al guardar', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      alertError('Nueva contraseña inválida', 'Debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      alertError('No coinciden', 'La confirmación no coincide con la nueva contraseña');
      return;
    }
    if (!currentPassword) {
      alertError('Contraseña actual requerida', 'Ingresa tu contraseña actual para continuar');
      return;
    }
    try {
      await api.patch(`/users/${currentUser!.id}/password`, {
        currentPassword,
        newPassword,
      });
      toastSuccess('Contraseña actualizada');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'No se pudo actualizar la contraseña';
      alertError('Error al cambiar contraseña', msg);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
          <User size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mi Perfil</h1>
          <p className="text-sm text-gray-500">Actualiza tu información personal</p>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Profile Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Información Personal</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                {...register('firstName', { required: 'El nombre es requerido' })}
                className={`w-full p-2 border rounded-md ${
                  errors.firstName
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.firstName && (
                <span className="text-red-500 text-xs">{errors.firstName.message as string}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
              <input
                type="text"
                {...register('lastName', { required: 'El apellido es requerido' })}
                className={`w-full p-2 border rounded-md ${
                  errors.lastName
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.lastName && (
                <span className="text-red-500 text-xs">{errors.lastName.message as string}</span>
              )}
            </div>

            {/* Username (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input
                type="text"
                value={currentUser?.username ?? ''}
                disabled
                className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">El nombre de usuario no se puede cambiar</p>
            </div>

            {/* Role (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <input
                type="text"
                value={ROLE_LABELS[currentUser?.type ?? ''] ?? currentUser?.type ?? ''}
                disabled
                className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Solo un administrador puede cambiar el rol</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                {...register('email', { required: 'El email es requerido' })}
                className={`w-full p-2 border rounded-md ${
                  errors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.email && (
                <span className="text-red-500 text-xs">{errors.email.message as string}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RUC *</label>
              <input
                type="text"
                {...register('ruc', {
                  required: 'El RUC es requerido',
                  minLength: { value: 10, message: 'Mínimo 10 caracteres' },
                  maxLength: { value: 13, message: 'Máximo 13 caracteres' },
                })}
                className={`w-full p-2 border rounded-md ${
                  errors.ruc
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              />
              {errors.ruc && (
                <span className="text-red-500 text-xs">{errors.ruc.message as string}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="text"
                {...register('phone')}
                className="w-full p-2 border rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                {...register('address')}
                className="w-full p-2 border rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-blue-400"
            >
              <Save size={18} />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>

        {/* Password Change Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Cambiar Contraseña</h2>
          <div className="max-w-md space-y-3">
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Contraseña actual"
                className="w-full p-2 border border-gray-300 rounded-md pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña"
                className="w-full p-2 border border-gray-300 rounded-md pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar nueva contraseña"
              className="w-full p-2 border border-gray-300 rounded-md"
            />

            <button
              type="button"
              onClick={handleChangePassword}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Actualizar Contraseña
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
