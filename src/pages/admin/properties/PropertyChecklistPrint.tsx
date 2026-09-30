import { createPortal } from "react-dom";
import {
  CHECKLIST_SIDES,
  type ChecklistItem,
  type PropertyChecklist,
} from "../../../utils/checklistItems";

export interface ChecklistPrintProperty {
  code: string;
  address: string;
  owner?: string | null;
  advisor?: { firstName: string; lastName: string } | null;
}

interface Props {
  property: ChecklistPrintProperty;
  checklist: PropertyChecklist;
  companyName: string;
}

const Box = ({ checked }: { checked: boolean }) => (
  <span className="checklist-print-box">{checked ? "✓" : ""}</span>
);

const Section = ({ title, items }: { title: string; items: ChecklistItem[] }) => {
  const done = items.filter((i) => i.checked).length;
  return (
    <section className="checklist-print-section">
      <div className="checklist-print-section-header">
        <h2>{title.toUpperCase()}</h2>
        <span>
          {done}/{items.length} completos
        </span>
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            <Box checked={item.checked} />
            <span className="checklist-print-label">{item.label}</span>
            <span className="checklist-print-date">
              {item.checked && item.checkedAt
                ? new Date(item.checkedAt).toLocaleDateString("es-EC")
                : "Fecha: ____/____/______"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

/**
 * Hidden on screen; only visible when printing (see #print-root rules in index.css).
 * Rendered into document.body so it sits outside the app root and the .dark wrapper.
 */
export const PropertyChecklistPrint = ({ property, checklist, companyName }: Props) =>
  createPortal(
    <div id="print-root">
      <div className="checklist-print">
        <header className="checklist-print-header">
          <div>
            <p className="checklist-print-company">{companyName}</p>
            <h1>Checklist de documentos</h1>
          </div>
          <p className="checklist-print-generated">
            Impreso: {new Date().toLocaleDateString("es-EC")}
          </p>
        </header>

        <table className="checklist-print-meta">
          <tbody>
            <tr>
              <th>Código</th>
              <td>{property.code}</td>
              <th>Asesor</th>
              <td>
                {property.advisor
                  ? `${property.advisor.firstName} ${property.advisor.lastName}`
                  : ""}
              </td>
            </tr>
            <tr>
              <th>Dirección</th>
              <td>{property.address}</td>
              <th>Propietario</th>
              <td>{property.owner ?? ""}</td>
            </tr>
          </tbody>
        </table>

        {CHECKLIST_SIDES.map((side) => (
          <Section key={side} title={side} items={checklist[side]} />
        ))}

        <div className="checklist-print-notes">
          <p>Observaciones:</p>
          <div />
          <div />
        </div>

        <footer className="checklist-print-signatures">
          <div>Firma asesor</div>
          <div>Firma revisión</div>
        </footer>
      </div>
    </div>,
    document.body,
  );
