// The Markdown commands of the editor toolbar. `applyMarkdownEditorFormat` is a copy of applyMarkdownFormat in notes/notes-model.ts (the Notes
// workspace is a different level), plus the code block the editor adds. Pure: text and selection in, text and selection out.

export type MarkdownEditorFormat = "bold" | "italic" | "strike" | "code" | "link" | "wikilink" | "h1" | "h2" | "h3" | "quote" | "bullet" | "ordered" | "task" | "codeBlock";

export interface MarkdownEditorEdit {
  value: string;
  start: number;
  end: number;
}

import { parseMarkdownEditorSource, safeUrl, type MdBlock, type MdInline, type MdItem } from "./markdown-editor-parse";

const WRAP: Partial<Record<MarkdownEditorFormat, [string, string]>> = {
  bold: ["**", "**"],
  italic: ["*", "*"],
  strike: ["~~", "~~"],
  code: ["`", "`"],
  wikilink: ["[[", "]]"],
};

const LINE_MARK: Record<string, RegExp> = {
  h1: /^# /,
  h2: /^## /,
  h3: /^### /,
  quote: /^> ?/,
  bullet: /^[-*+] (?!\[[ xX]\] )/,
  ordered: /^\d+\. /,
  task: /^[-*+] \[[ xX]\] /,
};
const ANY_LINE_MARK = /^(#{1,6} |> ?|[-*+] \[[ xX]\] |[-*+] |\d+\. )/;
const LIST_KINDS = new Set<MarkdownEditorFormat>(["bullet", "ordered", "task"]);
const FENCE = "```";

/** Applies a command to the selection `[start, end)`: wraps or unwraps inline marks, toggles a prefix on each selected line, or fences a code block. */
export function applyMarkdownEditorFormat(value: string, start: number, end: number, format: MarkdownEditorFormat): MarkdownEditorEdit {
  if (format === "codeBlock") {
    const before = value.slice(0, start);
    const open = (before && !before.endsWith("\n") ? "\n" : "") + FENCE + "\n";
    const selected = value.slice(start, end);
    return { value: before + open + selected + "\n" + FENCE + "\n" + value.slice(end), start: start + open.length, end: start + open.length + selected.length };
  }
  const wrap = WRAP[format];
  if (wrap) {
    const [open, close] = wrap;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    if (before.endsWith(open) && after.startsWith(close)) {
      return { value: before.slice(0, -open.length) + selected + after.slice(close.length), start: start - open.length, end: end - open.length };
    }
    if (selected.length >= open.length + close.length && selected.startsWith(open) && selected.endsWith(close)) {
      const inner = selected.slice(open.length, selected.length - close.length);
      return { value: before + inner + after, start, end: start + inner.length };
    }
    return { value: before + open + selected + close + after, start: start + open.length, end: end + open.length };
  }
  if (format === "link") {
    const selected = value.slice(start, end) || "text";
    const text = `[${selected}](url)`;
    const urlStart = start + selected.length + 3;
    return { value: value.slice(0, start) + text + value.slice(end), start: urlStart, end: urlStart + 3 };
  }
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const stop = value.indexOf("\n", Math.max(end, start));
  const to = stop === -1 ? value.length : stop;
  const lines = value.slice(from, to).split("\n");
  const marker = LINE_MARK[format] as RegExp;
  const filled = lines.filter((l) => l.trim());
  const allHave = filled.length > 0 && filled.every((l) => marker.test(l));
  let n = 0;
  const next = lines.map((line) => {
    if (!line.trim() && lines.length > 1) return line;
    const bare = allHave ? line.replace(marker, "") : format.startsWith("h") || LIST_KINDS.has(format) ? line.replace(ANY_LINE_MARK, "") : line.replace(marker, "");
    if (allHave) return bare;
    n++;
    const prefix = format === "h1" ? "# " : format === "h2" ? "## " : format === "h3" ? "### " : format === "quote" ? "> " : format === "bullet" ? "- " : format === "task" ? "- [ ] " : `${n}. `;
    return prefix + bare;
  });
  const block = next.join("\n");
  return { value: value.slice(0, from) + block + value.slice(to), start: from, end: from + block.length };
}

/** The toolbar: label key, the format it applies and its Ctrl/Cmd shortcut. */
export const MARKDOWN_EDITOR_TOOLS: { key: string; format: MarkdownEditorFormat; shortcut?: string }[] = [
  { key: "bold", format: "bold", shortcut: "b" },
  { key: "italic", format: "italic", shortcut: "i" },
  { key: "h2", format: "h2" },
  { key: "h3", format: "h3" },
  { key: "bullets", format: "bullet" },
  { key: "numbers", format: "ordered" },
  { key: "tasks", format: "task" },
  { key: "quote", format: "quote" },
  { key: "link", format: "link", shortcut: "k" },
  { key: "code", format: "code" },
  { key: "codeBlock", format: "codeBlock" },
];

// ---- The live preview: HTML for the parsed Markdown, with the classes of the Markdown component (server-rendered there). ----

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const HEADING = ["text-h1", "text-h2", "text-h3", "text-h3", "text-h3", "text-h3"];
const A = "rounded-[2px] text-foreground underline decoration-nq-line-strong underline-offset-4 outline-none hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus";
const ALIGN: Record<string, string> = { left: "text-start", right: "text-end", center: "text-center" };

function inline(nodes: MdInline[]): string {
  return nodes
    .map((n) => {
      switch (n.t) {
        case "text":
          return esc(n.v);
        case "br":
          return "<br>";
        case "code":
          return `<code data-slot="inline-code" dir="ltr" class="rounded-[4px] border border-border bg-secondary px-1 py-0.5 font-mono text-[0.9em] text-foreground [unicode-bidi:isolate]">${esc(n.v)}</code>`;
        case "strong":
          return `<strong class="font-semibold text-foreground">${inline(n.c)}</strong>`;
        case "em":
          return `<em>${inline(n.c)}</em>`;
        case "del":
          return `<del>${inline(n.c)}</del>`;
        case "a": {
          const href = safeUrl(n.href);
          const external = href !== undefined && /^https?:\/\//i.test(href);
          return `<a${href !== undefined ? ` href="${esc(href)}"` : ""}${external ? ' target="_blank" rel="noopener noreferrer"' : ""} class="${A}">${inline(n.c)}</a>`;
        }
        case "img": {
          const src = safeUrl(n.src);
          return `<img${src ? ` src="${esc(src)}"` : ""} alt="${esc(n.alt)}"${n.title ? ` title="${esc(n.title)}"` : ""} loading="lazy" class="h-auto max-w-full rounded-card border border-border">`;
        }
      }
    })
    .join("");
}

function item(it: MdItem): string {
  const task = it.checked !== undefined;
  const box = task ? `<input type="checkbox" disabled${it.checked ? " checked" : ""} class="me-2 align-middle accent-[var(--nq-accent)]">` : "";
  const body = it.blocks.map((b, i) => (task && i === 0 && b.t === "p" ? inline(b.c) : block(b))).join("");
  return `<li dir="auto" class="text-start [&.task-list-item]:list-none [&.task-list-item]:-ms-6${task ? " task-list-item" : ""}">${box}${body}</li>`;
}

function block(b: MdBlock): string {
  switch (b.t) {
    case "h":
      return `<h${b.level} data-slot="text" dir="auto" class="${HEADING[b.level - 1]} text-foreground mt-2 text-start first:mt-0">${inline(b.c)}</h${b.level}>`;
    case "p":
      return `<p data-slot="text" dir="auto" class="text-body text-nq-fg-body text-start">${inline(b.c)}</p>`;
    case "ul":
    case "ol": {
      const cls = `${b.t === "ul" ? "list-disc" : "list-decimal"} space-y-1 ps-6 text-body text-nq-fg-body marker:text-muted-foreground`;
      return `<${b.t} dir="auto"${b.t === "ol" && b.start !== 1 ? ` start="${b.start}"` : ""} class="${cls}">${b.items.map(item).join("")}</${b.t}>`;
    }
    case "bq":
      return `<blockquote dir="auto" class="border-s-2 border-nq-line-strong ps-4 text-start text-muted-foreground">${b.blocks.map(block).join("")}</blockquote>`;
    case "hr":
      return '<hr class="border-0 border-t border-border">';
    case "code":
      return `<figure data-slot="code-block" dir="ltr" class="group/code relative m-0 overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start"><pre class="m-0 overflow-auto bg-transparent py-3 font-mono text-code"><code class="block w-max min-w-full px-4">${esc(b.code)}</code></pre></figure>`;
    case "table": {
      const al = (i: number) => ALIGN[b.align[i] ?? ""] ?? "";
      const th = b.head.map((c, i) => `<th data-slot="table-head" scope="col" dir="auto" class="h-row align-middle text-caption font-medium whitespace-nowrap text-muted-foreground px-4 py-3 text-start ${al(i)}">${inline(c)}</th>`).join("");
      const rows = b.rows
        .map((r) => `<tr data-slot="table-row" class="border-b border-border transition-colors duration-150 ease-nq hover:bg-nq-hover data-[state=selected]:bg-nq-selected">${r.map((c, i) => `<td data-slot="table-cell" dir="auto" class="align-middle px-4 h-auto whitespace-normal py-2 text-start ${al(i)}">${inline(c)}</td>`).join("")}</tr>`)
        .join("");
      return `<div data-slot="table-container" role="region" tabindex="0" class="relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"><table data-slot="table" data-density="default" dir="auto" class="w-full caption-bottom border-collapse text-body-sm"><thead data-slot="table-header" class="[&_tr]:border-b [&_tr]:hover:bg-transparent [&_tr]:even:bg-transparent"><tr data-slot="table-row" class="border-b border-border">${th}</tr></thead><tbody data-slot="table-body" class="[&_tr:last-child]:border-0">${rows}</tbody></table></div>`;
    }
  }
}

/** HTML of the Markdown source, in the typography of the Markdown component. Raw HTML in the source is dropped; unsafe URLs are removed. */
export function markdownEditorHtml(source: string): string {
  return `<div data-slot="markdown" class="flex min-w-0 flex-col gap-3 text-body text-nq-fg-body">${parseMarkdownEditorSource(source).map(block).join("")}</div>`;
}
