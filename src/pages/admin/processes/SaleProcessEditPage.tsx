import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import api from "../../../services/api";
import { ProgressBar } from "../../../components/common/ProgressBar";
import {
  PAYMENT_METHOD_BADGE,
  PAYMENT_METHOD_LABELS,
  type SaleProcess,
} from "../../../utils/saleProcess";
import { SaleProcessPanel } from "./SaleProcessPanel";

export const SaleProcessEditPage = () => {
  const { propertyId } = useParams();
  const [process, setProcess] = useState<SaleProcess | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/sale-processes/${propertyId}`)
      .then((res) => {
        if (!cancelled) setProcess(res.data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err.response?.data?.message || "No se pudo cargar el proceso");
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/procesos"
          className="p-2 hover:bg-gray-100 rounded-full"
          aria-label="Volver a Procesos"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 flex flex-wrap items-center gap-3">
            Proceso de venta {process ? `· ${process.code}` : ""}
            {process && (
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAYMENT_METHOD_BADGE[process.paymentMethod]}`}
              >
                {PAYMENT_METHOD_LABELS[process.paymentMethod]}
              </span>
            )}
          </h1>
          {process && (
            <p className="text-sm text-gray-600 truncate">
              {process.address}
              {process.cityName ? ` · ${process.cityName}` : ""}
            </p>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-red-600">
          {error}
        </div>
      ) : !process ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-700 mb-2">Avance del proceso</div>
            <ProgressBar value={process.progress} size="lg" />
          </div>
          <SaleProcessPanel process={process} onChange={setProcess} />
        </>
      )}
    </div>
  );
};
