import { onBeforeUnmount, ref } from "vue";

/** Shows a check for 1.5 seconds after `flash(message, true)`, plus the message for the live region. */
export function useFlash() {
  const status = ref("");
  const done = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onBeforeUnmount(() => clearTimeout(timer));
  function flash(message: string, ok: boolean) {
    clearTimeout(timer);
    status.value = message;
    done.value = ok;
    timer = setTimeout(() => {
      done.value = false;
      status.value = "";
    }, 1500);
  }
  return { status, done, flash };
}
