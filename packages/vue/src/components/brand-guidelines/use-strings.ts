import { computed, type Ref } from "vue";
import { useNasaq } from "../../provider";
import { BRAND_STRINGS, type BrandGuidelinesLabels, type BrandStrings } from "./strings";

/** The active strings, with any `labels` overrides applied. */
export function useBrandStrings(labels?: () => BrandGuidelinesLabels | undefined): Ref<BrandStrings> {
  const nq = useNasaq();
  return computed(() => ({ ...BRAND_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }) as BrandStrings);
}
