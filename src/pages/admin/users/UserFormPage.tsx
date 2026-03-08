import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import { Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { alertError, toastSuccess } from '../../../utils/alerts';
import { useAuth } from '../../../context/AuthContext';

export const UserFormPage = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.type === 'ADMIN';
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      phone: '',
      address: '',
      ruc: '',
      type: 'EMPLOYEE'
    }
  });

  useEffect(() => {
    if (isEditMode) {
      const fetchUser = async () => {
        try {
          const response = await api.get(`/users/${id}`);
          // Remove password from form data when editing to avoid overwriting with empty or hash
          const { password, ...userData } = response.data;
          // Only set allowed fields into the form
          const allowed = {
            firstName: userData.firstName ?? '',
            lastName: userData.lastName ?? '',
            username: userData.username ?? '',
            email: userData.email ?? '',
            phone: userData.phone ?? '',
            address: userData.address ?? '',
            ruc: userData.ruc ?? '',
            type: userData.type ?? 'EMPLOYEE',
          };
          reset(allowed);
          setIsActive(userData.isActive ?? true);
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      };
      fetchUser();
    }
  }, [id, isEditMode, reset]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // If editing and password is empty, remove it from payload
      const payload: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        email: data.email,
        ruc: data.ruc,
        type: data.type,
      };
      if (data.phone && data.phone.trim().length > 0) {
        payload.phone = data.phone.trim();
      }
      if (data.address && data.address.trim().length > 0) {
        payload.address = data.address.trim();
      }
      if (isEditMode && !payload.password) {
        delete payload.password;
      } else if (data.password) {
        payload.password = data.password;
      }

      if (isEditMode) {
        await api.patch(`/users/${id}`, { ...payload, isActive });
      } else {
        await api.post('/users', payload);
      }
      toastSuccess('Usuario guardado correctamente');
      navigate('/admin/usuarios');
    } catch (error: any) {
      console.error('Error saving user:', error);
      const msg =
        error.response?.data?.message ||
        (Array.isArray(error.response?.data?.errors) ? error.response.data.errors.join(', ') : 'Error al guardar el usuario. Revisa los datos.');
      alertError('Error al guardar', msg);
    } finally {
      setLoading(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async () => {
    if (!isEditMode) return;
    if (newPassword.length < 6) {
      alertError('Nueva contraseña inválida', 'Debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      alertError('No coinciden', 'La confirmación no coincide con la nueva contraseña');
      return;
    }
    try {
      const payload: any = { newPassword };
      if (!isAdmin) {
        payload.currentPassword = currentPassword;
      }
      await api.patch(`/users/${id}/password`, payload);
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
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/usuarios')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditMode ? 'Editar Usuario' : 'Nuevo Usuario'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
            <input
              type="text"
              {...register('username', { 
                required: 'El usuario es requerido',
                pattern: {
                  value: /^[a-zA-Z]+$/,
                  message: 'Solo se permiten letras'
                }
              })}
              className={`w-full p-2 border rounded-md ${errors.username ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              disabled={isEditMode}
            />
            {errors.username && <span className="text-red-500 text-xs">{errors.username.message as string}</span>}
            {isEditMode && <p className="text-xs text-gray-500 mt-1">El nombre de usuario no se puede cambiar</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              {...register('email', { required: 'El email es requerido' })}
              className={`w-full p-2 border rounded-md ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
            />
            {errors.email && <span className="text-red-500 text-xs">{errors.email.message as string}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
            <select {...register('type')} className="w-full p-2 border rounded-md">
              <option value="EMPLOYEE">Empleado</option>
              <option value="ACCOUNTING">Contabilidad</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          {isEditMode && (
            <div className="flex items-center gap-3">
              <label className="block text-sm font-medium text-gray-700">Estado</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${
                isActive ? 'text-green-600' : 'text-gray-400'
              }`}>
                {isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RUC *</label>
            <input
              type="text"
              {...register('ruc', { 
                required: 'El RUC es requerido',
                minLength: { value: 10, message: 'Mínimo 10 caracteres' },
                maxLength: { value: 13, message: 'Máximo 13 caracteres' }
              })}
              className={`w-full p-2 border rounded-md ${errors.ruc ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
            />
            {errors.ruc && <span className="text-red-500 text-xs">{errors.ruc.message as string}</span>}
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

          <div className="md:col-span-2 border-t pt-4 mt-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Seguridad</h3>
            <div className="max-w-md">
              {!isEditMode ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      {...register('password', { 
                        required: 'La contraseña es requerida',
                        minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                      })}
                      className={`w-full p-2 border rounded-md pr-10 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="********"
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
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cambiar Contraseña</label>
                  {!isAdmin && (
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Contraseña actual"
                      className="w-full p-2 border rounded-md mb-2"
                    />
                  )}
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nueva contraseña"
                    className="w-full p-2 border rounded-md mb-2"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmar nueva contraseña"
                    className="w-full p-2 border rounded-md mb-2"
                  />
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Actualizar Contraseña
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/admin/usuarios')}
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
            {loading ? 'Guardando...' : 'Guardar Usuario'}
          </button>
        </div>
      </form>
    </div>
  );
};
