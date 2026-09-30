import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Workflow } from "lucide-react";
import api from "../../../services/api";
import { ProgressBar } from "../../../components/common/ProgressBar";
import {
  PAYMENT_METHOD_BADGE,
  PAYMENT_METHOD_LABELS,
  STAGE_STATE_LABELS,
  formatMoney,
  stageState,
  type SaleProcess,
  type SaleProcessStage,
} from "../../../utils/saleProcess";

const TILE = {
  done: "bg-green-50 border-green-200 text-green-800",
  partial: "bg-blue-50 border-blue-200 text-blue-800",
  empty: "bg-gray-50 border-gray-200 text-gray-600",
};
const MARK = { done: "✓", partial: "◐", empty: "○" };

const detailOf = (s: SaleProcessStage) => {
  if (s.stage === "Sena" && s.completed) return `Saldo ${formatMoney(s.balance)}`;
  if (s.stage === "Registro" && s.registryStatus) return s.registryStatus;
  return STAGE_STATE_LABELS[stageState(s)];
};

/** Read-only sale-process summary for the property detail page. */
export const SaleProcessCard = ({ propertyId }: { propertyId: string }) => {
  const [process, setProcess] = useState<SaleProcess | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/sale-processes/${propertyId}`)
      .then((res) => {
        if (!cancelled) setProcess(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Workflow size={18} className="text-blue-600" /> Proceso de venta
          {process && (
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${PAYMENT_METHOD_BADGE[process.paymentMethod]}`}
            >
              {PAYMENT_METHOD_LABELS[process.paymentMethod]}
            </span>
          )}
        </h3>
        <Link
          to={`/admin/procesos/${propertyId}`}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Editar proceso <ArrowRight size={15} />
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-600">No se pudo cargar el proceso.</p>
      ) : !process ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-gray-400" size={22} />
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
          <ProgressBar value={process.progress} size="lg" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {process.stages
              .filter((s) => s.applies)
              .map((s) => {
                const state = stageState(s);
                return (
                  <div key={s.stage} className={`rounded-lg border px-3 py-2 ${TILE[state]}`}>
                    <div className="text-sm font-semibold">
                      {MARK[state]} {s.label}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">{detailOf(s)}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
