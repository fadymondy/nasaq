import { computed } from "vue";
import { useNasaq } from "../../provider";
import { STRINGS, type StoreOrderTimelineLabels, type StoreOrderTimelineStrings } from "./strings";

/** The timeline's words for the provider locale, with `labels` laid over them: `{ t, ar, locale }`. */
export function useStoreTimelineStrings(labels?: () => StoreOrderTimelineLabels | undefined) {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const ar = computed(() => locale.value.startsWith("ar"));
  const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...labels?.() }) as StoreOrderTimelineStrings);
  return { t, ar, locale };
}
