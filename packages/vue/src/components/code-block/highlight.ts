// A small, dependency-free syntax highlighter for CodeBlock. The React component lazy-loads Shiki; the Vue / Alpine ports must not add a
// dependency, so this tokenises the same languages with plain regex rules and the same `--shiki-token-*` colour variables.
// It is deliberately approximate (no scopes, no embedded languages). Pass `highlight` to CodeBlock to plug in Shiki instead.
// The html package carries a copy of this file (html/src/alpine/code-block-highlight.ts).

export interface CodeToken {
  content: string;
  /** A `var(--shiki-…)` reference, never a literal colour. */
  color?: string | undefined;
  italic?: boolean;
  bold?: boolean;
}

type Kind = "comment" | "keyword" | "string" | "constant" | "function" | "punctuation" | "parameter" | null;
type Rule = [RegExp, Kind | ((match: string) => Kind)];

const COLOR: Record<Exclude<Kind, null>, string> = {
  comment: "var(--shiki-token-comment)",
  keyword: "var(--shiki-token-keyword)",
  string: "var(--shiki-token-string)",
  constant: "var(--shiki-token-constant)",
  function: "var(--shiki-token-function)",
  punctuation: "var(--shiki-token-punctuation)",
  parameter: "var(--shiki-token-parameter)",
};

const words = (list: string) => new Set(list.split(" "));
const JS_KEYWORDS = words(
  "const let var function return if else for while do switch case break continue new class extends super import export from default as async await try catch finally throw typeof instanceof in of delete void yield interface type enum implements namespace declare readonly public private protected static abstract satisfies keyof is",
);
const GO_KEYWORDS = words("package import func return if else for range switch case default break continue go defer select chan map struct interface type var const fallthrough goto");
const PHP_KEYWORDS = words(
  "function return if else elseif foreach for while do switch case break continue new class extends implements interface trait namespace use public private protected static abstract final try catch finally throw echo print require require_once include include_once as instanceof fn match enum readonly yield",
);
const PY_KEYWORDS = words("def class return if elif else for while in not and or is import from as with try except finally raise pass break continue lambda yield global nonlocal assert del async await");
const SH_KEYWORDS = words("if then else elif fi for while until do done case esac function in select export local return exit source alias unset set");
const SQL_KEYWORDS = words(
  "select from where and or not null insert into values update set delete create table alter drop index join left right inner outer on as group by order having limit offset union distinct primary key foreign references default unique is in like between case when then else end asc desc exists with",
);
const CONSTANTS = words("true false null undefined NaN Infinity None True False nil iota this self");

const IDENT = /[A-Za-z_$][\w$]*/y;
const NUMBER = /\b(?:0x[\da-f]+|\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?n?)\b/iy;
const PUNCT = /[{}()[\];,.:<>=+\-*/%&|!?^~@\\]+/y;
const DQ = /"(?:[^"\\\n]|\\.)*"?/y;
const SQ = /'(?:[^'\\\n]|\\.)*'?/y;
const TPL = /`(?:[^`\\]|\\[\s\S])*`?/y;

/** An identifier rule: keyword, constant, a call (`name(`) or plain text. */
function ident(keywords: Set<string>, ci = false): Rule {
  return [
    IDENT,
    (m) => {
      const w = ci ? m.toLowerCase() : m;
      if (keywords.has(w)) return "keyword";
      if (CONSTANTS.has(m)) return "constant";
      return null;
    },
  ];
}

const CALL = /[A-Za-z_$][\w$]*(?=\s*\()/y;
const RULES: Record<string, Rule[]> = {};

const cLike = (keywords: Set<string>, extraComment?: RegExp): Rule[] => [
  [/\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y, "comment"],
  ...(extraComment ? ([[extraComment, "comment"]] as Rule[]) : []),
  [DQ, "string"],
  [SQ, "string"],
  [TPL, "string"],
  [NUMBER, "constant"],
  [
    CALL,
    (m) => (keywords.has(m) ? "keyword" : CONSTANTS.has(m) ? "constant" : "function"),
  ],
  ident(keywords),
  [PUNCT, "punctuation"],
];

RULES.javascript = cLike(JS_KEYWORDS);
RULES.go = cLike(GO_KEYWORDS);
RULES.php = [[/\$[A-Za-z_]\w*/y, "parameter"], ...cLike(PHP_KEYWORDS, /#[^\n]*/y)];
RULES.python = [
  [/#[^\n]*/y, "comment"],
  [/(?:[rRbBfFuU]{0,2})(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/y, "string"],
  [/(?:[rRbBfFuU]{0,2})(?:"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)/y, "string"],
  [NUMBER, "constant"],
  [CALL, (m) => (PY_KEYWORDS.has(m) ? "keyword" : CONSTANTS.has(m) ? "constant" : "function")],
  ident(PY_KEYWORDS),
  [PUNCT, "punctuation"],
];
RULES.shellscript = [
  [/#[^\n]*/y, "comment"],
  [DQ, "string"],
  [SQ, "string"],
  [/\$(?:\{[^}\n]*\}?|\(\(?|[A-Za-z_]\w*|[0-9@#?$!*-])/y, "constant"],
  [/(?<![\w-])--?[A-Za-z][\w-]*/y, "parameter"],
  [NUMBER, "constant"],
  ident(SH_KEYWORDS),
  [/[|&;<>(){}[\]=!\\]+/y, "punctuation"],
];
RULES.sql = [
  [/--[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y, "comment"],
  [SQ, "string"],
  [/"(?:[^"\n]|"")*"?/y, "constant"],
  [NUMBER, "constant"],
  [CALL, (m) => (SQL_KEYWORDS.has(m.toLowerCase()) ? "keyword" : "function")],
  ident(SQL_KEYWORDS, true),
  [/[(),;.*=<>!+\-/%]+/y, "punctuation"],
];
RULES.json = [
  [/\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y, "comment"],
  [/"(?:[^"\\\n]|\\.)*"?(?=\s*:)/y, "function"],
  [DQ, "string"],
  [/-?\b\d[\d.]*(?:e[+-]?\d+)?\b/iy, "constant"],
  [/\b(?:true|false|null)\b/y, "constant"],
  [/[{}[\],:]+/y, "punctuation"],
];
RULES.yaml = [
  [/#[^\n]*/y, "comment"],
  [/[\w.-]+(?=\s*:(?:\s|$))/y, "function"],
  [DQ, "string"],
  [SQ, "string"],
  [/-?\b\d[\d._]*\b/y, "constant"],
  [/\b(?:true|false|null|yes|no|on|off)\b/y, "constant"],
  [/[&*][\w-]+/y, "parameter"],
  [/[-:[\]{},|>?]+/y, "punctuation"],
];
RULES.css = [
  [/\/\*[\s\S]*?(?:\*\/|$)/y, "comment"],
  [DQ, "string"],
  [SQ, "string"],
  [/@[\w-]+/y, "keyword"],
  [/#[\da-f]{3,8}\b/iy, "constant"],
  [/-?\d*\.?\d+(?:%|[a-z]+)?/iy, "constant"],
  [/--?[A-Za-z][\w-]*(?=\s*:)|[A-Za-z-]+(?=\s*:)/y, "function"],
  [/[{}()[\];,:>+~*=]+/y, "punctuation"],
];
RULES.html = [
  [/<!--[\s\S]*?(?:-->|$)/y, "comment"],
  [/<\/?[A-Za-z][\w:.-]*/y, "keyword"],
  [DQ, "string"],
  [SQ, "string"],
  [/[\w:@.-]+(?=\s*=)/y, "function"],
  [/\/?>|[=/]/y, "punctuation"],
];
RULES.markdown = [
  [/^#{1,6}[^\n]*/my, "keyword"],
  [/```[\s\S]*?(?:```|$)|`[^`\n]*`/y, "string"],
  [/\*\*[^*\n]+\*\*|__[^_\n]+__/y, "constant"],
  [/\[[^\]\n]*\]\([^)\n]*\)/y, "function"],
  [/^\s*(?:[-*+]|\d+\.)\s/my, "punctuation"],
];

const ALIASES: Record<string, string> = {
  ts: "javascript", typescript: "javascript", tsx: "javascript", js: "javascript", javascript: "javascript", mjs: "javascript", jsx: "javascript",
  json: "json", jsonc: "json", bash: "shellscript", sh: "shellscript", shell: "shellscript", zsh: "shellscript",
  css: "css", html: "html", md: "markdown", markdown: "markdown", go: "go", php: "php", python: "python", py: "python",
  sql: "sql", yaml: "yaml", yml: "yaml",
};

/** Tokenises code into lines of coloured tokens. Returns `null` for plain text or an unknown language. */
export function highlightCode(code: string, language: string): CodeToken[][] | null {
  const family = ALIASES[language.toLowerCase()];
  const rules = family ? RULES[family] : undefined;
  if (!rules) return null;

  const flat: { text: string; kind: Kind }[] = [];
  let plain = "";
  const flush = () => {
    if (plain) flat.push({ text: plain, kind: null });
    plain = "";
  };
  let i = 0;
  scan: while (i < code.length) {
    for (const [re, kind] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m[0].length > 0) {
        const k = typeof kind === "function" ? kind(m[0]) : kind;
        if (k) {
          flush();
          flat.push({ text: m[0], kind: k });
        } else plain += m[0];
        i += m[0].length;
        continue scan;
      }
    }
    plain += code[i];
    i++;
  }
  flush();

  // Split on newlines so a multi-line token (block comment, template string) colours every line it spans.
  const lines: CodeToken[][] = [[]];
  for (const { text, kind } of flat) {
    text.split("\n").forEach((part, n) => {
      if (n > 0) lines.push([]);
      if (!part) return;
      const line = lines[lines.length - 1]!;
      const color = kind ? COLOR[kind] : undefined;
      const prev = line[line.length - 1];
      if (prev && prev.color === color) prev.content += part;
      else line.push({ content: part, color, italic: kind === "comment" });
    });
  }
  return lines;
}
