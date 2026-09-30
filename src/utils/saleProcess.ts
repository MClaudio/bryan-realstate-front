// Shapes returned by /sale-processes. Completion rules and progress are
// computed by the backend (backend/src/sale-processes/sale-process.rules.ts).
export type PaymentMethod = "Credito" | "Efectivo";
export type SaleStage = "Sena" | "Cooperativa" | "Municipio" | "Notaria" | "Registro";
export type RegistryStatus = "Ingreso" | "Devolutiva" | "Inscrita";

export interface SaleProcessStage {
  stage: SaleStage;
  label: string;
  applies: boolean;
  completed: boolean;
  completedAt: string | null;
  completedBy: { id: string; firstName: string; lastName: string } | null;
  hasData: boolean;
  observation: string | null;
  totalValue: number | null;
  depositAmount: number | null;
  balance: number | null;
  registryStatus: RegistryStatus | null;
}

export interface SaleProcess {
  propertyId: string;
  code: string;
  address: string;
  cityName: string | null;
  suggestedTotalValue: number;
  paymentMethod: PaymentMethod;
  progress: number;
  stages: SaleProcessStage[];
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  Credito: "Crédito",
  Efectivo: "Efectivo",
};

export const PAYMENT_METHOD_BADGE: Record<PaymentMethod, string> = {
  Credito: "bg-blue-100 text-blue-800",
  Efectivo: "bg-amber-100 text-amber-800",
};

export const REGISTRY_STATUSES: RegistryStatus[] = ["Ingreso", "Devolutiva", "Inscrita"];

export type StageState = "done" | "partial" | "empty";

export const stageState = (s: SaleProcessStage): StageState =>
  s.completed ? "done" : s.hasData ? "partial" : "empty";

export const STAGE_STATE_LABELS: Record<StageState, string> = {
  done: "Completo",
  partial: "En curso",
  empty: "Pendiente",
};

export type ProgressBucket = "none" | "low" | "mid" | "done";

export const progressBucket = (pct: number): ProgressBucket =>
  pct >= 100 ? "done" : pct >= 50 ? "mid" : pct > 0 ? "low" : "none";

export const formatMoney = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "—"
    : `$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-EC") : "";
