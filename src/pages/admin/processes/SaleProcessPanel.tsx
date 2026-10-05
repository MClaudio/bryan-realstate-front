import { useState } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import api from "../../../services/api";
import { alertError, toastSuccess } from "../../../utils/alerts";
import {
  PAYMENT_METHOD_LABELS,
  REGISTRY_STATUSES,
  STAGE_STATE_LABELS,
  formatDate,
  formatMoney,
  isManualStage,
  stageState,
  type PaymentMethod,
  type RegistryStatus,
  type SaleProcess,
  type SaleProcessStage,
  type StageState,
} from "../../../utils/saleProcess";

const errorMessage = (err: unknown, fallback: string) => {
  if (isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string") return msg;
  }
  return fallback;
};

// ─── Step dots (list rows) ───────────────────────────────────────────────────
const DOT: Record<StageState, string> = {
  done: "w-2.5 h-2.5 bg-green-600",
  partial: "w-2.5 h-2.5 border-2 border-blue-600 bg-blue-200",
  empty: "w-2.5 h-2.5 border-2 border-gray-300 bg-white",
};

export const StageDots = ({ process }: { process: SaleProcess }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
    {process.stages
      .filter((s) => s.applies)
      .map((s) => {
        const state = stageState(s);
        return (
          <span
            key={s.stage}
            className="inline-flex items-center gap-1.5"
            title={`${s.label}: ${STAGE_STATE_LABELS[state]}`}
          >
            <span className={`rounded-full flex-none ${DOT[state]}`} />
            {s.stage === "Registro" ? "Registro" : s.label}
            {s.stage === "Registro" && !s.completed && s.registryStatus && (
              <span className="text-gray-500">· {s.registryStatus}</span>
            )}
          </span>
        );
      })}
  </div>
);

// ─── Stage card ──────────────────────────────────────────────────────────────
const STAGE_HINTS: Record<SaleProcessStage["stage"], string> = {
  Sena: "Se completa automáticamente cuando el monto de seña es mayor a 0.",
  Cooperativa: "Paso manual: se completa solo al marcar la casilla.",
  Municipio: "Paso manual: se completa solo al marcar la casilla.",
  Notaria: "Se completa automáticamente al guardar una observación.",
  Registro: "Ingreso y Devolutiva quedan en curso. Se completa cuando el estado es Inscrita.",
};

const OBSERVATION_LABELS: Record<SaleProcessStage["stage"], string> = {
  Sena: "Observación (opcional)",
  Cooperativa: "Observación: estado del trámite, papeles o documentos que faltan",
  Municipio: "Observación",
  Notaria: "Observación",
  Registro: "Observación",
};

const StatusBadge = ({ stage }: { stage: SaleProcessStage }) => {
  const state = stageState(stage);
  if (state === "done") {
    const who = stage.completedBy
      ? ` · ${stage.completedBy.firstName} ${stage.completedBy.lastName}`
      : "";
    return (
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
        ✓ Completo · {formatDate(stage.completedAt)}
        {who}
      </span>
    );
  }
  const detail =
    state === "partial" && isManualStage(stage.stage)
      ? " · falta marcar"
      : state === "partial" && stage.stage === "Registro" && stage.registryStatus
        ? ` · ${stage.registryStatus}`
        : "";
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
        state === "partial" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
      }`}
    >
      {STAGE_STATE_LABELS[state]}
      {detail}
    </span>
  );
};

const inputClass =
  "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const toInput = (v: number | null) => (v === null ? "" : String(v));
const toNumber = (v: string) => (v.trim() === "" ? null : Number(v));

interface StageCardProps {
  index: number;
  stage: SaleProcessStage;
  propertyId: string;
  suggestedTotalValue: number;
  onSaved: (p: SaleProcess) => void;
}

const StageCard = ({
  index,
  stage,
  propertyId,
  suggestedTotalValue,
  onSaved,
}: StageCardProps) => {
  const initialTotal =
    stage.totalValue ?? (stage.stage === "Sena" ? suggestedTotalValue : null);
  const [observation, setObservation] = useState(stage.observation ?? "");
  const [totalValue, setTotalValue] = useState(toInput(initialTotal));
  const [depositAmount, setDepositAmount] = useState(toInput(stage.depositAmount));
  const [registryStatus, setRegistryStatus] = useState<RegistryStatus | "">(
    stage.registryStatus ?? "",
  );
  const [saving, setSaving] = useState(false);

  const total = toNumber(totalValue);
  const deposit = toNumber(depositAmount);
  const balance = total !== null ? total - (deposit ?? 0) : null;
  const depositTooHigh = total !== null && deposit !== null && deposit > total;

  const dirty =
    observation.trim() !== (stage.observation ?? "") ||
    (stage.stage === "Sena" &&
      (total !== initialTotal || deposit !== stage.depositAmount)) ||
    (stage.stage === "Registro" && (registryStatus || null) !== stage.registryStatus);

  const patch = async (body: Record<string, unknown>, successMsg: string) => {
    setSaving(true);
    try {
      const res = await api.patch(
        `/sale-processes/${propertyId}/stages/${stage.stage}`,
        body,
      );
      onSaved(res.data);
      toastSuccess(successMsg);
    } catch (err) {
      alertError("Error", errorMessage(err, "No se pudo guardar el paso"));
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    const body: Record<string, unknown> = { observation: observation.trim() || null };
    if (stage.stage === "Sena") {
      body.totalValue = total;
      body.depositAmount = deposit;
    }
    if (stage.stage === "Registro") body.registryStatus = registryStatus || null;
    patch(body, `${stage.label} guardado`);
  };

  const state = stageState(stage);
  const border =
    state === "done"
      ? "border border-green-200"
      : state === "partial"
        ? "border-2 border-blue-300"
        : "border border-gray-200";

  return (
    <section className={`bg-white rounded-xl p-5 space-y-4 ${border}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-gray-900">
          {index}. {stage.label}
        </h3>
        <StatusBadge stage={stage} />
      </div>

      {stage.stage === "Sena" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-gray-700">
            Valor total
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={totalValue}
              onChange={(e) => setTotalValue(e.target.value)}
            />
            <span className="text-xs font-normal text-gray-500">
              Precargado del precio de venta (editable)
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-gray-700">
            Monto de seña
            <input
              type="number"
              min={0}
              step="0.01"
              className={`${inputClass} ${depositTooHigh ? "border-red-500" : ""}`}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            {depositTooHigh && (
              <span className="text-xs font-normal text-red-600">
                La seña no puede ser mayor que el valor total
              </span>
            )}
          </label>
          <div className="flex flex-col gap-1.5 text-sm font-semibold text-gray-700">
            Saldo pendiente
            <div className="px-3 py-2.5 rounded-lg bg-gray-100 text-base font-bold text-gray-900">
              {formatMoney(balance)}
            </div>
            <span className="text-xs font-normal text-gray-500">
              Calculado: valor total − seña
            </span>
          </div>
        </div>
      )}

      <div
        className={
          stage.stage === "Registro"
            ? "grid grid-cols-1 sm:grid-cols-[240px_minmax(0,1fr)] gap-4"
            : ""
        }
      >
        {stage.stage === "Registro" && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-gray-700">
            Estado
            <select
              className={`${inputClass} bg-white`}
              value={registryStatus}
              onChange={(e) => setRegistryStatus(e.target.value as RegistryStatus | "")}
            >
              <option value="">Seleccionar estado…</option>
              {REGISTRY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-gray-700">
          {OBSERVATION_LABELS[stage.stage]}
          <textarea
            rows={2}
            className={`${inputClass} resize-y font-normal`}
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder={
              stage.stage === "Notaria"
                ? "Ej: Firma agendada en la Notaría…"
                : stage.stage === "Registro"
                  ? "Ej: Devolutiva por error en linderos…"
                  : ""
            }
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {isManualStage(stage.stage) ? (
          <label className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-dashed border-blue-300 bg-blue-50 text-sm font-semibold text-blue-700 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 accent-green-600"
              checked={stage.completed}
              disabled={saving}
              onChange={(e) =>
                // Send the observation too so an unsaved one isn't lost.
                patch(
                  { completed: e.target.checked, observation: observation.trim() || null },
                  e.target.checked ? `${stage.label} completado` : `${stage.label} desmarcado`,
                )
              }
            />
            Marcar {stage.label} como completado
          </label>
        ) : (
          <span className="text-xs text-gray-500">{STAGE_HINTS[stage.stage]}</span>
        )}
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-amber-700">Cambios sin guardar</span>}
          <button
            onClick={save}
            disabled={saving || !dirty || depositTooHigh}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isManualStage(stage.stage) ? "Guardar observación" : "Guardar"}
          </button>
        </div>
      </div>
    </section>
  );
};

// ─── Timeline ────────────────────────────────────────────────────────────────
export const Timeline = ({ stages }: { stages: SaleProcessStage[] }) => (
  <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 overflow-x-auto">
    <ol className="flex items-start min-w-130">
      {stages.map((s, i) => {
        const state = stageState(s);
        return (
          <li key={s.stage} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 w-28 text-center">
              {state === "done" ? (
                <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center">
                  <Check size={16} strokeWidth={3} />
                </span>
              ) : (
                <span
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                    state === "partial"
                      ? "border-blue-600 bg-blue-100 text-blue-700"
                      : "border-gray-300 bg-white text-gray-500"
                  }`}
                >
                  {i + 1}
                </span>
              )}
              <span className="text-sm font-semibold text-gray-900">{s.label}</span>
              <span
                className={`text-xs ${
                  state === "done"
                    ? "text-green-700"
                    : state === "partial"
                      ? "text-blue-700"
                      : "text-gray-500"
                }`}
              >
                {STAGE_STATE_LABELS[state]}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div
                className={`flex-1 h-0.5 mt-4 ${
                  state === "done" ? "bg-green-600" : "bg-gray-300"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  </div>
);

// ─── Panel ───────────────────────────────────────────────────────────────────
interface PanelProps {
  process: SaleProcess;
  onChange: (p: SaleProcess) => void;
}

export const SaleProcessPanel = ({ process, onChange }: PanelProps) => {
  const [changingMethod, setChangingMethod] = useState(false);
  const applicable = process.stages.filter((s) => s.applies);

  const setMethod = async (paymentMethod: PaymentMethod) => {
    if (paymentMethod === process.paymentMethod) return;
    setChangingMethod(true);
    try {
      const res = await api.patch(`/sale-processes/${process.propertyId}`, {
        paymentMethod,
      });
      onChange(res.data);
      toastSuccess(`Modalidad: ${PAYMENT_METHOD_LABELS[paymentMethod]}`);
    } catch (err) {
      alertError("Error", errorMessage(err, "No se pudo cambiar la modalidad"));
    } finally {
      setChangingMethod(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Modalidad de pago</span>
          <div
            role="radiogroup"
            aria-label="Modalidad de pago"
            className="inline-flex bg-gray-200 rounded-lg p-1"
          >
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => {
              const active = process.paymentMethod === m;
              return (
                <button
                  key={m}
                  role="radio"
                  aria-checked={active}
                  disabled={changingMethod}
                  onClick={() => setMethod(m)}
                  className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-white font-semibold text-blue-800 shadow-sm"
                      : "font-medium text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {PAYMENT_METHOD_LABELS[m]}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-gray-500">
            {process.paymentMethod === "Efectivo"
              ? "Cooperativa no aplica en Efectivo; lo que tenga guardado se conserva."
              : "En Efectivo no aplica Cooperativa."}
          </span>
        </div>
        <Link
          to={`/admin/propiedades/ver/${process.propertyId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Ver propiedad <ExternalLink size={14} />
        </Link>
      </div>

      <Timeline stages={applicable} />

      {applicable.map((s, i) => (
        <StageCard
          // Remount only when THIS stage's saved data changes, so unsaved
          // edits in other cards survive a save elsewhere.
          key={[
            s.stage,
            s.observation,
            s.totalValue,
            s.depositAmount,
            s.registryStatus,
            s.completed,
          ].join("|")}
          index={i + 1}
          stage={s}
          propertyId={process.propertyId}
          suggestedTotalValue={process.suggestedTotalValue}
          onSaved={onChange}
        />
      ))}
    </div>
  );
};
