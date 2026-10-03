import { computed } from "vue";
import { useNasaq } from "../../provider";

export const STRINGS = {
  en: {
    pro: "Pro",
    upgrade: "Upgrade",
    upgradeNow: "Upgrade now",
    upgradeTo: (name: string) => `Upgrade to ${name}`,
    later: "Maybe later",
    dismiss: "Dismiss",
    cancelAnytime: "Cancel anytime. Your data stays yours.",
    endsIn: "Ends in",
    days: "d",
    locked: "Locked",
    unlock: "Unlock with an upgrade",
    seePlans: "See plans",
  },
  ar: {
    pro: "احترافي",
    upgrade: "ترقية",
    upgradeNow: "رقِّ الآن",
    upgradeTo: (name: string) => `الترقية إلى ${name}`,
    later: "ربما لاحقًا",
    dismiss: "إخفاء",
    cancelAnytime: "ألغِ في أي وقت. بياناتك تبقى لك.",
    endsIn: "ينتهي خلال",
    days: "ي",
    locked: "مقفل",
    unlock: "افتحها بالترقية",
    seePlans: "عرض الخطط",
  },
};

export type UpgradeLabels = Partial<typeof STRINGS.en>;

/** The built-in strings for the active locale (Arabic under an Arabic provider) with any overrides on top. */
export function useUpgradeStrings(labels?: () => UpgradeLabels | undefined) {
  const nq = useNasaq();
  const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }));
  return { t };
}
