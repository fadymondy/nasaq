export const STRINGS = {
  en: {
    list: "Versions",
    title: "Version history",
    version: (n: string) => `Version ${n}`,
    current: "Current",
    by: (name: string) => `by ${name}`,
    none: "No versions yet",
    noneBody: "Every save will show up here, newest first.",
    pick: "Choose a version",
    pickBody: "Pick a version to read it, compare it and restore it.",
    back: "Back to versions",
    preview: "Preview",
    changes: "Changes",
    readOnly: "Read only",
    compareWith: "Compare with",
    previous: "Previous version",
    currentVersion: "Current version",
    noPrevious: "This is the first version. There is nothing to compare it with.",
    identical: "No differences.",
    added: (n: string) => `${n} added`,
    removed: (n: string) => `${n} removed`,
    unchanged: (n: string) => `${n} unchanged lines`,
    lineAdded: "Added",
    lineRemoved: "Removed",
    restore: "Restore this version",
    restoring: "Restoring",
    restoreTitle: (n: string) => `Restore version ${n}?`,
    restoreBody: "Restoring saves it as a new version on top. Nothing is deleted, and you can go back.",
    restoreConfirm: "Restore",
    cancel: "Cancel",
    diffLabel: "Differences",
  },
  ar: {
    list: "النسخ",
    title: "سجل النسخ",
    version: (n: string) => `النسخة ${n}`,
    current: "الحالية",
    by: (name: string) => `بواسطة ${name}`,
    none: "لا نسخ بعد",
    noneBody: "ستظهر كل عملية حفظ هنا، الأحدث أولًا.",
    pick: "اختر نسخة",
    pickBody: "اختر نسخة لقراءتها ومقارنتها واستعادتها.",
    back: "العودة إلى النسخ",
    preview: "معاينة",
    changes: "التغييرات",
    readOnly: "للقراءة فقط",
    compareWith: "قارن مع",
    previous: "النسخة السابقة",
    currentVersion: "النسخة الحالية",
    noPrevious: "هذه أول نسخة، فلا شيء لمقارنتها به.",
    identical: "لا اختلافات.",
    added: (n: string) => `${n} مضاف`,
    removed: (n: string) => `${n} محذوف`,
    unchanged: (n: string) => `${n} أسطر دون تغيير`,
    lineAdded: "مضاف",
    lineRemoved: "محذوف",
    restore: "استعادة هذه النسخة",
    restoring: "جارٍ الاستعادة",
    restoreTitle: (n: string) => `استعادة النسخة ${n}؟`,
    restoreBody: "تُحفظ الاستعادة كنسخة جديدة فوق الحالية. لا يُحذف شيء ويمكنك الرجوع.",
    restoreConfirm: "استعادة",
    cancel: "إلغاء",
    diffLabel: "الاختلافات",
  },
};

export type VersionHistoryLabels = Partial<(typeof STRINGS)["en"]>;

export interface HistoryVersion {
  id: string;
  /** Sequence number shown to people: 1, 2, 3. */
  version: number;
  savedAt: Date | number | string;
  author?: string;
  /** What changed, in the author's words. */
  note?: string;
  /** The saved content as text: JSON, Markdown, code. */
  content: string;
}
