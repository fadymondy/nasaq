/** Writes text to the clipboard. Uses the async Clipboard API, then a hidden textarea when it is unavailable (insecure origins, old browsers). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or not focused: try the fallback below.
  }
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;inset-block-start:0;inset-inline-start:0;opacity:0;pointer-events:none";
  const active = document.activeElement as HTMLElement | null;
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  active?.focus?.();
  return ok;
}
