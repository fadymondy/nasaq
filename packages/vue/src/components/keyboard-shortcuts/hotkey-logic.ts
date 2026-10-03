// Keyboard shortcut logic used by the shortcuts reference: parse, draw as key caps, match a keydown, fold Arabic for
// search. Copied from the React hotkey-recorder/hotkey-logic.ts (pure functions, no framework), trimmed to what the
// reference needs. A shortcut is a string: keys of one chord join with "+", the steps of a sequence with a space
// ("Mod+Shift+K", "G I"). `Mod` is Cmd on Apple platforms and Ctrl elsewhere.

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
