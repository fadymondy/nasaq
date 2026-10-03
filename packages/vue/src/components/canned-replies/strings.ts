import type { CannedReplyIssue } from "./canned-replies-logic";

export const CANNED_STRINGS = {
  en: {
    label: "Canned replies",
    search: "Search replies…",
    shortcut: "Shortcut",
    title: "Title",
    body: "Reply",
    uses: "Uses",
    updated: "Updated",
    add: "New reply",
    edit: "Edit",
    duplicate: "Duplicate",
    remove: "Delete",
    empty: "No canned replies yet",
    emptyHint: "Save the answers you type again and again, and insert them with a slash.",
    dialogNew: "New canned reply",
    dialogEdit: "Edit canned reply",
    dialogHint: "Type the shortcut after a slash in any composer to insert the reply.",
    shortcutHint: "Letters, digits, hyphen. Typed after /.",
    titleHint: "Only your team sees this.",
    bodyHint: "Insert a variable and it is filled in for each conversation.",
    variables: "Variables",
    insertVariable: (label: string) => `Insert ${label}`,
    preview: "Preview",
    previewHint: "With sample values",
    save: "Save reply",
    cancel: "Cancel",
    removeTitle: (title: string) => `Delete “${title}”?`,
    removeBody: "It disappears for everyone on your team. Messages already sent are not changed.",
    failed: "That did not work. Try again.",
    issues: {
      "title-empty": "Give the reply a title.",
      "shortcut-empty": "Add a shortcut.",
      "shortcut-duplicate": "Another reply already uses this shortcut.",
      "body-empty": "Write the reply.",
      "variable-unknown": "The reply uses a variable that does not exist.",
    } as Record<CannedReplyIssue, string>,
    variableNames: { name: "Name", agent: "Agent", company: "Company" } as Record<string, string>,
  },
  ar: {
    label: "الردود الجاهزة",
    search: "ابحث في الردود…",
    shortcut: "الاختصار",
    title: "العنوان",
    body: "الرد",
    uses: "مرات الاستخدام",
    updated: "آخر تعديل",
    add: "رد جديد",
    edit: "تعديل",
    duplicate: "تكرار",
    remove: "حذف",
    empty: "لا توجد ردود جاهزة بعد",
    emptyHint: "احفظ الإجابات التي تكتبها مرارًا، وأدرجها بشرطة مائلة.",
    dialogNew: "رد جاهز جديد",
    dialogEdit: "تعديل الرد الجاهز",
    dialogHint: "اكتب الاختصار بعد شرطة مائلة في أي مربع كتابة لإدراج الرد.",
    shortcutHint: "حروف وأرقام وشرطة. يُكتب بعد /.",
    titleHint: "يراه فريقك فقط.",
    bodyHint: "أدرج متغيرًا ليُملأ تلقائيًا في كل محادثة.",
    variables: "المتغيرات",
    insertVariable: (label: string) => `إدراج ${label}`,
    preview: "معاينة",
    previewHint: "بقيم تجريبية",
    save: "حفظ الرد",
    cancel: "إلغاء",
    removeTitle: (title: string) => `حذف «${title}»؟`,
    removeBody: "يختفي عن كل أعضاء فريقك. الرسائل المرسلة لا تتغير.",
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    issues: {
      "title-empty": "أعطِ الرد عنوانًا.",
      "shortcut-empty": "أضف اختصارًا.",
      "shortcut-duplicate": "يستخدم رد آخر هذا الاختصار.",
      "body-empty": "اكتب الرد.",
      "variable-unknown": "يستخدم الرد متغيرًا غير موجود.",
    } as Record<CannedReplyIssue, string>,
    variableNames: { name: "الاسم", agent: "الموظف", company: "الشركة" } as Record<string, string>,
  },
};

export type CannedRepliesLabels = Omit<typeof CANNED_STRINGS.en, "issues" | "variableNames"> & { issues: Record<CannedReplyIssue, string>; variableNames: Record<string, string> };
export type CannedRepliesLabelOverrides = Partial<Omit<CannedRepliesLabels, "issues" | "variableNames">> & { issues?: Partial<CannedRepliesLabels["issues"]> };

export function cannedStrings(locale: string, labels?: CannedRepliesLabelOverrides): CannedRepliesLabels {
  const base = CANNED_STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...labels, issues: { ...base.issues, ...labels?.issues }, variableNames: base.variableNames };
}

/** A saved reply. Structurally a `CannedSnippet`, so the same list feeds the Inbox composer's `/` menu. */
export interface CannedReply {
  id: string;
  /** Typed after `/`, e.g. "refund". */
  shortcut: string;
  title: string;
  /** May contain `{{name}}`-style variables. */
  body: string;
  uses?: number;
  updatedAt?: Date | string | number | null;
}

export interface CannedReplyVariable {
  /** The name inside `{{ }}`. */
  key: string;
  label: string;
  /** Used in the preview. */
  sample: string;
}

export type CannedReplyResult = void | { error?: string };
