/* Pure types and helpers of the Inbox (no React, so node --test can import it). */

export type InboxChannel = "chat" | "email" | "whatsapp";
export type InboxStatus = "open" | "snoozed" | "closed";
export type InboxColor = "gray" | "red" | "orange" | "amber" | "green" | "teal" | "blue" | "violet" | "pink";
export const INBOX_COLORS: readonly InboxColor[] = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"];
export type DateLike = Date | number | string;

export interface InboxAgent {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface InboxAttachment {
  id: string;
  name: string;
  /** Object or remote URL. Images render as thumbnails when it is set. */
  url?: string;
  /** Bytes. */
  size?: number;
  kind: "image" | "file";
}

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  siteName?: string;
  image?: string;
}

export interface InboxReaction {
  emoji: string;
  /** Ids of the people who reacted (agents and the contact). */
  by: string[];
}

export interface VoiceNote {
  /** Seconds. */
  duration: number;
  src?: string;
  /** Bar heights 0 to 1. Generated from the duration when omitted. */
  waveform?: number[];
}

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface InboxMessage {
  id: string;
  /** `in` is from the contact, `out` from an agent. */
  direction: "in" | "out";
  /** `note` is internal and never sent; `system` is an event line such as an assignment. */
  kind?: "text" | "voice" | "location" | "note" | "system";
  author?: { id?: string; name: string; avatar?: string };
  body: string;
  /** Email: the body is HTML written in the editor (rendered read-only, sanitised by the editor schema). */
  html?: boolean;
  subject?: string;
  to?: string[];
  cc?: string[];
  at: DateLike;
  status?: "sending" | "sent" | "error";
  voice?: VoiceNote;
  location?: GeoPoint;
  attachments?: InboxAttachment[];
  reactions?: InboxReaction[];
  replyTo?: { id: string; author: string; excerpt: string };
  linkPreview?: LinkPreviewData;
}

export interface InboxContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  company?: string;
  location?: string;
  timezone?: string;
  tags?: string[];
  firstSeen?: DateLike;
  notes?: string;
}

export interface InboxConversation {
  id: string;
  channel: InboxChannel;
  contact: InboxContact;
  /** Email subject or a chat topic. */
  subject?: string;
  messages: InboxMessage[];
  status: InboxStatus;
  assigneeId?: string | null;
  unread?: number;
  pinned?: boolean;
  archived?: boolean;
  muted?: boolean;
  color?: InboxColor | null;
  snoozedUntil?: DateLike | null;
  /** The contact is typing right now. */
  typing?: boolean;
}

/** What one callback can change on a conversation: row menu, assignment, status and snooze all use it. */
export type ConversationPatch = Partial<Pick<InboxConversation, "pinned" | "archived" | "muted" | "color" | "status" | "assigneeId" | "snoozedUntil">> & {
  /** Mark it unread (`true`) or read (`false`). */
  unread?: boolean;
};

export interface CannedSnippet {
  id: string;
  /** Typed after `/` in the composer, e.g. "refund". */
  shortcut: string;
  title: string;
  /** May contain `{{name}}` and `{{agent}}`. */
  body: string;
}

export interface InboxDraft {
  conversationId: string;
  channel: InboxChannel;
  /** `note` stays inside the team. */
  mode: "reply" | "note";
  /** Plain text, or HTML when `format` is `html` (email). */
  body: string;
  format: "text" | "html";
  subject?: string;
  cc?: string[];
  replyToId?: string;
  attachments?: File[];
  voice?: { blob?: Blob; duration: number; waveform: number[] };
  location?: GeoPoint;
  /** Agent ids mentioned with @. */
  mentions?: string[];
}

export type InboxResult = void | { error?: string };

const HOUR = 3_600_000;

export const toTime = (value: DateLike): number => (value instanceof Date ? value.getTime() : typeof value === "number" ? value : new Date(value).getTime());

/** Last message the customer or an agent wrote (system lines do not count as a preview). */
export function lastMessage(c: InboxConversation): InboxMessage | undefined {
  for (let i = c.messages.length - 1; i >= 0; i--) {
    const m = c.messages[i] as InboxMessage;
    if (m.kind !== "system") return m;
  }
  return undefined;
}

export function lastActivity(c: InboxConversation): number {
  const m = c.messages[c.messages.length - 1];
  return m ? toTime(m.at) : 0;
}

/** Strips tags from HTML and collapses whitespace (list previews, quotes). Never used to render. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function messageText(m: InboxMessage): string {
  return m.html ? htmlToText(m.body) : m.body;
}

/** One-line description of a message for the list row, the quote and the toast. `words` names non-text kinds. */
export function previewOf(m: InboxMessage | undefined, words: { voice: string; location: string; attachment: string }): string {
  if (!m) return "";
  if (m.kind === "voice") return words.voice;
  if (m.kind === "location") return words.location;
  const text = messageText(m).replace(/\s+/g, " ").trim();
  if (text) return text;
  return m.attachments?.length ? words.attachment : "";
}

export interface InboxFilter {
  channel?: InboxChannel | "all";
  scope?: "all" | "mine" | "unassigned";
  view?: "active" | "archived" | "snoozed" | "closed";
  query?: string;
  me?: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");

/** Filters and orders the list: pinned first, then newest activity. */
export function filterConversations(list: readonly InboxConversation[], f: InboxFilter = {}): InboxConversation[] {
  const q = f.query ? norm(f.query.trim()) : "";
  const view = f.view ?? "active";
  const out = list.filter((c) => {
    if (f.channel && f.channel !== "all" && c.channel !== f.channel) return false;
    if (f.scope === "mine" && c.assigneeId !== f.me) return false;
    if (f.scope === "unassigned" && c.assigneeId) return false;
    if (view === "archived" ? !c.archived : c.archived) return false;
    if (view === "snoozed" && c.status !== "snoozed") return false;
    if (view === "closed" && c.status !== "closed") return false;
    if (view === "active" && c.status !== "open") return false;
    if (!q) return true;
    const hay = [c.contact.name, c.contact.email, c.contact.phone, c.subject, ...c.messages.map(messageText)]
      .filter(Boolean)
      .map((s) => norm(s as string))
      .join("\n");
    return hay.includes(q);
  });
  return out.sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || lastActivity(b) - lastActivity(a));
}

/** Counts per view for the tabs. Same rules as `filterConversations` without query and scope. */
export function countViews(list: readonly InboxConversation[]) {
  return {
    active: list.filter((c) => !c.archived && c.status === "open").length,
    unread: list.filter((c) => !c.archived && c.status === "open" && (c.unread ?? 0) > 0 && !c.muted).length,
    snoozed: list.filter((c) => !c.archived && c.status === "snoozed").length,
    closed: list.filter((c) => !c.archived && c.status === "closed").length,
    archived: list.filter((c) => c.archived).length,
  };
}

// ---- Find in thread --------------------------------------------------------------------------------------------

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits `text` into runs, flagging the ones equal to `query` (case-insensitive). */
export function splitByQuery(text: string, query: string): { text: string; match: boolean }[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const re = new RegExp(escapeRe(q), "gi");
  const runs: { text: string; match: boolean }[] = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > at) runs.push({ text: text.slice(at, i), match: false });
    runs.push({ text: m[0], match: true });
    at = i + m[0].length;
  }
  if (at < text.length) runs.push({ text: text.slice(at), match: false });
  return runs.length ? runs : [{ text, match: false }];
}

/** Every hit of `query` in the thread, in reading order: `{ messageId, nth }` (nth counts inside the message). */
export function findMatches(messages: readonly InboxMessage[], query: string): { messageId: string; nth: number }[] {
  const q = query.trim();
  if (!q) return [];
  const out: { messageId: string; nth: number }[] = [];
  for (const m of messages) {
    if (m.kind === "system") continue;
    const hits = splitByQuery(messageText(m), q).filter((r) => r.match).length;
    for (let nth = 0; nth < hits; nth++) out.push({ messageId: m.id, nth });
  }
  return out;
}

// ---- Snooze ------------------------------------------------------------------------------------------------------

export type SnoozePresetId = "later" | "tomorrow" | "weekend" | "nextWeek";

/** Preset wake-up times relative to `now` (local time): +3h, tomorrow 09:00, Saturday 09:00, next Monday 09:00. */
export function snoozePresets(now: DateLike = Date.now()): { id: SnoozePresetId; at: number }[] {
  const base = new Date(toTime(now));
  const at9 = (d: Date) => {
    const x = new Date(d);
    x.setHours(9, 0, 0, 0);
    return x.getTime();
  };
  const add = (days: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  const day = base.getDay(); // 0 Sunday
  const toSat = (6 - day + 7) % 7 || 7;
  const toMon = (1 - day + 7) % 7 || 7;
  return [
    { id: "later", at: base.getTime() + 3 * HOUR },
    { id: "tomorrow", at: at9(add(1)) },
    { id: "weekend", at: at9(add(toSat)) },
    { id: "nextWeek", at: at9(add(toMon)) },
  ];
}

// ---- Snippets --------------------------------------------------------------------------------------------------

/** Fills `{{name}}` style variables; unknown variables are left visible so the agent notices them. */
export function applySnippet(body: string, vars: Record<string, string | undefined>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, key: string) => vars[key] ?? all);
}

export function filterSnippets(list: readonly CannedSnippet[], query: string): CannedSnippet[] {
  const q = norm(query.trim().replace(/^\//, ""));
  if (!q) return [...list];
  const score = (s: CannedSnippet) => {
    const sc = norm(s.shortcut);
    const t = norm(s.title);
    if (sc.startsWith(q)) return 4;
    if (t.startsWith(q)) return 3;
    if (sc.includes(q) || t.includes(q)) return 2;
    return norm(s.body).includes(q) ? 1 : 0;
  };
  return list
    .map((s) => [s, score(s)] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);
}

// ---- Links, media, formatting ------------------------------------------------------------------------------------

/** http(s) URLs in a text, without trailing punctuation. */
export function extractUrls(text: string): string[] {
  const found = text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
  return [...new Set(found.map((u) => u.replace(/[.,;:!?؟،]+$/, "")))];
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export interface MediaItem {
  id: string;
  messageId: string;
  at: DateLike;
  kind: "image" | "file" | "link";
  name: string;
  url?: string;
  size?: number;
}

/** Everything shareable in a thread, newest first: images, files and links (from text and previews). */
export function collectMedia(messages: readonly InboxMessage[]): MediaItem[] {
  const out: MediaItem[] = [];
  for (const m of messages) {
    for (const a of m.attachments ?? []) out.push({ id: `${m.id}:${a.id}`, messageId: m.id, at: m.at, kind: a.kind, name: a.name, url: a.url, size: a.size });
    const urls = new Set(extractUrls(messageText(m)));
    if (m.linkPreview) urls.add(m.linkPreview.url);
    for (const u of urls) out.push({ id: `${m.id}:${u}`, messageId: m.id, at: m.at, kind: "link", name: m.linkPreview?.url === u && m.linkPreview.title ? m.linkPreview.title : hostOf(u), url: u });
  }
  return out.sort((a, b) => toTime(b.at) - toTime(a.at));
}

/** 75 -> "1:15", 5 -> "0:05". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** A stable pseudo-waveform for a voice note without recorded levels. */
export function fakeWaveform(seed: number, bars = 32): number[] {
  let x = Math.abs(Math.floor(seed * 9301 + 49297)) % 233280 || 1;
  return Array.from({ length: bars }, (_, i) => {
    x = (x * 9301 + 49297) % 233280;
    return Number((0.25 + 0.75 * Math.abs(Math.sin(i / 3 + (x / 233280) * 2))).toFixed(2));
  });
}

/** Downsamples recorded levels (0 to 1) to `bars` bars. */
export function downsample(levels: readonly number[], bars = 32): number[] {
  if (levels.length === 0) return Array.from({ length: bars }, () => 0.1);
  return Array.from({ length: bars }, (_, i) => {
    const from = Math.floor((i * levels.length) / bars);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / bars));
    const slice = levels.slice(from, to);
    return Number(Math.max(0.08, slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2));
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ---- Location ------------------------------------------------------------------------------------------------------

/** Half-height of the pick-a-point pad, in degrees of latitude. */
export const PAD_SPAN = 0.02;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Pad position (0..1, from the top-left corner) to a coordinate around `center`. */
export function padToPoint(center: { lat: number; lng: number }, x: number, y: number): { lat: number; lng: number } {
  return { lat: Number((center.lat + (0.5 - clamp01(y)) * PAD_SPAN * 2).toFixed(6)), lng: Number((center.lng + (clamp01(x) - 0.5) * PAD_SPAN * 2).toFixed(6)) };
}

export function pointToPad(center: { lat: number; lng: number }, p: { lat: number; lng: number }): { x: number; y: number } {
  return { x: clamp01((p.lng - center.lng) / (PAD_SPAN * 2) + 0.5), y: clamp01(0.5 - (p.lat - center.lat) / (PAD_SPAN * 2)) };
}

export function formatCoords(p: { lat: number; lng: number }): string {
  return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}

export function mapsUrl(p: { lat: number; lng: number }): string {
  return `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`;
}

export const isLat = (n: number) => Number.isFinite(n) && n >= -90 && n <= 90;
export const isLng = (n: number) => Number.isFinite(n) && n >= -180 && n <= 180;
