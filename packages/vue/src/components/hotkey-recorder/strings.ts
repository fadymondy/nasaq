export const STRINGS = {
  en: {
    notSet: "Not set",
    press: "Press the keys",
    pressSequence: "Press the keys, then Enter",
    escHint: "Esc cancels",
    record: "Record a shortcut",
    change: "Change shortcut",
    clear: "Clear shortcut",
    reset: "Reset to default",
    resetAll: "Reset all",
    saved: "Shortcut set to {shortcut}",
    cleared: "Shortcut cleared",
    recording: "Recording. Press the shortcut you want.",
    duplicate: "Already used by {label}.",
    shadows: "Would block {label}, which starts the same way.",
    shadowed: "Would never run: {label} uses the first keys.",
    browser: "The browser keeps this shortcut. Choose another.",
    system: "The operating system keeps this shortcut. Choose another.",
    modifierRequired: "Add Ctrl, Alt or Command: a bare key would fire while you type.",
    invalid: "That is not a usable shortcut.",
    sequenceNotAllowed: "Use one key combination, not a sequence.",
    tooLong: "That sequence is too long.",
    empty: "Press a key to record it.",
    then: "then",
    defaultIs: "Default",
  },
  ar: {
    notSet: "غير محدد",
    press: "اضغط المفاتيح",
    pressSequence: "اضغط المفاتيح ثم Enter",
    escHint: "Esc للإلغاء",
    record: "سجّل اختصارًا",
    change: "غيّر الاختصار",
    clear: "امسح الاختصار",
    reset: "إعادة إلى الافتراضي",
    resetAll: "إعادة الكل",
    saved: "تم تعيين الاختصار إلى {shortcut}",
    cleared: "تم مسح الاختصار",
    recording: "جارٍ التسجيل. اضغط الاختصار الذي تريده.",
    duplicate: "مستخدم بالفعل في {label}.",
    shadows: "سيعطّل {label} لأنه يبدأ بالمفاتيح نفسها.",
    shadowed: "لن يعمل أبدًا: {label} يستخدم المفاتيح الأولى.",
    browser: "المتصفح يحتفظ بهذا الاختصار. اختر غيره.",
    system: "نظام التشغيل يحتفظ بهذا الاختصار. اختر غيره.",
    modifierRequired: "أضف Ctrl أو Alt أو Command: المفتاح وحده يعمل أثناء الكتابة.",
    invalid: "هذا اختصار غير صالح.",
    sequenceNotAllowed: "استخدم مجموعة مفاتيح واحدة وليس تسلسلًا.",
    tooLong: "التسلسل طويل جدًا.",
    empty: "اضغط مفتاحًا لتسجيله.",
    then: "ثم",
    defaultIs: "الافتراضي",
  },
};
export type HotkeyRecorderLabels = Partial<typeof STRINGS.en>;

export const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

/** Another binding, with a name to show when it clashes. */
export interface HotkeyRecorderBinding {
  id: string;
  shortcut: string;
  label: string;
}

export interface HotkeyBindingItem {
  id: string;
  label: string;
  labelAr?: string;
  description?: string;
  descriptionAr?: string;
  /** Section heading. Items with the same group sit together, in first-seen order. */
  group?: string;
  groupAr?: string;
  /** The current shortcut, or null when none is set. */
  shortcut: string | null;
  /** What Reset goes back to. */
  defaultShortcut?: string | null;
  /** Shown but not editable (Esc closes dialogs). */
  locked?: boolean;
}

export const pick = (en: string | undefined, ar: string | undefined, locale: string) => (locale.startsWith("ar") ? ar || en : en || ar) ?? "";
