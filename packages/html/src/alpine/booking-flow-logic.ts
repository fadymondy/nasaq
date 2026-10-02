/** Pure helpers for BookingFlow: the guest-details and totals parts of booking-flow's booking-math, copied. */

const round2 = (n: number) => Math.round(n * 100) / 100;

export function bookingTotals(price: number | null, taxRate = 0): { subtotal: number; tax: number; total: number } {
  const subtotal = round2(price ?? 0);
  const tax = round2(subtotal * taxRate);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

/** Arabic-Indic and Persian digits to Latin, separators dropped, a leading + kept. */
export function normalizePhone(input: string): string {
  const latin = input.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
  const plus = latin.trim().startsWith("+") ? "+" : "";
  return plus + latin.replace(/\D/g, "");
}

export const isPhoneValid = (input: string) => {
  const digits = normalizePhone(input).replace(/^\+/, "");
  return digits.length >= 8 && digits.length <= 15;
};
export const isEmailValid = (input: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.trim());

export interface DetailsInput {
  name: string;
  phone: string;
  email?: string;
  forOther?: boolean;
  otherName?: string;
}
export type DetailsErrors = { name?: "required"; phone?: "required" | "invalid"; email?: "invalid"; otherName?: "required" };

export function validateDetails(input: DetailsInput): DetailsErrors {
  const errors: DetailsErrors = {};
  if (!input.name.trim()) errors.name = "required";
  if (!input.phone.trim()) errors.phone = "required";
  else if (!isPhoneValid(input.phone)) errors.phone = "invalid";
  if (input.email?.trim() && !isEmailValid(input.email)) errors.email = "invalid";
  if (input.forOther && !input.otherName?.trim()) errors.otherName = "required";
  return errors;
}

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function bookingCode(seed: string, prefix = "BK"): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[h % CODE_ALPHABET.length];
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
  }
  return `${prefix}-${out}`;
}
