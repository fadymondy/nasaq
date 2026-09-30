/* Pure helpers for composing a broadcast: what is missing before it can go, and how far a send has got. No React. */

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
