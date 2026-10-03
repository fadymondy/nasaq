import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

export const MOBILE_NAV_STRINGS = {
  en: { navigation: "Main navigation", filters: "Filters" },
  ar: { navigation: "التنقل الرئيسي", filters: "التصفية" },
};

export type MobileNavLabels = Partial<(typeof MOBILE_NAV_STRINGS)["en"]>;

export function useMobileNav(labels?: () => MobileNavLabels | undefined): { t: ComputedRef<(typeof MOBILE_NAV_STRINGS)["en"]>; rtl: ComputedRef<boolean> } {
  const nq = useNasaq();
  const ar = computed(() => nq.locale.value.startsWith("ar"));
  const rtl = computed(() => nq.direction.value === "rtl");
  const t = computed(() => ({ ...MOBILE_NAV_STRINGS[ar.value ? "ar" : "en"], ...labels?.() }));
  return { t, rtl };
}
