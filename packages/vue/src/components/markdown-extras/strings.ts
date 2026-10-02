import { computed } from "vue";
import { useNasaq } from "../../provider";

const STRINGS = {
  en: {
    filter: "Filter rows",
    clearFilter: "Clear filter",
    sortBy: "Sort by {column}",
    rowCount: "{shown} of {total} rows",
    noMatch: "No rows match “{query}”.",
    downloadCsv: "Download CSV",
    downloadCode: "Download file",
    lineNumbers: "Line numbers",
    properties: "Properties",
    yes: "Yes",
    no: "No",
    sorted: "Sorted by {column}, {direction}",
    ascending: "ascending",
    descending: "descending",
    table: "Table",
  },
  ar: {
    filter: "تصفية الصفوف",
    clearFilter: "مسح التصفية",
    sortBy: "ترتيب حسب {column}",
    rowCount: "{shown} من {total} صفًا",
    noMatch: "لا صفوف تطابق «{query}».",
    downloadCsv: "تنزيل CSV",
    downloadCode: "تنزيل الملف",
    lineNumbers: "أرقام الأسطر",
    properties: "الخصائص",
    yes: "نعم",
    no: "لا",
    sorted: "مرتب حسب {column}، {direction}",
    ascending: "تصاعديًا",
    descending: "تنازليًا",
    table: "جدول",
  },
};

/** String overrides for the Markdown extras. */
export type MarkdownExtrasLabels = Partial<(typeof STRINGS)["en"]>;

/** Built-in strings by the Nasaq locale, with the caller's overrides on top. */
export function useExtrasStrings(labels: () => MarkdownExtrasLabels | undefined) {
  const nq = useNasaq();
  const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels() }));
  return { locale: computed(() => nq.locale.value), t };
}

export const fillExtras = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
