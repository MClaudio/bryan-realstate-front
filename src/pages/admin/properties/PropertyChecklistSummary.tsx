import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ListChecks, Loader2 } from "lucide-react";
import api from "../../../services/api";
import {
  CHECKLIST_SIDES,
  type PropertyChecklist,
} from "../../../utils/checklistItems";

interface Props {
  propertyId: string;
  onOpen: () => void;
}

/** Read-only checklist overview for the property detail page. */
export const PropertyChecklistSummary = ({ propertyId, onOpen }: Props) => {
  const [checklist, setChecklist] = useState<PropertyChecklist | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/properties/${propertyId}/checklist`)
      .then((res) => {
        if (!cancelled) setChecklist(res.data);
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <ListChecks size={18} className="text-emerald-600" /> Checklist de
          documentos
        </h3>
        <button
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          <ListChecks size={15} /> Abrir checklist
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600">No se pudo cargar el checklist.</p>
      ) : !checklist ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-gray-400" size={22} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHECKLIST_SIDES.map((side) => {
            const items = checklist[side];
            const done = items.filter((i) => i.checked).length;
            const pct = items.length ? Math.round((done / items.length) * 100) : 0;
            return (
              <div
                key={side}
                className="bg-gray-50 border border-gray-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-gray-900">
                    {side}
                  </span>
                  <span className="text-xs text-gray-500">
                    {done}/{items.length} completos
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full ${
                      done === items.length ? "bg-green-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li key={item.key} className="flex items-start gap-2 text-sm">
                      {item.checked ? (
                        <CheckCircle2
                          size={16}
                          className="text-green-600 mt-0.5 flex-none"
                        />
                      ) : (
                        <Circle size={16} className="text-gray-300 mt-0.5 flex-none" />
                      )}
                      <span
                        className={item.checked ? "text-gray-900" : "text-gray-500"}
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
