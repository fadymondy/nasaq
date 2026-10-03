import { computed } from "vue";
import { useNasaq } from "../../provider";
import { STRINGS, type AppUpdateLabels } from "./strings";

/** The words for the provider locale with `labels` laid over them, plus the locale itself. */
export function useAppUpdateLabels(labels?: () => Partial<AppUpdateLabels> | undefined) {
  const nq = useNasaq();
  const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }) as AppUpdateLabels);
  return { t, locale: nq.locale };
}

/** Fills {name} placeholders. */
export const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
