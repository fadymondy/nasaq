/* Pure logic of quick capture: the global shortcut, save keys and reading a capture (link, #tags) out of typed text. */

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
