/* Pure helpers for manual (local) payment methods: fees, limits, receipt references and the verification steps.
 * Money is an integer in minor units. No React, so it runs under node --test. */

/** Where a manual payment is in its life. */
export type PaymentVerification = "unpaid" | "submitted" | "verifying" | "verified" | "rejected";

export interface PaymentFee {
  /** Percentage in basis points: 150 is 1.5%. */
  percentBps?: number;
  /** A flat fee in minor units, added after the percentage. */
  fixed?: number;
}

/** Half-up integer division. */
const divRound = (numerator: number, denominator: number) => Math.floor((numerator * 2 + denominator) / (denominator * 2));

/** The fee for `amount`: the percentage rounded half up to a whole minor unit, plus the flat fee. */
export function paymentFee(amount: number, fee?: PaymentFee): number {
  if (!fee || amount <= 0) return 0;
  return divRound(amount * (fee.percentBps ?? 0), 10_000) + (fee.fixed ?? 0);
}

/** What the customer transfers: the amount plus the method's fee. */
export const paymentTotal = (amount: number, fee?: PaymentFee): number => amount + paymentFee(amount, fee);

export type PaymentLimitProblem = "min" | "max" | null;

/** Checks the amount against a method's limits, both in minor units and inclusive. */
export function paymentLimit(amount: number, { min, max }: { min?: number; max?: number } = {}): PaymentLimitProblem {
  if (min !== undefined && amount < min) return "min";
  if (max !== undefined && amount > max) return "max";
  return null;
}

/** Tidies a transfer reference: Arabic-Indic digits to Latin, spaces and dashes trimmed at the ends, upper case. */
export function normalizeReference(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
    .trim()
    .replace(/^[-\s]+|[-\s]+$/g, "")
    .toUpperCase();
}

export type ReferenceProblem = "empty" | "short" | "chars" | null;

/** A reference is letters, digits, dashes, slashes or dots, at least `minLength` long (default 6). */
export function referenceProblem(input: string, minLength = 6): ReferenceProblem {
  const ref = normalizeReference(input);
  if (!ref) return "empty";
  if (!/^[A-Z0-9][A-Z0-9\-/.]*$/.test(ref)) return "chars";
  return ref.length < minLength ? "short" : null;
}

/** The steps shown to the customer: 0 submitted, 1 under review, 2 verified. Rejected stays on the review step. */
export function verificationStep(status: PaymentVerification): 0 | 1 | 2 | -1 {
  switch (status) {
    case "unpaid":
      return -1;
    case "submitted":
      return 0;
    case "verifying":
    case "rejected":
      return 1;
    case "verified":
      return 2;
  }
}

/** A receipt can be sent when nothing is with the reviewer yet, or a rejected one is being corrected. */
export const canSubmitReceipt = (status: PaymentVerification): boolean => status === "unpaid" || status === "rejected";

/** A verdict is final: nothing more will change unless the customer sends a new receipt. */
export const isFinalVerification = (status: PaymentVerification): boolean => status === "verified" || status === "rejected";
