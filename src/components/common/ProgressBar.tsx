import { progressBucket } from "../../utils/saleProcess";

const FILL: Record<ReturnType<typeof progressBucket>, string> = {
  none: "bg-gray-300",
  low: "bg-amber-500",
  mid: "bg-blue-600",
  done: "bg-green-600",
};

const TEXT: Record<ReturnType<typeof progressBucket>, string> = {
  none: "text-gray-500",
  low: "text-amber-700",
  mid: "text-blue-700",
  done: "text-green-700",
};

interface Props {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/** Sale-process progress: grey 0%, amber 1–49%, blue 50–99%, green 100%. */
export const ProgressBar = ({
  value,
  size = "md",
  showLabel = true,
  className = "",
}: Props) => {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const bucket = progressBucket(pct);
  const height = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";
  const labelSize =
    size === "lg" ? "text-xl" : size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex-1 ${height} bg-gray-200 rounded-full overflow-hidden`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avance del proceso"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${FILL[bucket]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className={`font-bold tabular-nums ${labelSize} ${TEXT[bucket]}`}>
          {pct}%
        </span>
      )}
    </div>
  );
};
