"use client";

import type { ComponentProps, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { CopyButton } from "../copy-button";

const STRINGS = {
  en: { code: "Code", copy: "Copy code", copied: "Code copied to clipboard" },
  ar: { code: "شيفرة برمجية", copy: "نسخ الشيفرة", copied: "تم نسخ الشيفرة إلى الحافظة" },
};

function useStrings() {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return STRINGS[ar ? "ar" : "en"];
}

/** Languages CodeBlock can highlight. Anything else renders as plain text. */
export type CodeLanguage =
  | "ts"
  | "tsx"
  | "js"
  | "jsx"
  | "json"
  | "bash"
  | "sh"
  | "css"
  | "html"
  | "md"
  | "go"
  | "php"
  | "python"
  | "py"
  | "sql"
  | "yaml"
  | "yml"
  | "text";

/** Grammar loaders. Each language is a separate dynamic import, fetched only when a block asks for it. */
const GRAMMARS: Record<string, () => Promise<{ default: unknown }>> = {
  typescript: () => import("shiki/langs/typescript.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  shellscript: () => import("shiki/langs/shellscript.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  php: () => import("shiki/langs/php.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
};

const ALIASES: Record<string, string> = {
  ts: "typescript",
  typescript: "typescript",
  tsx: "tsx",
  js: "javascript",
  javascript: "javascript",
  mjs: "javascript",
  jsx: "jsx",
  json: "json",
  jsonc: "json",
  bash: "shellscript",
  sh: "shellscript",
  shell: "shellscript",
  zsh: "shellscript",
  css: "css",
  html: "html",
  md: "markdown",
  markdown: "markdown",
  go: "go",
  php: "php",
  python: "python",
  py: "python",
  sql: "sql",
  yaml: "yaml",
  yml: "yaml",
};

const THEME = "nasaq";

export interface CodeToken {
  content: string;
  /** A `var(--shiki-…)` reference, never a literal colour. */
  color?: string | undefined;
  italic?: boolean;
  bold?: boolean;
}

type Highlighter = {
  loadLanguage: (...langs: never[]) => Promise<void>;
  codeToTokens: (
    code: string,
    options: { lang: string; theme: string },
  ) => { tokens: { content: string; color?: string | undefined; fontStyle?: number | undefined }[][] };
};

let highlighter: Promise<Highlighter> | undefined;

/** Shiki is created once, on first use. `createCssVariablesTheme` keeps every colour a CSS variable, so no hex ships and dark mode needs no second theme. */
function getHighlighter(): Promise<Highlighter> {
  highlighter ??= (async () => {
    const [core, engine] = await Promise.all([import("shiki/core"), import("shiki/engine/javascript")]);
    const theme = core.createCssVariablesTheme({ name: THEME, variablePrefix: "--shiki-", fontStyle: true });
    return (await core.createHighlighterCore({
      themes: [theme],
      langs: [],
      engine: engine.createJavaScriptRegexEngine(),
    })) as unknown as Highlighter;
  })();
  highlighter.catch(() => {
    highlighter = undefined;
  });
  return highlighter;
}

/** Tokenises code with Shiki. Resolves to `null` for plain text or an unknown language. */
export async function highlightCode(code: string, language: string): Promise<CodeToken[][] | null> {
  const grammar = ALIASES[language.toLowerCase()];
  const load = grammar ? GRAMMARS[grammar] : undefined;
  if (!grammar || !load) return null;
  const hl = await getHighlighter();
  await hl.loadLanguage((await load()).default as never);
  return hl.codeToTokens(code, { lang: grammar, theme: THEME }).tokens.map((line) =>
    line.map((t) => ({
      content: t.content,
      color: t.color,
      italic: Boolean(t.fontStyle && t.fontStyle & 1),
      bold: Boolean(t.fontStyle && t.fontStyle & 2),
    })),
  );
}

/** "1,3-5" or [1, 3, 4, 5] to a set of 1-based line numbers. */
function parseLines(lines: number[] | string | undefined): Set<number> {
  const out = new Set<number>();
  if (!lines) return out;
  if (Array.isArray(lines)) {
    for (const n of lines) out.add(n);
    return out;
  }
  for (const part of lines.split(",")) {
    const [a, b] = part.trim().split("-").map(Number);
    if (a === undefined || Number.isNaN(a)) continue;
    const end = b === undefined || Number.isNaN(b) ? a : b;
    for (let n = a; n <= end; n++) out.add(n);
  }
  return out;
}

export interface CodeBlockProps extends Omit<ComponentProps<"figure">, "children" | "dir"> {
  /** The source text. */
  code: string;
  /** A language id or common alias (`ts`, `tsx`, `bash`, `py`, …). Omit or use `text` for no highlighting. */
  language?: CodeLanguage | (string & {});
  /** Shown in a header above the code. */
  filename?: string;
  /** Show 1-based line numbers. */
  lineNumbers?: boolean;
  /** Lines to emphasise: `[2, 3]` or `"2-4,7"` (1-based). */
  highlightLines?: number[] | string;
  /** Show the copy button. Default true. */
  copyable?: boolean;
  /** Replaces the copy button, e.g. with the AI copy menu from `code-block-variants`. Shown where the button would be. */
  copyAction?: ReactNode;
  /** Accessible name for the copy button. Default "Copy code" / "نسخ الشيفرة". */
  copyLabel?: string;
  /** Accessible name of the scrollable code region. Defaults to the filename, then "Code". */
  label?: string;
  /** Classes for the scrolling `<pre>`, e.g. `max-h-80`. */
  preClassName?: string;
}

const shikiVars = [
  "[--shiki-foreground:var(--nq-fg)]",
  "[--shiki-background:transparent]",
  "[--shiki-token-comment:var(--nq-fg-muted)]",
  "[--shiki-token-keyword:var(--nq-accent-text)]",
  "[--shiki-token-string:var(--nq-success-text)]",
  "[--shiki-token-string-expression:var(--nq-success-text)]",
  "[--shiki-token-constant:var(--nq-warning-text)]",
  "[--shiki-token-function:var(--nq-info-text)]",
  "[--shiki-token-parameter:var(--nq-fg-body)]",
  "[--shiki-token-punctuation:var(--nq-fg-muted)]",
  "[--shiki-token-link:var(--nq-info-text)]",
];

/**
 * Syntax-highlighted code. Shiki loads lazily on first use, so the first paint is a plain `<pre>` with the
 * same line layout (no shift), then colours arrive. Code is always left-to-right, also in Arabic pages.
 */
export function CodeBlock({
  code,
  language = "text",
  filename,
  lineNumbers = false,
  highlightLines,
  copyable = true,
  copyAction,
  copyLabel,
  label,
  preClassName,
  className,
  ...props
}: CodeBlockProps) {
  const t = useStrings();
  const source = useMemo(() => code.replace(/\n$/, ""), [code]);
  const [result, setResult] = useState<{ key: string; tokens: CodeToken[][] } | null>(null);
  const key = `${language}\u0000${source}`;

  useEffect(() => {
    let cancelled = false;
    highlightCode(source, language)
      .then((tokens) => {
        if (!cancelled && tokens) setResult({ key, tokens });
      })
      .catch(() => {
        // Loading failed (offline, blocked chunk): the plain fallback stays.
      });
    return () => {
      cancelled = true;
    };
  }, [source, language, key]);

  const highlighted = result?.key === key;
  const lines: CodeToken[][] = highlighted
    ? result.tokens
    : source.split("\n").map((content) => (content ? [{ content }] : []));
  const marked = useMemo(() => parseLines(highlightLines), [highlightLines]);
  const gutter = String(lines.length).length;
  const action = copyAction ?? <CopyButton value={source} label={copyLabel ?? t.copy} copiedLabel={t.copied} />;

  return (
    <figure
      data-slot="code-block"
      data-language={language}
      data-highlighted={highlighted || undefined}
      dir="ltr"
      className={cn(
        "group/code relative m-0 overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start",
        shikiVars,
        className,
      )}
      {...props}
    >
      {filename ? (
        <figcaption
          data-slot="code-block-header"
          className="flex h-row items-center justify-between gap-2 border-b border-border ps-3 pe-1.5 font-mono text-caption text-muted-foreground"
        >
          <span className="truncate">{filename}</span>
          {copyable ? action : null}
        </figcaption>
      ) : null}
      {copyable && !filename ? (
        <div className="absolute end-1.5 top-1.5 z-10 opacity-0 transition-opacity duration-150 ease-nq focus-within:opacity-100 group-hover/code:opacity-100 pointer-coarse:opacity-100">
          {action}
        </div>
      ) : null}
      <pre
        data-slot="code-block-pre"
        role="region"
        tabIndex={0}
        aria-label={label ?? filename ?? t.code}
        className={cn(
          "m-0 overflow-auto bg-transparent py-3 font-mono text-code text-[var(--shiki-foreground)] outline-none",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
          preClassName,
        )}
      >
        <code className="block w-max min-w-full">
          {lines.map((line, i) => {
            const n = i + 1;
            const on = marked.has(n);
            return (
              <span
                key={n}
                data-line={n}
                data-highlighted={on || undefined}
                className={cn(
                  "flex min-h-[1lh] border-s-2 border-transparent pe-4 whitespace-pre",
                  !lineNumbers && "ps-3",
                  on && "border-nq-accent bg-nq-selected",
                )}
              >
                {lineNumbers ? (
                  <span
                    aria-hidden="true"
                    className="inline-block shrink-0 select-none pe-4 ps-3 text-end text-muted-foreground tabular-nums"
                    style={{ minWidth: `${gutter + 3}ch` }}
                  >
                    {n}
                  </span>
                ) : null}
                <span>
                  {line.map((tok, j) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional and never reordered
                      key={j}
                      style={tok.color ? { color: tok.color } : undefined}
                      className={cn(tok.italic && "italic", tok.bold && "font-semibold")}
                    >
                      {tok.content}
                    </span>
                  ))}
                </span>
              </span>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}

/** Inline code inside a sentence. Left-to-right and isolated, so `npm i` keeps its order in Arabic text. */
export function InlineCode({ className, ...props }: ComponentProps<"code">) {
  return (
    <code
      data-slot="inline-code"
      dir="ltr"
      className={cn(
        "rounded-[4px] border border-border bg-secondary px-1 py-0.5 font-mono text-[0.9em] text-foreground [unicode-bidi:isolate]",
        className,
      )}
      {...props}
    />
  );
}
