import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

export const LEGAL_PAGE_STRINGS = {
  en: {
    documents: "Legal documents",
    onThisPage: "On this page",
    updated: "Last updated",
    effective: "Effective",
    version: "Version {version}",
    draftTitle: "Draft",
    draft: "This document is a draft and is not yet in force.",
    copyLink: "Copy link to this section",
    linkCopied: "Link copied",
  },
  ar: {
    documents: "المستندات القانونية",
    onThisPage: "في هذه الصفحة",
    updated: "آخر تحديث",
    effective: "ساري من",
    version: "الإصدار {version}",
    draftTitle: "مسودة",
    draft: "هذا المستند مسودة وليس ساريًا بعد.",
    copyLink: "انسخ رابط هذا القسم",
    linkCopied: "تم نسخ الرابط",
  },
};

export type LegalPageLabels = Partial<(typeof LEGAL_PAGE_STRINGS)["en"]>;

export interface LegalSection {
  /** Anchor id, kept stable across edits so shared links keep working. Default a slug of the title. */
  id?: string;
  title: string;
  /** The section text as Markdown. */
  body: string;
}

export interface LegalDocument {
  id: string;
  title: string;
  /** One line under the title. */
  summary?: string;
  /** ISO date of the last change. */
  updated: string;
  /** ISO date the terms take effect. */
  effective?: string;
  version?: string;
  /** Shows a notice that the document is not in force. */
  draft?: boolean;
  sections: LegalSection[];
}

export function useLegalPageStrings(labels?: () => LegalPageLabels | undefined): ComputedRef<(typeof LEGAL_PAGE_STRINGS)["en"]> {
  const nq = useNasaq();
  return computed(() => ({ ...LEGAL_PAGE_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels?.() }));
}

export const legalFill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
