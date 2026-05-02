import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import api from '../../../services/api';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, 
  ArrowLeft,
  FileText,
  MapPin,
  ListChecks,
  DollarSign,
  Image as ImageIcon,
  Share2
} from 'lucide-react';
import { alertError, toastSuccess, toastError } from '../../../utils/alerts';
import { FileUpload } from '../../../components/common/FileUpload';

interface Property {
  id: string;
  code: string;
  address: string;
  price: number;
  propertyType: string;
  status: string;
  isPublic: boolean;
  isFeatured: boolean;
  advisorId: string;
  advisor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  files: Array<{
    file: {
      id: string;
      originalName: string;
      path: string;
      size?: number;
    };
    fileType: string;
  }>;
}

export const PropertyFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [_property, setProperty] = useState<Property | null>(null);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [documentFileIds, setDocumentFileIds] = useState<string[]>([]);
  const [initialImageFiles, setInitialImageFiles] = useState<{ id: string; url: string; name: string; size?: number }[]>([]);
  const [initialDocumentFiles, setInitialDocumentFiles] = useState<{ id: string; url: string; name: string; size?: number }[]>([]);
  const [advisors, setAdvisors] = useState<Array<{id: string; firstName: string; lastName: string}>>([]);
  const [clients, setClients] = useState<Array<{id: string; firstName: string; lastName: string; phone: string}>>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBasicServices, setShowBasicServices] = useState(false);
  const [resolvingUrl, setResolvingUrl] = useState(false);

  const { register, handleSubmit, reset, setValue, getValues, control, formState: { errors } } = useForm({
    mode: 'onBlur',
    reValidateMode: 'onSubmit',
    criteriaMode: 'firstError',
    defaultValues: {
      code: '',
      address: '',
      price: 0,
      propertyType: 'Casa',
      status: 'Nuevo',
      advisorId: '',
      constructionArea: 0,
      landArea: 0,
      hasBasicServices: false,
      basicServices: [] as string[],
      features: '',
      constructionYears: 0,
      latitude: '',
      longitude: '',
      topography: 'Plano',
      zone: 'Urbano',
      cityTime: 0,
      observations: '',
      maxPrice: 0,
      minPrice: 0,
      commission: 0,
      salePrice: 0,
      isPublic: true,
      isFeatured: false,
      owner: '',
      facebookUrl: '',
      tiktokUrl: '',
      instagramUrl: '',
      youtubeUrl: '',
      locationUrl: '',
      negotiationClientId: ''
    }
  });

  const watchedStatus = useWatch({ control, name: 'status' });
  const watchedNegotiationClientId = useWatch({ control, name: 'negotiationClientId' });
  const watchedBasicServices = useWatch({ control, name: 'basicServices' }) as string[] || [];

  // Initialize clientSearch label when editing a property that already has a negotiation client
  useEffect(() => {
    if (watchedNegotiationClientId && clients.length > 0) {
      const found = clients.find(c => c.id === watchedNegotiationClientId);
      if (found) setClientSearch(`${found.firstName} ${found.lastName}`);
    }
  }, [watchedNegotiationClientId, clients]);

  // Close client dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false);
      }
    };
    if (clientDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clientDropdownOpen]);

  const extractCoordsFromGoogleMapsUrl = useCallback(async (url: string) => {
    if (!url) return;

    // Short URLs (maps.app.goo.gl, goo.gl) need server-side redirect resolution
    const isShortUrl = /goo\.gl\/|maps\.app\.goo\.gl/.test(url);
    if (isShortUrl) {
      try {
        setResolvingUrl(true);
        const res = await api.get(`/properties/resolve-maps-url?url=${encodeURIComponent(url)}`);
        setValue('latitude', res.data.latitude, { shouldValidate: true });
        setValue('longitude', res.data.longitude, { shouldValidate: true });
        // Also update the locationUrl field with the resolved full URL
        setValue('locationUrl', res.data.resolvedUrl, { shouldValidate: true });
      } catch (err) {
        console.error('Error resolving maps URL:', err);
      } finally {
        setResolvingUrl(false);
      }
      return;
    }

    // Full URLs: parse directly on the client
    const placeMatches = [...url.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
    if (placeMatches.length > 0) {
      const last = placeMatches[placeMatches.length - 1];
      setValue('latitude', last[1], { shouldValidate: true });
      setValue('longitude', last[2], { shouldValidate: true });
      return;
    }
    const fallbackPatterns = [
      /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];
    for (const pattern of fallbackPatterns) {
      const match = url.match(pattern);
      if (match) {
        setValue('latitude', match[1], { shouldValidate: true });
        setValue('longitude', match[2], { shouldValidate: true });
        return;
      }
    }
  }, [setValue]);

  const fetchAdvisors = useCallback(async () => {
    try {
      const response = await api.get('/users');
      setAdvisors(response.data);
    } catch (error) {
      console.error('Error fetching advisors:', error);
      // Non-critical error, continue without advisors
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }, []);

  // Memoize file upload callbacks to prevent FileUpload re-renders
  const handleImageFilesChange = useCallback((files: Array<{ id: string }>) => {
    console.log('Image files changed:', files);
    setFileIds(files.map(f => f.id).filter(id => id && id.length === 36));
  }, []);

  const handleDocumentFilesChange = useCallback((files: Array<{ id: string }>) => {
    console.log('Document files changed:', files);
    setDocumentFileIds(files.map(f => f.id).filter(id => id && id.length === 36));
  }, []);

  // Fetch advisors only once on mount
  useEffect(() => {
    fetchAdvisors();
    fetchClients();
  }, [fetchAdvisors, fetchClients]);

  // Fetch property when id changes
  useEffect(() => {
    if (!id) {
      setPageLoading(false);
      return;
    }

    const fetchProperty = async () => {
      try {
        setError(null);
        const response = await api.get(`/properties/${id}`);
        const propertyData = response.data;
        console.log('=== FETCHED PROPERTY ===');
        console.log('Property files:', propertyData.files);
        setProperty(propertyData);
        setIsEditMode(true);
        
        // Set form data
        reset({
          code: propertyData.code,
          address: propertyData.address,
          price: propertyData.price,
          propertyType: propertyData.propertyType,
          status: propertyData.status,
          advisorId: propertyData.advisorId,
          constructionArea: propertyData.constructionArea,
          landArea: propertyData.landArea,
          hasBasicServices: propertyData.hasBasicServices,
          basicServices: propertyData.basicServices,
          features: propertyData.features,
          constructionYears: propertyData.constructionYears,
          latitude: propertyData.latitude,
          longitude: propertyData.longitude,
          topography: propertyData.topography,
          zone: propertyData.zone,
          cityTime: propertyData.cityTime,
          observations: propertyData.observations,
          maxPrice: propertyData.maxPrice,
          minPrice: propertyData.minPrice,
          commission: propertyData.commission,
          salePrice: propertyData.salePrice,
          isPublic: propertyData.isPublic,
          isFeatured: propertyData.isFeatured,
          owner: propertyData.owner || '',
          facebookUrl: propertyData.facebookUrl || '',
          tiktokUrl: propertyData.tiktokUrl || '',
          instagramUrl: propertyData.instagramUrl || '',
          youtubeUrl: propertyData.youtubeUrl || '',
          locationUrl: propertyData.locationUrl || '',
          negotiationClientId: propertyData.negotiationClientId || ''
        });

        setShowBasicServices(propertyData.hasBasicServices);

        // Set file IDs and fetch URLs for existing files
        const imageFiles = propertyData.files?.filter((f: {fileType: string; file: {id: string}}) => f?.fileType === 'image' && f?.file?.id) || [];
        const documentFiles = propertyData.files?.filter((f: {fileType: string; file: {id: string}}) => f?.fileType === 'document' && f?.file?.id) || [];
        
        // Fetch actual URLs for the files
        const fetchFileUrls = async (files: Array<{fileType: string; file: {id: string; path: string; originalName: string; size?: number}}>) => {
          return await Promise.all(
            files.map(async (f: {fileType: string; file: {id: string; path: string; originalName: string; size?: number}}) => {
              try {
                if (!f?.file?.id) return f;
                const urlResp = await api.get(`/files/${f.file.id}/url`);
                return { 
                  ...f, 
                  file: { 
                    ...f.file, 
                    path: urlResp.data.url,
                    size: urlResp.data.size || f.file.size
                  } 
                };
              } catch {
                return f;
              }
            })
          );
        };

        const [imageFilesWithUrls, documentFilesWithUrls] = await Promise.all([
          fetchFileUrls(imageFiles),
          fetchFileUrls(documentFiles)
        ]);

        // Prepare initial file arrays for FileUpload components
        const imageFilesList = imageFilesWithUrls.map((f: {file: {id: string; path: string; originalName: string; size?: number}}) => ({
          id: f.file.id,
          url: f.file.path,
          name: f.file.originalName,
          size: f.file.size
        }));
        
        const documentFilesList = documentFilesWithUrls.map((f: {file: {id: string; path: string; originalName: string; size?: number}}) => ({
          id: f.file.id,
          url: f.file.path,
          name: f.file.originalName,
          size: f.file.size
        }));

        setInitialImageFiles(imageFilesList);
        setInitialDocumentFiles(documentFilesList);
        setFileIds(imageFilesList.map(f => f.id).filter(id => id && id.length === 36));
        setDocumentFileIds(documentFilesList.map(f => f.id).filter(id => id && id.length === 36));
        
        // Update property with files that have URLs
        setProperty({
          ...propertyData,
          files: [...imageFilesWithUrls, ...documentFilesWithUrls]
        });
      } catch (error) {
        console.error('Error fetching property:', error);
        setError('Error al cargar la propiedad. Por favor, intente nuevamente.');
        toastError('Error al cargar la propiedad');
      } finally {
        setPageLoading(false);
      }
    };

    fetchProperty();
  }, [id, reset]);

  const onSubmit = async (data: Record<string, any>) => {
    try {
      setLoading(true);
      
      // Validate required data
      if (isEditMode && !id) {
        alertError('Error', 'ID de propiedad no encontrado');
        return;
      }
      
      const payload = {
        ...data,
        fileIds: fileIds.filter(id => id && id.length === 36) || [],
        documentFileIds: documentFileIds.filter(id => id && id.length === 36) || [],
        // Send negotiationClientId when status is Negociación or Vendido; clear it otherwise
        negotiationClientId: (data.status === 'Negociación' || data.status === 'Vendido') && data.negotiationClientId
          ? data.negotiationClientId
          : null,
      };
      
      console.log('=== SUBMITTING PROPERTY ===');
      console.log('fileIds:', payload.fileIds);
      console.log('documentFileIds:', payload.documentFileIds);
      console.log('isEditMode:', isEditMode);
      
      if (isEditMode) {
        const response = await api.patch(`/properties/${id}`, payload);
        console.log('Update response:', response.data);
        toastSuccess('Propiedad actualizada exitosamente');
      } else {
        const response = await api.post('/properties', payload);
        console.log('Create response:', response.data);
        toastSuccess('Propiedad creada exitosamente');
      }
      
      navigate('/admin/propiedades/gestion');
    } catch (error: any) {
      console.error('Error saving property:', error);
      const message = error.response?.data?.message || 'Error al guardar la propiedad';
      alertError('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleBasicServiceToggle = (service: string) => {
    const currentServices = getValues('basicServices') || [];
    const newServices = currentServices.includes(service)
      ? currentServices.filter((s: string) => s !== service)
      : [...currentServices, service];
    setValue('basicServices', newServices, { shouldValidate: false });
  };

  // Memoize advisor options to prevent unnecessary re-calculations
  const advisorOptions = useMemo(() => {
    if (!advisors || advisors.length === 0) {
      return <option value="" disabled>No hay asesores disponibles</option>;
    }
    return advisors.map((advisor) => (
      <option key={advisor.id} value={advisor.id}>
        {advisor.firstName} {advisor.lastName}
      </option>
    ));
  }, [advisors]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  }, [clients, clientSearch]);

  // Memoize property type options
  const propertyTypeOptions = useMemo(() => (
    <>
      <option value="Casa">Casa</option>
      <option value="Terreno">Terreno</option>
      <option value="Casa y terreno">Casa y terreno</option>
      <option value="Departamento">Departamento</option>
      <option value="Finca">Finca</option>
      <option value="Lote">Lote</option>
    </>
  ), []);

  // Memoize status options
  const statusOptions = useMemo(() => (
    <>
      <option value="Nuevo">Nuevo</option>
      <option value="Negociación">Negociación</option>
      <option value="Vendido">Vendido</option>
    </>
  ), []);

  // Memoize topography options
  const topographyOptions = useMemo(() => (
    <>
      <option value="Plano">Plano</option>
      <option value="Semiplano">Semiplano</option>
      <option value="Pendiente">Pendiente</option>
      <option value="Mixto">Mixto</option>
    </>
  ), []);

  // Memoize zone options
  const zoneOptions = useMemo(() => (
    <>
      <option value="Urbano">Urbano</option>
      <option value="Rural">Rural</option>
      <option value="Urbanización">Urbanización</option>
    </>
  ), []);


  // Show loading state while fetching data
  if (pageLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/admin/propiedades/gestion')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditMode ? 'Editar Propiedad' : 'Nueva Propiedad'}
          </h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando propiedad...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there was an error
  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/admin/propiedades/gestion')} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditMode ? 'Editar Propiedad' : 'Nueva Propiedad'}
          </h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center text-red-600">
            <p className="mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/propiedades/gestion')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditMode ? 'Editar Propiedad' : 'Nueva Propiedad'}
        </h1>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-gray-50 px-2 sm:px-4 md:px-6">
        <nav className="-mb-px flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {[
            { id: 'basic', label: 'Información Básica', shortLabel: 'Info', icon: FileText },
            { id: 'location', label: 'Ubicación', shortLabel: 'Ubicación', icon: MapPin },
            { id: 'details', label: 'Detalles', shortLabel: 'Detalles', icon: ListChecks },
            { id: 'prices', label: 'Precios', shortLabel: 'Precios', icon: DollarSign },
            { id: 'media', label: 'Multimedia', shortLabel: 'Media', icon: ImageIcon },
            { id: 'social', label: 'Redes Sociales', shortLabel: 'Social', icon: Share2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group relative min-w-fit flex items-center gap-2 px-2 sm:px-3 md:px-4 py-3 sm:py-4
                  border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200
                  ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-white shadow-sm'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-white/50'
                  }
                `}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform duration-200 ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`} />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.shortLabel}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 rounded-t"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
        {/* Basic Tab */}
        <div className={activeTab === 'basic' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
              <input
                type="text"
                {...register('code', { required: 'El código es requerido' })}
                className={`w-full p-2 border rounded-md ${errors.code ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                disabled={isEditMode}
              />
              {errors.code && <span className="text-red-500 text-xs">{errors.code.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asesor *</label>
              <select 
                {...register('advisorId', { required: 'El asesor es requerido' })} 
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                <option value="">Seleccionar asesor</option>
                {advisorOptions}
              </select>
              {errors.advisorId && <span className="text-red-500 text-xs">{errors.advisorId.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Propiedad *</label>
              <select 
                {...register('propertyType')} 
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {propertyTypeOptions}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select 
                {...register('status')} 
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {statusOptions}
              </select>
            </div>

            {(watchedStatus === 'Negociación' || watchedStatus === 'Vendido') && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente <span className="text-red-500">*</span>
                </label>
                {/* Hidden field for react-hook-form validation */}
                <input type="hidden" {...register('negotiationClientId', { required: 'Debes seleccionar el cliente en negociación' })} />
                <div className="relative" ref={clientDropdownRef}>
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={e => {
                      setClientSearch(e.target.value);
                      setValue('negotiationClientId', '', { shouldValidate: false });
                      setClientDropdownOpen(true);
                    }}
                    onFocus={() => setClientDropdownOpen(true)}
                    placeholder="Escribe nombre o teléfono..."
                    className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.negotiationClientId ? 'border-red-300' : 'border-gray-300'
                    }`}
                    autoComplete="off"
                  />
                  {clientDropdownOpen && filteredClients.length > 0 && (
                    <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
                      {filteredClients.map(client => (
                        <li
                          key={client.id}
                          onMouseDown={() => {
                            setValue('negotiationClientId', client.id, { shouldValidate: true });
                            setClientSearch(`${client.firstName} ${client.lastName}`);
                            setClientDropdownOpen(false);
                          }}
                          className="px-4 py-2 cursor-pointer hover:bg-blue-50 text-sm flex justify-between"
                        >
                          <span className="font-medium">{client.firstName} {client.lastName}</span>
                          <span className="text-gray-400 text-xs">{client.phone}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {clientDropdownOpen && filteredClients.length === 0 && clientSearch.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg px-4 py-2 text-sm text-gray-500">
                      No se encontraron clientes
                    </div>
                  )}
                </div>
                {errors.negotiationClientId && (
                  <span className="text-red-500 text-xs">{errors.negotiationClientId.message as string}</span>
                )}
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Completa *</label>
              <input
                type="text"
                {...register('address', { required: 'La dirección es requerida' })}
                className={`w-full p-2 border rounded-md ${errors.address ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              {errors.address && <span className="text-red-500 text-xs">{errors.address.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Propietario</label>
              <input
                type="text"
                {...register('owner')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Nombre del propietario"
              />
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                {...register('isPublic')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">Público</label>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                {...register('isFeatured')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">Destacado</label>
            </div>
          </div>
        </div>

        {/* Location Tab */}
        <div className={activeTab === 'location' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">URL de Google Maps *</label>
              <div className="relative">
                <input
                  type="text"
                  {...register('locationUrl', { required: 'La URL de Google Maps es requerida' })}
                  onPaste={(e) => {
                    const pastedUrl = e.clipboardData.getData('text').trim();
                    if (pastedUrl) {
                      e.preventDefault();
                      setValue('locationUrl', pastedUrl, { shouldValidate: true });
                      extractCoordsFromGoogleMapsUrl(pastedUrl);
                    }
                  }}
                  onChange={(e) => {
                    register('locationUrl').onChange(e);
                    const val = e.target.value.trim();
                    if (val.startsWith('http') && val.length > 25) {
                      extractCoordsFromGoogleMapsUrl(val);
                    }
                  }}
                  className={`w-full p-2 border rounded-md pr-10 ${errors.locationUrl ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  placeholder="https://maps.app.goo.gl/... o https://www.google.com/maps/..."
                />
                {resolvingUrl && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              {errors.locationUrl && <span className="text-red-500 text-xs">{errors.locationUrl.message as string}</span>}
              <p className="text-xs text-gray-500 mt-1">Soporta URLs cortas (maps.app.goo.gl) y completas. La latitud y longitud se extraen automáticamente.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área de Construcción (m²)</label>
              <input
                type="number"
                {...register('constructionArea', { required: 'El área de construcción es requerida' })}
                className={`w-full p-2 border rounded-md ${errors.constructionArea ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              {errors.constructionArea && <span className="text-red-500 text-xs">{errors.constructionArea.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área de Terreno (m²)</label>
              <input
                type="number"
                {...register('landArea', { required: 'El área de terreno es requerida' })}
                className={`w-full p-2 border rounded-md ${errors.landArea ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              {errors.landArea && <span className="text-red-500 text-xs">{errors.landArea.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
              <input
                type="text"
                {...register('latitude', { required: 'La latitud es requerida' })}
                className={`w-full p-2 border rounded-md ${errors.latitude ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              {errors.latitude && <span className="text-red-500 text-xs">{errors.latitude.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
              <input
                type="text"
                {...register('longitude', { required: 'La longitud es requerida' })}
                className={`w-full p-2 border rounded-md ${errors.longitude ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              {errors.longitude && <span className="text-red-500 text-xs">{errors.longitude.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo a la Ciudad (minutos)</label>
              <input
                type="number"
                {...register('cityTime', { required: 'El tiempo a la ciudad es requerido' })}
                className={`w-full p-2 border rounded-md ${errors.cityTime ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              {errors.cityTime && <span className="text-red-500 text-xs">{errors.cityTime.message as string}</span>}
            </div>
          </div>
        </div>

        {/* Details Tab */}
        <div className={activeTab === 'details' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Años de Construcción</label>
              <input
                type="number"
                {...register('constructionYears', { required: 'Los años de construcción son requeridos' })}
                className={`w-full p-2 border rounded-md ${errors.constructionYears ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              {errors.constructionYears && <span className="text-red-500 text-xs">{errors.constructionYears.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topografía</label>
              <select 
                {...register('topography')} 
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {topographyOptions}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zona</label>
              <select 
                {...register('zone')} 
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {zoneOptions}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('hasBasicServices', {
                  onChange: (e) => setShowBasicServices(e.target.checked)
                })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">¿Tiene servicios básicos?</label>
            </div>

            {showBasicServices && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Servicios Básicos</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['Agua', 'Luz', 'Internet', 'Agua de Riego', 'Alcantarillado', 'Teléfono'].map((service) => (
                    <label key={service} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={watchedBasicServices.includes(service)}
                        onChange={() => handleBasicServiceToggle(service)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{service}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Características</label>
              <textarea
                {...register('features')}
                rows={4}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Describa las características de la propiedad..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea
                {...register('observations')}
                rows={4}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>
        </div>

        {/* Prices Tab */}
        <div className={activeTab === 'prices' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta ($) *</label>
              <input
                type="number"
                step="0.01"
                {...register('price', { required: 'El precio es requerido', min: { value: 0, message: 'Mínimo 0' } })}
                className={`w-full p-2 border rounded-md ${errors.price ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              {errors.price && <span className="text-red-500 text-xs">{errors.price.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comisión (%)</label>
              <input
                type="number"
                step="0.01"
                {...register('commission', { required: 'La comisión es requerida', min: { value: 0, message: 'Mínimo 0' } })}
                className={`w-full p-2 border rounded-md ${errors.commission ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              />
              {errors.commission && <span className="text-red-500 text-xs">{errors.commission.message as string}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Mínimo ($)</label>
              <input
                type="number"
                step="0.01"
                {...register('minPrice', { min: { value: 0, message: 'Mínimo 0' } })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Máximo ($)</label>
              <input
                type="number"
                step="0.01"
                {...register('maxPrice', { min: { value: 0, message: 'Mínimo 0' } })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta Real ($)</label>
              <input
                type="number"
                step="0.01"
                {...register('salePrice', { min: { value: 0, message: 'Mínimo 0' } })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Media Tab */}
        <div className={activeTab === 'media' ? 'block' : 'hidden'}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes de la Propiedad</label>
              <FileUpload
                onFilesChange={handleImageFilesChange}
                initialFiles={initialImageFiles}
                accept="image/*"
                multiple
                showPreview={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Documentos</label>
              <FileUpload
                onFilesChange={handleDocumentFilesChange}
                initialFiles={initialDocumentFiles}
                accept=".pdf,.doc,.docx"
                multiple
                showPreview={true}
                displayMode="list"
              />
            </div>
          </div>
        </div>

        {/* Social Tab */}
        <div className={activeTab === 'social' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label>
              <input
                type="url"
                {...register('facebookUrl')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="https://facebook.com/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
              <input
                type="url"
                {...register('instagramUrl')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="https://instagram.com/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TikTok URL</label>
              <input
                type="url"
                {...register('tiktokUrl')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="https://tiktok.com/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
              <input
                type="url"
                {...register('youtubeUrl')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
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
              isEditMode ? 'Actualizar Propiedad' : 'Crear Propiedad'
            )}
          </button>
        </div>
      </form>
      
      {/* Close card container */}
      </div>
    </div>
  );
};