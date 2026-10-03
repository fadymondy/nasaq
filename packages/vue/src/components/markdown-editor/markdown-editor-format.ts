// The Markdown commands of the editor toolbar. `applyMarkdownEditorFormat` is a copy of applyMarkdownFormat in notes/notes-model.ts (the Notes
// workspace is a different level), plus the code block the editor adds. Pure: text and selection in, text and selection out.

export type MarkdownEditorFormat = "bold" | "italic" | "strike" | "code" | "link" | "wikilink" | "h1" | "h2" | "h3" | "quote" | "bullet" | "ordered" | "task" | "codeBlock";

export interface MarkdownEditorEdit {
  value: string;
  start: number;
  end: number;
}

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
