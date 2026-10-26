import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Heart,
  HeartPlus,
  Plus,
  RefreshCw,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Undo2,
  User,
  X,
} from 'lucide-react';
import api from '../../../services/api';
import { toastError, toastInfo, toastSuccess } from '../../../utils/alerts';
import { ClientInfoModal, type ClientInterestContext } from '../../../components/clients/ClientInfoModal';

type MatchLevel = 'ALTO' | 'MEDIO' | 'BAJO';
type FeedbackReason = 'presupuesto' | 'ubicacion' | 'tipo' | 'tamano' | 'no_busca' | 'otro';

interface PropertyMatch {
  level: MatchLevel;
  score: number;
  matched: string[];
  unconfirmed: string[];
  explanation: string;
  calculatedAt: string;
  liked: boolean;
  alreadyInterested: boolean;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    interestDescription?: string | null;
    notes?: string | null;
  };
}

interface DiscardedMatch {
  clientId: string;
  reason?: FeedbackReason | null;
  comment?: string | null;
  createdAt: string;
  client: { id: string; firstName: string; lastName: string; phone: string };
}

interface MatchesResponse {
  matches: PropertyMatch[];
  discarded: DiscardedMatch[];
  summary?: { created: number; updated: number; deleted: number; total: number };
}

type InterestLevel = 'Bajo' | 'Medio' | 'Alto' | 'MuyAlto';

/** Interesado registrado a mano (formulario, WhatsApp) o confirmado desde una recomendación. */
export interface RegisteredInterest {
  id: string;
  interestDate: string;
  interestLevel: InterestLevel;
  notes?: string;
  client: { id: string; firstName: string; lastName: string; email?: string; phone: string };
}

/** Nivel común para ordenar y filtrar registrados y recomendados en una sola escala. */
type Level = 'MUY_ALTO' | MatchLevel;
const LEVEL_STYLE: Record<Level, { badge: string; label: string; stars: number; rank: number }> = {
  MUY_ALTO: { badge: 'bg-red-100 text-red-700', label: 'Muy Alto', stars: 4, rank: 4 },
  ALTO: { badge: 'bg-green-100 text-green-700', label: 'Alto', stars: 3, rank: 3 },
  MEDIO: { badge: 'bg-yellow-100 text-yellow-700', label: 'Medio', stars: 2, rank: 2 },
  BAJO: { badge: 'bg-gray-100 text-gray-600', label: 'Bajo', stars: 1, rank: 1 },
};
const FROM_INTEREST: Record<InterestLevel, Level> = { MuyAlto: 'MUY_ALTO', Alto: 'ALTO', Medio: 'MEDIO', Bajo: 'BAJO' };
const MATCH_HINT: Record<MatchLevel, string> = {
  ALTO: 'Coincide en todo lo que pide',
  MEDIO: 'Coincide, pero falta confirmar algo',
  BAJO: 'Coincidencia parcial',
};

interface Entry {
  clientId: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    interestDescription?: string | null;
  };
  interest?: RegisteredInterest;
  match?: PropertyMatch;
  level: Level;
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

/** "Coincide en: a, b. Sin confirmar: c." → partes para mostrarlas por separado. */
const splitExplanation = (explanation: string) => {
  const match = /^Coincide en: (.*?)\.(?: Sin confirmar: (.*)\.)?$/.exec(explanation.trim());
  return match ? { matched: match[1], pending: match[2] ?? '' } : { matched: explanation, pending: '' };
};

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
              {clientName} saldrá de la lista y no se volverá a recomendar para esta propiedad.
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
              placeholder="Ej: el interés del cliente está desactualizado"
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

/**
 * Clientes interesados de una propiedad en UNA sola lista: los registrados (formulario, WhatsApp,
 * confirmados) y los recomendados por el sistema (calculados con reglas a partir de lo que busca cada
 * cliente). Un cliente que es ambas cosas aparece una sola vez.
 */
export const InterestedClientsSection = ({
  propertyId,
  interests,
  deletingInterestId,
  onDeleteInterest,
  onRegisterInterest,
  onInterestsChanged,
}: {
  propertyId: string;
  interests: RegisteredInterest[];
  deletingInterestId: string | null;
  onDeleteInterest: (interestId: string) => void;
  onRegisterInterest: () => void;
  onInterestsChanged: () => void;
}) => {
  const [data, setData] = useState<MatchesResponse>({ matches: [], discarded: [] });
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [dislikeTarget, setDislikeTarget] = useState<PropertyMatch | null>(null);
  const [showDiscarded, setShowDiscarded] = useState(false);
  const [filter, setFilter] = useState<Level | 'TODOS' | 'REGISTRADOS'>('TODOS');
  const [infoClient, setInfoClient] = useState<{ clientId: string; interest?: ClientInterestContext } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<MatchesResponse>(`/recommendations/properties/${propertyId}`);
      setData({ matches: res.data.matches ?? [], discarded: res.data.discarded ?? [] });
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Se recargan cuando llega una notificación del motor para esta propiedad.
  useEffect(() => {
    const onNotification = (event: Event) => {
      const detail = (event as CustomEvent<{ entityType?: string; entityId?: string }>).detail;
      if (detail?.entityType === 'property' && String(detail.entityId) === String(propertyId)) void load();
    };
    window.addEventListener('app:notification', onNotification as EventListener);
    return () => window.removeEventListener('app:notification', onNotification as EventListener);
  }, [load, propertyId]);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const res = await api.post<MatchesResponse>(`/recommendations/properties/${propertyId}/recompute`);
      setData({ matches: res.data.matches ?? [], discarded: res.data.discarded ?? [] });
      const s = res.data.summary;
      toastSuccess(
        s
          ? `Recomendaciones actualizadas: ${s.total} cliente(s) (${s.created} nuevo(s), ${s.deleted} quitado(s)).`
          : 'Recomendaciones actualizadas',
      );
    } catch {
      toastError('No se pudieron recalcular las recomendaciones.');
    } finally {
      setRecomputing(false);
    }
  };

  const handleLike = async (match: PropertyMatch) => {
    setBusyClientId(match.client.id);
    try {
      if (match.liked) {
        await api.delete(`/recommendations/properties/${propertyId}/clients/${match.client.id}/feedback`);
        toastInfo('Calificación quitada');
      } else {
        await api.post(`/recommendations/properties/${propertyId}/clients/${match.client.id}/feedback`, { rating: 'like' });
        toastSuccess('Recomendación marcada como correcta');
      }
      await load();
    } catch {
      toastError('No se pudo guardar la calificación.');
    } finally {
      setBusyClientId(null);
    }
  };

  const handleConfirmDislike = async (reason: FeedbackReason, comment: string) => {
    if (!dislikeTarget) return;
    setBusyClientId(dislikeTarget.client.id);
    try {
      await api.post(`/recommendations/properties/${propertyId}/clients/${dislikeTarget.client.id}/feedback`, {
        rating: 'dislike',
        reason,
        comment: comment || undefined,
      });
      setDislikeTarget(null);
      toastSuccess('No se volverá a recomendar a este cliente para esta propiedad');
      await load();
    } catch {
      toastError('No se pudo guardar la calificación.');
    } finally {
      setBusyClientId(null);
    }
  };

  const handleUndoDislike = async (clientId: string) => {
    setBusyClientId(clientId);
    try {
      await api.delete(`/recommendations/properties/${propertyId}/clients/${clientId}/feedback`);
      toastInfo('Cliente desbloqueado: se volvió a evaluar');
      await load();
    } catch {
      toastError('No se pudo deshacer la calificación.');
    } finally {
      setBusyClientId(null);
    }
  };

  const handleConfirmInterest = async (match: PropertyMatch) => {
    setBusyClientId(match.client.id);
    try {
      await api.post(`/recommendations/properties/${propertyId}/clients/${match.client.id}/interest`);
      toastSuccess(`${match.client.firstName} quedó confirmado como interesado`);
      onInterestsChanged();
      await load();
    } catch {
      toastError('No se pudo registrar el interés.');
    } finally {
      setBusyClientId(null);
    }
  };

  // Una entrada por cliente: lo registrado manda en el nivel; la recomendación aporta la explicación.
  const entries = new Map<string, Entry>();
  for (const match of data.matches) {
    entries.set(match.client.id, { clientId: match.client.id, client: match.client, match, level: match.level });
  }
  for (const interest of interests) {
    const prev = entries.get(interest.client.id);
    entries.set(interest.client.id, {
      clientId: interest.client.id,
      client: { ...prev?.client, ...interest.client },
      match: prev?.match,
      interest,
      level: FROM_INTEREST[interest.interestLevel],
    });
  }
  const all = [...entries.values()].sort(
    (a, b) =>
      LEVEL_STYLE[b.level].rank - LEVEL_STYLE[a.level].rank ||
      Number(Boolean(b.interest)) - Number(Boolean(a.interest)) ||
      (b.match?.score ?? 0) - (a.match?.score ?? 0),
  );
  const visible = all.filter((e) =>
    filter === 'TODOS' ? true : filter === 'REGISTRADOS' ? Boolean(e.interest) : e.level === filter,
  );
  const countOf = (level: Level) => all.filter((e) => e.level === level).length;
  const filters: Array<{ key: Level | 'TODOS' | 'REGISTRADOS'; label: string; count: number }> = [
    { key: 'TODOS', label: 'Todos', count: all.length },
    ...(['MUY_ALTO', 'ALTO', 'MEDIO', 'BAJO'] as Level[])
      .map((level) => ({ key: level, label: LEVEL_STYLE[level].label, count: countOf(level) }))
      .filter((f) => f.count > 0),
    { key: 'REGISTRADOS', label: 'Registrados', count: interests.length },
  ];

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Heart size={18} className="text-pink-500" /> Clientes Interesados
          {all.length > 0 && <span className="ml-1 text-sm font-normal text-gray-400">({all.length})</span>}
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            title="Vuelve a buscar clientes con los datos actuales de la propiedad y de los clientes"
          >
            <RefreshCw size={15} className={recomputing ? 'animate-spin' : ''} />
            {recomputing ? 'Recalculando...' : 'Recalcular'}
          </button>
          <button
            onClick={onRegisterInterest}
            className="inline-flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700 font-medium"
          >
            <Plus size={15} /> Registrar interés
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Incluye los clientes registrados y los <b>recomendados</b> automáticamente según lo que busca cada cliente.{' '}
        <b>Alto</b> = coincide en todo (tipo, ubicación, área, presupuesto y lo que pidió).
      </p>

      {all.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                filter === f.key ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      )}

      {loading && interests.length === 0 ? (
        <p className="text-sm text-gray-400">Cargando interesados...</p>
      ) : visible.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Heart size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">
            {all.length === 0 ? 'Sin clientes interesados ni recomendados por ahora' : 'Sin clientes en este filtro'}
          </p>
          {all.length === 0 && (
            <button onClick={onRegisterInterest} className="inline-flex items-center gap-1 mt-2 text-sm text-pink-600 hover:underline">
              <Plus size={14} /> Registrar interés
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((entry) => {
            const style = LEVEL_STYLE[entry.level];
            const { match, interest } = entry;
            const parts = match ? splitExplanation(match.explanation) : null;
            const busy = busyClientId === entry.clientId;
            const notes = interest?.notes && interest.notes !== match?.explanation ? interest.notes : null;
            return (
              <div
                key={entry.clientId}
                className="flex items-start justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 hover:border-pink-200 hover:bg-white transition-all"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1.5 bg-pink-50 rounded-full mt-0.5">
                    <User size={16} className="text-pink-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          setInfoClient({
                            clientId: entry.clientId,
                            interest: {
                              level: style.label,
                              levelClassName: style.badge,
                              date: interest?.interestDate,
                              reason: match?.explanation ?? interest?.notes,
                              source: interest ? 'manual' : 'ia',
                            },
                          })
                        }
                        className="font-semibold text-sm text-gray-900 hover:text-pink-600 hover:underline text-left"
                        title="Ver información del cliente"
                      >
                        {entry.client.firstName} {entry.client.lastName}
                      </button>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}
                        title={match && !interest ? MATCH_HINT[match.level] : undefined}
                      >
                        {Array.from({ length: style.stars }).map((_, i) => (
                          <Star key={i} size={10} fill="currentColor" />
                        ))}
                        {style.label}
                      </span>
                      {match && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700"
                          title="Recomendado automáticamente según lo que busca el cliente"
                        >
                          <Sparkles size={10} /> Recomendado
                        </span>
                      )}
                      {interest && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700">
                          Registrado
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {entry.client.phone}
                      {entry.client.email ? ` · ${entry.client.email}` : ''}
                    </div>
                    {match?.client.interestDescription && (
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="font-medium">Busca:</span> {match.client.interestDescription}
                      </p>
                    )}
                    {parts && (
                      <p className="text-xs text-green-700 mt-1 flex items-start gap-1">
                        <CheckCircle2 size={13} className="mt-px shrink-0" />
                        <span>
                          <b>Coincide en:</b> {parts.matched}
                        </span>
                      </p>
                    )}
                    {parts?.pending && (
                      <p className="text-xs text-amber-700 mt-0.5 flex items-start gap-1">
                        <CircleHelp size={13} className="mt-px shrink-0" />
                        <span>
                          <b>Sin confirmar:</b> {parts.pending}
                        </span>
                      </p>
                    )}
                    {notes && <p className="text-xs text-gray-600 mt-1 italic">{notes}</p>}
                    {interest && (
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(interest.interestDate).toLocaleDateString('es-EC', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {match && !interest && (
                    <button
                      onClick={() => handleConfirmInterest(match)}
                      disabled={busy}
                      className="p-1.5 rounded-md text-gray-300 hover:text-pink-600 transition-colors disabled:opacity-40"
                      title="Confirmar como interesado"
                    >
                      <HeartPlus size={15} />
                    </button>
                  )}
                  {match && (
                    <>
                      <button
                        onClick={() => handleLike(match)}
                        disabled={busy}
                        className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                          match.liked ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-green-600'
                        }`}
                        title="Recomendación correcta"
                      >
                        <ThumbsUp size={15} />
                      </button>
                      <button
                        onClick={() => setDislikeTarget(match)}
                        disabled={busy}
                        className="p-1.5 rounded-md text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Recomendación incorrecta"
                      >
                        <ThumbsDown size={15} />
                      </button>
                    </>
                  )}
                  {interest && (
                    <button
                      onClick={() => onDeleteInterest(interest.id)}
                      disabled={deletingInterestId === interest.id}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="Quitar interesado registrado"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data.discarded.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowDiscarded((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ChevronDown size={15} className={`transition-transform ${showDiscarded ? 'rotate-180' : ''}`} />
            Descartados ({data.discarded.length})
          </button>
          {showDiscarded && (
            <div className="mt-2 space-y-2">
              {data.discarded.map((f) => (
                <div key={f.clientId} className="flex items-start justify-between gap-3 bg-red-50/40 border border-red-100 rounded-xl px-4 py-2.5">
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
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUndoDislike(f.clientId)}
                    disabled={busyClientId === f.clientId}
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 disabled:opacity-40 shrink-0"
                    title="Permitir que se vuelva a recomendar"
                  >
                    <Undo2 size={13} /> Deshacer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {dislikeTarget && (
        <DislikeModal
          clientName={`${dislikeTarget.client.firstName} ${dislikeTarget.client.lastName}`}
          saving={busyClientId === dislikeTarget.client.id}
          onClose={() => setDislikeTarget(null)}
          onConfirm={handleConfirmDislike}
        />
      )}

      {infoClient && (
        <ClientInfoModal clientId={infoClient.clientId} interest={infoClient.interest} onClose={() => setInfoClient(null)} />
      )}
    </div>
  );
};
