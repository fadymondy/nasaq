/*
 * Pure helpers for the presentational card fields. Nothing here validates a card with a processor: the
 * checks (length, Luhn, expiry) only catch typos before the caller's own payment provider takes over.
 */

export type CardBrand = "visa" | "mastercard" | "amex" | "mada" | "unknown";

/** Digits only, at most 19. Accepts Arabic-Indic and Persian digits so a pasted "٤٢٤٢" works. */
export function cardDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, "")
    .slice(0, 19);
}

/** The brand from the leading digits. Text only: Nasaq does not ship card brand artwork. */
export function detectBrand(input: string): CardBrand {
  const n = cardDigits(input);
  if (/^(4026|417500|4508|4844|4913|4917|446404|588845|636120|968)/.test(n)) return "mada";
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "unknown";
}

/** "4242424242424242" -> "4242 4242 4242 4242"; American Express groups 4-6-5. */
export function formatCardNumber(input: string): string {
  const n = cardDigits(input);
  if (detectBrand(n) === "amex") return [n.slice(0, 4), n.slice(4, 10), n.slice(10, 15)].filter(Boolean).join(" ");
  return (n.match(/.{1,4}/g) ?? []).join(" ");
}

/** The Luhn checksum every real card number satisfies. */
export function luhn(input: string): boolean {
  const n = cardDigits(input);
  if (n.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function isCardNumberValid(input: string): boolean {
  const n = cardDigits(input);
  const brand = detectBrand(n);
  const lengthOk = brand === "amex" ? n.length === 15 : n.length >= 13 && n.length <= 19;
  return lengthOk && luhn(n);
}

/** "1226" -> "12/26", "3" -> "03/", "13" -> "1/3": the month is padded and clamped as the user types. */
export function formatExpiry(input: string): string {
  let d = cardDigits(input).slice(0, 4);
  if (d.length === 1 && Number(d) > 1) d = `0${d}`;
  if (d.length >= 2 && Number(d.slice(0, 2)) > 12) d = `1${d.slice(1)}`.slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d.length === 2 && input.endsWith("/") ? `${d}/` : d;
}

/** True when "MM/YY" is a real month that is not before `now`'s month. */
export function isExpiryValid(value: string, now: Date = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

export function isCvcValid(value: string, brand: CardBrand): boolean {
  const digits = value.replace(/\s/g, "");
  return /^\d+$/.test(digits) && digits.length === (brand === "amex" ? 4 : 3);
}

/** The last four digits, for the review step and the receipt. Never keep more than this. */
export const lastFour = (input: string) => cardDigits(input).slice(-4);
