import { commerceMinorFactor as storeMinorFactor } from "../../lib/commerce";
import { Num } from "../numeric";

/** Minor units ("piasters") shown as money in the store's currency, with the Nasaq digit set and a bidi isolate. */
export function StoreMoney({ amount, currency, className, negative = false }: { amount: number; currency: string; className?: string; negative?: boolean }) {
  const digits = Math.log10(storeMinorFactor(currency));
  const major = (negative ? -Math.abs(amount) : amount) / storeMinorFactor(currency);
  return <Num value={major} format={{ style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }} className={className} />;
}

/** The order's money as a plain string for a `title` or a CSV-free label. */
export const storeMinorToMajor = (amount: number, currency: string) => amount / storeMinorFactor(currency);
