import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Building, MapPin, Phone, Mail, Instagram, Facebook, Youtube, MessageCircle, Star, Shield, Users, TrendingUp } from 'lucide-react';
import api from '../../services/api';

interface Configuration {
  companyName: string;
  businessName: string;
  phone: string;
  email?: string;
  facebookProfile?: string;
  instagramProfile?: string;
  youtubeProfile?: string;
  whatsappLink?: string;
  logo?: {
    id: string;
    originalName: string;
    path: string;
  };
}

interface FeaturedProperty {
  id: string;
  code: string;
  title: string;
  address: string;
  price: number;
  propertyType: string;
  constructionArea: number;
  files: Array<{
    file: {
      id: string;
      path: string;
      originalName: string;
    };
    fileType: string;
  }>;
}

export const HomePage = () => {
  const [config, setConfig] = useState<Configuration | null>(null);
  const [featuredProperties, setFeaturedProperties] = useState<FeaturedProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configResponse, featuredResponse] = await Promise.all([
          api.get('/configuration'),
          api.get('/properties/featured')
        ]);
        setConfig(configResponse.data);
        setFeaturedProperties(featuredResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const services = [
    {
      icon: <Search className="w-8 h-8" />,
      title: "Búsqueda Personalizada",
      description: "Encontramos la propiedad que se ajusta a tus necesidades y presupuesto con nuestro sistema de filtros avanzados."
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Transacciones Seguras",
      description: "Procesos legales transparentes y asesoría profesional en cada etapa de tu compra o venta."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Agentes Expertos",
      description: "Equipo certificado con amplio conocimiento del mercado inmobiliario local y nacional."
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Valoración Precisa",
      description: "Análisis detallado del mercado para obtener el mejor precio en tu propiedad."
    }
  ];

  const testimonials = [
    {
      name: "María González",
      role: "Cliente Satisfecha",
      comment: "Excelente servicio, encontraron la casa perfecta para mi familia. El proceso fue rápido y seguro.",
      rating: 5
    },
    {
      name: "Carlos Rodríguez",
      role: "Inversionista",
      comment: "Profesionales en todo el proceso. Me ayudaron a encontrar una excelente oportunidad de inversión.",
      rating: 5
    },
    {
      name: "Ana López",
      role: "Vendedora",
      comment: "Vendí mi propiedad en tiempo récord y al mejor precio del mercado. Muy recomendados.",
      rating: 5
    }
  ];

  const stats = [
    { number: "500+", label: "Propiedades Vendidas" },
    { number: "15+", label: "Años de Experiencia" },
    { number: "98%", label: "Clientes Satisfechos" },
    { number: "50+", label: "Agentes Certificados" }
  ];

  const getPropertyImage = (property: FeaturedProperty) => {
    const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
    const base = String(apiBase).replace(/\/$/, '');
    const firstImage = property.files?.find(pf => pf.fileType === 'image')?.file;
    return firstImage ? `${base}/public/files/${firstImage.id}` : "https://images.unsplash.com/photo-1600596542815-27b5c0b8aa2b?auto=format&fit=crop&w=800&q=80";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[600px] bg-gray-900">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80")' }}
        />
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-center items-center text-center text-white">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Tu Propiedad Ideal en {config?.companyName || 'Ecuador'}
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-2xl mx-auto">
              Especialistas en casas, terrenos y departamentos en las mejores zonas del país. 
              Más de 15 años de experiencia respaldando tu inversión.
            </p>
            
            {/* Quick Search */}
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-2xl w-full max-w-4xl">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="¿Dónde buscas tu propiedad?" 
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  />
                </div>
                <select className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800">
                  <option value="">Tipo de Propiedad</option>
                  <option value="Casa">Casa</option>
                  <option value="Departamento">Departamento</option>
                  <option value="Terreno">Terreno</option>
                  <option value="Finca">Finca</option>
                  <option value="Lote">Lote</option>
                </select>
                <Link to="/propiedades" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 min-w-fit">
                  <Search size={20} /> Buscar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="">
                <div className="text-3xl md:text-4xl font-bold mb-2">{stat.number}</div>
                <div className="text-blue-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Propiedades Destacadas
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Las mejores oportunidades del mercado, seleccionadas especialmente para ti
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando propiedades destacadas...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {featuredProperties.map((property) => (
                  <div key={property.id} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        src={getPropertyImage(property)} 
                        alt={property.code}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                      <span className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        En Venta
                      </span>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="text-white text-2xl font-bold">${Number(property.price).toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {property.title || `${property.propertyType} en ${property.address}`}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-600 mb-4">
                        <MapPin size={16} />
                        <span className="text-sm">{property.address}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <Building size={16} className="text-gray-500" />
                          <span className="text-sm text-gray-600">{Number(property.constructionArea)} m²</span>
                        </div>
                        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                          {property.propertyType}
                        </span>
                      </div>
                      
                      <Link 
                        to={`/propiedades/${property.id}`}
                        className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                      >
                        Ver Detalles
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Link to="/propiedades" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold transition">
                  Ver Todas las Propiedades <ArrowRight size={20} />
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Nuestros Servicios
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Ofrecemos soluciones integrales para todas tus necesidades inmobiliarias
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <div key={index} className="text-center group">
                <div className="bg-blue-50 group-hover:bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 group-hover:text-blue-700 transition-colors">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              La satisfacción de nuestros clientes es nuestra mayor recompensa
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.comment}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              ¿Listo para encontrar tu propiedad ideal?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Contáctanos hoy y descubre cómo podemos ayudarte a hacer realidad tu sueño de tener la propiedad perfecta.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/propiedades" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold transition">
                Explorar Propiedades
              </Link>
              <a 
                href={config?.whatsappLink || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <MessageCircle size={20} /> Contactar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <Building className="w-8 h-8 text-blue-400" />
                <div>
                  <h3 className="text-xl font-bold">{config?.companyName || 'Inmobiliaria'}</h3>
                  <p className="text-gray-400 text-sm">{config?.businessName}</p>
                </div>
              </div>
              <p className="text-gray-300 mb-6 max-w-md">
                Somos una empresa inmobiliaria con más de 15 años de experiencia en el mercado ecuatoriano. 
                Nos especializamos en la compra, venta y alquiler de propiedades residenciales y comerciales.
              </p>
              <div className="flex gap-4">
                {config?.facebookProfile && (
                  <a href={config.facebookProfile} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition">
                    <Facebook size={24} />
                  </a>
                )}
                {config?.instagramProfile && (
                  <a href={config.instagramProfile} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-400 transition">
                    <Instagram size={24} />
                  </a>
                )}
                {config?.youtubeProfile && (
                  <a href={config.youtubeProfile} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-400 transition">
                    <Youtube size={24} />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Enlaces Rápidos</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link to="/propiedades" className="hover:text-white transition">Propiedades</Link></li>
                <li><Link to="/nosotros" className="hover:text-white transition">Nosotros</Link></li>
                <li><Link to="/servicios" className="hover:text-white transition">Servicios</Link></li>
                <li><Link to="/contacto" className="hover:text-white transition">Contacto</Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Contacto</h4>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-blue-400" />
                  <span>{config?.phone || '+593 99 999 9999'}</span>
                </div>
                {config?.email && (
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-blue-400" />
                    <a href={`mailto:${config.email}`} className="hover:text-white transition">{config.email}</a>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-blue-400" />
                  <span>Quito, Ecuador</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 {config?.companyName || 'Inmobiliaria'}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};