import type { ProfileFormOption } from "./types";

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const WEBSITE_PATTERN = /^https?:\/\/[^\s.]+\.[^\s]+$/i;
export const PROFILE_DIRTY_KEYS = ["name", "username", "phone", "bio", "locale", "timezone", "location", "website"] as const;

const FALLBACK_ZONES = ["Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Asia/Kuwait", "Asia/Qatar", "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "UTC"];

/** Every IANA zone the runtime knows, labelled "Riyadh (GMT+3)" in the reader's language. */
export function buildTimezones(locale: string): ProfileFormOption[] {
  const ids = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? FALLBACK_ZONES;
  const now = new Date();
  return ids.map((id) => {
    let offset = "";
    try {
      offset = new Intl.DateTimeFormat(locale, { timeZone: id, timeZoneName: "shortOffset" }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "";
    } catch {
      /* an id the runtime cannot format: show it without an offset */
    }
    const place = id.replace(/_/g, " ").replace(/\//g, " / ");
    return { value: id, label: offset ? `${place} (${offset})` : place };
  });
}
