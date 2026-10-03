import { ref } from "vue";
import { resultError } from "./use-note-menu";

/** Runs a callback that may resolve to `{ error }`, tracking the busy state and the message. */
export function useAction() {
  const busy = ref(false);
  const error = ref<string | null>(null);
  async function run(fn: () => unknown, failed: string): Promise<boolean> {
    busy.value = true;
    error.value = null;
    try {
      const message = resultError(await fn());
      if (message) {
        error.value = message;
        return false;
      }
      return true;
    } catch {
      error.value = failed;
      return false;
    } finally {
      busy.value = false;
    }
  }
  return { busy, error, run };
}
