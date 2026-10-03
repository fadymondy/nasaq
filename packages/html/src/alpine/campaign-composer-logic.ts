// Pure helpers behind nqCampaignComposer: what stops a broadcast from going, how far a send has got, and the email render used
// for the preview. The campaign helpers are the React campaign-logic.ts; the email helpers are the React email-render.ts.

export interface EmailVariable {
  key: string;
  label: string;
  sample: string;
}
export type Dir = "ltr" | "rtl";
const VARIABLE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const findVariables = (text: string): string[] => {
  const seen = new Set<string>();
  for (const m of text.matchAll(VARIABLE)) seen.add(m[1]!);
  return [...seen];
};

export const fillVariables = (text: string, variables: readonly EmailVariable[], html = false): string => {
  const byKey = new Map(variables.map((v) => [v.key, v.sample]));
  return text.replace(VARIABLE, (whole, key: string) => {
    const value = byKey.get(key);
    if (value === undefined) return whole;
    return html ? escapeHtml(value) : value;
  });
};

const INK = "rgb(24, 24, 27)";
const MUTED = "rgb(113, 113, 122)";
const PAPER = "rgb(255, 255, 255)";
const DESK = "rgb(244, 244, 245)";
const LINE = "rgb(228, 228, 231)";

export const renderEmailDocument = (input: { body: string; preheader?: string; dir?: Dir; variables?: readonly EmailVariable[]; footer?: string }): string => {
  const { body, preheader, dir = "ltr", variables = [], footer } = input;
  const filled = fillVariables(body, variables, true);
  const pre = preheader ? fillVariables(preheader, variables, true) : "";
  const foot = footer ? fillVariables(footer, variables, true) : "";
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
};

export type CampaignChannel = "email" | "whatsapp";

export const CAMPAIGN_CHANNELS: readonly CampaignChannel[] = ["email", "whatsapp"];

/** The length WhatsApp accepts for one template body. */
export const CAMPAIGN_WHATSAPP_MAX = 1024;

export type CampaignIssue = "audience-none" | "audience-empty" | "subject-empty" | "body-empty" | "body-too-long" | "variable-unknown";

/** Visible text of an HTML body, for "is it empty" and counting. */
export function campaignPlainText(html: string): string {
  return html
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export interface CampaignCheckInput {
  channel: CampaignChannel;
  audienceId?: string | null;
  /** How many people would get it. `null` while counting. */
  audienceCount: number | null;
  subject: string;
  body: string;
  /** Names of variables that exist. */
  knownVariables: readonly string[];
}

/** Everything that stops a send, in the order to fix it. Empty means ready. A count still loading is not an issue. */
export function validateCampaign(input: CampaignCheckInput): CampaignIssue[] {
  const issues: CampaignIssue[] = [];
  if (!input.audienceId) issues.push("audience-none");
  else if (input.audienceCount === 0) issues.push("audience-empty");
  if (input.channel === "email" && !input.subject.trim()) issues.push("subject-empty");
  const text = input.channel === "email" ? campaignPlainText(input.body) : input.body.trim();
  if (!text) issues.push("body-empty");
  else if (input.channel === "whatsapp" && input.body.length > CAMPAIGN_WHATSAPP_MAX) issues.push("body-too-long");
  const known = new Set(input.knownVariables);
  const used = [...(input.subject + " " + input.body).matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((m) => m[1]!);
  if (used.some((k) => !known.has(k))) issues.push("variable-unknown");
  return issues;
}

/** The variable names in the text that are not known, without repeats. */
export function campaignUnknownVariables(text: string, known: readonly string[]): string[] {
  const set = new Set(known);
  return [...new Set([...text.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((m) => m[1]!))].filter((k) => !set.has(k));
}

export interface CampaignProgressInput {
  sent: number;
  failed: number;
  total: number;
}

export type CampaignSendState = "sending" | "done" | "partial";

/** Percent done (sent and failed both count as handled), and the state the bar should read. */
export function campaignProgress({ sent, failed, total }: CampaignProgressInput): { percent: number; state: CampaignSendState; remaining: number } {
  const handled = Math.max(0, Math.min(total, sent + failed));
  const percent = total <= 0 ? 0 : Math.round((handled / total) * 100);
  const remaining = Math.max(0, total - handled);
  const state: CampaignSendState = remaining > 0 ? "sending" : failed > 0 ? "partial" : "done";
  return { percent, state, remaining };
}
