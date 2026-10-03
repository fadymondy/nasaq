/* Pure helpers for email templates: {{variable}} substitution and the standalone HTML document shown in previews. No React. */

export interface EmailVariable {
  /** The name used inside `{{ }}`, such as `first_name`. */
  key: string;
  /** Human name shown in the variable list. */
  label: string;
  /** The value substituted in previews. */
  sample: string;
}

export type EmailDirection = "ltr" | "rtl";

const VARIABLE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

/** Escapes text for use inside HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** The distinct variable keys used in `text`, in order of first use. */
export function findVariables(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(VARIABLE)) seen.add(m[1]!);
  return [...seen];
}

/** Keys used in `text` that are not in `variables`. */
export function unknownVariables(text: string, variables: readonly EmailVariable[]): string[] {
  const known = new Set(variables.map((v) => v.key));
  return findVariables(text).filter((k) => !known.has(k));
}

/**
 * Replaces `{{key}}` with the variable's sample value. Unknown keys are left as written so a typo stays visible.
 * With `html: true` the values are escaped (the text around them is trusted HTML).
 */
export function fillVariables(text: string, variables: readonly EmailVariable[], { html = false }: { html?: boolean } = {}): string {
  const byKey = new Map(variables.map((v) => [v.key, v.sample]));
  return text.replace(VARIABLE, (whole, key: string) => {
    const value = byKey.get(key);
    if (value === undefined) return whole;
    return html ? escapeHtml(value) : value;
  });
}

export interface EmailDocumentInput {
  /** HTML from the body editor. */
  body: string;
  preheader?: string;
  dir?: EmailDirection;
  variables?: readonly EmailVariable[];
  /** Small print under the body, such as a postal address or an unsubscribe line. */
  footer?: string;
}

// Emails are read on paper-white in every client, whatever the app theme, so the document uses fixed rgb() colours.
const INK = "rgb(24, 24, 27)";
const MUTED = "rgb(113, 113, 122)";
const PAPER = "rgb(255, 255, 255)";
const DESK = "rgb(244, 244, 245)";
const LINE = "rgb(228, 228, 231)";

/** A complete, self-contained HTML document for a preview iframe (`sandbox=""`, so no script runs). */
export function renderEmailDocument({ body, preheader, dir = "ltr", variables = [], footer }: EmailDocumentInput): string {
  const filled = fillVariables(body, variables, { html: true });
  const pre = preheader ? fillVariables(preheader, variables, { html: true }) : "";
  const foot = footer ? fillVariables(footer, variables, { html: true }) : "";
  const font = dir === "rtl" ? "'Segoe UI', Tahoma, Arial, sans-serif" : "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
  return `<!doctype html>
<html lang="${dir === "rtl" ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,body{margin:0;padding:0;background:${DESK};color:${INK};font-family:${font};font-size:15px;line-height:1.6}
.wrap{max-width:600px;margin:0 auto;padding:24px 12px}
.card{background:${PAPER};border:1px solid ${LINE};border-radius:8px;padding:32px 28px}
.pre{display:none;max-height:0;overflow:hidden;opacity:0}
h1,h2,h3{margin:0 0 12px;line-height:1.25;color:${INK}}
h1{font-size:24px}h2{font-size:20px}h3{font-size:17px}
p{margin:0 0 14px}
a{color:${INK};text-decoration:underline}
blockquote{margin:0 0 14px;padding-inline-start:14px;border-inline-start:3px solid ${LINE};color:${MUTED}}
ul,ol{margin:0 0 14px;padding-inline-start:22px}
li p{margin:0}
code{background:${DESK};padding:1px 4px;border-radius:3px;font-family:ui-monospace,Consolas,monospace;font-size:13px}
.foot{padding:16px 8px 0;color:${MUTED};font-size:12px;text-align:center}
</style>
</head>
<body>
${pre ? `<span class="pre">${pre}</span>` : ""}
<div class="wrap"><div class="card">${filled}</div>${foot ? `<div class="foot">${foot}</div>` : ""}</div>
</body>
</html>`;
}
