import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Search, MapPin, Building, Filter } from 'lucide-react';

interface Property {
  id: string;
  code: string;
  price: number;
  address: string;
  constructionArea: number;
  propertyType: string;
  status: string;
  images?: { path: string }[];
  files?: { file: { id: string, path: string } }[];
}

export const PropertiesPage = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await api.get('/properties/public');
        setProperties(response.data);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Propiedades Disponibles</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Encuentra la propiedad ideal para ti con las mejores opciones del mercado
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-grow relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="Buscar por ubicación, código..." 
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-6 py-3 rounded-lg transition-colors"
            >
              <Filter size={20} /> Filtros
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors font-semibold">
              Buscar
            </button>
          </div>

          {/* Filter Chips */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Tipo de propiedad</option>
                  <option>Casa</option>
                  <option>Terreno</option>
                  <option>Departamento</option>
                  <option>Finca</option>
                  <option>Lote</option>
                </select>
                <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Estado</option>
                  <option>Nuevo</option>
                  <option>Negociación</option>
                  <option>Vendido</option>
                </select>
                <input type="number" placeholder="Precio mínimo" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="number" placeholder="Precio máximo" className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 pb-16">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando propiedades...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map((property) => (
              <div key={property.id} className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
                {/* Image with overlay */}
                <div className="relative h-64 bg-gray-100 overflow-hidden">
                  <img 
                    src={(() => {
                      const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
                      const base = String(apiBase).replace(/\/$/, '');
                      const firstImageId = property.files?.find((pf: any) => (pf as any).fileType === 'image')?.file?.id || property.files?.[0]?.file?.id;
                      return firstImageId ? `${base}/public/files/${firstImageId}` : "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";
                    })()} 
                    alt={property.code} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  <span className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-gray-800">
                    {property.code}
                  </span>
                  <span className="absolute bottom-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {property.propertyType}
                  </span>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {property.address}
                    </h3>
                    <p className="text-2xl font-bold text-blue-600 whitespace-nowrap ml-4">
                      ${Number(property.price).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                    <MapPin size={16} />
                    <span className="truncate">{property.address}</span>
                  </div>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Building size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-600">{Number(property.constructionArea)} m²</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      property.status === 'Nuevo' ? 'bg-green-100 text-green-700' :
                      property.status === 'Vendido' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {property.status}
                    </span>
                  </div>
                  
                  <a 
                    href={`/propiedades/${property.id}`} 
                    className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                  >
                    Ver Detalles
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {properties.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Building size={64} className="mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No se encontraron propiedades</h3>
            <p className="text-gray-500">Intenta ajustar tus filtros o criterios de búsqueda</p>
          </div>
        )}
      </div>
    </div>
  );
};