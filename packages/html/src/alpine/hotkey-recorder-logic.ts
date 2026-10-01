/*
 * Keyboard shortcut logic: parse, format, record, compare. Pure functions with no React and no runtime imports,
 * so they run in the recorder, the reference, on a server that stores the bindings, and in node tests.
 *
 * A shortcut is a string. Keys of one chord join with "+", the steps of a sequence with a space:
 * "Mod+Shift+K", "G I", "Alt+ArrowUp". `Mod` is Cmd on Apple platforms and Ctrl elsewhere, so the same string
 * works on every OS. Keys are the physical key (`event.code`), so a binding also works on an Arabic layout.
 */

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

/** The canonical string: modifiers in a fixed order, then the key. "shift+mod+k" becomes "Mod+Shift+K". */
export function hotkeyFormat(steps: readonly HotkeyStep[]): string {
  return steps
    .map((s) =>
      [s.mod && "Mod", s.ctrl && "Ctrl", s.meta && "Meta", s.alt && "Alt", s.shift && "Shift", s.key].filter(Boolean).join("+"),
    )
    .join(" ");
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

/** A shortcut string as the caps to draw, one list per step. Null for a string that does not parse. */
export function hotkeyKeys(shortcut: string, apple: boolean): string[][] | null {
  const steps = hotkeyParse(shortcut);
  return steps ? steps.map((s) => hotkeyCaps(s, apple)) : null;
}

/** Plain text for a shortcut: "⌘⇧K" on Apple, "Ctrl+Shift+K" elsewhere, "G then I" for a sequence. */
export function hotkeyLabel(shortcut: string, apple: boolean, then = "then"): string {
  const keys = hotkeyKeys(shortcut, apple);
  if (!keys) return shortcut;
  return keys.map((caps) => (apple ? caps.join("") : caps.join("+"))).join(` ${then} `);
}

/* ------------------------------------------------------------------ recording */

export interface HotkeyRecordOptions {
  apple: boolean;
  /** Allow "G I": keys without a modifier keep adding steps until Enter (or the limit). Default false: one chord. */
  sequence?: boolean;
  /** Longest sequence. Default 3. */
  maxSteps?: number;
}

export type HotkeyRecordStatus = "recording" | "committed" | "cancelled" | "cleared" | "ignored";

export interface HotkeyRecordResult {
  steps: HotkeyStep[];
  status: HotkeyRecordStatus;
}

/**
 * What one keydown does to a recording in progress. A modifier alone is ignored (the chord is not done until a key
 * joins it). Escape cancels, Backspace or Delete clears (or steps back in a sequence), Enter confirms a sequence.
 */
export function hotkeyRecordKey(steps: readonly HotkeyStep[], event: HotkeyKeyEvent, options: HotkeyRecordOptions): HotkeyRecordResult {
  const { apple, sequence = false, maxSteps = MAX_STEPS } = options;
  const step = hotkeyFromEvent(event, apple);
  if (!step) return { steps: [...steps], status: "ignored" };
  const bare = !step.mod && !step.ctrl && !step.meta && !step.alt && !step.shift;
  if (bare && step.key === "Escape") return { steps: [...steps], status: "cancelled" };
  if (bare && (step.key === "Backspace" || step.key === "Delete")) {
    if (sequence && steps.length > 1) return { steps: steps.slice(0, -1), status: "recording" };
    return { steps: [], status: "cleared" };
  }
  if (!sequence) return { steps: [step], status: "committed" };
  if (bare && step.key === "Enter" && steps.length > 0) return { steps: [...steps], status: "committed" };
  const next = [...steps, step];
  const chord = step.mod || step.ctrl || step.meta || step.alt;
  return { steps: next, status: chord || next.length >= maxSteps ? "committed" : "recording" };
}

/* ------------------------------------------------------------------ checks */

export type HotkeyIssueCode = "empty" | "invalid" | "modifier-required" | "sequence-not-allowed" | "too-long";

export interface HotkeyValidateOptions {
  /** Refuse a bare key: it would fire while people type. */
  requireModifier?: boolean;
  sequence?: boolean;
  maxSteps?: number;
}

/** Is this shortcut acceptable for the field? Null when it is. */
export function hotkeyValidate(input: string | null | undefined, { requireModifier = false, sequence = false, maxSteps = MAX_STEPS }: HotkeyValidateOptions = {}): HotkeyIssueCode | null {
  if (!input || !input.trim()) return "empty";
  const steps = hotkeyParse(input);
  if (!steps) return "invalid";
  if (steps.length > 1 && !sequence) return "sequence-not-allowed";
  if (steps.length > maxSteps) return "too-long";
  if (requireModifier && steps.some((s) => !s.mod && !s.ctrl && !s.meta && !s.alt)) return "modifier-required";
  return null;
}

/** One step with `Mod` resolved for the platform, so "Mod+K" and "Ctrl+K" compare equal on Windows. */
function resolved(step: HotkeyStep, apple: boolean): string {
  const meta = step.meta || (step.mod && apple);
  const ctrl = step.ctrl || (step.mod && !apple);
  return [ctrl && "Ctrl", meta && "Meta", step.alt && "Alt", step.shift && "Shift", step.key].filter(Boolean).join("+");
}

/** The shortcut as one comparable string for the platform. */
export function hotkeyIdentity(input: string, apple: boolean): string | null {
  const steps = hotkeyParse(input);
  return steps ? steps.map((s) => resolved(s, apple)).join(" ") : null;
}

export type HotkeyConflictKind = "duplicate" | "shadows" | "shadowed";

export interface HotkeyBinding {
  id: string;
  shortcut: string;
}

export interface HotkeyConflict {
  id: string;
  shortcut: string;
  /** `duplicate`: same keys. `shadows`: the new shortcut is the start of a longer one ("G" and "G I"). `shadowed`: it continues a shorter one. */
  kind: HotkeyConflictKind;
}

/** Which other bindings clash with this shortcut on this platform. Empty when it is free. */
export function hotkeyConflicts(shortcut: string, others: readonly HotkeyBinding[], { apple, ignoreId }: { apple: boolean; ignoreId?: string }): HotkeyConflict[] {
  const mine = hotkeyIdentity(shortcut, apple);
  if (!mine) return [];
  const out: HotkeyConflict[] = [];
  for (const other of others) {
    if (other.id === ignoreId) continue;
    const theirs = hotkeyIdentity(other.shortcut, apple);
    if (!theirs) continue;
    if (theirs === mine) out.push({ id: other.id, shortcut: other.shortcut, kind: "duplicate" });
    else if (theirs.startsWith(`${mine} `)) out.push({ id: other.id, shortcut: other.shortcut, kind: "shadows" });
    else if (mine.startsWith(`${theirs} `)) out.push({ id: other.id, shortcut: other.shortcut, kind: "shadowed" });
  }
  return out;
}

export interface HotkeyReserved {
  shortcut: string;
  /** Who owns it: the browser or the operating system. */
  owner: "browser" | "system";
  /** Only on Apple platforms. */
  apple?: boolean;
  /** Only on other platforms. */
  other?: boolean;
}

/** Shortcuts a web page cannot own: the browser or the OS takes them before the page sees the key. */
export const HOTKEY_RESERVED: readonly HotkeyReserved[] = [
  { shortcut: "Mod+W", owner: "browser" },
  { shortcut: "Mod+T", owner: "browser" },
  { shortcut: "Mod+N", owner: "browser" },
  { shortcut: "Mod+Shift+N", owner: "browser" },
  { shortcut: "Mod+Shift+T", owner: "browser" },
  { shortcut: "Mod+Shift+W", owner: "browser" },
  { shortcut: "Mod+L", owner: "browser" },
  { shortcut: "Mod+R", owner: "browser" },
  { shortcut: "Mod+Q", owner: "system", apple: true },
  { shortcut: "Mod+H", owner: "system", apple: true },
  { shortcut: "Mod+M", owner: "system", apple: true },
  { shortcut: "Mod+Space", owner: "system", apple: true },
  { shortcut: "Alt+F4", owner: "system", other: true },
  { shortcut: "Alt+Tab", owner: "system", other: true },
  { shortcut: "Ctrl+Tab", owner: "browser" },
  { shortcut: "F5", owner: "browser" },
  { shortcut: "F11", owner: "browser" },
  { shortcut: "F12", owner: "browser" },
];

/** Who takes this shortcut before the page does, or null when it is free to use. */
export function hotkeyReservedBy(shortcut: string, apple: boolean): "browser" | "system" | null {
  const id = hotkeyIdentity(shortcut, apple);
  if (!id) return null;
  for (const r of HOTKEY_RESERVED) {
    if (r.apple && !apple) continue;
    if (r.other && apple) continue;
    if (hotkeyIdentity(r.shortcut, apple) === id) return r.owner;
  }
  return null;
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
