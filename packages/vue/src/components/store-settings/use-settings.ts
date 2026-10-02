// Composables shared by the store-settings screens: the strings for the current locale and the busy/error runner of a save.
import { computed, onBeforeUnmount, ref } from "vue";
import { useNasaq } from "../../provider";
import { formatNumber } from "../numeric";
import { settingsStrings, type SettingsResult, type StoreSettingsLabels } from "./strings";

export function useSettingsStrings(labels: () => StoreSettingsLabels | undefined) {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const t = computed(() => settingsStrings(locale.value, labels()));
  return { t, locale, n: (v: number) => formatNumber(v, locale.value) };
}

/** Runs a save or delete, tracks busy and the error, and reports whether it worked. */
export function useAction(fallback: () => string) {
  const busy = ref(false);
  const error = ref<string | null>(null);
  let alive = true;
  onBeforeUnmount(() => (alive = false));
  async function run(job: () => Promise<SettingsResult> | SettingsResult): Promise<boolean> {
    busy.value = true;
    error.value = null;
    try {
      const r = await job();
      if (r && typeof r === "object" && r.error) {
        error.value = r.error;
        return false;
      }
      return true;
    } catch (e) {
      error.value = e instanceof Error && e.message ? e.message : fallback();
      return false;
    } finally {
      if (alive) busy.value = false;
    }
  }
  return { busy, error, run };
}
