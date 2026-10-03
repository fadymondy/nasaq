// nqQuickCapture: get a thought or a page into the inbox. The markup is the React QuickCapture's (see the Blade component),
// the state lives here.
//
//   <div x-data="nqQuickCapture({ shortcut: 'Mod+Shift+K', destinations: [{ id: 'inbox' }], page: null })" x-modelable="open" x-id="['nq-qc']">
//     <template x-teleport="body"> … <div data-slot="quick-capture" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open"> … </div></template>
//   </div>
//
// A global shortcut toggles the dialog (a modifier is required; it matches event.code so Arabic layouts work) and the
// listener lives only while the component is mounted. Ctrl/Cmd+Enter saves, Escape closes. presentation: "panel" renders
// only the form and clears it after a save. Saving calls the `onCapture(capture)` option, which may return (or resolve
// to) { error } to keep the text, and dispatches a bubbling "capture" event whose detail is the capture.
// The pure helpers (shortcut matching, tags, buildCapture) are exported from this file and shared with the Vue port's
// quick-capture-logic.ts (same code).

import type { Magics, Register } from "./types";


export interface CaptureShortcut {
  /** Cmd on Apple platforms, Ctrl elsewhere. */
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  /** Lower-case key: "k", "enter", "space", "f5". */
  key: string;
}

/** "Mod+Shift+K" or "Ctrl Alt N" as a spec. Returns `null` when there is no key or no modifier (a bare letter would steal typing). */
export function parseCaptureShortcut(input: string | null | undefined): CaptureShortcut | null {
  if (!input) return null;
  const spec: CaptureShortcut = { mod: false, ctrl: false, meta: false, alt: false, shift: false, key: "" };
  for (const raw of input.trim().split(/[\s+]+/)) {
    const part = raw.toLowerCase();
    if (!part) continue;
    if (part === "mod" || part === "cmdorctrl" || part === "commandorcontrol") spec.mod = true;
    else if (part === "ctrl" || part === "control") spec.ctrl = true;
    else if (part === "cmd" || part === "command" || part === "meta" || part === "super") spec.meta = true;
    else if (part === "alt" || part === "option") spec.alt = true;
    else if (part === "shift") spec.shift = true;
    else if (spec.key) return null;
    else spec.key = part === "return" ? "enter" : part === "esc" ? "escape" : part;
  }
  if (!spec.key || !(spec.mod || spec.ctrl || spec.meta || spec.alt)) return null;
  return spec;
}

export interface CaptureKeyEvent {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing?: boolean;
}

/** `event.code` first so Arabic and other layouts still match a Latin shortcut ("KeyK"), then `event.key`. */
function keyMatches(spec: CaptureShortcut, event: CaptureKeyEvent): boolean {
  const code = event.code ?? "";
  if (spec.key.length === 1) {
    if (/^[a-z]$/.test(spec.key) && code) return code === `Key${spec.key.toUpperCase()}`;
    if (/^\d$/.test(spec.key) && code) return code === `Digit${spec.key}`;
  }
  return event.key.toLowerCase() === spec.key || (spec.key === "space" && event.key === " ");
}

/** Whether the event is exactly this shortcut: the modifiers must match, no extras. */
export function matchesCaptureShortcut(spec: CaptureShortcut | null, event: CaptureKeyEvent, apple: boolean): boolean {
  if (!spec || event.isComposing) return false;
  const wantMeta = spec.meta || (spec.mod && apple);
  const wantCtrl = spec.ctrl || (spec.mod && !apple);
  if (event.metaKey !== wantMeta || event.ctrlKey !== wantCtrl) return false;
  if (event.altKey !== spec.alt || event.shiftKey !== spec.shift) return false;
  return keyMatches(spec, event);
}

/** Ctrl or Cmd plus Enter: save from inside the text box. */
export function isCaptureSaveKey(event: CaptureKeyEvent): boolean {
  return event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.altKey && !event.isComposing;
}

/** The keys to draw for a shortcut spec: ["⌘", "⇧", "K"] on Apple, ["Ctrl", "Shift", "K"] elsewhere. */
export function captureShortcutKeys(spec: CaptureShortcut | null, apple: boolean): string[] {
  if (!spec) return [];
  const keys: string[] = [];
  if (spec.ctrl) keys.push(apple ? "⌃" : "Ctrl");
  if (spec.mod) keys.push(apple ? "⌘" : "Ctrl");
  if (spec.meta) keys.push(apple ? "⌘" : "Win");
  if (spec.alt) keys.push(apple ? "⌥" : "Alt");
  if (spec.shift) keys.push(apple ? "⇧" : "Shift");
  keys.push(spec.key.length === 1 ? spec.key.toUpperCase() : spec.key === "enter" ? "Enter" : spec.key.charAt(0).toUpperCase() + spec.key.slice(1));
  return keys;
}

/* ------------------------------------------------------------ reading a capture */

const HASHTAG = /(^|[\s(])#([\p{L}\p{N}_-]{1,40})/gu;
const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/i;

/** Tags written as #word (Latin or Arabic), lower-cased, without repeats, in order. */
export function extractCaptureTags(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(HASHTAG)) {
    const tag = (m[2] as string).toLowerCase();
    if (!seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

/** The first http(s) link in the text, without trailing punctuation. */
export function extractCaptureUrl(text: string): string | undefined {
  const m = URL_RE.exec(text);
  return m ? m[0].replace(/[.,;:!?،؛]+$/, "") : undefined;
}

export type CaptureKind = "note" | "link" | "clip";

export interface CaptureInput {
  text: string;
  /** Tags picked in the UI, added to the #tags found in the text. */
  tags?: readonly string[];
  /** The page being clipped. Makes the capture a `clip`. */
  page?: { title?: string; url: string; selection?: string };
  destinationId?: string;
  /** Milliseconds since epoch. Default now. */
  now?: number;
}

export interface CaptureValue {
  kind: CaptureKind;
  /** The text as typed, trimmed. */
  text: string;
  /** First non-empty line, at most 80 characters. */
  title: string;
  url?: string;
  pageTitle?: string;
  selection?: string;
  tags: string[];
  destinationId?: string;
  capturedAt: string;
}

const firstLine = (text: string) => (text.split(/\r?\n/).find((l) => l.trim()) ?? "").trim();

/** Turns what was typed (and the page, when clipping) into the value handed to `onCapture`. */
export function buildCapture({ text, tags = [], page, destinationId, now = Date.now() }: CaptureInput): CaptureValue {
  const body = text.trim();
  const merged = [...new Set([...tags.map((t) => t.replace(/^#/, "").toLowerCase()), ...extractCaptureTags(body)])];
  const url = page?.url ?? extractCaptureUrl(body);
  const onlyUrl = !page && url !== undefined && body === url;
  const kind: CaptureKind = page ? "clip" : onlyUrl ? "link" : "note";
  const base = firstLine(body) || page?.title || url || "";
  return {
    kind,
    text: body,
    title: base.length > 80 ? `${base.slice(0, 79).trimEnd()}…` : base,
    ...(url ? { url } : {}),
    ...(page?.title ? { pageTitle: page.title } : {}),
    ...(page?.selection ? { selection: page.selection } : {}),
    tags: merged,
    ...(destinationId ? { destinationId } : {}),
    capturedAt: new Date(now).toISOString(),
  };
}

/** A capture needs some content: text, or a clipped page. */
export function canSaveCapture(text: string, page?: { url: string }): boolean {
  return Boolean(text.trim() || page?.url);
}

/* ------------------------------------------------------------ the Alpine component */

const APPLE_PLATFORMS = new Set(["darwin", "macos", "ios"]);
const BROWSER_PLATFORMS = new Set(["web", "extension"]);

/** ⌘ or Ctrl. `<html data-platform>` wins when it is set; otherwise the browser's own platform decides. */
function isApplePlatform(): boolean {
  if (typeof document !== "undefined") {
    const platform = document.documentElement.dataset.platform;
    if (platform && !BROWSER_PLATFORMS.has(platform)) return APPLE_PLATFORMS.has(platform);
  }
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

export interface QuickCaptureOptions {
  /** "dialog" (default) or "panel": the bare form. */
  presentation?: "dialog" | "panel";
  /** Global toggle, like "Mod+Shift+K". null for none. */
  shortcut?: string | null;
  shortcutEnabled?: boolean;
  page?: { title?: string; url: string; selection?: string } | null;
  destinations?: { id: string; label?: string }[];
  defaultDestinationId?: string;
  suggestedTags?: string[];
  initialText?: string;
  open?: boolean;
  /** Save the capture. Return (or resolve to) { error } to keep the text and show it. */
  onCapture?: (capture: CaptureValue) => unknown;
}

type Outcome = { error?: string } | void | undefined;

interface QuickCaptureState extends Magics {
  $nq: { t(en: string, ar: string): string };
  open: boolean;
  text: string;
  picked: string[];
  destination: string | undefined;
  pending: boolean;
  error: string | undefined;
  saved: string | undefined;
  busy: boolean;
  dialog: boolean;
  page: QuickCaptureOptions["page"];
  destinations: NonNullable<QuickCaptureOptions["destinations"]>;
  suggestedTags: string[];
  spec: CaptureShortcut | null;
  shortcutEnabled: boolean;
  onCapture: QuickCaptureOptions["onCapture"];
  listener: ((e: KeyboardEvent) => void) | undefined;
  readonly typedTags: string[];
  readonly offeredTags: string[];
  readonly canSave: boolean;
  readonly modKey: string;
  readonly hintKeys: string[];
  focusArea(): void;
  save(): Promise<void>;
}

export const quickCapture: Register = (Alpine) => {
  Alpine.data("nqQuickCapture", (options: QuickCaptureOptions = {}) => ({
    open: Boolean(options.open),
    text: options.initialText ?? "",
    picked: [] as string[],
    destination: options.defaultDestinationId ?? options.destinations?.[0]?.id,
    pending: false,
    error: undefined as string | undefined,
    saved: undefined as string | undefined,
    busy: false,
    dialog: (options.presentation ?? "dialog") === "dialog",
    page: options.page ?? undefined,
    destinations: options.destinations ?? [],
    suggestedTags: options.suggestedTags ?? [],
    spec: parseCaptureShortcut(options.shortcut === undefined ? "Mod+Shift+K" : options.shortcut),
    shortcutEnabled: options.shortcutEnabled !== false,
    onCapture: options.onCapture,
    listener: undefined as ((e: KeyboardEvent) => void) | undefined,

    get typedTags(): string[] {
      return extractCaptureTags((this as unknown as QuickCaptureState).text);
    },
    /** Suggested tags that are not already typed in the text. */
    get offeredTags(): string[] {
      const typed = (this as unknown as QuickCaptureState).typedTags;
      return (this as unknown as QuickCaptureState).suggestedTags.filter((t) => !typed.includes(t.toLowerCase()));
    },
    get canSave(): boolean {
      const s = this as unknown as QuickCaptureState;
      return canSaveCapture(s.text, s.page ?? undefined);
    },
    get modKey(): string {
      return isApplePlatform() ? "⌘" : "Ctrl";
    },
    get hintKeys(): string[] {
      const s = this as unknown as QuickCaptureState;
      return s.dialog ? captureShortcutKeys(s.spec, isApplePlatform()) : [];
    },

    init(this: QuickCaptureState) {
      if (this.dialog && this.spec && this.shortcutEnabled && typeof window !== "undefined") {
        this.listener = (event: KeyboardEvent) => {
          if (!matchesCaptureShortcut(this.spec, event, isApplePlatform())) return;
          event.preventDefault();
          this.open = !this.open;
        };
        window.addEventListener("keydown", this.listener);
      }
      if (!this.dialog) this.$nextTick(() => this.focusArea());
    },
    destroy(this: QuickCaptureState) {
      if (this.listener) window.removeEventListener("keydown", this.listener);
    },

    show() {
      (this as unknown as QuickCaptureState).open = true;
    },
    close() {
      (this as unknown as QuickCaptureState).open = false;
    },
    toggle() {
      const s = this as unknown as QuickCaptureState;
      s.open = !s.open;
    },
    /** Cancel: closes the dialog, or tells the page (a bubbling "close" event) to close the panel. */
    cancel(this: QuickCaptureState) {
      if (this.dialog) this.open = false;
      else this.$root.dispatchEvent(new CustomEvent("close", { bubbles: true }));
    },
    toggleTag(tag: string) {
      const s = this as unknown as QuickCaptureState;
      s.picked = s.picked.includes(tag) ? s.picked.filter((x) => x !== tag) : [...s.picked, tag];
    },
    /** Typing clears the error and the saved message. */
    edited(this: QuickCaptureState) {
      this.error = undefined;
      this.saved = undefined;
    },
    focusArea(this: QuickCaptureState) {
      this.$refs.area?.focus();
    },

    async save(this: QuickCaptureState) {
      if (this.busy) return;
      if (!this.canSave) {
        this.error = this.$nq.t("Type something to capture.", "اكتب شيئًا لالتقاطه.");
        this.focusArea();
        return;
      }
      this.busy = true;
      this.pending = true;
      this.error = undefined;
      try {
        const capture = buildCapture({ text: this.text, tags: this.picked, page: this.page ?? undefined, destinationId: this.destination });
        this.$root.dispatchEvent(new CustomEvent("capture", { detail: capture, bubbles: true }));
        const outcome = (await this.onCapture?.(capture)) as Outcome;
        if (outcome && typeof outcome === "object" && outcome.error) {
          this.error = outcome.error;
          return;
        }
        if (this.dialog) {
          this.open = false;
        } else {
          const label = this.destinations.find((d) => d.id === this.destination)?.label;
          this.text = "";
          this.picked = [];
          this.saved = label
            ? this.$nq.t("Saved to {destination}.", "تم الحفظ في {destination}.").replace("{destination}", label)
            : this.$nq.t("Saved.", "تم الحفظ.");
          this.focusArea();
        }
      } catch {
        this.error = this.$nq.t("Could not save. Your text is still here, try again.", "تعذر الحفظ. نصك ما زال هنا، حاول مرة أخرى.");
      } finally {
        this.busy = false;
        this.pending = false;
      }
    },

    /** Bind on the form wrapper: Ctrl/Cmd+Enter saves, Escape closes the panel. */
    form: {
      "x-on:keydown"(this: QuickCaptureState, e: KeyboardEvent) {
        if (isCaptureSaveKey(e)) {
          e.preventDefault();
          void this.save();
        } else if (e.key === "Escape" && !this.dialog && !e.isComposing) {
          e.preventDefault();
          this.$root.dispatchEvent(new CustomEvent("close", { bubbles: true }));
        }
      },
    },
    /** Bind on the dialog popup: dialog role, labelled by the title and described by the description. */
    popup: {
      role: "dialog",
      "aria-modal": "true",
      tabindex: "-1",
      ":aria-labelledby"(this: Magics) {
        return this.$id("nq-qc", "title");
      },
      ":aria-describedby"(this: Magics) {
        return this.$id("nq-qc", "description");
      },
      "x-on:keydown.escape.prevent.stop"(this: QuickCaptureState) {
        this.open = false;
      },
    },
  }));
};
