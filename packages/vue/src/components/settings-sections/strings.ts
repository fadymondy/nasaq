// Built-in strings and the search helpers, shared by the component and its test.
import { normalizeForSearch } from "../commands";

export const STRINGS = {
  en: {
    title: "Settings",
    description: "Manage your workspace, grouped by topic.",
    nav: "Settings sections",
    search: "Search settings…",
    searchLabel: "Search settings",
    clear: "Clear search",
    results: (n: string) => (n === "1" ? "1 result" : `${n} results`),
    noResults: "No settings match",
    unsaved: (n: string) => (n === "1" ? "1 unsaved change" : `${n} unsaved changes`),
    unsavedSome: "You have unsaved changes",
    save: "Save changes",
    discard: "Discard",
    saving: "Saving…",
    saved: "All changes saved",
    failed: "Could not save your changes. Try again.",
    section: "Section",
  },
  ar: {
    title: "الإعدادات",
    description: "أدِر مساحة عملك، مجمّعة حسب الموضوع.",
    nav: "أقسام الإعدادات",
    search: "ابحث في الإعدادات…",
    searchLabel: "البحث في الإعدادات",
    clear: "مسح البحث",
    results: (n: string) => (n === "1" ? "نتيجة واحدة" : `${n} نتائج`),
    noResults: "لا توجد إعدادات مطابقة",
    unsaved: (n: string) => (n === "1" ? "تغيير واحد غير محفوظ" : `${n} تغييرات غير محفوظة`),
    unsavedSome: "لديك تغييرات غير محفوظة",
    save: "حفظ التغييرات",
    discard: "تجاهل",
    saving: "جارٍ الحفظ…",
    saved: "تم حفظ كل التغييرات",
    failed: "تعذّر حفظ تغييراتك. حاول مرة أخرى.",
    section: "القسم",
  },
};

export type SettingsSectionsLabels = Partial<typeof STRINGS.en>;

export const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

/** One individual setting inside a section. Listing it makes search find it. */
export interface SettingsEntry {
  /** Matches `data-setting-id` on the element in your content, so the page scrolls to it. */
  id: string;
  label: string;
  description?: string;
  keywords?: readonly string[];
}

export interface SettingsPage {
  id: string;
  label: string;
  description?: string;
  /** A component (a lucide icon) rendered before the label. */
  icon?: object | ((...args: never[]) => unknown);
  /** Extra words that find this page. */
  keywords?: readonly string[];
  /** The individual settings on the page, for search. */
  entries?: readonly SettingsEntry[];
  tone?: "default" | "danger";
}

export interface SettingsGroup {
  id: string;
  label: string;
  pages: readonly SettingsPage[];
}

export interface SettingsSaveResult {
  error?: string;
}

export interface SettingsHit {
  key: string;
  pageId: string;
  entryId?: string;
  title: string;
  description?: string;
  path: string;
}

/** Finds pages and single settings for a (normalised) query. */
export function searchSettings(groups: readonly SettingsGroup[], q: string): SettingsHit[] {
  if (!q) return [];
  const out: SettingsHit[] = [];
  for (const group of groups) {
    for (const page of group.pages) {
      const pageHay = normalizeForSearch([page.label, page.description, group.label, ...(page.keywords ?? [])].filter(Boolean).join(" "));
      if (pageHay.includes(q)) out.push({ key: page.id, pageId: page.id, title: page.label, description: page.description, path: group.label });
      for (const entry of page.entries ?? []) {
        const hay = normalizeForSearch([entry.label, entry.description, ...(entry.keywords ?? [])].filter(Boolean).join(" "));
        if (hay.includes(q)) {
          out.push({ key: `${page.id}:${entry.id}`, pageId: page.id, entryId: entry.id, title: entry.label, description: entry.description, path: `${group.label} › ${page.label}` });
        }
      }
    }
  }
  return out;
}

export const navItem = [
  "flex h-nav-row w-full min-h-[var(--nq-touch-min,0px)] items-center gap-2.5 rounded-control px-3 text-start text-body-sm text-muted-foreground outline-none",
  "transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
  "data-[active=true]:bg-nq-selected data-[active=true]:font-medium data-[active=true]:text-foreground",
  "[&_svg]:size-4 [&_svg]:shrink-0",
].join(" ");
