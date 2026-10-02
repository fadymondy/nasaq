import type { PromoApplied, PromoLike } from "../loyalty-promo";
import type { CommerceShippingMethod } from "./commerce";

/** What the shipping estimator reports: the matched zone and the chosen method. */
export interface StoreShippingSelection {
  city: string;
  zoneId: string;
  zoneLabel: string;
  method: CommerceShippingMethod;
}

export interface StoreCartPromo {
  applied?: PromoApplied | null;
  /** Local rules; the code is checked here, then `onApplied` is called. */
  promos?: readonly PromoLike[];
  /** Or check the code with your server. */
  onApply?: (code: string) => Promise<void | { error?: string }>;
  onApplied?: (applied: PromoApplied) => void;
  onRemove?: () => void;
  /** "YYYY-MM-DD" for the date rules. Default today. */
  today?: string;
  firstOrder?: boolean;
}
