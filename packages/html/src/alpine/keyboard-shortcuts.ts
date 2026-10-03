// nqShortcuts, nqShortcutKeys, nqShortcutsDialog: the keyboard shortcuts reference. The markup is the React
// ShortcutsReference's (rendered by <x-nq::keyboard-shortcuts>); the state lives here.
//
//   <section data-slot="shortcuts-reference" x-data="nqShortcuts('auto', { results: '{n} shortcuts', resultsOne: '1 shortcut', locale: 'en' })">
//     <input x-model="query" type="search">
//     <div x-bind… x-model="platformValue">  <!-- a toggle group: auto | mac | windows -->
//     <div data-group="nav" data-title="Navigation" x-show="groupVisible($el)">
//       <li data-item="palette" data-search="Open the command palette" data-keys-mac="Mod+K" data-keys-other="Mod+K" x-show="itemVisible($el)">
//         <div data-keys="other" x-show="! apple">…Ctrl K…</div><div data-keys="mac" x-show="apple">…⌘ K…</div>
//
// Both platforms' key caps are server-rendered; `apple` (the device, or the switch) decides which shows. The device is
// read from <html data-platform> or the browser, and follows changes. Search folds Arabic letter variants and matches
// the label, description, group title and the raw keys ("Mod+K") of the platform in view. The switch never ends up
// empty. Each change fires `nq-platform-change` with { platform }.
//
// nqShortcutsDialog(open, hotkey): wraps a dialog (<x-nq::dialog x-model="shown">); the hotkey (default "?") toggles
// `shown` from anywhere except inside a text field, select or editable region. shown is x-modelable.

import type { Magics, Register } from "./types";

/* ------------------------------------------------------------------ hotkey logic (from the React hotkey-recorder) */

export interface HotkeyStep {
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  /** Canonical key name: "K", "1", "Enter", "ArrowUp", "F5", "/". */
  key: string;
}

export interface HotkeyKeyEvent {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

type ModifierName = "mod" | "ctrl" | "meta" | "alt" | "shift";

const MODIFIER_ALIASES: Record<string, ModifierName> = {
  mod: "mod",
  cmdorctrl: "mod",
  commandorcontrol: "mod",
  ctrl: "ctrl",
  control: "ctrl",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  win: "meta",
  super: "meta",
  alt: "alt",
  option: "alt",
  opt: "alt",
  shift: "shift",
};

const KEY_ALIASES: Record<string, string> = {
  esc: "Escape",
  escape: "Escape",
  return: "Enter",
  enter: "Enter",
  space: "Space",
  spacebar: "Space",
  tab: "Tab",
  backspace: "Backspace",
  del: "Delete",
  delete: "Delete",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  insert: "Insert",
  plus: "Plus",
};

const CODE_KEYS: Record<string, string> = {
  Slash: "/",
  Backslash: "\\",
  Comma: ",",
  Period: ".",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Minus: "-",
  Equal: "=",
  Backquote: "`",
  Space: "Space",
  IntlBackslash: "\\",
};

const MODIFIER_CODES = /^(Control|Shift|Alt|Meta|OS|AltGraph|CapsLock|NumLock|Fn)/;
const MAX_STEPS = 3;

/** "esc" to "Escape", "k" to "K", " " to "Space". Empty for nothing usable. */
export function hotkeyNormalizeKey(raw: string): string {
  if (raw === " ") return "Space";
  if (raw === "+") return "Plus";
  const text = raw.trim();
  if (!text) return "";
  const alias = KEY_ALIASES[text.toLowerCase()];
  if (alias) return alias;
  if (/^f([1-9]|1\d|2[0-4])$/i.test(text)) return text.toUpperCase();
  if (text.length === 1) return text.toUpperCase();
  return "";
}

/** Reads "Mod+Shift+K" or "G I" into steps. Null when it is not a usable shortcut. */
export function hotkeyParse(input: string | null | undefined): HotkeyStep[] | null {
  if (!input || !input.trim()) return null;
  const steps: HotkeyStep[] = [];
  for (const token of input.trim().split(/\s+/)) {
    const parts = token === "+" ? ["+"] : token.split("+");
    const step: HotkeyStep = { mod: false, ctrl: false, meta: false, alt: false, shift: false, key: "" };
    for (const part of parts) {
      const modifier = MODIFIER_ALIASES[part.toLowerCase()];
      if (modifier) {
        if (step[modifier]) return null;
        step[modifier] = true;
      } else {
        if (step.key) return null;
        step.key = hotkeyNormalizeKey(part);
        if (!step.key) return null;
      }
    }
    if (!step.key) return null;
    steps.push(step);
  }
  return steps.length > 0 && steps.length <= MAX_STEPS ? steps : null;
}


/** The physical key of a keyboard event as a canonical name, or "" for modifiers alone. */
export function hotkeyEventKey(event: HotkeyKeyEvent): string {
  const code = event.code ?? "";
  if (MODIFIER_CODES.test(code) || /^(Control|Shift|Alt|Meta|OS|AltGraph|CapsLock)$/.test(event.key)) return "";
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return code.slice(6);
  if (CODE_KEYS[code]) return CODE_KEYS[code];
  if (/^F\d{1,2}$/.test(code) || /^(Arrow|Page)/.test(code) || /^(Home|End|Enter|Escape|Tab|Backspace|Delete|Insert)$/.test(code)) return code;
  return hotkeyNormalizeKey(event.key);
}


/** One recorded step. On Apple, Cmd is `Mod` and Control stays `Ctrl`; elsewhere Ctrl is `Mod` and the Windows key is `Meta`. */
export function hotkeyFromEvent(event: HotkeyKeyEvent, apple: boolean): HotkeyStep | null {
  const key = hotkeyEventKey(event);
  if (!key) return null;
  return {
    mod: apple ? Boolean(event.metaKey) : Boolean(event.ctrlKey),
    ctrl: apple ? Boolean(event.ctrlKey) : false,
    meta: apple ? false : Boolean(event.metaKey),
    alt: Boolean(event.altKey),
    shift: Boolean(event.shiftKey),
    key,
  };
}


/** Does this keydown press this step? Matches the physical key first, then the typed character. */
export function hotkeyMatches(step: HotkeyStep, event: HotkeyKeyEvent, apple: boolean): boolean {
  const pressed = hotkeyFromEvent(event, apple);
  if (!pressed) return false;
  if (pressed.mod !== step.mod || pressed.ctrl !== step.ctrl || pressed.meta !== step.meta || pressed.alt !== step.alt) return false;
  const typed = hotkeyNormalizeKey(event.key);
  // "?" is Shift+/ on most layouts: a symbol step without shift still matches the character that was typed.
  const symbolByCharacter = typed === step.key && typed.length === 1 && !/[A-Z0-9]/.test(typed);
  if (pressed.shift !== step.shift && !symbolByCharacter) return false;
  return pressed.key === step.key || typed === step.key;
}

const ARROWS: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };

/** The label of one key: Enter is a return arrow on Apple, arrows are arrows everywhere. */
export function hotkeyKeyCap(key: string, apple: boolean): string {
  if (ARROWS[key]) return ARROWS[key];
  if (key === "Enter") return apple ? "↵" : "Enter";
  if (key === "Escape") return "Esc";
  if (key === "Backspace") return apple ? "⌫" : "Backspace";
  if (key === "Delete") return apple ? "⌦" : "Del";
  if (key === "Plus") return "+";
  if (key === "Tab") return apple ? "⇥" : "Tab";
  return key;
}

/** The key caps to draw for a step, per platform: ⌘ ⇧ K on Apple, Ctrl Shift K elsewhere. */
export function hotkeyCaps(step: HotkeyStep, apple: boolean): string[] {
  const caps: string[] = [];
  if (step.ctrl) caps.push(apple ? "⌃" : "Ctrl");
  if (step.alt) caps.push(apple ? "⌥" : "Alt");
  if (step.shift) caps.push(apple ? "⇧" : "Shift");
  if (step.mod) caps.push(apple ? "⌘" : "Ctrl");
  if (step.meta) caps.push(apple ? "⌘" : "Win");
  caps.push(hotkeyKeyCap(step.key, apple));
  return caps;
}


/* ------------------------------------------------------------------ reference search */

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");

/** Arabic-aware "does this text contain the query": folds case, diacritics, tatweel and alef, yeh and teh-marbuta variants. */
export function hotkeyTextMatches(text: string, query: string): boolean {
  const q = fold(query).trim();
  return q === "" || fold(text).includes(q);
}

/* ------------------------------------------------------------------ Alpine */

const APPLE_PLATFORMS = new Set(["darwin", "macos", "ios"]);
const BROWSER_PLATFORMS = new Set(["web", "extension"]);

/** True on a Mac, iPhone or iPad, or when `<html data-platform>` says so. */
function isApplePlatform(): boolean {
  const platform = document.documentElement.dataset.platform;
  if (platform && !BROWSER_PLATFORMS.has(platform)) return APPLE_PLATFORMS.has(platform);
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

type Platform = "auto" | "mac" | "windows";

interface PlatformState {
  platform: Platform;
  auto: boolean;
  readonly apple: boolean;
}

/** Tracks the device's platform (and `<html data-platform>` changes). Returns the stop function. */
function watchPlatform(state: { auto: boolean }): () => void {
  state.auto = isApplePlatform();
  const observer = new MutationObserver(() => (state.auto = isApplePlatform()));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-platform"] });
  return () => observer.disconnect();
}

const appleOf = (s: PlatformState) => (s.platform === "mac" ? true : s.platform === "windows" ? false : s.auto);

interface ShortcutsState extends PlatformState, Magics {
  query: string;
  platformValue: string[];
  i18n: { results: string; resultsOne: string; locale: string };
  total(): number;
  itemVisible(el: HTMLElement): boolean;
}

export const keyboardShortcuts: Register = (Alpine) => {
  // The reference: search, the Mac/Windows switch and the result count. Both platforms' keys are rendered by the
  // server (data-keys="mac" | "other"); this shows the one that applies. Items carry data-search and
  // data-keys-mac / data-keys-other; groups carry data-title.
  Alpine.data("nqShortcuts", (platform: Platform = "auto", i18n = { results: "{n} shortcuts", resultsOne: "1 shortcut", locale: "en" }) => ({
    platform,
    auto: false,
    query: "",
    platformValue: [platform] as string[],
    i18n,
    get apple() {
      return appleOf(this as unknown as PlatformState);
    },
    stopWatching: null as (() => void) | null,
    destroy(this: { stopWatching: (() => void) | null }) {
      this.stopWatching?.();
    },
    init(this: ShortcutsState & { stopWatching: (() => void) | null }) {
      this.stopWatching = watchPlatform(this);
      this.$watch("platformValue", (v: string[]) => {
        const next = v[0] as Platform | undefined;
        // Pressing the pressed switch clears the group: keep the current platform, like the React component.
        if (!next) {
          this.platformValue = [this.platform];
          return;
        }
        if (next === this.platform) return;
        this.platform = next;
        this.$dispatch("nq-platform-change", { platform: next });
      });
    },
    itemVisible(this: ShortcutsState, el: HTMLElement) {
      const q = this.query;
      if (!q.trim()) return true;
      const title = el.closest<HTMLElement>("[data-group]")?.dataset.title ?? "";
      if (hotkeyTextMatches(title, q)) return true;
      const keys = this.apple ? el.dataset.keysMac : el.dataset.keysOther;
      return hotkeyTextMatches(`${el.dataset.search ?? ""} ${keys ?? ""}`, q);
    },
    groupVisible(this: ShortcutsState, el: HTMLElement) {
      return [...el.querySelectorAll<HTMLElement>("[data-item]")].some((li) => this.itemVisible(li));
    },
    total(this: ShortcutsState & { $root: HTMLElement }) {
      return [...this.$root.querySelectorAll<HTMLElement>("[data-item]")].filter((li) => this.itemVisible(li)).length;
    },
    status(this: ShortcutsState) {
      const total = this.total();
      const count = new Intl.NumberFormat(this.i18n.locale, { numberingSystem: "latn" }).format(total);
      return total === 1 ? this.i18n.resultsOne : this.i18n.results.replace("{n}", count);
    },
  }));

  // One shortcut on its own: shows the keys for the device's platform.
  Alpine.data("nqShortcutKeys", (platform: Platform = "auto") => ({
    platform,
    auto: false,
    get apple() {
      return appleOf(this as unknown as PlatformState);
    },
    stopWatching: null as (() => void) | null,
    init(this: PlatformState & { stopWatching: (() => void) | null }) {
      this.stopWatching = watchPlatform(this);
    },
    destroy(this: { stopWatching: (() => void) | null }) {
      this.stopWatching?.();
    },
  }));

  // The dialog's own state: open, and the key that toggles it (outside text fields).
  Alpine.data("nqShortcutsDialog", (initial: boolean = false, hotkey: string | null = "?") => ({
    shown: Boolean(initial),
    hotkey,
    onKey(this: { shown: boolean; hotkey: string | null }, event: KeyboardEvent) {
      const step = this.hotkey ? hotkeyParse(this.hotkey)?.[0] : undefined;
      if (!step) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (event.defaultPrevented || event.isComposing || !hotkeyMatches(step, event, isApplePlatform())) return;
      event.preventDefault();
      this.shown = !this.shown;
    },
  }));
};
