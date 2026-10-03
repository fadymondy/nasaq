// Helpers for the filter chips: the human label of one applied filter, and a minor-unit money formatter.
import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import { listingToMajor, type ListingChip, type ListingLabelIndex } from "./listing-model";
import { currencyDigits, fillTemplate, type ListingStrings } from "./listing-strings";

/** Whole-unit money formatter for minor-unit amounts, Latin digits, in the active locale. */
export function useStoreMoney(currency: () => string): ComputedRef<(minor: number) => string> {
  const nq = useNasaq();
  return computed(() => {
    const code = currency();
    const digits = currencyDigits(code);
    const nf = new Intl.NumberFormat(`${nq.locale.value}-u-nu-latn`, { style: "currency", currency: code, maximumFractionDigits: 0 });
    return (minor: number) => nf.format(listingToMajor(minor, digits));
  });
}

/** Human label of one applied filter, for chips. */
export function storeChipLabel(chip: ListingChip, index: ListingLabelIndex, t: ListingStrings, money: (minor: number) => string, fmt: (n: number) => string): string {
  switch (chip.kind) {
    case "query":
      return `“${chip.value}”`;
    case "category":
      return index.categories.get(chip.value) ?? chip.value;
    case "brand":
      return chip.value;
    case "option":
      return index.options.get(chip.optionId)?.values.get(chip.value)?.label ?? chip.value;
    case "price":
      return `${money(chip.value[0])} – ${money(chip.value[1])}`;
    case "rating":
      return fillTemplate(t.andUp, { n: fmt(chip.value) });
    case "stock":
      return t.inStock;
    case "sale":
      return t.onSale;
  }
}
