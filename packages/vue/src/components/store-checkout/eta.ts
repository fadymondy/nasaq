import { formatDateRange } from "../numeric";
import { etaWindow } from "./checkout-machine";
import type { CommerceShippingMethod } from "./commerce";
import type { StoreCheckoutStrings } from "./strings";

/** "Arrives Sep 30 - Oct 2" for a shipping method; the same-day wording for one day; undefined without an ETA. */
export function storeShippingEta(method: CommerceShippingMethod, now: Date, weekend: readonly number[], locale: string, t: StoreCheckoutStrings): string | undefined {
  if (!method.etaDays) return undefined;
  if (method.etaDays[1] <= 1) return t.arrivesToday;
  const { start, end } = etaWindow(method.etaDays, now, weekend);
  return t.arrives(formatDateRange(start, end, locale, { month: "short", day: "numeric", timeZone: "UTC" }));
}
