// The list's own words, en and ar, copied from packages/web/src/components/env-list/env-list.tsx.
import type { EnvKeyProblem, EnvParseIssue } from "./env-list-format";

export const STRINGS = {
  en: {
    title: "Environment variables",
    description: "Values are hidden until you reveal them.",
    list: "Variables",
    search: "Filter variables",
    environment: "Environment",
    add: "Add variable",
    import: "Import .env",
    exportAll: "Download .env",
    copyAll: "Copy as .env",
    reveal: (key: string) => `Reveal ${key}`,
    hide: (key: string) => `Hide ${key}`,
    copyValue: (key: string) => `Copy value of ${key}`,
    edit: (key: string) => `Edit ${key}`,
    remove: (key: string) => `Delete ${key}`,
    secret: "Secret",
    plain: "Plain",
    hidden: "Value hidden",
    emptyValue: "(empty)",
    emptyTitle: "No variables yet",
    emptyBody: "Add one by hand or paste the contents of a .env file.",
    noMatch: "No variables match your filter.",
    count: (n: number) => (n === 1 ? "1 variable" : `${n} variables`),
    // add / edit
    addTitle: "Add variable",
    editTitle: (key: string) => `Edit ${key}`,
    keyLabel: "Name",
    keyHint: "Letters, digits and underscores. Cannot start with a digit.",
    keyEmpty: "Enter a name.",
    keyInvalid: "Use only letters, digits and underscores, and do not start with a digit.",
    keyDuplicate: "A variable with this name already exists.",
    valueLabel: "Value",
    showValue: "Show value",
    descriptionLabel: "Note (optional)",
    secretLabel: "Secret",
    secretHint: "Mask the value in the list until someone reveals it.",
    save: "Save",
    cancel: "Cancel",
    genericError: "Something went wrong. Try again.",
    // import
    importTitle: "Import from .env",
    importBody: "Paste the contents of a .env file or choose one. Nothing is sent until you import.",
    importLabel: ".env contents",
    importPlaceholder: "API_URL=https://api.example.com\nDATABASE_URL=postgres://...",
    chooseFile: "Choose file",
    found: (n: number) => (n === 1 ? "1 variable found" : `${n} variables found`),
    conflicts: (n: number) => (n === 1 ? "1 already exists" : `${n} already exist`),
    overwrite: "Overwrite existing values",
    skipNote: "Existing variables are skipped unless you overwrite them.",
    pasteDuplicates: (keys: string) => `Repeated in the paste, last value wins: ${keys}`,
    issuesTitle: "Lines that could not be read",
    issue: (i: EnvParseIssue) =>
      i.problem === "invalid-key"
        ? `Line ${i.line}: "${i.key}" is not a valid name`
        : i.problem === "unterminated-quote"
          ? `Line ${i.line}: quote is never closed${i.key ? ` (${i.key})` : ""}`
          : `Line ${i.line}: expected NAME=value`,
    importButton: (n: number) => (n === 1 ? "Import 1 variable" : `Import ${n} variables`),
    // delete
    deleteTitle: (key: string) => `Delete ${key}?`,
    deleteBody: "This removes the variable from this environment. Running deployments keep their current value until they restart.",
    deleteConfirm: "Delete",
    copied: "Copied to clipboard",
  },
  ar: {
    title: "متغيرات البيئة",
    description: "القيم مخفية إلى أن تكشفها.",
    list: "المتغيرات",
    search: "تصفية المتغيرات",
    environment: "البيئة",
    add: "إضافة متغير",
    import: "استيراد .env",
    exportAll: "تنزيل .env",
    copyAll: "نسخ بصيغة .env",
    reveal: (key: string) => `كشف ${key}`,
    hide: (key: string) => `إخفاء ${key}`,
    copyValue: (key: string) => `نسخ قيمة ${key}`,
    edit: (key: string) => `تعديل ${key}`,
    remove: (key: string) => `حذف ${key}`,
    secret: "سرّي",
    plain: "عادي",
    hidden: "القيمة مخفية",
    emptyValue: "(فارغ)",
    emptyTitle: "لا توجد متغيرات بعد",
    emptyBody: "أضف متغيرًا يدويًا أو الصق محتوى ملف .env.",
    noMatch: "لا توجد متغيرات تطابق التصفية.",
    count: (n: number) => (n === 1 ? "متغير واحد" : `${n} متغيرات`),
    addTitle: "إضافة متغير",
    editTitle: (key: string) => `تعديل ${key}`,
    keyLabel: "الاسم",
    keyHint: "أحرف لاتينية وأرقام وشرطات سفلية. لا يبدأ برقم.",
    keyEmpty: "أدخل اسمًا.",
    keyInvalid: "استخدم أحرفًا لاتينية وأرقامًا وشرطات سفلية فقط، ولا تبدأ برقم.",
    keyDuplicate: "يوجد متغير بهذا الاسم بالفعل.",
    valueLabel: "القيمة",
    showValue: "إظهار القيمة",
    descriptionLabel: "ملاحظة (اختياري)",
    secretLabel: "سرّي",
    secretHint: "أخفِ القيمة في القائمة إلى أن يكشفها أحد.",
    save: "حفظ",
    cancel: "إلغاء",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    importTitle: "الاستيراد من ملف .env",
    importBody: "الصق محتوى ملف .env أو اختر ملفًا. لا يُرسل شيء قبل أن تستورد.",
    importLabel: "محتوى ملف .env",
    importPlaceholder: "API_URL=https://api.example.com\nDATABASE_URL=postgres://...",
    chooseFile: "اختيار ملف",
    found: (n: number) => (n === 1 ? "تم العثور على متغير واحد" : `تم العثور على ${n} متغيرات`),
    conflicts: (n: number) => (n === 1 ? "واحد موجود بالفعل" : `${n} موجودة بالفعل`),
    overwrite: "استبدال القيم الموجودة",
    skipNote: "تُتخطى المتغيرات الموجودة ما لم تستبدلها.",
    pasteDuplicates: (keys: string) => `مكررة في النص الملصوق، تُعتمد القيمة الأخيرة: ${keys}`,
    issuesTitle: "أسطر تعذّرت قراءتها",
    issue: (i: EnvParseIssue) =>
      i.problem === "invalid-key"
        ? `السطر ${i.line}: "${i.key}" ليس اسمًا صالحًا`
        : i.problem === "unterminated-quote"
          ? `السطر ${i.line}: علامة الاقتباس غير مغلقة${i.key ? ` (${i.key})` : ""}`
          : `السطر ${i.line}: المتوقع NAME=value`,
    importButton: (n: number) => (n === 1 ? "استيراد متغير واحد" : `استيراد ${n} متغيرات`),
    deleteTitle: (key: string) => `حذف ${key}؟`,
    deleteBody: "يُزال المتغير من هذه البيئة. تحتفظ عمليات النشر الجارية بقيمتها الحالية حتى تُعاد تشغيلها.",
    deleteConfirm: "حذف",
    copied: "تم النسخ إلى الحافظة",
  },
};

export type EnvListLabels = Partial<(typeof STRINGS)["en"]>;
export type EnvListStrings = (typeof STRINGS)["en"];

export function envListStrings(locale: string, labels?: EnvListLabels): EnvListStrings {
  const ar = locale.startsWith("ar");
  return { ...STRINGS[ar ? "ar" : "en"], ...labels } as EnvListStrings;
}

export const keyMessage = (t: EnvListStrings, problem: EnvKeyProblem): string => (problem === "empty" ? t.keyEmpty : problem === "invalid" ? t.keyInvalid : t.keyDuplicate);
