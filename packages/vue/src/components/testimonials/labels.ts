import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import type { TestimonialErrorCode } from "./testimonials-logic";

export const TESTIMONIAL_STRINGS = {
  en: {
    name: "Your name",
    role: "Role",
    company: "Company",
    email: "Email",
    emailHint: "Optional. We only use it to thank you.",
    quote: "Your testimonial",
    quoteHint: (max: string) => `Up to ${max} characters.`,
    rating: "Rating",
    stars: (n: number) => `${n} ${n === 1 ? "star" : "stars"}`,
    consent: "You may show my name and words on your website.",
    submit: "Send testimonial",
    thanks: "Thank you! Your testimonial is on its way to be reviewed.",
    another: "Send another",
    empty: "No testimonials yet.",
    previous: "Previous testimonial",
    next: "Next testimonial",
    goTo: (n: number) => `Testimonial ${n}`,
    ratedOutOf: (n: number) => `Rated ${n} out of 5`,
    honeypot: "Leave this field empty",
    errors: {
      name: "Enter your name.",
      "quote-short": "Write a little more.",
      "quote-long": "That is too long.",
      rating: "Pick a rating from 1 to 5.",
      email: "Enter a valid email address.",
      consent: "Please agree so we can show it.",
    } satisfies Record<TestimonialErrorCode, string>,
  },
  ar: {
    name: "اسمك",
    role: "المسمى الوظيفي",
    company: "الشركة",
    email: "البريد الإلكتروني",
    emailHint: "اختياري. نستخدمه لشكرك فقط.",
    quote: "شهادتك",
    quoteHint: (max: string) => `حتى ${max} حرفًا.`,
    rating: "التقييم",
    stars: (n: number) => `${n} ${n === 1 ? "نجمة" : n === 2 ? "نجمتان" : n <= 10 ? "نجوم" : "نجمة"}`,
    consent: "يمكنكم عرض اسمي وكلماتي على موقعكم.",
    submit: "أرسل الشهادة",
    thanks: "شكرًا لك! شهادتك في طريقها إلى المراجعة.",
    another: "إرسال شهادة أخرى",
    empty: "لا شهادات بعد.",
    previous: "الشهادة السابقة",
    next: "الشهادة التالية",
    goTo: (n: number) => `الشهادة ${n}`,
    ratedOutOf: (n: number) => `التقييم ${n} من 5`,
    honeypot: "اترك هذا الحقل فارغًا",
    errors: {
      name: "أدخل اسمك.",
      "quote-short": "اكتب أكثر قليلًا.",
      "quote-long": "النص أطول من المسموح.",
      rating: "اختر تقييمًا من 1 إلى 5.",
      email: "أدخل بريدًا إلكترونيًا صحيحًا.",
      consent: "يرجى الموافقة لنتمكن من عرضها.",
    } satisfies Record<TestimonialErrorCode, string>,
  },
};

type En = (typeof TESTIMONIAL_STRINGS)["en"];
export type TestimonialLabels = Partial<{ [K in keyof En]: En[K] extends string ? string : En[K] }>;

export function useTestimonialStrings(locale: () => string | undefined, labels: () => TestimonialLabels | undefined): { locale: ComputedRef<string>; t: ComputedRef<En> } {
  const nq = useNasaq();
  const loc = computed(() => locale() ?? nq.locale.value ?? "en");
  const t = computed(() => ({ ...TESTIMONIAL_STRINGS[loc.value.startsWith("ar") ? "ar" : "en"], ...labels() }) as En);
  return { locale: loc, t };
}
