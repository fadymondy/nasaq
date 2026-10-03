/* Pure helpers for a leads inbox: where a lead came from, and how it moves through the stages. No React. */

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "spam";

/** The order the pipeline shows them in. */
export const LEAD_STATUSES: readonly LeadStatus[] = ["new", "contacted", "qualified", "converted", "spam"];

/** The stages a lead moves through on the way to becoming a contact. Spam sits beside them. */
export const LEAD_PIPELINE: readonly LeadStatus[] = ["new", "contacted", "qualified", "converted"];

/** What the visitor's browser reported when they sent the form. */
export interface LeadAttribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  /** Google Ads click id. */
  gclid?: string;
  landingPage?: string;
}

export type LeadSourceKind = "paid" | "organic" | "social" | "email" | "referral" | "direct";

export interface LeadSource {
  kind: LeadSourceKind;
  /** "Google Ads", "newsletter", "example.com", or "" for direct. Brand names are kept as they came. */
  name: string;
  /** The campaign, when there is one. */
  campaign?: string;
}

const SOCIAL = /^(facebook|fb|instagram|ig|linkedin|twitter|x|tiktok|youtube|snapchat|pinterest|reddit|whatsapp|telegram|t\.co|lnkd\.in)$/i;
const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia)\./i;
const PAID_MEDIUM = /^(cpc|ppc|paid|paidsocial|paid-social|display|cpm|retargeting)$/i;

/** The host of a URL or referrer, without "www.", or "" when it is not one. */
export function leadHost(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(/^[a-z]+:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Sorts a lead's attribution into one of six kinds, the way a marketer would read it. A gclid always means paid search. */
export function classifyLeadSource(a: LeadAttribution | undefined): LeadSource {
  const campaign = a?.utmCampaign?.trim() || undefined;
  const source = a?.utmSource?.trim() ?? "";
  const medium = a?.utmMedium?.trim() ?? "";
  const host = leadHost(a?.referrer);
  if (a?.gclid) return { kind: "paid", name: "Google Ads", campaign };
  if (PAID_MEDIUM.test(medium)) return { kind: "paid", name: source || host || medium, campaign };
  if (/^e-?mail|newsletter$/i.test(medium) || /^(newsletter|email|mailchimp|mautic)$/i.test(source)) return { kind: "email", name: source || medium, campaign };
  if (SOCIAL.test(source) || /^(social|social-media)$/i.test(medium) || SOCIAL.test(host.split(".").slice(-2, -1)[0] ?? "")) return { kind: "social", name: source || host, campaign };
  if (/^organic$/i.test(medium) || SEARCH.test(host)) return { kind: "organic", name: source || host, campaign };
  if (source) return { kind: "referral", name: source, campaign };
  if (host) return { kind: "referral", name: host, campaign };
  return { kind: "direct", name: "", campaign };
}

/** The attribution fields that have a value, in the order people read them. */
export function leadAttributionEntries(a: LeadAttribution | undefined): { key: keyof LeadAttribution; value: string }[] {
  const order: (keyof LeadAttribution)[] = ["utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent", "referrer", "gclid", "landingPage"];
  return order.flatMap((key) => (a?.[key]?.trim() ? [{ key, value: a[key]!.trim() }] : []));
}

export function leadStatusCounts(leads: readonly { status: LeadStatus }[]): Record<LeadStatus | "all", number> {
  const counts = { all: leads.length, new: 0, contacted: 0, qualified: 0, converted: 0, spam: 0 };
  for (const l of leads) counts[l.status] += 1;
  return counts;
}

/**
 * Whether a lead may be moved to `to` by hand. Converted is reached only by converting, and a converted lead stays
 * converted, because its links to the contact and deal would otherwise say one thing and its status another.
 */
export function canMoveLead(from: LeadStatus, to: LeadStatus): boolean {
  return from !== "converted" && to !== "converted" && from !== to;
}

/** Whether a lead can be converted: not already converted, and not marked as spam (probably a misclick). */
export function canConvertLead(status: LeadStatus): boolean {
  return status !== "converted" && status !== "spam";
}

/** The pipeline stages before, at and after the lead's own, for drawing a stepper. Spam has none done. */
export function leadPipelineStates(status: LeadStatus): { status: LeadStatus; state: "done" | "current" | "todo" }[] {
  const at = LEAD_PIPELINE.indexOf(status);
  return LEAD_PIPELINE.map((s, i) => ({ status: s, state: at < 0 ? "todo" : i < at ? "done" : i === at ? "current" : "todo" }));
}
