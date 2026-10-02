import { computed } from "vue";
import { useNasaq } from "../../provider";
import { localize, type ArtifactText, type ArtifactTone } from "./artifact-renderer-logic";

const STRINGS = {
  en: {
    invalid: "This content could not be shown",
    unsupported: "Unsupported content",
    yes: "Yes",
    no: "No",
    confirm: "Confirm",
    cancel: "Cancel",
    send: "Send",
    sent: "Sent",
    choose: "Choose an option",
    failed: "That did not work. Try again.",
    htmlAsCode: "HTML from the agent is shown as code. Enable it in a sandbox with allowHtml.",
    htmlFrame: "Content from the agent, in a sandbox",
    source: "Source",
    chartLabel: (title: string) => (title ? `Chart: ${title}` : "Chart"),
    other: "Other",
    tones: { neutral: "Neutral", success: "Good", warning: "Warning", danger: "Critical", info: "Info" } as Record<ArtifactTone, string>,
  },
  ar: {
    invalid: "تعذّر عرض هذا المحتوى",
    unsupported: "محتوى غير مدعوم",
    yes: "نعم",
    no: "لا",
    confirm: "تأكيد",
    cancel: "إلغاء",
    send: "إرسال",
    sent: "تم الإرسال",
    choose: "اختر خيارًا",
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    htmlAsCode: "يُعرض HTML القادم من الوكيل على هيئة شيفرة. فعّله داخل صندوق معزول بالخاصية allowHtml.",
    htmlFrame: "محتوى من الوكيل داخل صندوق معزول",
    source: "المصدر",
    chartLabel: (title: string) => (title ? `مخطط: ${title}` : "مخطط"),
    other: "أخرى",
    tones: { neutral: "محايد", success: "جيد", warning: "تحذير", danger: "حرج", info: "معلومة" } as Record<ArtifactTone, string>,
  },
};

export type ArtifactRendererLabels = (typeof STRINGS)["en"];

/** The built-in strings for the active locale, with `labels` laid over them, and `tx` to pick a `{ en, ar }` text by locale. */
export function useArtifactI18n(labels: () => Partial<ArtifactRendererLabels> | undefined) {
  const nq = useNasaq();
  const t = computed<ArtifactRendererLabels>(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels() }));
  const tx = (v: ArtifactText | undefined) => localize(v, nq.locale.value);
  return { t, tx, locale: nq.locale };
}
