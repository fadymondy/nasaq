import type { PaymentFormValue } from "../checkout-steps";
import type { CheckoutData, CheckoutSummary } from "./checkout-machine";
import type { CommerceCartLine, CommerceOrder, CommerceShippingMethod } from "./commerce";

export interface StoreCheckoutDraft {
  /** Contact, addresses (normalised, phone in international form), shipping method id, payment choice, notes and gift. */
  data: CheckoutData;
  /** The lines being bought (saved-for-later ones left out). */
  lines: CommerceCartLine[];
  summary: CheckoutSummary;
  shippingMethod: CommerceShippingMethod | undefined;
  /** The card fields when paying by card. Send them to your payment provider; never log or store them. */
  card?: PaymentFormValue;
  /** The order this checkout produces, as a pending order without a number. */
  order: CommerceOrder;
  /** How many times this order was sent (1 on the first try). */
  attempt: number;
}

export type StorePlaceOrderResult = void | { error?: string; orderNumber?: string; order?: CommerceOrder };
