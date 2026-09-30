"use client";

import type { LucideIcon } from "lucide-react";
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { isApplePlatform } from "../../lib/hotkey";

/**
 * Standard sections, in display order. Products may use their own section ids too; those sort
 * after "products" unless they pass `sectionOrder`.
 */
export const COMMAND_SECTIONS = ["context", "search", "create", "navigation", "products", "ai", "system"] as const;
export type CommandSection = (typeof COMMAND_SECTIONS)[number];

export const DEFAULT_SECTION_LABELS: Record<CommandSection, { en: string; ar: string }> = {
  context: { en: "This page", ar: "هذه الصفحة" },
  search: { en: "Results", ar: "النتائج" },
  create: { en: "Create", ar: "إنشاء" },
  navigation: { en: "Go to", ar: "انتقال" },
  products: { en: "Switch product", ar: "تبديل المنتج" },
  ai: { en: "Ask AI", ar: "الذكاء الاصطناعي" },
  system: { en: "System", ar: "النظام" },
};

export interface Command {
  /** Unique across the registry. Prefix with your product, e.g. "mahaam.issue.new". */
  id: string;
  label: string;
  section?: CommandSection | (string & {});
  /** Label for a custom section id (ignored for standard sections). */
  sectionLabel?: string;
  /** Position of a custom section; standard sections are 0–6. Default 4.5 (after products). */
  sectionOrder?: number;
  /** A Lucide icon, or an element such as a ProductMark. */
  icon?: LucideIcon | ReactElement;
  /** Extra words that should match: synonyms, the other language's name, ids. */
  keywords?: string[];
  /**
   * Key sequence, space-separated: "C", "G I", "Shift A", "?", or one modified chord: "Mod K",
   * "⌘ Shift P", "Alt N" ("Mod"/"⌘" = ⌘ on Apple, Ctrl elsewhere). Shown in the palette and, unless
   * `bindShortcut` is false, bound globally. Plain keys never fire inside text fields; chords do.
   * Letters and digits match physical keys, so shortcuts work on Arabic layouts.
   */
  shortcut?: string;
  bindShortcut?: boolean;
  /** Muted text at the inline end, e.g. "Project" or "Mahaam". */
  hint?: ReactNode;
  /** Higher sorts first within its section when there is no query. */
  priority?: number;
  disabled?: boolean;
  /** Only listed once the user types (rare or destructive commands). */
  searchOnly?: boolean;
  perform?: () => void;
  /** Opens a nested page of commands instead of running (e.g. "Change status →"). */
  children?: Command[] | (() => Command[]);
  /** Keep the palette open after `perform` (e.g. toggles you may repeat). */
  keepOpen?: boolean;
}

/** Async results for the "search" section (or any section), run as the user types. */
export interface CommandSource {
  id: string;
  /** Called with the trimmed query once it reaches `minQuery` characters. Abort on `signal`. */
  search: (query: string, signal: AbortSignal) => Promise<Command[]> | Command[];
  minQuery?: number;
  /** Debounce in ms. Default 150. */
  debounce?: number;
}

type Listener = () => void;

export interface RegistrySnapshot {
  commands: Command[];
  sources: CommandSource[];
  paletteOpen: boolean;
}

/** Holds every mounted component's commands. One per app (AppShell creates it). */
export class CommandRegistry {
  private commands = new Map<string, Command[]>();
  private sources = new Map<string, CommandSource>();
  private listeners = new Set<Listener>();
  private snapshot: RegistrySnapshot = { commands: [], sources: [], paletteOpen: false };
  private paletteOpen = false;

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.snapshot;

  /** The palette's open state, shared so any SearchTrigger can open the one palette. */
  setPaletteOpen = (open: boolean) => {
    if (open === this.paletteOpen) return;
    this.paletteOpen = open;
    this.emit();
  };
  setCommands(owner: string, commands: Command[] | null) {
    if (commands) this.commands.set(owner, commands);
    else this.commands.delete(owner);
    this.emit();
  }
  setSource(owner: string, source: CommandSource | null) {
    if (source) this.sources.set(owner, source);
    else this.sources.delete(owner);
    this.emit();
  }
  private emit() {
    const commands = [...this.commands.values()].flat();
    if ((globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !== "production") {
      const seen = new Set<string>();
      for (const c of commands) {
        if (seen.has(c.id)) console.warn(`[nasaq] Duplicate command id "${c.id}". Ids must be unique across the registry.`);
        seen.add(c.id);
      }
    }
    this.snapshot = { commands, sources: [...this.sources.values()], paletteOpen: this.paletteOpen };
    for (const l of this.listeners) l();
  }
}

const RegistryContext = createContext<CommandRegistry | null>(null);

/** Provides a command registry. AppShell includes one; use this for apps without the shell. */
export function CommandProvider({ children, registry }: { children: ReactNode; registry?: CommandRegistry }) {
  const parent = useContext(RegistryContext);
  const [own] = useState(() => registry ?? new CommandRegistry());
  // Nested providers reuse the outer registry, so every command lands in the one palette.
  const value = parent ?? own;
  return (
    <RegistryContext.Provider value={value}>
      {parent ? null : <ShortcutBinder registry={value} />}
      {children}
    </RegistryContext.Provider>
  );
}

export function useCommandRegistry() {
  return useContext(RegistryContext);
}

/** Everything registered right now. Re-renders when any component adds or removes commands. */
export function useRegisteredCommands() {
  const registry = useContext(RegistryContext);
  const empty = useRef<RegistrySnapshot>({ commands: [], sources: [], paletteOpen: false });
  return useSyncExternalStore(
    registry?.subscribe ?? (() => () => {}),
    registry?.getSnapshot ?? (() => empty.current),
    () => empty.current,
  );
}

/**
 * Registers commands while the calling component is mounted, e.g. a page's contextual actions.
 * Nasaq holds no business logic: products pass `perform` callbacks. Memoise the array
 * (`useMemo`): a new array on every render re-registers on every render.
 */
export function useRegisterCommands(commands: Command[] | null | undefined) {
  const registry = useContext(RegistryContext);
  const owner = useId();
  useEffect(() => {
    registry?.setCommands(owner, commands ?? null);
  }, [registry, owner, commands]);
  useEffect(() => () => registry?.setCommands(owner, null), [registry, owner]);
}

/** The shared palette open state: `[open, setOpen]`. Works in AppShell and in a bare CommandProvider. */
export function useCommandPaletteOpen(): [boolean, (open: boolean) => void] {
  const registry = useContext(RegistryContext);
  const { paletteOpen } = useRegisteredCommands();
  return [paletteOpen, registry?.setPaletteOpen ?? noop];
}
const noop = () => {};

/** Registers an async search source (records, people, docs…) while mounted. */
export function useRegisterCommandSource(source: CommandSource | null | undefined) {
  const registry = useContext(RegistryContext);
  const owner = useId();
  useEffect(() => {
    registry?.setSource(owner, source ?? null);
  }, [registry, owner, source]);
  useEffect(() => () => registry?.setSource(owner, null), [registry, owner]);
}

/* ------------------------------------------------------------------ matching */

/** Folds case, Arabic diacritics/tatweel and letter variants so "اداره" finds "إدارة". */
export function normalizeForSearch(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

/** 0 = no match. Prefix of the label beats a word prefix beats a substring beats a keyword. */
export function scoreCommand(command: Command, query: string) {
  if (!query) return 1;
  const label = normalizeForSearch(command.label);
  if (label.startsWith(query)) return 4;
  if (label.split(/\s+/).some((w) => w.startsWith(query))) return 3;
  if (label.includes(query)) return 2;
  const keywords = (command.keywords ?? []).map(normalizeForSearch);
  if (keywords.some((k) => k.startsWith(query))) return 1.5;
  if (keywords.some((k) => k.includes(query))) return 1;
  return 0;
}

export const sectionOrder = (c: Command) => {
  const i = (COMMAND_SECTIONS as readonly string[]).indexOf(c.section ?? "context");
  return i >= 0 ? i : (c.sectionOrder ?? 4.5);
};

/* ----------------------------------------------------------------- shortcuts */

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest("[role=dialog] [role=combobox]") !== null);


const MODIFIERS: Record<string, "mod" | "ctrl" | "alt" | "shift"> = {
  mod: "mod",
  "⌘": "mod",
  cmd: "mod",
  meta: "mod",
  ctrl: "ctrl",
  control: "ctrl",
  "⌃": "ctrl",
  alt: "alt",
  option: "alt",
  "⌥": "alt",
  shift: "shift",
  "⇧": "shift",
};

const isAlnum = (key: string) => /^[a-z0-9]$/.test(key);

/** Letters and digits by physical key (layout-independent); anything else by the character typed. */
const keyName = (e: KeyboardEvent) => {
  if (e.code.startsWith("Key")) return e.code.slice(3).toLowerCase();
  if (e.code.startsWith("Digit")) return e.code.slice(5);
  return e.key.toLowerCase();
};

const chord = (mods: string[], key: string) => [...new Set(isAlnum(key) ? mods : mods.filter((m) => m !== "shift"))].sort().concat(key).join("+");

/**
 * Parses a shortcut into steps, each a canonical chord such as "meta+shift+p" or "g".
 * Shift only counts for letters and digits: "?" already implies it.
 */
export function parseShortcut(shortcut: string): string[] {
  const steps: string[] = [];
  let mods: string[] = [];
  for (const token of shortcut.trim().toLowerCase().split(/\s+/)) {
    const mod = MODIFIERS[token];
    if (mod) mods.push(mod === "mod" ? (isApplePlatform() ? "meta" : "ctrl") : mod);
    else {
      steps.push(chord(mods, token));
      mods = [];
    }
  }
  return steps;
}

const eventChord = (e: KeyboardEvent) => {
  const mods: string[] = [];
  if (e.altKey) mods.push("alt");
  if (e.ctrlKey) mods.push("ctrl");
  if (e.metaKey) mods.push("meta");
  if (e.shiftKey) mods.push("shift");
  return chord(mods, keyName(e));
};

const SEQUENCE_MS = 900;

/**
 * Binds registered shortcuts. The longest registered sequence wins: with "G C" and "C" both bound,
 * G then C runs "G C" only. Keys that break a sequence in progress are dropped, not re-read.
 */
function ShortcutBinder({ registry }: { registry: CommandRegistry }) {
  useEffect(() => {
    let buffer: string[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || /^(Shift|Control|Alt|Meta)$/.test(e.key)) return;
      const step = eventChord(e);
      const modified = /(^|\+)(alt|ctrl|meta)\+/.test(step);
      if (!modified && (isEditable(e.target) || document.querySelector("[role=dialog][data-open], [role=menu][data-open]"))) return;

      const bound = registry
        .getSnapshot()
        .commands.filter((c) => c.shortcut && c.bindShortcut !== false && !c.disabled && c.perform)
        .map((c) => ({ command: c, steps: parseShortcut(c.shortcut!) }));
      const keys = [...buffer, step];
      const typed = keys.join(" ");
      const exact = bound.find((b) => b.steps.join(" ") === typed)?.command;
      const pending = bound.some((b) => b.steps.length > keys.length && b.steps.slice(0, keys.length).join(" ") === typed);

      clearTimeout(timer);
      buffer = [];
      if (pending) {
        // "G" alone may also be bound: it runs if the sequence is not continued in time.
        buffer = keys;
        timer = setTimeout(() => {
          buffer = [];
          exact?.perform?.();
        }, SEQUENCE_MS);
        e.preventDefault();
      } else if (exact) {
        e.preventDefault();
        exact.perform!();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, [registry]);
  return null;
}
