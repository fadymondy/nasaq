import { onBeforeUnmount, ref, type Ref } from "vue";
import type { ServerAdminResult } from "./types";

/** Runs host callbacks, tracks which keys are busy and keeps the last error. A thrown error becomes the generic message. */
export function useRunner(genericError: () => string) {
  const error: Ref<string | null> = ref(null);
  const busy = ref<ReadonlySet<string>>(new Set());
  let mounted = true;
  onBeforeUnmount(() => (mounted = false));

  async function run(keys: readonly string[], task: () => Promise<ServerAdminResult> | ServerAdminResult) {
    error.value = null;
    busy.value = new Set([...busy.value, ...keys]);
    try {
      const result = await task();
      if (result && result.error && mounted) error.value = result.error;
    } catch {
      if (mounted) error.value = genericError();
    } finally {
      if (mounted) {
        const next = new Set(busy.value);
        for (const k of keys) next.delete(k);
        busy.value = next;
      }
    }
  }
  return { error, busy, run };
}
