import { computed } from "vue";
import { useNasaq } from "../../provider";
import { STRINGS, type DesktopNotificationLabels } from "./strings";

/** The words for the provider locale with `labels` laid over them. */
export function useDesktopNotificationLabels(labels?: () => Partial<DesktopNotificationLabels> | undefined) {
  const nq = useNasaq();
  return computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }) as DesktopNotificationLabels);
}
