/* Pure helpers for a contact's linked accounts and per-channel consent. No React. */

export type ContactChannel = "email" | "phone" | "whatsapp" | "telegram" | "slack" | "discord" | "messenger" | "instagram" | "linkedin" | "x" | "chat" | "other";

export const CONTACT_CHANNELS: readonly ContactChannel[] = ["email", "phone", "whatsapp", "telegram", "slack", "discord", "messenger", "instagram", "linkedin", "x", "chat", "other"];

/** Channels a person has to agree to be written to. Consent is kept per channel, not per account. */
export const CONTACT_CONSENT_CHANNELS: readonly ContactChannel[] = ["email", "whatsapp", "phone"];

export type ContactConsentStatus = "granted" | "denied" | "unknown";

export type ContactIdentityIssue = "empty" | "email" | "phone" | "duplicate";

/** The form of an account value used to compare two of them: trimmed, lower-cased, phone-like channels reduced to digits. */
export function normalizeContactIdentity(channel: ContactChannel, value: string): string {
  const trimmed = value.trim();
  if (channel === "phone" || channel === "whatsapp") return trimmed.replace(/\D/g, "");
  if (channel === "email") return trimmed.toLowerCase();
  return trimmed.replace(/^@/, "").toLowerCase();
}

export function contactIdentityKey(channel: ContactChannel, value: string): string {
  return `${channel}:${normalizeContactIdentity(channel, value)}`;
}

/** Why `value` cannot be linked as a `channel` account, or `null` when it can. `existing` are the accounts already on the contact. */
export function validateContactIdentity(channel: ContactChannel, value: string, existing: readonly { channel: ContactChannel; value: string }[] = []): ContactIdentityIssue | null {
  if (!value.trim()) return "empty";
  if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) return "email";
  if ((channel === "phone" || channel === "whatsapp") && normalizeContactIdentity(channel, value).length < 7) return "phone";
  const key = contactIdentityKey(channel, value);
  if (existing.some((e) => contactIdentityKey(e.channel, e.value) === key)) return "duplicate";
  return null;
}

/**
 * The consent that survives when contacts are merged. The safest answer wins: one refusal refuses for the merged
 * contact, otherwise one grant grants, otherwise it is still unknown.
 */
export function mergeContactConsent(states: readonly (ContactConsentStatus | undefined)[]): ContactConsentStatus {
  if (states.includes("denied")) return "denied";
  if (states.includes("granted")) return "granted";
  return "unknown";
}

/** The accounts of one channel first, with the primary at the top. */
export function sortContactIdentities<T extends { channel: ContactChannel; primary?: boolean }>(identities: readonly T[]): T[] {
  const order = new Map(CONTACT_CHANNELS.map((c, i) => [c, i]));
  return [...identities].sort((a, b) => (order.get(a.channel) ?? 99) - (order.get(b.channel) ?? 99) || Number(!!b.primary) - Number(!!a.primary));
}
