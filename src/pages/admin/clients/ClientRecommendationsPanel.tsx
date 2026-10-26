import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, CheckCircle2, CircleHelp, RefreshCw, Sparkles } from 'lucide-react';
import api from '../../../services/api';
import { toastError, toastSuccess } from '../../../utils/alerts';

type MatchLevel = 'ALTO' | 'MEDIO' | 'BAJO';

/** Criterios estructurados de lo que busca el cliente (client_criteria). */
interface ClientCriteria {
  intent: 'COMPRA' | 'VENDE' | 'OTRO';
  acceptedTypes: string[];
  genericType: boolean;
  acceptedCities: string[];
  excludedCities: string[];
  acceptedSectors: string[];
  maxMinutesCenter: number | null;
  nearCenter: boolean;
  minLandM2: string | number | null;
  maxLandM2: string | number | null;
  minConstructionM2: string | number | null;
  minBudgetUsd: string | number | null;
  maxBudgetUsd: string | number | null;
  topographies: string[];
  zones: string[];
  requiredServices: string[];
  uses: string[];
  wantedFeatures: string[];
  method: 'rules' | 'ai';
  aiNotes: string | null;
  extractedAt: string;
}

interface ClientMatch {
  level: MatchLevel;
  score: number;
  explanation: string;
  property: {
    id: string;
    code: string;
    propertyType: string;
    referenceSector: string | null;
    price: string | number;
    landArea: string | number;
    city: { name: string } | null;
  };
}

const LEVEL_BADGE: Record<MatchLevel, string> = {
  ALTO: 'bg-green-100 text-green-700',
  MEDIO: 'bg-yellow-100 text-yellow-700',
  BAJO: 'bg-gray-100 text-gray-600',
};
const TYPE_LABEL: Record<string, string> = { Casa_y_terreno: 'Casa y terreno' };
const INTENT_LABEL = { COMPRA: 'Comprar / invertir', VENDE: 'Vende (no se le recomiendan propiedades)', OTRO: 'No busca comprar' };

const usd = (v: string | number | null) =>
  v === null || v === undefined ? null : `$${Math.round(Number(v)).toLocaleString('es-EC')}`;
const m2 = (v: string | number | null) =>
  v === null || v === undefined ? null : `${Math.round(Number(v)).toLocaleString('es-EC')} m²`;

const splitExplanation = (explanation: string) => {
  const match = /^Coincide en: (.*?)\.(?: Sin confirmar: (.*)\.)?$/.exec(explanation.trim());
  return match ? { matched: match[1], pending: match[2] ?? '' } : { matched: explanation, pending: '' };
};

/** Cómo se entendió el interés del cliente y qué propiedades se le recomiendan. */
export const ClientRecommendationsPanel = ({ clientId }: { clientId: string }) => {
  const [criteria, setCriteria] = useState<ClientCriteria | null>(null);
  const [matches, setMatches] = useState<ClientMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [criteriaRes, matchesRes] = await Promise.all([
        api.get<ClientCriteria | null>(`/recommendations/clients/${clientId}/criteria`),
        api.get<ClientMatch[]>(`/recommendations/clients/${clientId}`),
      ]);
      setCriteria(criteriaRes.data || null);
      setMatches(Array.isArray(matchesRes.data) ? matchesRes.data : []);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.post<{ criteria: ClientCriteria | null; matches: ClientMatch[] }>(
        `/recommendations/clients/${clientId}/refresh`,
      );
      setCriteria(res.data.criteria);
      setMatches(res.data.matches ?? []);
      toastSuccess('Interés leído de nuevo y propiedades recalculadas');
    } catch {
      toastError('No se pudo actualizar.');
    } finally {
      setRefreshing(false);
    }
  };

  const rows: Array<[string, string | null]> = criteria
    ? [
        ['Intención', INTENT_LABEL[criteria.intent]],
        [
          'Tipo',
          criteria.acceptedTypes.length > 0
            ? criteria.acceptedTypes.map((t) => TYPE_LABEL[t] ?? t).join(', ')
            : criteria.genericType
              ? 'Cualquiera (dice "una propiedad")'
              : null,
        ],
        ['Ciudades', criteria.acceptedCities.join(', ') || null],
        ['No acepta', criteria.excludedCities.join(', ') || null],
        ['Sectores', criteria.acceptedSectors.join(', ') || null],
        [
          'Cercanía',
          criteria.maxMinutesCenter !== null
            ? `Máx. ${criteria.maxMinutesCenter} min del centro`
            : criteria.nearCenter
              ? 'Cerca del centro'
              : null,
        ],
        [
          'Área terreno',
          [criteria.minLandM2 !== null ? `desde ${m2(criteria.minLandM2)}` : '', criteria.maxLandM2 !== null ? `hasta ${m2(criteria.maxLandM2)}` : '']
            .filter(Boolean)
            .join(' ') || null,
        ],
        ['Construcción', criteria.minConstructionM2 !== null ? `desde ${m2(criteria.minConstructionM2)}` : null],
        [
          'Presupuesto',
          criteria.maxBudgetUsd !== null
            ? `${criteria.minBudgetUsd !== null ? `${usd(criteria.minBudgetUsd)} a ` : 'hasta '}${usd(criteria.maxBudgetUsd)}`
            : null,
        ],
        ['Topografía', criteria.topographies.join(', ') || null],
        ['Zona', criteria.zones.map((z) => (z === 'Urbanizacion' ? 'Urbanización' : z)).join(', ') || null],
        ['Servicios', criteria.requiredServices.join(', ') || null],
        ['Uso', criteria.uses.join(', ') || null],
        ['Pide', criteria.wantedFeatures.join(', ') || null],
      ]
    : [];

  return (
    <div className="mt-6 bg-white p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Sparkles size={18} className="text-blue-500" /> Lo que busca y propiedades recomendadas
        </h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Actualizando...' : 'Volver a leer interés'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : !criteria ? (
        <p className="text-sm text-gray-500">
          Aún no se ha leído el interés de este cliente (se hace al guardar; si no tiene interés escrito no se le recomiendan propiedades).
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm mb-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <span className="text-gray-500 w-28 shrink-0">{label}</span>
                <span className={value ? 'text-gray-800' : 'text-gray-400 italic'}>{value ?? 'No lo indica'}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-5">
            {criteria.method === 'ai' ? <Bot size={13} /> : null}
            {criteria.method === 'ai' ? 'Interpretado con IA' : 'Leído con reglas (sin IA)'}
            {criteria.aiNotes ? ` · ${criteria.aiNotes}` : ''}
          </p>

          <h3 className="text-sm font-semibold text-gray-700 mb-2">Propiedades recomendadas ({matches.length})</h3>
          {matches.length === 0 ? (
            <p className="text-sm text-gray-400">Ninguna propiedad disponible coincide por ahora.</p>
          ) : (
            <div className="space-y-2">
              {matches.map((m) => {
                const parts = splitExplanation(m.explanation);
                return (
                  <div key={m.property.id} className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/admin/propiedades/ver/${m.property.id}`} className="font-semibold text-sm text-blue-700 hover:underline">
                        {m.property.code}
                      </Link>
                      <span className="text-xs text-gray-600">
                        {TYPE_LABEL[m.property.propertyType] ?? m.property.propertyType}
                        {m.property.city?.name ? ` · ${m.property.city.name}` : ''}
                        {m.property.referenceSector ? ` · ${m.property.referenceSector}` : ''} · {usd(m.property.price)}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LEVEL_BADGE[m.level]}`}>{m.level}</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1 flex items-start gap-1">
                      <CheckCircle2 size={13} className="mt-px shrink-0" /> <span>{parts.matched}</span>
                    </p>
                    {parts.pending && (
                      <p className="text-xs text-amber-700 mt-0.5 flex items-start gap-1">
                        <CircleHelp size={13} className="mt-px shrink-0" /> <span>Sin confirmar: {parts.pending}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
