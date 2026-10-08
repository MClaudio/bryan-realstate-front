import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import api from '../../../services/api';
import { ArrowLeft, MapPin, ChevronLeft, ChevronRight, Download, BadgePercent, User, X, Plus, Heart, Trash2, Star, Sparkles, ImageIcon, ListChecks, RotateCcw, Copy, FileText, ThumbsUp, ThumbsDown, ChevronDown, Undo2 } from 'lucide-react';
import { alertConfirm, alertInfo, toastError, toastInfo, toastSuccess } from '../../../utils/alerts';
import { ClientInfoModal, type ClientInterestContext } from '../../../components/clients/ClientInfoModal';
import { PROPERTY_STATUS_LABELS, PROPERTY_TYPE_LABELS, ZONE_LABELS } from '../../../utils/propertyEnums';
import { PropertyChecklistModal } from './PropertyChecklistModal';
import { PropertyChecklistSummary } from './PropertyChecklistSummary';
import { SaleProcessCard } from '../processes/SaleProcessCard';

/** Response of POST /properties/:id/recommendations and …/restore-last. */
interface RecommendationRunResponse {
  status?: 'applied' | 'no_changes' | 'no_candidates' | 'preview' | 'skipped' | 'failed';
  recommendedCandidates?: unknown;
  reconcile?: { summary?: { created?: number; updated?: number; deleted?: number; discarded?: number } } | null;
  error?: string | null;
}

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

type RecommendedInterestLevel = 'ALTO' | 'MEDIO' | 'BAJO';

interface RecommendedCandidate {
  client_id: string;
  name: string;
  interest_level: RecommendedInterestLevel;
  reason: string;
  score?: number;
}

interface RecommendationNotification {
  id: string;
  path?: string | null;
  modalKey?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  payload?: {
    candidates?: unknown[];
  };
}

const RECOMMENDATION_MODAL_KEY = 'property-interested-candidates';

const INTEREST_LEVEL_TO_PRISMA: Record<
  RecommendedInterestLevel,
  'Alto' | 'Medio' | 'Bajo'
> = {
  ALTO: 'Alto',
  MEDIO: 'Medio',
  BAJO: 'Bajo',
};

const RECOMMENDED_LEVEL_BADGE: Record<RecommendedInterestLevel, string> = {
  ALTO: 'bg-red-100 text-red-700',
  MEDIO: 'bg-yellow-100 text-yellow-700',
  BAJO: 'bg-gray-100 text-gray-700',
};

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

type FeedbackRating = 'like' | 'dislike';
type FeedbackReason = 'presupuesto' | 'ubicacion' | 'tipo' | 'tamano' | 'no_busca' | 'otro';

interface RecommendationFeedback {
  id: string;
  clientId: string;
  rating: FeedbackRating;
  reason?: FeedbackReason | null;
  comment?: string | null;
  interestLevel?: string | null;
  aiReason?: string | null;
  createdAt: string;
  client: { id: string; firstName: string; lastName: string; phone: string };
}

const FEEDBACK_REASONS: { value: FeedbackReason; label: string }[] = [
  { value: 'presupuesto', label: 'Presupuesto' },
  { value: 'ubicacion', label: 'Ubicación' },
  { value: 'tipo', label: 'Tipo de propiedad' },
  { value: 'tamano', label: 'Tamaño' },
  { value: 'no_busca', label: 'Ya no busca / ya compró' },
  { value: 'otro', label: 'Otro' },
];
const FEEDBACK_REASON_LABEL = Object.fromEntries(FEEDBACK_REASONS.map((r) => [r.value, r.label])) as Record<
  FeedbackReason,
  string
>;

/** Dislike: pide el motivo (obligatorio) y un comentario opcional para que la IA aprenda. */
const DislikeModal = ({
  clientName,
  saving,
  onClose,
  onConfirm,
}: {
  clientName: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: (reason: FeedbackReason, comment: string) => void;
}) => {
  const [reason, setReason] = useState<FeedbackReason | null>(null);
  const [comment, setComment] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ThumbsDown size={18} className="text-red-500" /> Recomendación incorrecta
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {clientName} saldrá de la lista y la IA no volverá a recomendarlo para esta propiedad.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100" disabled={saving}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">¿Por qué no aplica? *</p>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    reason === r.value
                      ? 'bg-red-50 border-red-300 text-red-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comentario (opcional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 300))}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: su presupuesto es la mitad del precio"
            />
            <p className="text-xs text-gray-400 text-right">{comment.length}/300</p>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => reason && onConfirm(reason, comment.trim())}
            disabled={!reason || saving}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
          >
            {saving ? 'Guardando...' : 'Marcar como incorrecta'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RecommendedCandidatesModal = ({
  candidates,
  saving,
  onRemove,
  onClose,
  onSave,
}: {
  candidates: RecommendedCandidate[];
  saving: boolean;
  onRemove: (clientId: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}) => {
  const [infoCandidate, setInfoCandidate] = useState<RecommendedCandidate | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-blue-100">
              <Sparkles size={18} className="text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Clientes recomendados por IA</h2>
              <p className="text-sm text-gray-500">Revisa la lista, elimina los que no apliquen y guarda.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            disabled={saving}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3">
          {candidates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500">
              No quedan candidatos en la lista.
            </div>
          ) : (
            candidates.map((candidate) => (
              <div key={candidate.client_id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInfoCandidate(candidate)}
                        className="font-semibold text-gray-900 hover:text-blue-700 hover:underline text-left"
                        title="Ver información del cliente"
                      >
                        {candidate.name}
                      </button>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${RECOMMENDED_LEVEL_BADGE[candidate.interest_level]}`}
                      >
                        {candidate.interest_level}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{candidate.reason}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(candidate.client_id)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border border-red-200 text-red-600 hover:bg-red-50"
                    disabled={saving}
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Omitir por ahora
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || candidates.length === 0}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {saving ? 'Guardando...' : 'Guardar interesados'}
          </button>
        </div>
      </div>
      {infoCandidate && (
        <ClientInfoModal
          clientId={infoCandidate.client_id}
          onClose={() => setInfoCandidate(null)}
          interest={{
            level: infoCandidate.interest_level,
            levelClassName: RECOMMENDED_LEVEL_BADGE[infoCandidate.interest_level],
            reason: infoCandidate.reason,
            source: 'ia',
          }}
        />
      )}
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
  const [feedbacks, setFeedbacks] = useState<RecommendationFeedback[]>([]);
  const [ratingClientId, setRatingClientId] = useState<string | null>(null);
  const [dislikeTarget, setDislikeTarget] = useState<PropertyInterest | null>(null);
  const [showDiscarded, setShowDiscarded] = useState(false);
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);
  const [recommendedCandidates, setRecommendedCandidates] = useState<RecommendedCandidate[]>([]);
  const [savingRecommendations, setSavingRecommendations] = useState(false);
  const [runningRecommendations, setRunningRecommendations] = useState(false);
  const [lastRecommendation, setLastRecommendation] = useState<{ candidates: number; createdAt: string } | null>(null);
  const [restoringRecommendation, setRestoringRecommendation] = useState(false);
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

  const normalizeRecommendedCandidates = useCallback((payload: any): RecommendedCandidate[] => {
    if (!Array.isArray(payload)) return [];

    return payload
      .map((item) => {
        const rawLevel = String(item?.interest_level ?? '').toUpperCase();
        const normalizedLevel: RecommendedInterestLevel =
          rawLevel === 'ALTO' ? 'ALTO' : rawLevel === 'BAJO' ? 'BAJO' : 'MEDIO';

        return {
          client_id: String(item?.client_id ?? '').trim(),
          name: String(item?.name ?? '').trim(),
          interest_level: normalizedLevel,
          reason: String(item?.reason ?? '').trim(),
          score:
            item?.score !== undefined && !Number.isNaN(Number(item.score))
              ? Number(item.score)
              : undefined,
        };
      })
      .filter((item) => item.client_id && item.name && item.reason);
  }, []);

  const applyRecommendationNotification = useCallback(async (
    notification: RecommendationNotification,
  ) => {
    if (!id) return;
    if (notification.entityType !== 'property') return;
    if (String(notification.entityId ?? '') !== String(id)) return;

    const candidates = normalizeRecommendedCandidates(
      notification.payload?.candidates,
    );

    if (
      notification.modalKey === RECOMMENDATION_MODAL_KEY &&
      candidates.length > 0
    ) {
      setRecommendedCandidates(candidates);
      setShowRecommendationsModal(true);
    }

    // Los interesados ya se guardan automáticamente desde el backend (cola).
    // Refrescamos la lista para que el usuario vea el orden por nivel.
    await refreshInterests();

    if (notification.id) {
      try {
        await api.patch(`/notifications/${notification.id}/read`);
      } catch {
        // non-critical
      }
    }
  }, [id, normalizeRecommendedCandidates]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notificationId = params.get('notificationId');

    if (!notificationId || !id) {
      return;
    }

    const loadNotification = async () => {
      try {
        const res = await api.get(`/notifications/${notificationId}`);
        await applyRecommendationNotification(res.data as RecommendationNotification);
      } catch {
        // non-critical
      } finally {
        navigate(location.pathname, { replace: true });
      }
    };

    loadNotification();
  }, [
    applyRecommendationNotification,
    id,
    location.pathname,
    location.search,
    navigate,
  ]);

  useEffect(() => {
    const onNotification = (event: Event) => {
      const customEvent = event as CustomEvent<RecommendationNotification>;
      if (!customEvent?.detail) return;

      applyRecommendationNotification(customEvent.detail);
    };

    window.addEventListener('app:notification', onNotification as EventListener);

    return () => {
      window.removeEventListener('app:notification', onNotification as EventListener);
    };
  }, [applyRecommendationNotification]);

  const handleRemoveCandidate = (clientId: string) => {
    setRecommendedCandidates((prev) => prev.filter((candidate) => candidate.client_id !== clientId));
  };

  const sortInterests = (items: PropertyInterest[]): PropertyInterest[] =>
    [...items].sort((a, b) => {
      const rank = INTEREST_LEVEL_RANK[b.interestLevel] - INTEREST_LEVEL_RANK[a.interestLevel];
      if (rank !== 0) return rank;
      const aDate = new Date(a.interestDate).getTime();
      const bDate = new Date(b.interestDate).getTime();
      return bDate - aDate;
    });

  useEffect(() => {
    if (interests.length === 0) refreshLastRecommendation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, interests.length]);

  const loadFeedback = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<RecommendationFeedback[]>(`/property-interests/feedback?propertyId=${id}`);
      setFeedbacks(Array.isArray(res.data) ? res.data : []);
    } catch {
      // non-critical
    }
  }, [id]);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  const feedbackByClient = new Map(feedbacks.map((f) => [f.clientId, f]));
  const discarded = feedbacks.filter((f) => f.rating === 'dislike');

  const handleLike = async (interest: PropertyInterest) => {
    const current = feedbackByClient.get(interest.client.id);
    setRatingClientId(interest.client.id);
    try {
      if (current?.rating === 'like') {
        await api.delete(`/property-interests/feedback?propertyId=${id}&clientId=${interest.client.id}`);
        toastInfo('Calificación quitada');
      } else {
        await api.post(`/property-interests/${interest.id}/feedback`, { rating: 'like' });
        toastSuccess('Recomendación marcada como correcta');
      }
      await loadFeedback();
    } catch {
      toastError('No se pudo guardar la calificación.');
    } finally {
      setRatingClientId(null);
    }
  };

  const handleConfirmDislike = async (reason: FeedbackReason, comment: string) => {
    if (!dislikeTarget) return;
    setRatingClientId(dislikeTarget.client.id);
    try {
      await api.post(`/property-interests/${dislikeTarget.id}/feedback`, {
        rating: 'dislike',
        reason,
        comment: comment || undefined,
      });
      setInterests((prev) => prev.filter((i) => i.id !== dislikeTarget.id));
      setDislikeTarget(null);
      toastSuccess('La IA no volverá a recomendar a este cliente para esta propiedad');
      await loadFeedback();
    } catch {
      toastError('No se pudo guardar la calificación.');
    } finally {
      setRatingClientId(null);
    }
  };

  const handleUndoDislike = async (clientId: string) => {
    setRatingClientId(clientId);
    try {
      await api.delete(`/property-interests/feedback?propertyId=${id}&clientId=${clientId}`);
      toastInfo('Cliente desbloqueado: la IA podrá volver a recomendarlo');
      await loadFeedback();
    } catch {
      toastError('No se pudo deshacer la calificación.');
    } finally {
      setRatingClientId(null);
    }
  };

  const refreshInterests = async () => {
    if (!id) return;
    try {
      const intRes = await api.get(`/property-interests?propertyId=${id}`);
      setInterests(sortInterests(Array.isArray(intRes.data) ? intRes.data : []));
    } catch {
      // non-critical
    }
  };

  const handleRunManualRecommendations = async () => {
    if (!id) return;
    const confirm = await alertConfirm(
      'Ejecutar recomendación IA',
      'Se reemplazarán las recomendaciones de la IA para esta propiedad; los interesados agregados manualmente se conservan.',
    );
    if (!confirm.isConfirmed) return;
    try {
      setRunningRecommendations(true);
      // Runs in the background: with many clients a synchronous run outlasts the request timeout.
      const response = await api.post(`/properties/${id}/recommendations`, { enqueue: true, persist: true });

      if (response?.data?.recommendationAlreadyRunning) {
        alertInfo(
          'La recomendación ya se está ejecutando',
          'Hay una recomendación IA en curso para esta propiedad. Recibirás una notificación cuando termine.',
        );
        return;
      }
      if (response?.data?.recommendationQueued) {
        toastInfo(
          'Recomendación en segundo plano',
          'La recomendación IA se está ejecutando en segundo plano. Puedes seguir trabajando; recibirás una notificación cuando termine.',
        );
        return;
      }

      await refreshInterests();
      await refreshLastRecommendation();
      showRecommendationResult(response?.data);
    } catch {
      toastError('No se pudo ejecutar la recomendación manual.');
    } finally {
      setRunningRecommendations(false);
    }
  };

  /** Same wording as the backend notifications (recommendation-runner.service.ts). */
  const showRecommendationResult = (data?: RecommendationRunResponse) => {
    const status: string = data?.status ?? '';
    const candidates = normalizeRecommendedCandidates(data?.recommendedCandidates);
    const summary = data?.reconcile?.summary ?? null;
    const created = Number(summary?.created ?? 0);
    const updated = Number(summary?.updated ?? 0);
    const deleted = Number(summary?.deleted ?? 0);
    const discarded = Number(summary?.discarded ?? 0);
    const discardedText = discarded
      ? ` ${discarded} recomendado(s) se descartaron porque no existen en Clientes.`
      : '';

    if (status === 'failed') {
      toastError(`Recomendación IA no completada: ${data?.error ?? 'error desconocido'}. La lista de interesados no se modificó.`);
    } else if (status === 'no_candidates') {
      toastSuccess('La IA no encontró clientes para esta propiedad. La lista de interesados no se modificó.');
    } else if (status === 'applied') {
      toastSuccess(`Recomendación IA aplicada: ${created} nuevo(s), ${updated} actualizado(s), ${deleted} removido(s).${discardedText}`);
    } else {
      toastSuccess(`Se analizaron ${candidates.length} cliente(s); la lista de interesados ya estaba al día.${discardedText}`);
    }
  };

  const refreshLastRecommendation = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/properties/${id}/recommendations/last`);
      setLastRecommendation(res.data?.available ? res.data : null);
    } catch {
      setLastRecommendation(null);
    }
  };

  const handleRestoreLastRecommendation = async () => {
    if (!id) return;
    try {
      setRestoringRecommendation(true);
      const response = await api.post(`/properties/${id}/recommendations/restore-last`);
      await refreshInterests();
      showRecommendationResult(response?.data);
    } catch (error) {
      toastError(
        (isAxiosError(error) && error.response?.data?.message) ||
          'No se pudo restaurar la recomendación.',
      );
    } finally {
      setRestoringRecommendation(false);
    }
  };

  const handleSaveRecommendedCandidates = async () => {
    if (!id) return;

    try {
      setSavingRecommendations(true);
      const today = new Date().toISOString().split('T')[0];

      const response = await api.post(`/property-interests/properties/${id}/reconcile`, {
        recommendations: recommendedCandidates.map((candidate) => ({
          clientId: candidate.client_id,
          interestLevel: INTEREST_LEVEL_TO_PRISMA[candidate.interest_level],
          interestDate: today,
          notes: candidate.reason || undefined,
        })),
      });

      const summary = response?.data?.summary;
      const created = Number(summary?.created ?? 0);
      const updated = Number(summary?.updated ?? 0);
      const deleted = Number(summary?.deleted ?? 0);

      toastSuccess(
        `Interesados sincronizados: ${created} nuevo(s), ${updated} actualizado(s), ${deleted} removido(s).`,
      );

      setShowRecommendationsModal(false);
      setRecommendedCandidates([]);
      await refreshInterests();
    } catch {
      toastError('No se pudo guardar la lista de interesados recomendados.');
    } finally {
      setSavingRecommendations(false);
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

            {/* ── Interested Clients ───────────────────────────────── */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Heart size={18} className="text-pink-500" /> Clientes Interesados
                  {interests.length > 0 && (
                    <span className="ml-1 text-sm font-normal text-gray-400">({interests.length})</span>
                  )}
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRunManualRecommendations}
                    disabled={runningRecommendations}
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    <Sparkles size={15} />
                    {runningRecommendations ? 'Ejecutando IA...' : 'Ejecutar recomendación IA'}
                  </button>
                  <button
                    onClick={() => { loadClients(); setShowInterestForm(true); }}
                    className="inline-flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700 font-medium"
                  >
                    <Plus size={15} /> Registrar interés
                  </button>
                </div>
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
                  {lastRecommendation && lastRecommendation.candidates > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={handleRestoreLastRecommendation}
                        disabled={restoringRecommendation}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-white text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        <RotateCcw size={14} />
                        {restoringRecommendation
                          ? 'Restaurando...'
                          : `Restaurar última recomendación IA (${lastRecommendation.candidates})`}
                      </button>
                      <p className="text-xs text-gray-400 mt-1">
                        Del {new Date(lastRecommendation.createdAt).toLocaleString('es-EC')}. No vuelve a consultar a la IA.
                      </p>
                    </div>
                  )}
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
                              <button
                                type="button"
                                onClick={() =>
                                  setInfoClient({
                                    clientId: interest.client.id,
                                    interest: {
                                      level: level?.label,
                                      levelClassName: level?.color,
                                      date: interest.interestDate,
                                      reason: interest.notes,
                                      source: interest.source,
                                    },
                                  })
                                }
                                className="font-semibold text-sm text-gray-900 hover:text-pink-600 hover:underline text-left"
                                title="Ver información del cliente"
                              >
                                {interest.client.firstName} {interest.client.lastName}
                              </button>
                              {interest.source === 'ia' && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700"
                                  title="Recomendado por IA"
                                >
                                  <Sparkles size={10} /> IA
                                </span>
                              )}
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
                        <div className="flex items-center gap-0.5 shrink-0">
                          {interest.source === 'ia' && (
                            <>
                              <button
                                onClick={() => handleLike(interest)}
                                disabled={ratingClientId === interest.client.id}
                                className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                                  feedbackByClient.get(interest.client.id)?.rating === 'like'
                                    ? 'text-green-600 bg-green-50'
                                    : 'text-gray-300 hover:text-green-600'
                                }`}
                                title="Recomendación correcta"
                              >
                                <ThumbsUp size={15} />
                              </button>
                              <button
                                onClick={() => setDislikeTarget(interest)}
                                disabled={ratingClientId === interest.client.id}
                                className="p-1.5 rounded-md text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                                title="Recomendación incorrecta"
                              >
                                <ThumbsDown size={15} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteInterest(interest.id)}
                            disabled={deletingInterestId === interest.id}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {discarded.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowDiscarded((v) => !v)}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    <ChevronDown size={15} className={`transition-transform ${showDiscarded ? 'rotate-180' : ''}`} />
                    Descartados por IA ({discarded.length})
                  </button>
                  {showDiscarded && (
                    <div className="mt-2 space-y-2">
                      {discarded.map((f) => (
                        <div key={f.id} className="flex items-start justify-between gap-3 bg-red-50/40 border border-red-100 rounded-xl px-4 py-2.5">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setInfoClient({ clientId: f.client.id })}
                              className="font-semibold text-sm text-gray-800 hover:text-pink-600 hover:underline text-left"
                            >
                              {f.client.firstName} {f.client.lastName}
                            </button>
                            <p className="text-xs text-red-700 mt-0.5">
                              {f.reason ? FEEDBACK_REASON_LABEL[f.reason] : 'Incorrecta'}
                              {f.comment ? ` · ${f.comment}` : ''}
                            </p>
                            {f.aiReason && <p className="text-xs text-gray-500 italic mt-0.5">IA: {f.aiReason}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUndoDislike(f.clientId)}
                            disabled={ratingClientId === f.clientId}
                            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 disabled:opacity-40 shrink-0"
                            title="Permitir que la IA vuelva a recomendarlo"
                          >
                            <Undo2 size={13} /> Deshacer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

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

      {showRecommendationsModal && (
        <RecommendedCandidatesModal
          candidates={recommendedCandidates}
          saving={savingRecommendations}
          onRemove={handleRemoveCandidate}
          onClose={() => setShowRecommendationsModal(false)}
          onSave={handleSaveRecommendedCandidates}
        />
      )}

      {dislikeTarget && (
        <DislikeModal
          clientName={`${dislikeTarget.client.firstName} ${dislikeTarget.client.lastName}`}
          saving={ratingClientId === dislikeTarget.client.id}
          onClose={() => setDislikeTarget(null)}
          onConfirm={handleConfirmDislike}
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
