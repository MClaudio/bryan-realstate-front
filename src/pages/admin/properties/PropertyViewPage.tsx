import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../../services/api';
import { ArrowLeft, MapPin, ChevronLeft, ChevronRight, Download, BadgePercent } from 'lucide-react';

export const PropertyViewPage = () => {
  const { id } = useParams();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [images, setImages] = useState<{ id: string; url: string; name: string }[]>([]);
  const [documents, setDocuments] = useState<{ id: string; name: string; size: number; url: string }[]>([]);

  const buildMapsEmbedUrl = (locUrl?: string, lat?: number, lng?: number) => {
    if (typeof lat === 'number' && typeof lng === 'number') {
      return `https://www.google.com/maps?q=${lat},${lng}&hl=es&z=15&output=embed`;
    }
    if (locUrl && locUrl.includes('google.com/maps')) {
      const base = locUrl.split('?')[0];
      const qs = locUrl.includes('?') ? locUrl.split('?')[1] : '';
      const url = `${base}?${qs}${qs ? '&' : ''}output=embed`;
      return url;
    }
    return undefined;
  };

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await api.get(`/properties/${id}`);
        setProperty(res.data);
        if (res.data.files) {
          const imgFiles = res.data.files.filter((pf: any) => pf.fileType === 'image');
          const docFiles = res.data.files.filter((pf: any) => pf.fileType === 'document');
          const imgs = await Promise.all(imgFiles.map(async (pf: any) => {
            try {
              const urlResp = await api.get(`/files/${pf.file.id}/url`);
              return { id: pf.file.id, url: urlResp.data.url, name: pf.file.originalName };
            } catch {
              return { id: pf.file.id, url: pf.file.path, name: pf.file.originalName };
            }
          }));
          setImages(imgs);
          const docs = await Promise.all(docFiles.map(async (pf: any) => {
            try {
              const urlResp = await api.get(`/files/${pf.file.id}/url`);
              return { id: pf.file.id, name: pf.file.originalName, size: pf.file.size, url: urlResp.data.url };
            } catch {
              return { id: pf.file.id, name: pf.file.originalName, size: pf.file.size, url: pf.file.path };
            }
          }));
          setDocuments(docs);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  const services: string[] = Array.isArray(property?.basicServices)
    ? property?.basicServices
    : (typeof property?.basicServices === 'string' ? (() => { try { return JSON.parse(property.basicServices) } catch { return [] } })() : []);
  const mapsEmbed = buildMapsEmbedUrl(property?.locationUrl, Number(property?.latitude), Number(property?.longitude));

  const prev = () => setCurrent((c) => (images.length ? (c - 1 + images.length) % images.length : 0));
  const next = () => setCurrent((c) => (images.length ? (c + 1) % images.length : 0));

  if (loading) return <div className="p-8">Cargando...</div>;
  if (!property) return <div className="p-8">Propiedad no encontrada</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/propiedades/gestion" className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Propiedad {property.code}</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="relative h-[420px] bg-gray-100">
          {images.length > 0 ? (
            <>
              <img src={images[current].url} alt={images[current].name} className="w-full h-full object-cover" />
              <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow hover:bg-white">
                <ChevronLeft size={22} />
              </button>
              <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow hover:bg-white">
                <ChevronRight size={22} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full ${i === current ? 'bg-blue-600' : 'bg-white/70'} border border-white`}
                    onClick={() => setCurrent(i)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">Sin imágenes</div>
          )}
          <span className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-sm font-bold text-gray-800">
            {property.code}
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Información General</h2>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <MapPin size={16} />
              <span>{property.address}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-gray-600">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{property.propertyType}</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{property.status}</span>
              {property.zone && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{property.zone}</span>}
              {property.topography && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">{property.topography}</span>}
              {property.owner && <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">Propietario: {property.owner}</span>}
              {property.isPublic ? <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs">Publicada</span> : <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">No pública</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Área Construcción</div>
                <div className="text-sm font-semibold">{Number(property.constructionArea)} m²</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Área Terreno</div>
                <div className="text-sm font-semibold">{Number(property.landArea)} m²</div>
              </div>
              {property.constructionYears !== null && property.constructionYears !== undefined && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Años Construcción</div>
                  <div className="text-sm font-semibold">{Number(property.constructionYears)}</div>
                </div>
              )}
              {property.cityTime !== null && property.cityTime !== undefined && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Tiempo a la ciudad</div>
                  <div className="text-sm font-semibold">{Number(property.cityTime)} min</div>
                </div>
              )}
            </div>
            {services && services.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Servicios Básicos</h3>
                <div className="flex flex-wrap gap-2">
                  {services.map((s, i) => (
                    <span key={`${s}-${i}`} className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {property.features && (
              <div>
                <h3 className="text-lg font-medium mb-2">Descripción</h3>
                <p className="text-gray-700 whitespace-pre-line">{property.features}</p>
              </div>
            )}
            {mapsEmbed ? (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Mapa</h3>
                <div className="w-full aspect-video rounded-lg overflow-hidden border">
                  <iframe
                    title="Mapa de la propiedad"
                    src={mapsEmbed}
                    width="100%"
                    height="100%"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            ) : (
              property.locationUrl && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Mapa</h3>
                  <a href={property.locationUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Ver en Google Maps</a>
                </div>
              )
            )}
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-gray-500 text-sm">Precio</div>
              <div className="text-2xl font-bold text-blue-600">${Number(property.price).toLocaleString()}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {property.minPrice && <div><span className="text-gray-500">Mín:</span> ${Number(property.minPrice).toLocaleString()}</div>}
                {property.maxPrice && <div><span className="text-gray-500">Máx:</span> ${Number(property.maxPrice).toLocaleString()}</div>}
                {property.commission && <div className="col-span-2 flex items-center gap-1 text-gray-700"><BadgePercent size={16} /> Comisión {Number(property.commission)}%</div>}
                {property.salePrice && <div className="col-span-2"><span className="text-gray-500">Precio de Venta:</span> ${Number(property.salePrice).toLocaleString()}</div>}
              </div>
            </div>
            {documents.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-gray-800 font-semibold mb-2">Documentos</div>
                <div className="space-y-2">
                  {documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate">{d.name}</span>
                      <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100">
                        <Download size={16} /> Descargar
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {property.advisor && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-gray-800 font-semibold mb-1">Asesor</div>
                <div className="text-sm text-gray-700">{property.advisor.firstName} {property.advisor.lastName}</div>
                {property.advisor.email && <div className="text-xs text-gray-500">{property.advisor.email}</div>}
                {property.advisor.phone && <div className="text-xs text-gray-500">{property.advisor.phone}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
