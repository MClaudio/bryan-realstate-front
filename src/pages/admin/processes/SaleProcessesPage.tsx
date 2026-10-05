import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Pencil, RefreshCw, Search, Workflow } from "lucide-react";
import api from "../../../services/api";
import { alertError } from "../../../utils/alerts";
import { ProgressBar } from "../../../components/common/ProgressBar";
import {
  PAYMENT_METHOD_BADGE,
  PAYMENT_METHOD_LABELS,
  STAGE_STATE_LABELS,
  formatDate,
  formatMoney,
  isManualStage,
  stageState,
  type PaymentMethod,
  type SaleProcess,
} from "../../../utils/saleProcess";
import { StageDots, Timeline } from "./SaleProcessPanel";

type ProgressFilter = "" | "none" | "active" | "done";

const matchesProgress = (p: number, f: ProgressFilter) =>
  f === "" ||
  (f === "none" && p === 0) ||
  (f === "active" && p > 0 && p < 100) ||
  (f === "done" && p === 100);

/** Read-only view of where the process stands: the first pending step. */
const CurrentStage = ({ process }: { process: SaleProcess }) => {
  const applicable = process.stages.filter((s) => s.applies);
  const index = applicable.findIndex((s) => !s.completed);
  const current = index === -1 ? null : applicable[index];
  const last = applicable[applicable.length - 1];

  return (
    <div className="space-y-4">
      <Timeline stages={applicable} />
      {current ? (
        <div className="bg-white border-2 border-blue-200 rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Paso actual · {index + 1} de {applicable.length}
              </div>
              <div className="text-lg font-bold text-gray-900">{current.label}</div>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                stageState(current) === "partial"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {STAGE_STATE_LABELS[stageState(current)]}
              {current.stage === "Registro" && current.registryStatus
                ? ` · ${current.registryStatus}`
                : ""}
            </span>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {current.stage === "Sena" && (
              <>
                <div>
                  <dt className="text-gray-500">Valor total</dt>
                  <dd className="font-semibold text-gray-900">
                    {formatMoney(current.totalValue ?? process.suggestedTotalValue)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Seña</dt>
                  <dd className="font-semibold text-gray-900">
                    {formatMoney(current.depositAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Saldo pendiente</dt>
                  <dd className="font-semibold text-gray-900">
                    {formatMoney(current.balance)}
                  </dd>
                </div>
              </>
            )}
            <div className="sm:col-span-3">
              <dt className="text-gray-500">Observación</dt>
              <dd className="text-gray-900 whitespace-pre-line">
                {current.observation || (
                  <span className="text-gray-400">Sin observación</span>
                )}
              </dd>
            </div>
          </dl>
          {isManualStage(current.stage) && current.hasData && (
            <p className="text-xs text-blue-800">
              Falta marcar {current.label} como completado (paso manual).
            </p>
          )}
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-green-800 font-semibold">
          ✓ Proceso completado
          {last?.completedAt ? ` · ${formatDate(last.completedAt)}` : ""}
        </div>
      )}
      <div className="flex justify-end">
        <Link
          to={`/admin/procesos/${process.propertyId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
        >
          <Pencil size={15} /> Editar proceso
        </Link>
      </div>
    </div>
  );
};

export const SaleProcessesPage = () => {
  const [processes, setProcesses] = useState<SaleProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<"" | PaymentMethod>("");
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/sale-processes");
      setProcesses(res.data);
    } catch {
      alertError("Error", "No se pudieron cargar los procesos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return processes.filter(
      (p) =>
        (!term ||
          p.code.toLowerCase().includes(term) ||
          p.address.toLowerCase().includes(term)) &&
        (!methodFilter || p.paymentMethod === methodFilter) &&
        matchesProgress(p.progress, progressFilter),
    );
  }, [processes, searchTerm, methodFilter, progressFilter]);

  const counts = useMemo(
    () => ({
      none: processes.filter((p) => p.progress === 0).length,
      active: processes.filter((p) => p.progress > 0 && p.progress < 100).length,
      done: processes.filter((p) => p.progress === 100).length,
    }),
    [processes],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Workflow size={24} className="text-blue-600" /> Procesos de venta
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Avance de cada propiedad: Seña, Cooperativa, Municipio, Notaría y
            Registro de la Propiedad.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700">
            Sin iniciar <b>{counts.none}</b>
          </span>
          <span className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700">
            En curso <b>{counts.active}</b>
          </span>
          <span className="px-3 py-1.5 rounded-full bg-green-100 border border-green-200 text-green-800">
            Completados <b>{counts.done}</b>
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Buscar por código o dirección..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value as "" | PaymentMethod)}
          className="lg:w-52 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filtrar por modalidad"
        >
          <option value="">Todas las modalidades</option>
          <option value="Credito">Crédito</option>
          <option value="Efectivo">Efectivo</option>
        </select>
        <select
          value={progressFilter}
          onChange={(e) => setProgressFilter(e.target.value as ProgressFilter)}
          className="lg:w-44 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filtrar por avance"
        >
          <option value="">Todo avance</option>
          <option value="none">Sin iniciar</option>
          <option value="active">En curso</option>
          <option value="done">Completado</option>
        </select>
        <button
          onClick={fetchProcesses}
          className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={20} /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          No hay procesos que coincidan con los filtros.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-200">
          {filtered.map((p) => {
            const open = expandedId === p.propertyId;
            return (
              <div key={p.propertyId}>
                <div className={`flex items-stretch transition-colors ${open ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpandedId(open ? null : p.propertyId)}
                    className="flex-1 min-w-0 text-left px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5"
                  >
                    <span className="flex items-center gap-3 lg:w-80 min-w-0">
                      <span
                        className={`flex-none w-8 h-8 rounded-lg border flex items-center justify-center ${
                          open ? "border-blue-300 text-blue-700 bg-white" : "border-gray-200 text-gray-500"
                        }`}
                      >
                        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-gray-900">{p.code}</span>
                        <span className="block text-sm text-gray-600 truncate">
                          {p.address}
                          {p.cityName ? ` · ${p.cityName}` : ""}
                        </span>
                      </span>
                    </span>
                    <span className="lg:w-24">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAYMENT_METHOD_BADGE[p.paymentMethod]}`}
                      >
                        {PAYMENT_METHOD_LABELS[p.paymentMethod]}
                      </span>
                    </span>
                    <ProgressBar value={p.progress} className="lg:w-64" />
                    <span className="flex-1 min-w-0">
                      <StageDots process={p} />
                    </span>
                  </button>
                  <Link
                    to={`/admin/procesos/${p.propertyId}`}
                    className="flex-none self-center mr-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:text-blue-700 hover:border-blue-300 transition-colors"
                    title="Editar proceso"
                  >
                    <Pencil size={14} /> <span className="hidden sm:inline">Editar</span>
                  </Link>
                </div>
                {open && (
                  <div className="px-5 lg:pl-16 py-5 bg-gray-50 border-t border-gray-200">
                    <CurrentStage process={p} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
