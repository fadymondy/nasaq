// Pure helpers of the report editor module: the block model, counts, and the HTML the Preview tab shows. No Alpine here, so it is unit testable.
// Mirrors the React report-math; the preview markup follows <x-nq::report-editor.viewer> (same data-slots and classes, simpler stat cards).

export type BlockType = "heading" | "text" | "metrics" | "chart" | "table" | "callout" | "divider";
export const BLOCK_TYPES: readonly BlockType[] = ["heading", "text", "metrics", "chart", "table", "callout", "divider"];

export interface Figure {
  id: string;
  label: string;
  value: number;
  delta?: number | null;
  currency?: string;
  deltaLabel?: string;
}
// A loose block: the fields a type does not use are simply absent.
export interface Block {
  id: string;
  type: BlockType;
  text?: string;
  level?: number;
  html?: string;
  items?: Figure[];
  title?: string;
  kind?: "bar" | "line" | "area";
  series?: string[];
  rows?: unknown[];
  columns?: string[];
  tone?: "info" | "success" | "warning" | "danger";
  caption?: string;
}
export interface Report {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  blocks: Block[];
}
export type Words = Record<string, string>;

let counter = 0;
export function makeId(): string {
  counter += 1;
  return `blk_${Date.now().toString(36)}${counter.toString(36)}`;
}

export function newBlock(type: BlockType): Block {
  const id = makeId();
  switch (type) {
    case "heading":
      return { id, type, text: "", level: 2 };
    case "text":
      return { id, type, html: "" };
    case "metrics":
      return { id, type, items: [{ id: makeId(), label: "", value: 0 }] };
    case "chart":
      return { id, type, title: "", kind: "bar", series: ["Series 1"], rows: [{ label: "A", values: [0] }, { label: "B", values: [0] }] };
    case "table":
      return { id, type, columns: ["", ""], rows: [["", ""]] };
    case "callout":
      return { id, type, tone: "info", text: "" };
    default:
      return { id, type: "divider" };
  }
}

export const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function plainText(b: Block): string {
  switch (b.type) {
    case "heading":
      return b.text ?? "";
    case "text":
      return htmlToText(b.html ?? "");
    case "callout":
      return [b.title, b.text].filter(Boolean).join("\n");
    case "chart":
    case "table":
      return b.title ?? "";
    case "metrics":
      return (b.items ?? []).map((m) => m.label).join(", ");
    default:
      return "";
  }
}

/** A copy with fresh ids, for Duplicate. */
export function cloneBlock(b: Block): Block {
  const copy = JSON.parse(JSON.stringify(b)) as Block;
  copy.id = makeId();
  if (copy.items) copy.items = copy.items.map((m) => ({ ...m, id: makeId() }));
  return copy;
}

/** The block as another type, keeping the text it can carry over. */
export function convertBlock(b: Block, type: BlockType): Block {
  if (b.type === type) return b;
  const fresh = newBlock(type);
  const text = plainText(b);
  if (type === "heading") fresh.text = text.split("\n")[0] ?? "";
  if (type === "text") fresh.html = text ? `<p>${escapeHtml(text)}</p>` : "";
  if (type === "callout") fresh.text = text;
  return { ...fresh, id: b.id };
}

export function wordCount(report: Report): number {
  let total = 0;
  for (const b of report.blocks) total += (plainText(b).match(/[\p{L}\p{N}]+/gu) ?? []).length;
  return total;
}
export const readingMinutes = (words: number): number => (words <= 0 ? 0 : Math.max(1, Math.round(words / 200)));

export function issueCount(report: Report): number {
  let n = 0;
  for (const b of report.blocks) {
    if (b.type === "heading" && !(b.text ?? "").trim()) n += 1;
    else if (b.type === "text" && !htmlToText(b.html ?? "")) n += 1;
    else if (b.type === "metrics" && (b.items ?? []).some((m) => !(m.label ?? "").trim())) n += 1;
    else if (b.type === "chart" && (b.rows as { label: string }[]).some((r) => !(r.label ?? "").trim())) n += 1;
    else if (b.type === "table" && (b.columns ?? []).every((c) => !(c ?? "").trim())) n += 1;
  }
  return n;
}
export function blockHasIssue(b: Block): boolean {
  return issueCount({ title: "", blocks: [b] }) > 0;
}

/** Keeps chart rows as long as the series list, and table rows as wide as the header. */
export function fitBlock(b: Block): void {
  if (b.type === "chart") {
    const series = b.series ?? [];
    for (const r of b.rows as { values: number[] }[]) r.values = series.map((_, i) => r.values[i] ?? 0);
  }
  if (b.type === "table") {
    const cols = b.columns ?? [];
    b.rows = (b.rows as string[][]).map((r) => cols.map((_, i) => r[i] ?? ""));
  }
}

/** Parses a typed number, accepting Arabic-Indic digits and separators. Anything unreadable becomes 0. */
export function parseNumber(text: unknown): number {
  if (typeof text === "number") return Number.isFinite(text) ? text : 0;
  const western = String(text ?? "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  const cleaned = western.replace(/[٬,\s]/g, "").replace("٫", ".");
  const n = Number(cleaned);
  return cleaned !== "" && Number.isFinite(n) ? n : 0;
}

export function fill(sentence: string, ...values: (string | number)[]): string {
  return sentence.replace(/:([nabc])/g, (_, k: string) => String(values["nabc".indexOf(k)] ?? ""));
}

const ALLOWED = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "CODE", "PRE", "BLOCKQUOTE", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "A", "HR"]);
const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#)/i;

/** Only the tags the rich text editor can make survive; links keep http, https, mailto and tel addresses. */
export function sanitizeHtml(html: string): string {
  if (!html || typeof document === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      walk(child);
      if (!ALLOWED.has(child.tagName)) {
        if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"].includes(child.tagName)) child.remove();
        else child.replaceWith(...child.childNodes);
        continue;
      }
      for (const attr of [...child.attributes]) {
        if (!(child.tagName === "A" && (attr.name === "href" || attr.name === "title"))) child.removeAttribute(attr.name);
      }
      if (child.tagName === "A") {
        if (!SAFE_HREF.test((child.getAttribute("href") ?? "").trim())) child.removeAttribute("href");
        else {
          child.setAttribute("rel", "noopener noreferrer");
          child.setAttribute("target", "_blank");
        }
      } else child.setAttribute("dir", "auto");
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

const TEXT_CLASS =
  "flex flex-col gap-3 text-body text-nq-fg-body [&_p]:text-start [&_h1]:text-h1 [&_h2]:text-h2 [&_h3]:text-h3 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-6 [&_ol]:ps-6 [&_blockquote]:border-s-2 [&_blockquote]:border-nq-line-strong [&_blockquote]:ps-4 [&_a]:underline [&_strong]:font-semibold";
const TONE: Record<string, string> = {
  info: "border-nq-info/40 bg-nq-info/10",
  success: "border-nq-success/40 bg-nq-success/10",
  warning: "border-nq-warning/40 bg-nq-warning/10",
  danger: "border-nq-danger/40 bg-nq-danger/10",
};
const HEADING_CLASS = [, "text-h2", "text-h3", "text-label"];

function chartSvg(b: Block, locale: string): string {
  const series = b.series ?? [];
  const rows = (b.rows ?? []) as { label: string; values: number[] }[];
  const kind = b.kind ?? "bar";
  const all = rows.flatMap((r) => series.map((_, i) => Number(r.values[i]) || 0));
  const hi = Math.max(0, ...all);
  const lo = Math.min(0, ...all);
  const span = hi - lo || 1;
  const y = (v: number) => 100 - ((v - lo) / span) * 100;
  const slot = 100 / Math.max(1, rows.length);
  let shapes = "";
  series.forEach((_, si) => {
    const color = `var(--color-s${si}, var(--chart-${(si % 5) + 1}))`;
    if (kind === "bar") {
      const w = (slot * 0.7) / Math.max(1, series.length);
      rows.forEach((r, ri) => {
        const v = Number(r.values[si]) || 0;
        const top = y(Math.max(v, 0));
        shapes += `<rect data-slot="report-bar" x="${(ri * slot + slot * 0.15 + si * w).toFixed(2)}" y="${top.toFixed(2)}" width="${w.toFixed(2)}" height="${Math.abs(y(v) - y(0)).toFixed(2)}" fill="${color}"><title>${escapeHtml(`${r.label}: ${v}`)}</title></rect>`;
      });
    } else {
      const pts = rows.map((r, ri) => `${(ri * slot + slot / 2).toFixed(2)},${y(Number(r.values[si]) || 0).toFixed(2)}`);
      if (kind === "area" && pts.length) shapes += `<polygon points="${[`${slot / 2},${y(0)}`, ...pts, `${(rows.length - 1) * slot + slot / 2},${y(0)}`].join(" ")}" fill="${color}" fill-opacity="0.16" />`;
      shapes += `<polyline data-slot="report-line" points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />`;
    }
  });
  const fmt = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  return `<div data-slot="report-chart" data-kind="${kind}" class="flex h-64 min-h-0 gap-2"><div aria-hidden="true" class="flex w-12 shrink-0 flex-col justify-between text-end text-muted-foreground tabular-nums"><span>${fmt.format(hi)}</span><span>${fmt.format(lo)}</span></div><div class="relative min-w-0 flex-1 border-b border-border"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-0 size-full overflow-visible rtl:-scale-x-100">${shapes}</svg></div></div>`;
}

/** The Preview tab: the finished report as a reader sees it. Everything user typed is escaped; text blocks pass through sanitizeHtml. */
export function renderPreview(report: Report, t: Words, locale: string, uid: string): string {
  const num = (v: number) => new Intl.NumberFormat(locale).format(v);
  const words = wordCount(report);
  const toc = report.blocks.filter((b) => b.type === "heading" && (b.text ?? "").trim());
  const meta = [
    report.author ? fill(t.by ?? "", report.author) : "",
    report.date ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(`${report.date}T00:00:00`)) : "",
    words ? `${fill(t.words ?? "", num(words))} · ${fill(t.minutes ?? "", num(readingMinutes(words)))}` : "",
  ].filter(Boolean);
  let out = `<article data-slot="report-viewer" aria-label="${escapeHtml(report.title || t.viewer || "")}" class="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-5 print:max-w-none"><header class="flex flex-col gap-2"><h1 dir="auto" class="min-w-0 text-start text-h1 font-semibold text-foreground">${escapeHtml(report.title || t.titlePlaceholder || "")}</h1>`;
  if (report.subtitle) out += `<p dir="auto" class="text-start text-body text-muted-foreground">${escapeHtml(report.subtitle)}</p>`;
  if (meta.length) out += `<p class="text-caption text-muted-foreground">${escapeHtml(meta.join(" · "))}</p>`;
  out += "</header>";
  if (toc.length >= 2) {
    out += `<nav aria-label="${escapeHtml(t.contents ?? "")}" class="rounded-card border border-border bg-card p-3 break-inside-avoid"><p class="mb-1 text-label text-foreground">${escapeHtml(t.contents ?? "")}</p><ol class="flex flex-col gap-0.5">`;
    for (const h of toc) out += `<li style="padding-inline-start:${((h.level ?? 1) - 1) * 0.75}rem"><a href="#${uid}-${h.id}" dir="auto" class="text-body-sm text-foreground underline-offset-2 hover:underline">${escapeHtml((h.text ?? "").trim())}</a></li>`;
    out += "</ol></nav>";
  }
  for (const b of report.blocks) {
    if (b.type === "heading" && (b.text ?? "").trim()) {
      const lvl = [1, 2, 3].includes(b.level ?? 0) ? (b.level as number) : 1;
      out += `<h${lvl + 1} id="${uid}-${b.id}" dir="auto" class="scroll-mt-4 text-start font-semibold text-foreground break-after-avoid ${HEADING_CLASS[lvl]}">${escapeHtml(b.text ?? "")}</h${lvl + 1}>`;
    } else if (b.type === "text") {
      const clean = sanitizeHtml(b.html ?? "");
      if (clean) out += `<div data-slot="report-text" class="${TEXT_CLASS}">${clean}</div>`;
    } else if (b.type === "metrics") {
      out += `<div data-slot="stat-grid" class="grid gap-3 sm:grid-cols-2 break-inside-avoid">`;
      for (const m of (b.items ?? []).filter((x) => (x.label ?? "").trim())) {
        const value = m.currency ? new Intl.NumberFormat(locale, { style: "currency", currency: m.currency, maximumFractionDigits: 0 }).format(Number(m.value) || 0) : num(Number(m.value) || 0);
        const delta = typeof m.delta === "number" ? `${m.delta >= 0 ? "+" : "-"}${new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(Math.abs(m.delta))}${m.deltaLabel ? ` ${m.deltaLabel}` : ""}` : "";
        out += `<div data-slot="stat-card" class="flex flex-col gap-1 rounded-card border border-border bg-card p-4"><span class="text-caption text-muted-foreground">${escapeHtml(m.label)}</span><span class="text-h3 font-semibold tabular-nums text-foreground">${escapeHtml(value)}</span>${delta ? `<span class="text-caption text-muted-foreground">${escapeHtml(delta)}</span>` : ""}</div>`;
      }
      out += "</div>";
    } else if (b.type === "chart") {
      const label = fill(t.chartSummary ?? "", b.title || "", "", num((b.rows ?? []).length), num((b.series ?? []).length));
      out += `<figure class="flex min-w-0 flex-col gap-2 break-inside-avoid">${b.title ? `<figcaption class="text-label text-foreground">${escapeHtml(b.title)}</figcaption>` : ""}<div role="img" aria-label="${escapeHtml(label)}" class="rounded-card border border-border bg-card p-3">${chartSvg(b, locale)}</div>${b.caption ? `<p dir="auto" class="text-caption text-muted-foreground">${escapeHtml(b.caption)}</p>` : ""}</figure>`;
    } else if (b.type === "table") {
      const cols = b.columns ?? [];
      out += `<figure class="flex min-w-0 flex-col gap-2 break-inside-avoid">${b.title ? `<figcaption class="text-label text-foreground">${escapeHtml(b.title)}</figcaption>` : ""}<div class="overflow-x-auto rounded-card border border-border"><table class="w-full border-collapse text-body-sm"><thead class="bg-secondary text-start"><tr>${cols.map((c) => `<th scope="col" class="border-b border-border px-3 py-2 text-start text-label text-foreground">${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${(b.rows as string[][]).map((r) => `<tr class="border-b border-border last:border-b-0">${cols.map((_, i) => `<td dir="auto" class="px-3 py-2 text-start text-foreground">${escapeHtml(r[i] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div></figure>`;
    } else if (b.type === "callout" && ((b.text ?? "").trim() || (b.title ?? "").trim())) {
      out += `<div data-slot="alert" data-tone="${b.tone ?? "info"}" role="note" class="flex flex-col gap-1 rounded-card border p-3 break-inside-avoid ${TONE[b.tone ?? "info"]}">${b.title ? `<p dir="auto" class="text-label text-foreground">${escapeHtml(b.title)}</p>` : ""}<p dir="auto" class="text-body-sm text-nq-fg-body">${escapeHtml(b.text ?? "")}</p></div>`;
    } else if (b.type === "divider") out += `<hr class="border-border">`;
  }
  if (!report.blocks.length) out += `<p class="text-body-sm text-muted-foreground">${escapeHtml(t.emptyReport ?? "")}</p>`;
  return `${out}</article>`;
}
