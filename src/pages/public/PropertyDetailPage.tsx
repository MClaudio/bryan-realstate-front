import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import { MapPin, Building, ArrowLeft, ChevronLeft, ChevronRight, Instagram, Youtube, Facebook } from 'lucide-react'

export const PropertyDetailPage = () => {
  const { id } = useParams()
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const buildMapsEmbedUrl = (locUrl?: string, lat?: number, lng?: number) => {
    if (typeof lat === 'number' && typeof lng === 'number') {
      return `https://www.google.com/maps?q=${lat},${lng}&hl=es&z=15&output=embed`
    }
    if (locUrl && locUrl.includes('google.com/maps')) {
      const base = locUrl.split('?')[0]
      const qs = locUrl.includes('?') ? locUrl.split('?')[1] : ''
      const url = `${base}?${qs}${qs ? '&' : ''}output=embed`
      return url
    }
    return undefined
  }

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await api.get(`/properties/public/${id}`)
        setProperty(res.data)
      } catch (e) {
        console.error('Error fetching property', e)
      } finally {
        setLoading(false)
      }
    }
    fetchProperty()
  }, [id])

  const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api'
  const base = String(apiBase).replace(/\/$/, '')
  const images: string[] = (property?.files || [])
    .filter((pf: any) => pf.fileType === 'image')
    .map((pf: any) => `${base}/public/files/${pf.file.id}`)
  const services: string[] = Array.isArray(property?.basicServices)
    ? property?.basicServices
    : (typeof property?.basicServices === 'string' ? (() => { try { return JSON.parse(property.basicServices) } catch { return [] } })() : [])
  const mapsEmbed = buildMapsEmbedUrl(property?.locationUrl, Number(property?.latitude), Number(property?.longitude))

  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length)
  const next = () => setCurrent((c) => (c + 1) % images.length)

  if (loading) return <div className="container mx-auto px-4 py-8">Cargando...</div>
  if (!property) return <div className="container mx-auto px-4 py-8">Propiedad no encontrada</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/propiedades" className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">{property.address}</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="relative h-[480px] bg-gray-100">
          {images.length > 0 ? (
            <>
              <img src={images[current]} alt={property.code} className="w-full h-full object-cover" />
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
            <h2 className="text-xl font-semibold">Detalles</h2>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <MapPin size={16} />
              <span>{property.address}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-gray-600">
              <span className="flex items-center gap-1">
                <Building size={16} /> {Number(property.constructionArea)} m² construcción
              </span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">{property.status}</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{property.propertyType}</span>
              {property.zone && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{property.zone}</span>}
              {property.topography && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">{property.topography}</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>
            {(property.facebookUrl || property.instagramUrl || property.youtubeUrl || property.tiktokUrl) && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-gray-800 font-semibold mb-2">Redes</div>
                <div className="flex flex-wrap gap-2">
                  {property.facebookUrl && <a href={property.facebookUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100"><Facebook size={16} /> Facebook</a>}
                  {property.instagramUrl && <a href={property.instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100"><Instagram size={16} /> Instagram</a>}
                  {property.youtubeUrl && <a href={property.youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100"><Youtube size={16} /> YouTube</a>}
                  {property.tiktokUrl && <a href={property.tiktokUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 text-sm border rounded hover:bg-gray-100">TikTok</a>}
                </div>
              </div>
            )}
            {property.advisor && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-gray-800 font-semibold mb-1">Asesor</div>
                <div className="text-sm text-gray-700">{property.advisor.firstName} {property.advisor.lastName}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
