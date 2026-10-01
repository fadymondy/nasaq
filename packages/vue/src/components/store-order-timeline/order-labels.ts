// Copies of the order types and the status words in packages/web/src/lib/commerce.ts that the timeline uses.
export type CommerceOrderStatus =
  | "pending" | "paid" | "processing" | "partially-fulfilled" | "fulfilled"
  | "shipped" | "out-for-delivery" | "delivered" | "cancelled" | "refunded" | "partially-refunded" | "returned";

export type CommercePaymentStatus = "pending" | "authorized" | "paid" | "partially-refunded" | "refunded" | "failed" | "cod";

export interface CommerceOrderEvent {
  at: string;
  kind: string;
  label: string;
  by?: string;
  note?: string;
}

type CommerceChipVariant = "success" | "warning" | "danger" | "info" | "neutral";
type CommerceFulfilmentState = "unfulfilled" | "partial" | "fulfilled" | "none";

const COMMERCE_ORDER_STATUS_LABEL: Record<CommerceOrderStatus, { en: string; ar: string }> = {
  pending: { en: "Pending", ar: "قيد الانتظار" },
  paid: { en: "Paid", ar: "مدفوع" },
  processing: { en: "Processing", ar: "قيد التجهيز" },
  "partially-fulfilled": { en: "Partly shipped", ar: "شُحن جزئيًا" },
  fulfilled: { en: "Fulfilled", ar: "تم التجهيز" },
  shipped: { en: "Shipped", ar: "تم الشحن" },
  "out-for-delivery": { en: "Out for delivery", ar: "في الطريق إليك" },
  delivered: { en: "Delivered", ar: "تم التسليم" },
  cancelled: { en: "Cancelled", ar: "ملغي" },
  refunded: { en: "Refunded", ar: "تم الاسترداد" },
  "partially-refunded": { en: "Partly refunded", ar: "استرداد جزئي" },
  returned: { en: "Returned", ar: "مرتجع" },
};

const COMMERCE_ORDER_STATUS_VARIANT: Record<CommerceOrderStatus, CommerceChipVariant> = {
  pending: "warning",
  paid: "info",
  processing: "info",
  "partially-fulfilled": "info",
  fulfilled: "info",
  shipped: "info",
  "out-for-delivery": "info",
  delivered: "success",
  cancelled: "neutral",
  refunded: "neutral",
  "partially-refunded": "warning",
  returned: "neutral",
};

const COMMERCE_PAYMENT_LABEL: Record<CommercePaymentStatus, { en: string; ar: string }> = {
  pending: { en: "Unpaid", ar: "غير مدفوع" },
  authorized: { en: "Authorised", ar: "محجوز" },
  paid: { en: "Paid", ar: "مدفوع" },
  "partially-refunded": { en: "Partly refunded", ar: "استرداد جزئي" },
  refunded: { en: "Refunded", ar: "تم الاسترداد" },
  failed: { en: "Failed", ar: "فشل الدفع" },
  cod: { en: "Cash on delivery", ar: "الدفع عند الاستلام" },
};

const COMMERCE_PAYMENT_VARIANT: Record<CommercePaymentStatus, CommerceChipVariant> = {
  pending: "warning",
  authorized: "info",
  paid: "success",
  "partially-refunded": "warning",
  refunded: "neutral",
  failed: "danger",
  cod: "info",
};

const COMMERCE_FULFILMENT_LABEL: Record<CommerceFulfilmentState, { en: string; ar: string }> = {
  unfulfilled: { en: "Unfulfilled", ar: "لم يُجهَّز" },
  partial: { en: "Partly fulfilled", ar: "مجهّز جزئيًا" },
  fulfilled: { en: "Fulfilled", ar: "مجهّز" },
  none: { en: "Nothing to ship", ar: "لا شيء للشحن" },
};

const COMMERCE_FULFILMENT_VARIANT: Record<CommerceFulfilmentState, CommerceChipVariant> = {
  unfulfilled: "warning",
  partial: "info",
  fulfilled: "success",
  none: "neutral",
};


export type OrderChipVariant = CommerceChipVariant;
export const ORDER_STATUS_LABEL = COMMERCE_ORDER_STATUS_LABEL;
export const ORDER_STATUS_VARIANT = COMMERCE_ORDER_STATUS_VARIANT;
export const PAYMENT_LABEL = COMMERCE_PAYMENT_LABEL;
export const PAYMENT_VARIANT = COMMERCE_PAYMENT_VARIANT;
export const FULFILMENT_LABEL = COMMERCE_FULFILMENT_LABEL;
export const FULFILMENT_VARIANT = COMMERCE_FULFILMENT_VARIANT;
