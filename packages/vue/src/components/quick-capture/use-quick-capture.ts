import { onBeforeUnmount, toValue, watchEffect, type MaybeRefOrGetter } from "vue";
import { isApplePlatform } from "../commands/commands";
import { matchesCaptureShortcut, parseCaptureShortcut } from "./quick-capture-logic";

/**
 * Toggles something from a global shortcut like "Mod+Shift+K" (Mod is Cmd on Apple, Ctrl elsewhere). The `keydown`
 * listener lives only while `enabled` is true and the component is mounted, so it never leaks between pages.
 * A shortcut without a modifier is ignored (a bare letter would steal typing).
 */
export function useCaptureShortcut(
  shortcut: MaybeRefOrGetter<string | null | undefined>,
  toggle: () => void,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  let stop: (() => void) | undefined;
  watchEffect((onCleanup) => {
    const spec = parseCaptureShortcut(toValue(shortcut));
    if (!spec || !toValue(enabled) || typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!matchesCaptureShortcut(spec, event, isApplePlatform())) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    stop = () => window.removeEventListener("keydown", onKeyDown);
    onCleanup(() => stop?.());
  });
  onBeforeUnmount(() => stop?.());
}
