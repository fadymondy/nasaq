import { formatNumber } from "../numeric";
import { vitalDisplay, type WebVitalId } from "./web-vitals-math";

/** The value as text with its unit, in the given locale: "2.4 s", "180 ms", "0.08". */
export function formatVital(metric: WebVitalId, value: number, locale: string): string {
  const d = vitalDisplay(metric, value);
  const n = formatNumber(d.value, locale, { minimumFractionDigits: 0, maximumFractionDigits: d.fractionDigits });
  if (!d.unit) return n;
  const ar = locale.startsWith("ar");
  const unit = d.unit === "s" ? (ar ? "ث" : "s") : ar ? "مللي ث" : "ms";
  return `${n} ${unit}`;
}
