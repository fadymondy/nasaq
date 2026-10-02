import { onBeforeUnmount, ref } from "vue";

/** A flag that turns on for 1.5 s, for "Copied" feedback. */
export function useCopilotFlash() {
  const on = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onBeforeUnmount(() => clearTimeout(timer));
  const flash = () => {
    on.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => (on.value = false), 1500);
  };
  return { on, flash };
}

export async function copilotWriteClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
