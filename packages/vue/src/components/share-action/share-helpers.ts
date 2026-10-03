/* Pure helpers for the share action. No DOM, covered by test/share-action.test.mjs. */

export type ShareExpiry = "never" | "1d" | "7d" | "30d";

const DAY = 24 * 60 * 60 * 1000;
const EXPIRY_DAYS: Record<ShareExpiry, number> = { never: 0, "1d": 1, "7d": 7, "30d": 30 };

/** The moment a link created `now` expires, or null for "never". */
export function expiryToDate(expiry: ShareExpiry, now: Date | number = Date.now()): Date | null {
  const days = EXPIRY_DAYS[expiry];
  return days ? new Date(new Date(now).getTime() + days * DAY) : null;
}

const EMAIL = /^[^\s@<>,;:"]+@[^\s@<>,;:"]+\.[^\s@<>,;:"]{2,}$/u;

/** A pragmatic email check: something@domain.tld with no spaces. Real validation happens on the server. */
export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

/** Splits pasted text ("a@x.com, b@y.com; c@z.com") into lower-cased, de-duplicated addresses. */
export function parseEmails(text: string): string[] {
  const seen = new Set<string>();
  for (const part of text.split(/[\s,;]+/u)) {
    const email = part.trim().toLowerCase();
    if (email) seen.add(email);
  }
  return [...seen];
}

/** Adds a link's expiry to a URL as `?expires=` for demos and simple backends. Leaves the URL alone for "never". */
export function withExpiry(url: string, expiry: ShareExpiry, now: Date | number = Date.now()): string {
  const at = expiryToDate(expiry, now);
  if (!at) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("expires", at.toISOString());
    return u.toString();
  } catch {
    return url;
  }
}

/** A `mailto:` link that shares the URL by email. */
export function mailtoLink(url: string, title?: string, text?: string): string {
  const body = [text, url].filter(Boolean).join("\n\n");
  return `mailto:?subject=${encodeURIComponent(title ?? url)}&body=${encodeURIComponent(body)}`;
}
