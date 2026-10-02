// Strings of the docs shell, English and Arabic (copied from the React STRINGS table), and the template filler.
export const docsShellStrings = {
  en: {
    nav: "Documentation",
    menu: "Open navigation",
    closeMenu: "Close navigation",
    filter: "Filter pages",
    clearFilter: "Clear filter",
    noMatch: "No pages match “{query}”.",
    onThisPage: "On this page",
    copyPage: "Copy page",
    copied: "Copied",
    editPage: "Edit this page",
    updated: "Last updated",
    previous: "Previous",
    next: "Next",
    pager: "Previous and next pages",
    crumbs: "Breadcrumb",
    docs: "Docs",
  },
  ar: {
    nav: "التوثيق",
    menu: "فتح التنقل",
    closeMenu: "إغلاق التنقل",
    filter: "تصفية الصفحات",
    clearFilter: "مسح التصفية",
    noMatch: "لا صفحات تطابق «{query}».",
    onThisPage: "في هذه الصفحة",
    copyPage: "نسخ الصفحة",
    copied: "تم النسخ",
    editPage: "عدّل هذه الصفحة",
    updated: "آخر تحديث",
    previous: "السابق",
    next: "التالي",
    pager: "الصفحتان السابقة والتالية",
    crumbs: "مسار التنقل",
    docs: "التوثيق",
  },
};

export type DocsShellStrings = (typeof docsShellStrings)["en"];
export type DocsShellLabels = Partial<DocsShellStrings>;

export interface DocsPageData {
  /** The page's id in `nav`. */
  id: string;
  title: string;
  description?: string;
  /** Markdown body. `## ` and `### ` headings make the "On this page" rail; `> [!NOTE]` makes callouts. */
  markdown: string;
  /** ISO date of the last change. */
  updated?: string;
  /** Link to edit the page's source. */
  editHref?: string;
}

export const docsShellFill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
