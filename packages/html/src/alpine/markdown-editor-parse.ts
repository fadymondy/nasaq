// Copy of packages/vue/src/components/markdown/parse.ts (the Markdown component is a different level), renamed so nothing clashes.
// The live preview of the markdown editor parses with it and draws HTML in markdown-editor-logic.ts.
// A small GitHub-flavoured Markdown parser (headings, paragraphs, lists with task items, quotes, rules, fenced code, tables, inline
// code / strong / emphasis / strikethrough / links / images / autolinks). Raw HTML is dropped and unsafe URLs are removed, like
// react-markdown with `skipHtml`. Internal to the Markdown component.

export type MdInline =
  | { t: "text"; v: string }
  | { t: "code"; v: string }
  | { t: "br" }
  | { t: "strong" | "em" | "del"; c: MdInline[] }
  | { t: "a"; href: string | undefined; c: MdInline[] }
  | { t: "img"; src: string | undefined; alt: string; title?: string };

export interface MdItem {
  checked?: boolean;
  blocks: MdBlock[];
}

export type MdBlock =
  | { t: "h"; level: 1 | 2 | 3 | 4 | 5 | 6; c: MdInline[] }
  | { t: "p"; c: MdInline[] }
  | { t: "ul"; items: MdItem[] }
  | { t: "ol"; items: MdItem[]; start: number }
  | { t: "bq"; blocks: MdBlock[] }
  | { t: "hr" }
  | { t: "code"; lang: string; code: string }
  | { t: "table"; align: (string | null)[]; head: MdInline[][]; rows: MdInline[][][] };

/** react-markdown's default URL transform: http(s), irc(s), mailto, xmpp and relative URLs survive, everything else is dropped. */
export function safeUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const colon = url.indexOf(":");
  const q = url.indexOf("?");
  const h = url.indexOf("#");
  const s = url.indexOf("/");
  if (colon === -1 || (s !== -1 && colon > s) || (q !== -1 && colon > q) || (h !== -1 && colon > h)) return url;
  return /^(https?|ircs?|mailto|xmpp)$/i.test(url.slice(0, colon)) ? url : undefined;
}

const unescape = (s: string) => s.replace(/\\([!-/:-@[-`{-~])/g, "$1");

/** Inline syntax to nodes. */
export function parseInline(src: string): MdInline[] {
  const out: MdInline[] = [];
  let buf = "";
  const flush = () => {
    if (buf) out.push({ t: "text", v: unescape(buf) });
    buf = "";
  };
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    const rest = src.slice(i);
    if (ch === "\\" && i + 1 < src.length) {
      if (src[i + 1] === "\n") {
        flush();
        out.push({ t: "br" });
        i += 2;
        continue;
      }
      buf += src.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (ch === "`") {
      const m = /^(`+)([\s\S]*?[^`])\1(?!`)/.exec(rest);
      if (m) {
        flush();
        out.push({ t: "code", v: m[2]!.replace(/\n/g, " ").replace(/^ (.*[^ ].*) $/, "$1") });
        i += m[0].length;
        continue;
      }
    }
    if (ch === "<") {
      const auto = /^<((?:https?:\/\/|mailto:)[^\s<>]+)>/i.exec(rest);
      if (auto) {
        flush();
        out.push({ t: "a", href: safeUrl(auto[1]), c: [{ t: "text", v: auto[1]! }] });
        i += auto[0].length;
        continue;
      }
      const html = /^<\/?[A-Za-z][^>]*>|^<!--[\s\S]*?-->/.exec(rest);
      if (html) {
        flush();
        i += html[0].length;
        continue;
      }
    }
    if (ch === "!" || ch === "[") {
      const image = ch === "!";
      const start = image ? i + 1 : i;
      if (src[start] === "[") {
        let depth = 0;
        let j = start;
        for (; j < src.length; j++) {
          if (src[j] === "\\") j++;
          else if (src[j] === "[") depth++;
          else if (src[j] === "]" && --depth === 0) break;
        }
        const target = j < src.length ? /^\(\s*(<[^>]*>|[^\s)]*)(?:\s+(?:"([^"]*)"|'([^']*)'))?\s*\)/.exec(src.slice(j + 1)) : null;
        if (target) {
          flush();
          const label = src.slice(start + 1, j);
          const url = target[1]!.replace(/^<|>$/g, "");
          if (image) out.push({ t: "img", src: safeUrl(url), alt: label.replace(/[*_`~]/g, ""), title: target[2] ?? target[3] });
          else out.push({ t: "a", href: safeUrl(url), c: parseInline(label) });
          i = j + 1 + target[0].length;
          continue;
        }
      }
    }
    if (ch === "*" || ch === "_" || ch === "~") {
      const m = /^(\*\*\*|___|\*\*|__|~~|\*|_)(?=\S)/.exec(rest);
      if (m) {
        const mark = m[1]!;
        const intraword = ch === "_" && i > 0 && /\w/.test(src[i - 1]!);
        let end = intraword ? -1 : rest.indexOf(mark, mark.length);
        while (end > 0 && (/\s/.test(rest[end - 1]!) || rest[end - 1] === "\\")) end = rest.indexOf(mark, end + 1);
        if (end > 0 && !(ch === "_" && /\w/.test(rest[end + mark.length] ?? ""))) {
          flush();
          const inner = parseInline(rest.slice(mark.length, end));
          if (mark === "~~") out.push({ t: "del", c: inner });
          else if (mark.length === 3) out.push({ t: "em", c: [{ t: "strong", c: inner }] });
          else out.push({ t: mark.length === 2 ? "strong" : "em", c: inner });
          i += end + mark.length;
          continue;
        }
      }
    }
    if (ch === "h" || ch === "w") {
      const m = /^(?:https?:\/\/|www\.)[^\s<]+[^\s<?!.,:;*_~'")\]]/i.exec(rest);
      if (m && (i === 0 || /[\s(*_~]/.test(src[i - 1]!))) {
        flush();
        out.push({ t: "a", href: safeUrl(m[0].startsWith("www.") ? `http://${m[0]}` : m[0]), c: [{ t: "text", v: m[0] }] });
        i += m[0].length;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/;
const HR = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const HEADING = /^ {0,3}(#{1,6})(?:\s+(.*?))?(?:\s+#+)?\s*$/;
const BULLET = /^( {0,3})([-*+])\s+(.*)$/;
const ORDERED = /^( {0,3})(\d{1,9})[.)]\s+(.*)$/;
const DELIM_ROW = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (s[i] === "|") {
      cells.push(cur.trim());
      cur = "";
    } else cur += s[i];
  }
  cells.push(cur.trim());
  return cells;
}

function startsBlock(line: string): boolean {
  return FENCE.test(line) || HR.test(line) || /^ {0,3}#{1,6}(\s|$)/.test(line) || /^ {0,3}>/.test(line) || BULLET.test(line) || /^ {0,3}1[.)]\s+/.test(line);
}

/** Markdown text to blocks. */
export function parseMarkdownEditorSource(source: string): MdBlock[] {
  return parseBlocks(source.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n"));
}

function parseBlocks(lines: string[]): MdBlock[] {
  const blocks: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = FENCE.exec(line);
    if (fence) {
      const mark = fence[1]!;
      const closer = new RegExp(`^ {0,3}${mark[0] === "`" ? "`" : "~"}{${mark.length},}\\s*$`);
      const body: string[] = [];
      i++;
      while (i < lines.length && !closer.test(lines[i]!)) body.push(lines[i++]!);
      i++;
      blocks.push({ t: "code", lang: fence[2] || "text", code: body.length ? `${body.join("\n")}\n` : "" });
      continue;
    }
    if (HR.test(line)) {
      blocks.push({ t: "hr" });
      i++;
      continue;
    }
    const heading = /^ {0,3}#{1,6}(\s|$)/.test(line) ? HEADING.exec(line) : null;
    if (heading) {
      blocks.push({ t: "h", level: heading[1]!.length as 1, c: parseInline(heading[2] ?? "") });
      i++;
      continue;
    }
    if (/^ {0,3}>/.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && lines[i]!.trim() && (/^ {0,3}>/.test(lines[i]!) || !startsBlock(lines[i]!))) inner.push(lines[i++]!.replace(/^ {0,3}> ?/, ""));
      blocks.push({ t: "bq", blocks: parseBlocks(inner) });
      continue;
    }
    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    if (bullet || ordered) {
      const isOrdered = !bullet;
      const marker = bullet ? bullet[2]! : "";
      const re = isOrdered ? ORDERED : BULLET;
      const items: MdItem[] = [];
      const start = ordered ? Number(ordered[2]) : 1;
      while (i < lines.length) {
        const m = re.exec(lines[i]!);
        if (!m || HR.test(lines[i]!) || (!isOrdered && m[2] !== marker)) break;
        const indent = m[1]!.length + (isOrdered ? m[2]!.length + 1 : 1) + 1;
        const body: string[] = [m[3]!];
        i++;
        while (i < lines.length) {
          const next = lines[i]!;
          if (!next.trim()) {
            let j = i;
            while (j < lines.length && !lines[j]!.trim()) j++;
            if (j < lines.length && lines[j]!.startsWith(" ".repeat(indent))) {
              body.push("");
              i++;
              continue;
            }
            break;
          }
          if (next.startsWith(" ".repeat(indent))) body.push(next.slice(indent));
          else if (!startsBlock(next) && !ORDERED.test(next) && body[body.length - 1] !== "") body.push(next.trim());
          else break;
          i++;
        }
        let checked: boolean | undefined;
        const task = /^\[([ xX])\]\s+/.exec(body[0]!);
        if (task) {
          checked = task[1] !== " ";
          body[0] = body[0]!.slice(task[0].length);
        }
        items.push({ checked, blocks: parseBlocks(body) });
        while (i < lines.length && !lines[i]!.trim() && i + 1 < lines.length && re.test(lines[i + 1]!)) i++;
      }
      blocks.push(isOrdered ? { t: "ol", items, start } : { t: "ul", items });
      continue;
    }
    // Table: a header row followed by a delimiter row.
    if (line.includes("|") && i + 1 < lines.length && DELIM_ROW.test(lines[i + 1]!) && lines[i + 1]!.includes("-")) {
      const head = splitRow(line);
      const delim = splitRow(lines[i + 1]!);
      if (head.length === delim.length) {
        const align = delim.map((d) => (d.startsWith(":") && d.endsWith(":") ? "center" : d.endsWith(":") ? "right" : d.startsWith(":") ? "left" : null));
        const rows: MdInline[][][] = [];
        i += 2;
        while (i < lines.length && lines[i]!.trim() && !startsBlock(lines[i]!)) {
          const cells = splitRow(lines[i]!);
          rows.push(head.map((_, c) => parseInline(cells[c] ?? "")));
          i++;
        }
        blocks.push({ t: "table", align, head: head.map(parseInline), rows });
        continue;
      }
    }
    // Paragraph (setext headings included).
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i]!.trim() && !startsBlock(lines[i]!) && !/^ {0,3}(=+|-+)\s*$/.test(lines[i]!)) para.push(lines[i++]!);
    const setext = i < lines.length ? /^ {0,3}(=+|-+)\s*$/.exec(lines[i]!) : null;
    const text = para.map((l) => l.trim()).join("\n");
    if (setext) {
      blocks.push({ t: "h", level: setext[1]!.startsWith("=") ? 1 : 2, c: parseInline(text) });
      i++;
    } else blocks.push({ t: "p", c: parseInline(text) });
  }
  return blocks;
}
