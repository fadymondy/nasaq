/** Pure helpers for device codes (the short code a person types or compares when pairing a device). */

/** RFC 8628 suggests consonants only, so a code cannot spell a word and is hard to misread. */
export const USER_CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";

/** Uppercases and drops everything that is not a letter or digit: `wdjb mjht` -> `WDJBMJHT`. */
export function normalizeUserCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** `WDJBMJHT` -> `WDJB-MJHT`. Groups of `size` characters joined by a hyphen. */
export function formatUserCode(code: string, size = 4): string {
  const clean = normalizeUserCode(code);
  const groups: string[] = [];
  for (let i = 0; i < clean.length; i += size) groups.push(clean.slice(i, i + size));
  return groups.join("-");
}

export function isUserCodeComplete(code: string, length = 8): boolean {
  return normalizeUserCode(code).length === length;
}

type TimeInput = Date | number | string;
const ms = (value: TimeInput) => (value instanceof Date ? value.getTime() : new Date(value).getTime());

/** Whole seconds until `expiresAt`, never below zero. */
export function codeSecondsLeft(expiresAt: TimeInput, now: TimeInput = Date.now()): number {
  return Math.max(0, Math.ceil((ms(expiresAt) - ms(now)) / 1000));
}

export type DeviceCodeStatus = "pending" | "approved" | "denied" | "expired";

/** A pending code past its expiry reads as expired even if the host has not said so yet. */
export function effectiveCodeStatus(status: DeviceCodeStatus, expiresAt: TimeInput | undefined, now: TimeInput = Date.now()): DeviceCodeStatus {
  if (status === "pending" && expiresAt !== undefined && codeSecondsLeft(expiresAt, now) === 0) return "expired";
  return status;
}
