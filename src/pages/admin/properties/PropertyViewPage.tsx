import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../../services/api';
import { ArrowLeft, MapPin, ChevronLeft, ChevronRight, Download, BadgePercent, Clock, ChevronRight as ChevronRightIcon, DollarSign, FileText, User, Briefcase, X, ClipboardList, Plus, Heart, Trash2, Star } from 'lucide-react';

// ─── Interest types ──────────────────────────────────────────────────────────
type InterestLevel = 'Bajo' | 'Medio' | 'Alto' | 'MuyAlto';
const INTEREST_LEVELS: { value: InterestLevel; label: string; color: string; stars: number }[] = [
  { value: 'Bajo',    label: 'Bajo',     color: 'bg-gray-100 text-gray-600',    stars: 1 },
  { value: 'Medio',   label: 'Medio',    color: 'bg-yellow-100 text-yellow-700', stars: 2 },
  { value: 'Alto',    label: 'Alto',     color: 'bg-orange-100 text-orange-700', stars: 3 },
  { value: 'MuyAlto', label: 'Muy Alto', color: 'bg-red-100 text-red-700',       stars: 4 },
];
interface ClientSummary { id: string; firstName: string; lastName: string; email?: string; phone: string }
interface PropertyInterest {
  id: string;
  interestDate: string;
  interestLevel: InterestLevel;
  notes?: string;
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

// ─── Process types ────────────────────────────────────────────────────────────
interface Expense { amount: number; description: string }
interface ProcessFile { file: { id: string; originalName: string; path: string; size: number } }
interface Process {
  id: string;
  title: string;
  type: 'Comprador' | 'Vendedor';
  description: string;
  expenses: Expense[];
  approximateTime?: string;
  nextStep?: string;
  createdAt: string;
  files: ProcessFile[];
}

// ─── Process Detail Modal ─────────────────────────────────────────────────────
const ProcessDetailModal = ({ process, onClose }: { process: Process; onClose: () => void }) => {
  const [fileUrls, setFileUrls] = useState<{ id: string; name: string; url: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const results = await Promise.all(
        (process.files || []).map(async (pf) => {
          try {
            const r = await api.get(`/files/${pf.file.id}/url`);
            return { id: pf.file.id, name: pf.file.originalName, url: r.data.url };
          } catch {
            return { id: pf.file.id, name: pf.file.originalName, url: '' };
          }
        })
      );
      setFileUrls(results);
    };
    load();
  }, [process]);

  const expenses: Expense[] = Array.isArray(process.expenses) ? process.expenses : [];
  const isComprador = process.type === 'Comprador';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isComprador ? 'bg-blue-100' : 'bg-emerald-100'}`}>
              {isComprador ? <User size={20} className="text-blue-600" /> : <Briefcase size={20} className="text-emerald-600" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{process.title}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isComprador ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
              }`}>{process.type}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Descripción</h3>
            <p className="text-gray-800 whitespace-pre-line">{process.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {process.approximateTime && (
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                <Clock size={16} className="text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Tiempo Aproximado</div>
                  <div className="text-sm font-medium">{process.approximateTime}</div>
                </div>
              </div>
            )}
            {process.nextStep && (
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                <ChevronRightIcon size={16} className="text-gray-500" />
                <div>
                  <div className="text-xs text-gray-500">Siguiente Paso</div>
                  <div className="text-sm font-medium">{process.nextStep}</div>
                </div>
              </div>
            )}
          </div>

          {expenses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Gastos</h3>
              <div className="space-y-2">
                {expenses.map((e, i) => (
                  <div key={i} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
                    <span className="text-sm text-gray-700">{e.description}</span>
                    <span className="font-semibold text-amber-700">${Number(e.amount).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-end pt-1">
                  <span className="text-sm font-bold text-gray-900">
                    Total: ${expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {fileUrls.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Archivos</h3>
              <div className="space-y-2">
                {fileUrls.map((f) => (
                  <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-700 truncate">{f.name}</span>
                    </div>
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-gray-100 transition-colors">
                        <Download size={14} /> Descargar
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 pt-2">
            Registrado el {new Date(process.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PropertyViewPage = () => {
  const { id } = useParams();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [images, setImages] = useState<{ id: string; url: string; name: string }[]>([]);
  const [documents, setDocuments] = useState<{ id: string; name: string; size: number; url: string }[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [detailProcess, setDetailProcess] = useState<Process | null>(null);
  const [interests, setInterests] = useState<PropertyInterest[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [deletingInterestId, setDeletingInterestId] = useState<string | null>(null);

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
        // Fetch processes
        try {
          const procRes = await api.get(`/processes?propertyId=${id}`);
          setProcesses(procRes.data);
        } catch { /* non-critical */ }
        // Fetch interests
        try {
          const intRes = await api.get(`/property-interests?propertyId=${id}`);
          setInterests(intRes.data);
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

  const prev = () => setCurrent((c) => (images.length ? (c - 1 + images.length) % images.length : 0));
  const next = () => setCurrent((c) => (images.length ? (c + 1) % images.length : 0));

  const loadClients = async () => {
    if (clients.length > 0) return;
    try {
      const res = await api.get('/clients');
      setClients(res.data.map((c: any) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone })));
    } catch { /* non-critical */ }
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

  if (loading) return <div className="p-8">Cargando...</div>;
  if (!property) return <div className="p-8">Propiedad no encontrada</div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/admin/propiedades/gestion" className="p-2 hover:bg-gray-100 rounded-full">
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

            {/* ── Interested Clients ───────────────────────────────── */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Heart size={18} className="text-pink-500" /> Clientes Interesados
                  {interests.length > 0 && (
                    <span className="ml-1 text-sm font-normal text-gray-400">({interests.length})</span>
                  )}
                </h3>
                <button
                  onClick={() => { loadClients(); setShowInterestForm(true); }}
                  className="inline-flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700 font-medium"
                >
                  <Plus size={15} /> Registrar interés
                </button>
              </div>

              {interests.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Heart size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Sin clientes interesados registrados</p>
                  <button
                    onClick={() => { loadClients(); setShowInterestForm(true); }}
                    className="inline-flex items-center gap-1 mt-2 text-sm text-pink-600 hover:underline"
                  >
                    <Plus size={14} /> Registrar interés
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {interests.map((interest) => {
                    const level = INTEREST_LEVELS.find(l => l.value === interest.interestLevel);
                    return (
                      <div key={interest.id} className="flex items-start justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 hover:border-pink-200 hover:bg-white transition-all">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 bg-pink-50 rounded-full mt-0.5">
                            <User size={16} className="text-pink-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-gray-900">{interest.client.firstName} {interest.client.lastName}</span>
                              {level && (
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${level.color}`}>
                                  {Array.from({ length: level.stars }).map((_, i) => (
                                    <Star key={i} size={10} fill="currentColor" />
                                  ))}
                                  {level.label}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {interest.client.phone}{interest.client.email ? ` · ${interest.client.email}` : ''}
                            </div>
                            {interest.notes && (
                              <p className="text-xs text-gray-600 mt-1 italic">{interest.notes}</p>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(interest.interestDate).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteInterest(interest.id)}
                          disabled={deletingInterestId === interest.id}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Process Timeline ─────────────────────────────────── */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Procesos</h3>
                <Link
                  to={`/admin/propiedades/procesos/${id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus size={15} /> Nuevo proceso
                </Link>
              </div>

              {processes.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <ClipboardList size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Sin procesos registrados</p>
                  <Link
                    to={`/admin/propiedades/procesos/${id}`}
                    className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:underline"
                  >
                    <Plus size={14} /> Agregar proceso
                  </Link>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-3">
                    {processes.map((proc, idx) => {
                      const expenses: Expense[] = Array.isArray(proc.expenses) ? proc.expenses : [];
                      const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
                      const isComprador = proc.type === 'Comprador';
                      return (
                        <div key={proc.id} className="relative pl-14">
                          <div className={`absolute left-3 top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center
                            ${isComprador ? 'bg-blue-600 border-blue-600' : 'bg-emerald-500 border-emerald-500'}`}>
                            <span className="text-white text-xs font-bold">{idx + 1}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDetailProcess(proc)}
                            className="w-full text-left bg-gray-50 hover:bg-white border border-gray-200 hover:border-blue-200 hover:shadow-sm rounded-xl p-4 transition-all group"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                isComprador ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>{proc.type}</span>
                              <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">{proc.title}</h4>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{proc.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {expenses.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                                  <DollarSign size={11} /> {expenses.length} gasto{expenses.length !== 1 ? 's' : ''} · ${total.toLocaleString()}
                                </span>
                              )}
                              {proc.approximateTime && (
                                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  <Clock size={11} /> {proc.approximateTime}
                                </span>
                              )}
                              {proc.nextStep && (
                                <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                                  <ChevronRightIcon size={11} /> {proc.nextStep}
                                </span>
                              )}
                              {proc.files?.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  <FileText size={11} /> {proc.files.length} archivo{proc.files.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                              {new Date(proc.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 text-center">
                    <Link
                      to={`/admin/propiedades/procesos/${id}`}
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <ClipboardList size={15} /> Ver todos los procesos
                    </Link>
                  </div>
                </div>
              )}
            </div>
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

      {detailProcess && (
        <ProcessDetailModal process={detailProcess} onClose={() => setDetailProcess(null)} />
      )}

      {showInterestForm && id && (
        <InterestFormModal
          propertyId={id}
          clients={clients}
          onClose={() => setShowInterestForm(false)}
          onSaved={(item) => setInterests(prev => [item, ...prev])}
        />
      )}
    </div>
  );
};
