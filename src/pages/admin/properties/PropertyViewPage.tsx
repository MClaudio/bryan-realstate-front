import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { ArrowLeft, MapPin, ChevronLeft, ChevronRight, Download, BadgePercent, X, Heart, ImageIcon, ListChecks, Copy, FileText } from 'lucide-react';
import { toastError, toastSuccess } from '../../../utils/alerts';
import { ClientInfoModal, type ClientInterestContext } from '../../../components/clients/ClientInfoModal';
import { PROPERTY_STATUS_LABELS, PROPERTY_TYPE_LABELS, ZONE_LABELS } from '../../../utils/propertyEnums';
import { PropertyChecklistModal } from './PropertyChecklistModal';
import { PropertyChecklistSummary } from './PropertyChecklistSummary';
import { SaleProcessCard } from '../processes/SaleProcessCard';
import { InterestedClientsSection } from './InterestedClientsSection';

// ─── Image lightbox ──────────────────────────────────────────────────────────
interface GalleryImage { id: string; url: string; name: string }

const ImageLightbox = ({
  images,
  index,
  onChange,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}) => {
  const count = images.length;
  const prev = useCallback(() => onChange((index - 1 + count) % count), [index, count, onChange]);
  const next = useCallback(() => onChange((index + 1) % count), [index, count, onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [prev, next, onClose]);

  const image = images[index];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white/90 text-sm" onClick={(e) => e.stopPropagation()}>
        <span className="truncate pr-4">{image.name}</span>
        <div className="flex items-center gap-4 flex-none">
          <span>{index + 1} / {count}</span>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10" title="Cerrar">
            <X size={22} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 sm:px-16">
        <img
          src={image.url}
          alt={image.name}
          className="max-h-full max-w-full object-contain select-none"
          onClick={(e) => e.stopPropagation()}
        />
        {count > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/30 text-white p-3 rounded-full"
              title="Anterior"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/30 text-white p-3 rounded-full"
              title="Siguiente"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 justify-start sm:justify-center" onClick={(e) => e.stopPropagation()}>
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => onChange(i)}
              className={`flex-none w-16 h-16 rounded-md overflow-hidden border-2 transition-opacity ${
                i === index ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Interest types ──────────────────────────────────────────────────────────
type InterestLevel = 'Bajo' | 'Medio' | 'Alto' | 'MuyAlto';
const INTEREST_LEVELS: { value: InterestLevel; label: string; color: string; stars: number }[] = [
  { value: 'Bajo',    label: 'Bajo',     color: 'bg-gray-100 text-gray-600',    stars: 1 },
  { value: 'Medio',   label: 'Medio',    color: 'bg-yellow-100 text-yellow-700', stars: 2 },
  { value: 'Alto',    label: 'Alto',     color: 'bg-orange-100 text-orange-700', stars: 3 },
  { value: 'MuyAlto', label: 'Muy Alto', color: 'bg-red-100 text-red-700',       stars: 4 },
];
const INTEREST_LEVEL_RANK: Record<InterestLevel, number> = {
  Bajo: 1,
  Medio: 2,
  Alto: 3,
  MuyAlto: 4,
};
interface ClientSummary { id: string; firstName: string; lastName: string; email?: string; phone: string }
interface PropertyInterest {
  id: string;
  interestDate: string;
  interestLevel: InterestLevel;
  notes?: string;
  source?: 'manual' | 'ia';
  client: ClientSummary;
}

// ─── Interest Form Modal ──────────────────────────────────────────────────────
const InterestFormModal = ({
  propertyId, clients, onClose, onSaved,
}: {
  propertyId: string;
  clients: ClientSummary[];
  onClose: () => void;
  onSaved: (item: PropertyInterest) => void;
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [clientId, setClientId] = useState('');
  const [interestDate, setInterestDate] = useState(today);
  const [interestLevel, setInterestLevel] = useState<InterestLevel>('Medio');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError('Seleccione un cliente'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/property-interests', { propertyId, clientId, interestDate, interestLevel, notes: notes || undefined });
      onSaved(res.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-pink-100"><Heart size={18} className="text-pink-600" /></div>
            <h2 className="text-lg font-bold text-gray-900">Registrar Interés</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              required
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.phone}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input
                type="date"
                value={interestDate}
                onChange={e => setInterestDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de Interés *</label>
              <select
                value={interestLevel}
                onChange={e => setInterestLevel(e.target.value as InterestLevel)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                {INTEREST_LEVELS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
              placeholder="Observaciones sobre el interés del cliente..."
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const PropertyViewPage = () => {
  const [infoClient, setInfoClient] = useState<{ clientId: string; interest?: ClientInterestContext } | null>(null);
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [showChecklist, setShowChecklist] = useState(false);
  // Bumped when the checklist modal closes so the summary re-fetches.
  const [checklistVersion, setChecklistVersion] = useState(0);
  const [documents, setDocuments] = useState<{ id: string; name: string; size: number; url: string }[]>([]);
  const [interests, setInterests] = useState<PropertyInterest[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [deletingInterestId, setDeletingInterestId] = useState<string | null>(null);
  const [generatingProposal, setGeneratingProposal] = useState(false);

  const extractCoordsFromUrl = (url: string): { lat: number; lng: number } | null => {
    // For place URLs, use the LAST !3d!4d pair (actual place pin, not viewport or nearby results)
    const placeMatches = [...url.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
    if (placeMatches.length > 0) {
      const last = placeMatches[placeMatches.length - 1];
      return { lat: parseFloat(last[1]), lng: parseFloat(last[2]) };
    }
    // Fall back: simple link patterns
    const fallback = [
      /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    ];
    for (const p of fallback) {
      const m = url.match(p);
      if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
    }
    return null;
  };

  const buildMapsEmbedUrl = (locUrl?: string, lat?: number, lng?: number) => {
    // Always prefer coords from locationUrl (source of truth for the exact pin)
    if (locUrl) {
      const coords = extractCoordsFromUrl(locUrl);
      if (coords) return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&hl=es&z=15&output=embed`;
    }
    // Fall back to stored lat/lng (skip 0,0 which is likely an unset default)
    if (
      typeof lat === 'number' && !isNaN(lat) && lat !== 0 &&
      typeof lng === 'number' && !isNaN(lng) && lng !== 0
    ) {
      return `https://maps.google.com/maps?q=${lat},${lng}&hl=es&z=15&output=embed`;
    }
    return undefined;
  };

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await api.get(`/properties/${id}`);
        setProperty(res.data);
        if (res.data.files) {
          const imgFiles = res.data.files
            .filter((pf: any) => pf.fileType === 'image')
            .sort((a: any, b: any) =>
              (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER));
          const docFiles = res.data.files.filter((pf: any) => pf.fileType === 'document');
          // Backend PropertiesService enrichPropertyFiles() already fills pf.file.path
          // with the presigned S3 URL (or our placeholder SVG on any failure).
          // So we don't need a second roundtrip to /files/:id/url.
          const imgs = imgFiles.map((pf: any) => ({
            id: pf.file.id,
            url: (pf.file.path as string) || '',
            name: pf.file.originalName,
          }));
          setImages(imgs);
          const docs = docFiles.map((pf: any) => ({
            id: pf.file.id,
            name: pf.file.originalName,
            size: pf.file.size,
            url: (pf.file.path as string) || '',
          }));
          setDocuments(docs);
        }
        // Fetch interests
        try {
          const intRes = await api.get(`/property-interests?propertyId=${id}`);
          setInterests(sortInterests(Array.isArray(intRes.data) ? intRes.data : []));
        } catch { /* non-critical */ }
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

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const loadClients = async () => {
    if (clients.length > 0) return;
    try {
      const res = await api.get('/clients');
      setClients(res.data.map((c: any) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone })));
    } catch { /* non-critical */ }
  };

  // Al abrir desde una notificación: marcarla como leída y limpiar la URL.
  useEffect(() => {
    const notificationId = new URLSearchParams(location.search).get('notificationId');
    if (!notificationId) return;
    api.patch(`/notifications/${notificationId}/read`).catch(() => undefined);
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const sortInterests = (items: PropertyInterest[]): PropertyInterest[] =>
    [...items].sort((a, b) => {
      const rank = INTEREST_LEVEL_RANK[b.interestLevel] - INTEREST_LEVEL_RANK[a.interestLevel];
      if (rank !== 0) return rank;
      const aDate = new Date(a.interestDate).getTime();
      const bDate = new Date(b.interestDate).getTime();
      return bDate - aDate;
    });

  const refreshInterests = async () => {
    if (!id) return;
    try {
      const intRes = await api.get(`/property-interests?propertyId=${id}`);
      setInterests(sortInterests(Array.isArray(intRes.data) ? intRes.data : []));
    } catch {
      // non-critical
    }
  };

  const handleDeleteInterest = async (iid: string) => {
    setDeletingInterestId(iid);
    try {
      await api.delete(`/property-interests/${iid}`);
      setInterests(prev => prev.filter(i => i.id !== iid));
    } catch { /* non-critical */ } finally {
      setDeletingInterestId(null);
    }
  };

  /** Genera en el backend la propuesta de valor (PDF) y la abre en otra pestaña para imprimir/descargar. */
  const handleGenerateProposal = async () => {
    if (!id) return;
    // Open the tab synchronously (inside the click) so popup blockers allow it.
    const tab = window.open('', '_blank');
    setGeneratingProposal(true);
    try {
      const res = await api.get(`/properties/${id}/proposal-pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      if (tab && !tab.closed) {
        tab.location.href = url;
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Propuesta-${property?.code ?? id}.pdf`;
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      tab?.close();
      toastError('No se pudo generar la propuesta en PDF.');
    } finally {
      setGeneratingProposal(false);
    }
  };

  if (loading) return <div className="p-8">Cargando...</div>;
  if (!property) return <div className="p-8">Propiedad no encontrada</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/propiedades/gestion" className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Propiedad {property.code}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateProposal}
            disabled={generatingProposal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium transition-colors disabled:opacity-60"
            title="Generar propuesta de valor en PDF para el cliente"
          >
            <FileText size={16} /> {generatingProposal ? 'Generando...' : 'Propuesta PDF'}
          </button>
          <button
            onClick={() => setShowChecklist(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <ListChecks size={16} /> Checklist
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ImageIcon size={20} className="text-gray-500" /> Fotos
              {images.length > 0 && <span className="text-sm font-normal text-gray-400">({images.length})</span>}
            </h2>
          </div>
          {images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title={img.name}
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  {i === 0 && (
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                      Portada
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 rounded-lg bg-gray-50 border border-dashed border-gray-200 text-gray-400 text-sm">
              Sin imágenes
            </div>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Información General</h2>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <MapPin size={16} />
              <span>{property.address}</span>
            </div>
            {(property.city?.name || property.referenceSector) && (
              <div className="flex flex-wrap items-center gap-3 text-gray-600 text-sm">
                {property.city?.name && (
                  <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full text-xs">
                    Ciudad: {property.city.name}
                  </span>
                )}
                {property.referenceSector && (
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                    Reference Sector: {property.referenceSector}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 text-gray-600">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                {PROPERTY_STATUS_LABELS[property.status] ?? property.status}
              </span>
              {property.zone && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{ZONE_LABELS[property.zone] ?? property.zone}</span>}
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
            {(property.publicShortDescription || property.publicLongDescription) && (
              <div className="space-y-4 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
                <h3 className="text-lg font-medium">Descripción pública (para el cliente)</h3>
                {[
                  { label: 'Descripción corta', text: property.publicShortDescription as string | null },
                  { label: 'Descripción larga', text: property.publicLongDescription as string | null },
                ]
                  .filter((item) => item.text)
                  .map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-600">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard
                              .writeText(item.text ?? '')
                              .then(() => toastSuccess(`${item.label} copiada`))
                              .catch(() => toastError('No se pudo copiar'));
                          }}
                          className="flex items-center gap-1 text-sm text-indigo-700 hover:underline"
                        >
                          <Copy size={14} /> Copiar
                        </button>
                      </div>
                      <p className="text-gray-700 whitespace-pre-line">{item.text}</p>
                    </div>
                  ))}
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

            {/* ── Document Checklist ───────────────────────────────── */}
            {id && (
              <PropertyChecklistSummary
                key={checklistVersion}
                propertyId={id}
                onOpen={() => setShowChecklist(true)}
              />
            )}

            {/* ── Clientes Interesados (registrados + recomendados) ─ */}
            {id && (
              <InterestedClientsSection
                propertyId={id}
                interests={interests}
                deletingInterestId={deletingInterestId}
                onDeleteInterest={handleDeleteInterest}
                onRegisterInterest={() => {
                  loadClients();
                  setShowInterestForm(true);
                }}
                onInterestsChanged={refreshInterests}
              />
            )}

            {/* ── Sale Process ──────────────────────────────────────── */}
            {id && <SaleProcessCard propertyId={id} />}
          </div>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-gray-500 text-sm">Precio</div>
              <div className="text-2xl font-bold text-blue-600">${Number(property.price).toLocaleString()}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {property.minPrice && <div><span className="text-gray-500">Mín:</span> ${Number(property.minPrice).toLocaleString()}</div>}
                {/* {property.maxPrice && <div><span className="text-gray-500">Máx:</span> ${Number(property.maxPrice).toLocaleString()}</div>} */}
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

      {lightboxIndex !== null && images[lightboxIndex] && (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onChange={setLightboxIndex}
          onClose={closeLightbox}
        />
      )}

      {showChecklist && (
        <PropertyChecklistModal
          property={property}
          onClose={() => {
            setShowChecklist(false);
            setChecklistVersion((v) => v + 1);
          }}
        />
      )}

      {showInterestForm && id && (
        <InterestFormModal
          propertyId={id}
          clients={clients}
          onClose={() => setShowInterestForm(false)}
          onSaved={(item) => setInterests(prev => [item, ...prev])}
        />
      )}

      {infoClient && (
        <ClientInfoModal
          clientId={infoClient.clientId}
          interest={infoClient.interest}
          onClose={() => setInfoClient(null)}
        />
      )}
    </div>
  );
};
