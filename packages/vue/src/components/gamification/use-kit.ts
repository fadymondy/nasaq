import { computed } from "vue";
import { useNasaq } from "../../provider";
import { formatNumber, type FormatNumberOptions } from "../numeric/format";
import { STRINGS, type GamificationLabels } from "./strings";

/** The words, the locale and a number formatter for the provider locale, with `labels` laid over the words. */
export function useKit(labels?: () => Partial<GamificationLabels> | undefined) {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const ar = computed(() => locale.value.startsWith("ar"));
  const t = computed(() => {
    const base = STRINGS[ar.value ? "ar" : "en"];
    const l = labels?.();
    return { ...base, ...l, rarity: { ...base.rarity, ...l?.rarity } } as GamificationLabels;
  });
  const num = (n: number, o?: FormatNumberOptions) => formatNumber(n, locale.value, o);
  return { t, locale, ar, num };
}
