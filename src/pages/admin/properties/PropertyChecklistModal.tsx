import { useEffect, useState } from "react";
import { ListChecks, Printer, X, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../../services/api";
import { alertError } from "../../../utils/alerts";
import {
  CHECKLIST_SIDES,
  type ChecklistSide,
  type PropertyChecklist,
} from "../../../utils/checklistItems";
import {
  PropertyChecklistPrint,
  type ChecklistPrintProperty,
} from "./PropertyChecklistPrint";

interface Props {
  property: ChecklistPrintProperty & { id: string };
  onClose: () => void;
}

export const PropertyChecklistModal = ({ property, onClose }: Props) => {
  const [checklist, setChecklist] = useState<PropertyChecklist | null>(null);
  const [companyName, setCompanyName] = useState("Inmobiliaria");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/properties/${property.id}/checklist`)
      .then((res) => {
        if (!cancelled) setChecklist(res.data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err.response?.data?.message || "No se pudo cargar el checklist",
          );
      });
    api
      .get("/configuration")
      .then((res) => {
        if (!cancelled && res.data?.companyName)
          setCompanyName(res.data.companyName);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [property.id]);

  const setItemChecked = (side: ChecklistSide, key: string, checked: boolean) =>
    setChecklist((prev) =>
      prev
        ? {
            ...prev,
            [side]: prev[side].map((item) =>
              item.key === key
                ? {
                    ...item,
                    checked,
                    checkedAt: checked ? new Date().toISOString() : null,
                  }
                : item,
            ),
          }
        : prev,
    );

  const toggle = async (side: ChecklistSide, key: string, checked: boolean) => {
    const id = `${side}:${key}`;
    setItemChecked(side, key, checked);
    setSaving((prev) => new Set(prev).add(id));
    try {
      const res = await api.patch(`/properties/${property.id}/checklist`, {
        side,
        itemKey: key,
        checked,
      });
      setChecklist((prev) =>
        prev
          ? {
              ...prev,
              [side]: prev[side].map((item) =>
                item.key === key
                  ? {
                      ...item,
                      checked: res.data.checked,
                      checkedAt: res.data.checkedAt,
                      checkedBy: res.data.checkedBy,
                    }
                  : item,
              ),
            }
          : prev,
      );
    } catch (err) {
      setItemChecked(side, key, !checked);
      alertError(
        "Error",
        (isAxiosError(err) && err.response?.data?.message) ||
          "No se pudo guardar el cambio",
      );
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-full bg-emerald-100">
              <ListChecks size={18} className="text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900">
                Checklist de documentos
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {property.code} · {property.address}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : !checklist ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CHECKLIST_SIDES.map((side) => {
                const items = checklist[side];
                const done = items.filter((i) => i.checked).length;
                return (
                  <div
                    key={side}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">{side}</h3>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          done === items.length
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {done}/{items.length} completos
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {items.map((item) => {
                        const isSaving = saving.has(`${side}:${item.key}`);
                        return (
                          <li key={item.key}>
                            <label className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50">
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 accent-emerald-600 cursor-pointer"
                                checked={item.checked}
                                disabled={isSaving}
                                onChange={(e) =>
                                  toggle(side, item.key, e.target.checked)
                                }
                              />
                              <span className="flex-1 min-w-0">
                                <span
                                  className={`block text-sm ${
                                    item.checked
                                      ? "text-gray-900"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {item.label}
                                </span>
                                {item.checked && item.checkedAt && (
                                  <span className="block text-xs text-gray-400">
                                    {new Date(item.checkedAt).toLocaleDateString(
                                      "es-EC",
                                    )}
                                    {item.checkedBy &&
                                      ` · ${item.checkedBy.firstName} ${item.checkedBy.lastName}`}
                                  </span>
                                )}
                              </span>
                              {isSaving && (
                                <Loader2
                                  size={14}
                                  className="animate-spin text-gray-400 mt-1"
                                />
                              )}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => window.print()}
            disabled={!checklist || saving.size > 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors"
          >
            <Printer size={16} />
            Imprimir
          </button>
        </div>
      </div>

      {checklist && (
        <PropertyChecklistPrint
          property={property}
          checklist={checklist}
          companyName={companyName}
        />
      )}
    </div>
  );
};
