import type { FormatNumberOptions } from "../numeric";
import type { KpiStatus, MarginBand } from "./business-reports-math";

export const PERCENT: FormatNumberOptions = { style: "percent", maximumFractionDigits: 1 };
export const WHOLE: FormatNumberOptions = { style: "percent", maximumFractionDigits: 0 };

export const bandVariant: Record<MarginBand, "danger" | "warning" | "success"> = { loss: "danger", thin: "warning", healthy: "success" };
export const statusVariant: Record<KpiStatus, "success" | "info" | "warning"> = { ahead: "success", "on-track": "info", behind: "warning" };
export const statusTone: Record<KpiStatus, "success" | "default" | "warning"> = { ahead: "success", "on-track": "default", behind: "warning" };

/** Minutes as a short duration: "45 min" under two hours, then hours. */
export function durationFormat(minutes: number): { value: number; format: FormatNumberOptions } {
  return minutes >= 120
    ? { value: minutes / 60, format: { style: "unit", unit: "hour", unitDisplay: "short", maximumFractionDigits: 1 } }
    : { value: minutes, format: { style: "unit", unit: "minute", unitDisplay: "short", maximumFractionDigits: 0 } };
}
