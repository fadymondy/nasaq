import type { StatusTone } from "../status";
import type { PaymentVerification } from "./payment-logic";

/** The Status tone of each verification state. */
export const PAYMENT_STATUS_TONE: Record<PaymentVerification, StatusTone> = {
  unpaid: "neutral",
  submitted: "info",
  verifying: "warning",
  verified: "success",
  rejected: "danger",
};
