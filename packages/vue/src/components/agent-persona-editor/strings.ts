import { computed } from "vue";
import { useNasaq } from "../../provider";

export const PERSONA_STRINGS = {
  en: {
    label: "Agent persona",
    identity: "Identity",
    name: "Name",
    namePlaceholder: "Support agent",
    nameRequired: "Give the agent a name.",
    tagline: "Tagline",
    taglinePlaceholder: "Answers billing questions",
    color: "Colour",
    icon: "Icon",
    model: "Model",
    traits: "Traits",
    traitsHint: "Short words for how the agent comes across. Press Enter to add one.",
    traitsPlaceholder: "Add a trait",
    greeting: "Greeting",
    greetingHint: "The first thing the agent says.",
    persona: "Persona",
    personaHint: "Who the agent is and how it behaves, in Markdown. This is added to its instructions.",
    write: "Write",
    preview: "Preview",
    previewEmpty: "Nothing to preview yet.",
    personaTooLong: (max: string) => `Keep the persona under ${max} characters.`,
    insert: "Add a section",
    sections: ["Role", "Tone", "Rules", "Boundaries"],
    words: (n: string) => `${n} words`,
    chars: (n: string, max: string) => `${n} of ${max}`,
    save: "Save persona",
    saving: "Saving",
    revert: "Revert",
    unsaved: "Unsaved changes",
    saved: "Saved.",
    saveFailed: "The persona could not be saved. Try again.",
    previewTitle: "How it looks",
    unnamed: "Unnamed agent",
  },
  ar: {
    label: "شخصية الوكيل",
    identity: "الهوية",
    name: "الاسم",
    namePlaceholder: "وكيل الدعم",
    nameRequired: "أعطِ الوكيل اسمًا.",
    tagline: "الوصف المختصر",
    taglinePlaceholder: "يجيب عن أسئلة الفواتير",
    color: "اللون",
    icon: "الأيقونة",
    model: "النموذج",
    traits: "السمات",
    traitsHint: "كلمات قصيرة تصف طريقة الوكيل. اضغط Enter لإضافة سمة.",
    traitsPlaceholder: "أضف سمة",
    greeting: "التحية",
    greetingHint: "أول ما يقوله الوكيل.",
    persona: "الشخصية",
    personaHint: "من هو الوكيل وكيف يتصرف، بصيغة Markdown. تُضاف إلى تعليماته.",
    write: "كتابة",
    preview: "معاينة",
    previewEmpty: "لا شيء للمعاينة بعد.",
    personaTooLong: (max: string) => `اجعل الشخصية أقل من ${max} حرف.`,
    insert: "إضافة قسم",
    sections: ["الدور", "النبرة", "القواعد", "الحدود"],
    words: (n: string) => `${n} كلمة`,
    chars: (n: string, max: string) => `${n} من ${max}`,
    save: "حفظ الشخصية",
    saving: "جارٍ الحفظ",
    revert: "تراجع",
    unsaved: "تغييرات غير محفوظة",
    saved: "تم الحفظ.",
    saveFailed: "تعذر حفظ الشخصية. حاول مرة أخرى.",
    previewTitle: "كيف تبدو",
    unnamed: "وكيل بلا اسم",
  },
};

export type AgentPersonaEditorLabels = typeof PERSONA_STRINGS.en;

export interface AgentPersona {
  name: string;
  tagline?: string;
  /** A hex colour or a `--nq-tag-*` custom property name, as `NqColorPicker` returns it. */
  color: string;
  /** A kebab-case icon name from the icon picker, such as `bot` or `headphones`. */
  icon: string;
  /** The persona as Markdown. */
  persona: string;
  /** Short words for the agent manner. */
  traits: readonly string[];
  /** Model id, one of `models`. */
  model?: string;
  greeting?: string;
}

export interface AgentPersonaModel {
  id: string;
  label: string;
  description?: string;
}

export type AgentPersonaSaveResult = void | { error?: string };

export function usePersonaStrings(labels: () => Partial<AgentPersonaEditorLabels> | undefined) {
  const nq = useNasaq();
  const locale = computed(() => nq.locale.value);
  const t = computed(() => ({ ...PERSONA_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...labels() }) as AgentPersonaEditorLabels);
  return { locale, t };
}
