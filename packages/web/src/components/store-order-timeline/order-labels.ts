/*
 * Shared words for order, payment and fulfilment states, in English and Arabic, and the chip variant each one uses.
 * Used by the customer account and the store admin so the two sides never disagree. The maps live in the shared
 * model (lib/commerce.ts) so a consumer can label orders without the timeline component; these are the same objects.
 */
import {
  COMMERCE_FULFILMENT_LABEL,
  COMMERCE_FULFILMENT_VARIANT,
  COMMERCE_ORDER_STATUS_LABEL,
  COMMERCE_ORDER_STATUS_VARIANT,
  COMMERCE_PAYMENT_LABEL,
  COMMERCE_PAYMENT_VARIANT,
  type CommerceChipVariant,
} from "../../lib/commerce";

export type OrderChipVariant = CommerceChipVariant;
export const ORDER_STATUS_LABEL = COMMERCE_ORDER_STATUS_LABEL;
export const ORDER_STATUS_VARIANT = COMMERCE_ORDER_STATUS_VARIANT;
export const PAYMENT_LABEL = COMMERCE_PAYMENT_LABEL;
export const PAYMENT_VARIANT = COMMERCE_PAYMENT_VARIANT;
export const FULFILMENT_LABEL = COMMERCE_FULFILMENT_LABEL;
export const FULFILMENT_VARIANT = COMMERCE_FULFILMENT_VARIANT;
