"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const APPLE_PLATFORMS = new Set(["darwin", "macos", "ios"]);
/** Platforms that run in a browser, where the OS underneath still decides. */
const BROWSER_PLATFORMS = new Set(["web", "extension"]);

/**
 * ⌘ or Ctrl. `<html data-platform>` wins when it is set (Electron's `useWindowChrome`, the lab's Platform
 * control); otherwise the browser's own platform decides.
 */
export function isApplePlatform(): boolean {
  if (typeof document !== "undefined") {
    const platform = document.documentElement.dataset.platform;
    if (platform && !BROWSER_PLATFORMS.has(platform)) return APPLE_PLATFORMS.has(platform);
  }
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

const isApple = isApplePlatform;

/**
 * Registers ⌘+key on Apple platforms and Ctrl+key elsewhere. Matches on `event.code` so the
 * shortcut keeps working on Arabic (and any non-Latin) keyboard layouts. Pass
 * `{ ignoreEditable: true }` for keys that text editors own (⌘B is bold).
 */
export function useModHotkey(
  key: string,
  handler: (event: KeyboardEvent) => void,
  options: boolean | { enabled?: boolean; ignoreEditable?: boolean } = true,
) {
  const { enabled = true, ignoreEditable = false } = typeof options === "boolean" ? { enabled: options } : options;
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = isApple() ? event.metaKey : event.ctrlKey;
      if (!mod || event.altKey || event.shiftKey) return;
      if (event.code !== code && event.key.toLowerCase() !== key.toLowerCase()) return;
      const target = event.target;
      if (ignoreEditable && target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      event.preventDefault();
      ref.current(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, enabled, ignoreEditable]);
}

/** Re-render when `<html data-platform>` changes. */
function subscribePlatform(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-platform"] });
  return () => observer.disconnect();
}

/** "⌘" on Apple platforms, "Ctrl" elsewhere. Renders "Ctrl" on the server, then corrects on hydration. */
export function useModKeyLabel(): string {
  return useSyncExternalStore(subscribePlatform, () => (isApple() ? "⌘" : "Ctrl"), () => "Ctrl");
}

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

/** A command shortcut ("Mod Shift P", "G I") as the keys to draw: ["⌘", "⇧", "P"] on Apple, ["Ctrl", "Shift", "P"] elsewhere. */
export function useShortcutKeys(shortcut: string | undefined): string[] {
  const apple = useModKeyLabel() === "⌘";
  if (!shortcut) return [];
  return shortcut
    .trim()
    .split(/\s+/)
    .map((k) => KEY_LABELS[k.toLowerCase()]?.[apple ? 0 : 1] ?? (k.length === 1 ? k.toUpperCase() : k));
}
