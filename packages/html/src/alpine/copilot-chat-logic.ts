// Pure helpers of the copilot chat (copilot-chat-format.ts of packages/web, the composer parts).

export interface CopilotCommand {
  id: string;
  label: string;
  description?: string;
  kind?: string;
}

export interface CopilotContextItem {
  id: string;
  label: string;
  kind?: string;
}

export interface CopilotAttachment {
  id: string;
  name: string;
  type?: string;
  size?: number;
  url?: string;
  progress?: number;
  error?: string;
}

/** The "/" word the caret is in, or null. A slash only counts at the start or after a space. */
export function copilotSlashQuery(text: string, caret: number = text.length): { query: string; start: number } | null {
  const before = text.slice(0, caret);
  const m = /(^|\s)\/([^\s/]*)$/.exec(before);
  if (!m) return null;
  return { query: m[2] ?? "", start: before.length - (m[2] ?? "").length - 1 };
}

/** Commands whose label, id or description contain the query, label matches first. */
export function copilotFilterCommands(commands: readonly CopilotCommand[], query: string, chosen: readonly string[] = []): CopilotCommand[] {
  const q = query.trim().toLowerCase();
  const free = commands.filter((c) => !chosen.includes(c.id));
  if (!q) return free;
  const starts = free.filter((c) => c.label.toLowerCase().startsWith(q) || c.id.toLowerCase().startsWith(q));
  const rest = free.filter((c) => !starts.includes(c) && `${c.label} ${c.id} ${c.description ?? ""}`.toLowerCase().includes(q));
  return [...starts, ...rest];
}

/** Removes the "/query" the caret is in. */
export function copilotWithoutSlash(text: string, caret: number = text.length): string {
  const s = copilotSlashQuery(text, caret);
  if (!s) return text;
  return (text.slice(0, s.start) + text.slice(caret)).replace(/\s{2,}/g, " ").trimStart();
}

/** Items of `options` not yet in `items`. */
export function copilotAvailableContext(options: readonly CopilotContextItem[], items: readonly CopilotContextItem[]): CopilotContextItem[] {
  const have = new Set(items.map((i) => i.id));
  return options.filter((o) => !have.has(o.id));
}

/** 1.2 MB style sizes. */
export function copilotFormatBytes(bytes: number | undefined, locale = "en"): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  const n = new Intl.NumberFormat(locale.startsWith("ar") ? "ar-EG-u-nu-latn" : "en", { maximumFractionDigits: u === 0 ? 0 : 1 }).format(v);
  return `${n} ${units[u]}`;
}

/** Whether an attachment url may be put in an img src. */
export function copilotIsPreviewUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("blob:") || /^data:image\/(png|jpe?g|gif|webp|avif);/i.test(url)) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Replaces `{name}`-style placeholders. */
export function copilotFill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}

/** A local attachment entry for a picked file, before the host has uploaded it. */
export function copilotAttachmentOf(file: File, id: string): CopilotAttachment {
  const image = file.type.startsWith("image/");
  return { id, name: file.name, type: file.type || undefined, size: file.size, url: image && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : undefined };
}

/** Reads the `{ error }` out of whatever the host resolved the event's waitUntil promises with. */
export function copilotErrorOf(results: unknown[]): string {
  for (const r of results) {
    if (r && typeof r === "object" && "error" in r && typeof (r as { error?: unknown }).error === "string" && (r as { error: string }).error) return (r as { error: string }).error;
  }
  return "";
}
