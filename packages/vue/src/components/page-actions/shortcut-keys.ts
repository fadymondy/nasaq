import { isApplePlatform } from "../commands/commands";

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
export function shortcutKeys(shortcut: string | undefined): string[] {
  if (!shortcut) return [];
  const apple = isApplePlatform();
  return shortcut
    .trim()
    .split(/\s+/)
    .map((k) => KEY_LABELS[k.toLowerCase()]?.[apple ? 0 : 1] ?? (k.length === 1 ? k.toUpperCase() : k));
}
