/** Pure consent maths: no storage, no scripts, no network. The host decides what a "yes" turns on. */

/** The Google Consent Mode v2 storage types. Other tools use the same names; this file never calls any of them. */
export type ConsentModeKey =
  | "ad_storage"
  | "ad_user_data"
  | "ad_personalization"
  | "analytics_storage"
  | "functionality_storage"
  | "personalization_storage"
  | "security_storage";

export type ConsentModeValue = "granted" | "denied";

/** A cookie or similar storage item, listed under a category so people can see what they are agreeing to. */
export interface ConsentCookie {
  name: string;
  purpose: string;
  /** "1 year", "Session". Free text, so it can be localised. */
  duration?: string;
  /** Who sets it: your domain or a vendor. */
  provider?: string;
}

export interface ConsentCategory {
  /** Stable key stored in the consent record: `necessary`, `analytics`, `marketing`… */
  id: string;
  /** Overrides the built-in name for a known id; required for a custom id. */
  label?: string;
  description?: string;
  /** Cannot be turned off (strictly necessary storage). Always granted. */
  required?: boolean;
  cookies?: ConsentCookie[];
  /** Consent Mode keys this category controls. Known ids have defaults. */
  consentMode?: ConsentModeKey[];
}

/** category id -> granted. */
export type ConsentState = Record<string, boolean>;

export type ConsentSource = "accept-all" | "reject-all" | "custom";

export const DEFAULT_CONSENT_CATEGORIES: ConsentCategory[] = [
  { id: "necessary", required: true, consentMode: ["security_storage"] },
  { id: "preferences", consentMode: ["functionality_storage", "personalization_storage"] },
  { id: "analytics", consentMode: ["analytics_storage"] },
  { id: "marketing", consentMode: ["ad_storage", "ad_user_data", "ad_personalization"] },
];

/** Everything on. Required categories are always on. */
export function acceptAll(categories: readonly ConsentCategory[]): ConsentState {
  return Object.fromEntries(categories.map((c) => [c.id, true]));
}

/** Only the required categories on. */
export function rejectAll(categories: readonly ConsentCategory[]): ConsentState {
  return Object.fromEntries(categories.map((c) => [c.id, Boolean(c.required)]));
}

/** A state that has every category, with required ones forced on and missing ones off. */
export function normalizeConsent(categories: readonly ConsentCategory[], state?: ConsentState | null): ConsentState {
  return Object.fromEntries(categories.map((c) => [c.id, c.required ? true : Boolean(state?.[c.id])]));
}

export function consentSource(categories: readonly ConsentCategory[], state: ConsentState): ConsentSource {
  const s = normalizeConsent(categories, state);
  if (categories.every((c) => s[c.id])) return "accept-all";
  if (categories.every((c) => s[c.id] === Boolean(c.required))) return "reject-all";
  return "custom";
}

const CONSENT_MODE_KEYS: ConsentModeKey[] = [
  "ad_storage",
  "ad_user_data",
  "ad_personalization",
  "analytics_storage",
  "functionality_storage",
  "personalization_storage",
  "security_storage",
];

/**
 * Maps a consent state to Consent Mode signals, ready to hand to whatever loads your tags:
 * `gtag("consent", "update", consentModeSignals(state))`. A key no category controls stays `denied`.
 */
export function consentModeSignals(state: ConsentState, categories: readonly ConsentCategory[] = DEFAULT_CONSENT_CATEGORIES): Record<ConsentModeKey, ConsentModeValue> {
  const out = Object.fromEntries(CONSENT_MODE_KEYS.map((k) => [k, "denied"])) as Record<ConsentModeKey, ConsentModeValue>;
  for (const c of categories) {
    if (!(c.required || state[c.id])) continue;
    for (const key of c.consentMode ?? []) out[key] = "granted";
  }
  return out;
}
