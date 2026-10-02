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

/** The glyph of a named modifier key (the data-key of the server-drawn kbd) for this platform. */
export function aiKeyGlyph(key: string, apple: boolean): string | undefined {
  return KEY_LABELS[key]?.[apple ? 0 : 1];
}
