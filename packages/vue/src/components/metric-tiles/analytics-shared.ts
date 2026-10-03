import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

export { changeRatio } from "./analytics-math";

/** The component's own English or Arabic strings by the active locale, with the host's `labels` on top. */
export function useAnalyticsLabels<T extends object>(strings: { en: T; ar: T }, override?: () => Partial<T> | undefined): ComputedRef<T> {
  const nq = useNasaq();
  return computed(() => ({ ...strings[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...override?.() }));
}
