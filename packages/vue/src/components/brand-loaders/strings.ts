import { computed } from "vue";
import { useAuthLocale } from "../auth-layout/auth-utils";

const STRINGS = {
  en: {
    loading: "Loading",
    starting: "Getting things ready",
    slow: "This is taking longer than usual. Still trying.",
    failedTitle: "Could not start",
    failedBody: "We could not finish starting. Try again. If it keeps failing, send the details below to support.",
    retry: "Try again",
    details: "Details",
    copyDetails: "Copy details",
  },
  ar: {
    loading: "جارٍ التحميل",
    starting: "جارٍ تجهيز كل شيء",
    slow: "يستغرق هذا وقتًا أطول من المعتاد. ما زلنا نحاول.",
    failedTitle: "تعذّر البدء",
    failedBody: "لم نتمكن من إكمال التشغيل. حاول مرة أخرى، وإن استمر الفشل أرسل التفاصيل أدناه إلى الدعم.",
    retry: "حاول مرة أخرى",
    details: "التفاصيل",
    copyDetails: "نسخ التفاصيل",
  },
};

export type BrandLoadersLabels = (typeof STRINGS)["en"];

export function useBrandLoaderStrings() {
  const locale = useAuthLocale();
  return computed(() => STRINGS[locale.value]);
}
