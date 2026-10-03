import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

export const PUBLIC_FORM_STRINGS = {
  en: {
    submit: "Send",
    sending: "Sending",
    choose: "Choose an option",
    optional: "optional",
    closed: "This form is not accepting responses right now.",
    another: "Send another response",
    failed: "Something went wrong. Please try again.",
    errors: { required: "This field is required.", email: "Enter a valid email address.", phone: "Enter a phone number with its country code.", number: "Enter a number." },
    honeypot: "Leave this field empty",
    preview: "Preview: nothing is sent.",
  },
  ar: {
    submit: "إرسال",
    sending: "جارٍ الإرسال",
    choose: "اختر خيارًا",
    optional: "اختياري",
    closed: "هذا النموذج لا يستقبل ردودًا حاليًا.",
    another: "إرسال رد آخر",
    failed: "حدث خطأ. حاول مرة أخرى.",
    errors: { required: "هذا الحقل مطلوب.", email: "أدخل بريدًا إلكترونيًا صحيحًا.", phone: "أدخل رقم هاتف مع رمز الدولة.", number: "أدخل رقمًا." },
    honeypot: "اترك هذا الحقل فارغًا",
    preview: "معاينة: لا يُرسل شيء.",
  },
} as const;

type En = (typeof PUBLIC_FORM_STRINGS)["en"];
export type PublicFormLabels = Partial<{ [K in keyof En]: En[K] extends string ? string : En[K] }>;

export function usePublicFormStrings(locale: () => string | undefined, labels: () => PublicFormLabels | undefined): { locale: ComputedRef<string>; t: ComputedRef<En> } {
  const nq = useNasaq();
  const loc = computed(() => locale() ?? nq.locale.value ?? "en");
  const t = computed(() => ({ ...PUBLIC_FORM_STRINGS[loc.value.startsWith("ar") ? "ar" : "en"], ...labels() }) as En);
  return { locale: loc, t };
}
