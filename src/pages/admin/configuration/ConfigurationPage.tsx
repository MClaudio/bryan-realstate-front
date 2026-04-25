import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { Save, Building, Phone, Mail, Globe, Upload } from 'lucide-react';
import { alertError, alertConfirm, toastSuccess, toastError } from '../../../utils/alerts';

export const ConfigurationPage = () => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentLogoId, setCurrentLogoId] = useState<string | null>(null);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      companyName: '',
      businessName: '',
      ruc: '',
      phone: '',
      email: '',
      facebookProfile: '',
      instagramProfile: '',
      youtubeProfile: '',
      whatsappLink: ''
    }
  });

  useEffect(() => {
    fetchConfiguration();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const response = await api.get('/configuration');
      if (response.data) {
        reset(response.data);
        if (response.data.logo) {
          const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
          const base = String(apiBase).replace(/\/$/, '');
          setLogoPreview(`${base}/public/files/${response.data.logo.id}`);
          setCurrentLogoId(response.data.logo.id);
        }
      }
    } catch (error) {
      console.error('Error fetching configuration:', error);
      toastError('Error al cargar la configuración');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toastError('Por favor, sube solo imágenes PNG o JPG');
        return;
      }
      
      // Validar tamaño (2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        toastError('La imagen no debe pesar más de 2MB');
        return;
      }

      setLogoFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      toastSuccess('Logo seleccionado correctamente');
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;
    
    const formData = new FormData();
    formData.append('file', logoFile);
    formData.append('description', 'Company logo');
    
    try {
      const response = await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.id;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw new Error('Error al subir el logo');
    }
  };

  // Función para limpiar campos vacíos antes de enviar
  const cleanEmptyFields = (data: any) => {
    const cleaned = { ...data };
    
    // Limpiar campos de URL que estén vacíos
    const urlFields = ['email', 'facebookProfile', 'instagramProfile', 'youtubeProfile', 'whatsappLink'];
    urlFields.forEach(field => {
      if (cleaned[field] === '') {
        delete cleaned[field];
      }
    });
    
    return cleaned;
  };

  // Función para filtrar solo campos permitidos
  const filterAllowedFields = (data: any) => {
    const allowedFields = [
      'companyName', 'businessName', 'ruc', 'phone', 'email',
      'facebookProfile', 'instagramProfile', 'youtubeProfile', 'whatsappLink'
    ];
    
    const filtered: any = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        filtered[field] = data[field];
      }
    });
    
    return filtered;
  };

  const onSubmit = async (data: any) => {
    // Confirmar antes de guardar
    const confirm = await alertConfirm('¿Guardar cambios?', '¿Estás seguro de guardar la configuración de la empresa?');
    if (!confirm.isConfirmed) return;

    setLoading(true);
    
    try {
      let logoId = currentLogoId;
      
      // Subir nuevo logo si se seleccionó uno
      if (logoFile) {
        logoId = await uploadLogo();
      }
      
      // Limpiar campos vacíos y filtrar solo los permitidos
      const cleanedData = cleanEmptyFields(data);
      const filteredData = filterAllowedFields(cleanedData);
      
      const configData = {
        ...filteredData,
        logoId: logoId || undefined
      };
      
      // Intentar actualizar o crear
      try {
        await api.patch('/configuration', configData);
      } catch (error) {
        // Si falla, crear nuevo
        await api.post('/configuration', configData);
      }
      
      toastSuccess('Configuración guardada exitosamente');
      // Limpiar el archivo después de guardar
      setLogoFile(null);
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      alertError('Error', error.message || 'Error al guardar la configuración');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Configuración de la Empresa</h1>
        <div className="text-sm text-gray-500">
          {logoFile && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
              Logo pendiente de guardar
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm p-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Logo Section */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Logo de la Empresa</h3>
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-blue-400 transition-colors">
              <div className="h-24 w-24 bg-gray-200 rounded-full flex items-center justify-center mb-4 overflow-hidden border-2 border-gray-300">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Logo de la empresa" 
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <Building size={40} className="text-gray-400" />
                )}
              </div>
              <label className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium cursor-pointer bg-white px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-50 transition-all">
                <Upload size={18} />
                {logoPreview ? 'Cambiar Logo' : 'Subir Logo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">Formatos: PNG, JPG • Máx: 2MB</p>
              {logoFile && (
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  ✓ Logo listo para guardar
                </p>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Información General</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial *</label>
            <input
              type="text"
              {...register('companyName', { required: 'El nombre comercial es requerido' })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Ej: Inmobiliaria Bryan"
            />
            {errors.companyName && <span className="text-red-500 text-xs mt-1 block">{errors.companyName.message as string}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social *</label>
            <input
              type="text"
              {...register('businessName', { required: 'La razón social es requerida' })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {errors.businessName && <span className="text-red-500 text-xs mt-1 block">{errors.businessName.message as string}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RUC *</label>
            <input
              type="text"
              {...register('ruc', { 
                required: 'El RUC es requerido',
                minLength: { value: 13, message: 'El RUC debe tener 13 caracteres' }
              })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Ingrese los 13 dígitos del RUC"
            />
            {errors.ruc && <span className="text-red-500 text-xs mt-1 block">{errors.ruc.message as string}</span>}
          </div>

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b mt-4">Contacto</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono Principal *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                {...register('phone', { required: 'El teléfono es requerido' })}
                className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="0999999999"
              />
            </div>
            {errors.phone && <span className="text-red-500 text-xs mt-1 block">{errors.phone.message as string}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contacto</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="email"
                {...register('email')}
                className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="contacto@empresa.com"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b mt-4">Redes Sociales</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facebook (URL)</label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="url"
                {...register('facebookProfile')}
                className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="https://facebook.com/empresa"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram (URL)</label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="url"
                {...register('instagramProfile')}
                className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="https://instagram.com/empresa"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">YouTube (URL)</label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="url"
                {...register('youtubeProfile')}
                className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="https://youtube.com/empresa"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (URL)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="url"
                {...register('whatsappLink')}
                className="w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="https://wa.me/593999999999"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
          >
            <Save size={20} />
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              'Guardar Configuración'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};