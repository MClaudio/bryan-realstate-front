// The item catalog (keys, labels, order) lives in the backend:
// backend/src/property-checklist/checklist-items.ts
export type ChecklistSide = "Comprador" | "Vendedor";

export interface ChecklistItem {
  key: string;
  label: string;
  checked: boolean;
  checkedAt: string | null;
  checkedBy: { id: string; firstName: string; lastName: string } | null;
}

export type PropertyChecklist = Record<ChecklistSide, ChecklistItem[]>;

// Display order: modal left→right and print sheet top→bottom.
export const CHECKLIST_SIDES: ChecklistSide[] = ["Vendedor", "Comprador"];
