import { minorToMajor } from "../currency-input";
import type { PaymentFee, PaymentVerification } from "./payment-logic";
import type { LocalPaymentDetail, LocalPaymentKind } from "./strings";

export interface LocalPaymentMethod {
  id: string;
  /** The name people know it by, shown as text: "InstaPay", "Vodafone Cash". With a `mark` slot the name stays as screen-reader text. */
  name: string;
  kind: LocalPaymentKind;
  description?: string;
  /** Where to send the money: an IPA address, a wallet number, an IBAN. Values stay left to right. */
  details: readonly LocalPaymentDetail[];
  /** Numbered instructions, in order. */
  steps?: readonly string[];
  /** A QR payload for methods that can be scanned. */
  qr?: string;
  fee?: PaymentFee;
  /** Limits in minor units. Outside them the method cannot be used. */
  min?: number;
  max?: number;
}

export interface LocalPaymentSubmission {
  methodId: string;
  reference: string;
  receiptName?: string;
  status: PaymentVerification;
  submittedAt?: Date | number | string;
  /** Why a receipt was rejected. */
  rejectionReason?: string;
}

export interface LocalPaymentInput {
  methodId: string;
  /** Normalised: upper case, Latin digits. */
  reference: string;
  /** The receipt file, or null when the method does not need one. */
  receipt: File | null;
  /** The invoice amount, minor units. */
  amount: number;
  fee: number;
  /** `amount + fee`, what the customer sends. */
  total: number;
}

export interface PaymentSubmission {
  id: string;
  customer: string;
  methodName: string;
  /** Minor units. */
  amount: number;
  currency: string;
  reference: string;
  receiptName?: string;
  /** Where the receipt can be opened. */
  receiptUrl?: string;
  submittedAt: Date | number | string;
  status: PaymentVerification;
}

/** Resolve `{ error }` to show a message. */
export type LocalPaymentsResult = void | { error?: string };

export function paymentErrorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export function fmtPaymentMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(minorToMajor(minor, currency));
}
