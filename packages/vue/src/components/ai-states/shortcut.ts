import { computed, onBeforeUnmount, onMounted, ref, toValue, type MaybeRefOrGetter } from "vue";
import { isApplePlatform } from "../keyboard-shortcuts/keyboard-shortcuts";

const KEY_LABELS: Record<string, [apple: string, other: string]> = {
  mod: ["⌘", "Ctrl"],
  cmd: ["⌘", "Ctrl"],
  meta: ["⌘", "Ctrl"],
  "⌘": ["⌘", "Ctrl"],
  ctrl: ["⌃", "Ctrl"],
  control: ["⌃", "Ctrl"],
  alt: ["⌥", "Alt"],
  option: ["⌥", "Alt"],
  shift: ["⇧", "Shift"],
};

/** A command shortcut ("Mod Shift P") as the keys to draw: ["⌘", "⇧", "P"] on Apple, ["Ctrl", "Shift", "P"] elsewhere. */
export function aiShortcutKeys(shortcut: string | undefined, apple: boolean): string[] {
  if (!shortcut) return [];
  return shortcut
    .trim()
    .split(/\s+/)
    .map((k) => KEY_LABELS[k.toLowerCase()]?.[apple ? 0 : 1] ?? (k.length === 1 ? k.toUpperCase() : k));
}

/** The shortcut's keys for this platform. "Ctrl" until mounted, then corrected. */
export function useAiShortcutKeys(shortcut: MaybeRefOrGetter<string | undefined>) {
  const apple = ref(false);
  let observer: MutationObserver | undefined;
  onMounted(() => {
    apple.value = isApplePlatform();
    observer = new MutationObserver(() => (apple.value = isApplePlatform()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-platform"] });
  });
  onBeforeUnmount(() => observer?.disconnect());
  return computed(() => aiShortcutKeys(toValue(shortcut), apple.value));
}

/** Registers ⌘+key on Apple platforms and Ctrl+key elsewhere. Matches on the physical key, so it works on Arabic layouts. */
export function useAiModHotkey(key: string, handler: (event: KeyboardEvent) => void, enabled: MaybeRefOrGetter<boolean> = true) {
  const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
  const onKeyDown = (event: KeyboardEvent) => {
    if (!toValue(enabled)) return;
    const mod = isApplePlatform() ? event.metaKey : event.ctrlKey;
    if (!mod || event.altKey || event.shiftKey) return;
    if (event.code !== code && event.key.toLowerCase() !== key.toLowerCase()) return;
    event.preventDefault();
    handler(event);
  };
  onMounted(() => window.addEventListener("keydown", onKeyDown));
  onBeforeUnmount(() => window.removeEventListener("keydown", onKeyDown));
}

/** True when the visitor asked for less motion. */
export function usePrefersReducedMotion() {
  const has = typeof window !== "undefined" && typeof window.matchMedia === "function";
  const query = has ? window.matchMedia("(prefers-reduced-motion: reduce)") : undefined;
  const reduced = ref(query?.matches ?? false);
  const update = () => (reduced.value = query?.matches ?? false);
  onMounted(() => {
    update();
    query?.addEventListener("change", update);
  });
  onBeforeUnmount(() => query?.removeEventListener("change", update));
  return reduced;
}
