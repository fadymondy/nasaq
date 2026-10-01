import { computed } from "vue";
import { useNasaq } from "../../provider";
import { STRINGS, type InstallPromptLabels } from "./strings";

/** The words for the provider locale with `labels` laid over them. */
export function useInstallPromptLabels(labels?: () => Partial<InstallPromptLabels> | undefined) {
  const nq = useNasaq();
  return computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }) as InstallPromptLabels);
}

/** Fills {name} placeholders. */
export const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
