import { useNasaq } from "../../provider";
import {
  formatDate,
  formatDateRange,
  formatNumber,
  formatRelativeTime,
  type DateInput,
  type FormatDateOptions,
  type FormatNumberOptions,
  type FormatRelativeTimeOptions,
} from "./format";

/** `formatNumber` bound to the active locale ("en" outside a NasaqProvider). */
export function useFormatNumber() {
  const nq = useNasaq();
  return (value: number | bigint, options?: FormatNumberOptions) => formatNumber(value, nq.locale.value, options);
}

/** `formatDate`, `formatDateRange` and `formatRelativeTime` bound to the active locale. */
export function useFormatDate() {
  const nq = useNasaq();
  return {
    date: (value: DateInput, options?: FormatDateOptions) => formatDate(value, nq.locale.value, options),
    range: (start: DateInput, end: DateInput, options?: FormatDateOptions) => formatDateRange(start, end, nq.locale.value, options),
    relative: (value: DateInput, options?: FormatRelativeTimeOptions) => formatRelativeTime(value, nq.locale.value, options),
  };
}
