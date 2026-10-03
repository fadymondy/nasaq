/* Pure model helpers for the landing page editor: section defaults, ordering and slug rules. No React. */

export type LandingSectionType = "hero" | "features" | "faq" | "cta" | "text";
export type LandingLang = "en" | "ar";

export interface LandingItem {
  id: string;
  title: string;
  description: string;
}
export interface LandingFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface HeroData {
  eyebrow?: string;
  headline: string;
  subheadline: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  align: "start" | "center";
}
export interface FeaturesData {
  title: string;
  subtitle?: string;
  items: LandingItem[];
}
export interface FaqData {
  title: string;
  items: LandingFaqItem[];
}
export interface CtaData {
  title: string;
  body: string;
  buttonLabel: string;
  buttonHref: string;
}
export interface TextData {
  /** HTML from the rich text editor. */
  html: string;
}

export interface SectionDataMap {
  hero: HeroData;
  features: FeaturesData;
  faq: FaqData;
  cta: CtaData;
  text: TextData;
}

export type LandingSection = { [K in LandingSectionType]: { id: string; type: K; visible: boolean; data: SectionDataMap[K] } }[LandingSectionType];

export interface LandingPage {
  title: string;
  /** URL path segment: lowercase letters, digits and hyphens. */
  slug: string;
  seoTitle: string;
  seoDescription: string;
  /** Text direction of the published page. */
  dir: "ltr" | "rtl";
  sections: LandingSection[];
  status: "draft" | "published";
}

export const SECTION_TYPES: readonly LandingSectionType[] = ["hero", "features", "faq", "cta", "text"];

let serial = 0;
/** A short id that is unique within this page session. */
export function newId(prefix = "id"): string {
  serial += 1;
  return `${prefix}-${Date.now().toString(36)}${serial.toString(36)}`;
}

const DEFAULTS: { [K in LandingSectionType]: Record<LandingLang, () => SectionDataMap[K]> } = {
  hero: {
    en: () => ({ headline: "A headline that says it in one line", subheadline: "One or two sentences on who this is for and why it matters.", primaryLabel: "Get started", primaryHref: "/signup", secondaryLabel: "Learn more", secondaryHref: "#features", align: "center" }),
    ar: () => ({ headline: "عنوان يقول كل شيء في سطر واحد", subheadline: "جملة أو جملتان عمّن يخدمه هذا ولماذا يهمّه.", primaryLabel: "ابدأ الآن", primaryHref: "/signup", secondaryLabel: "اعرف المزيد", secondaryHref: "#features", align: "center" }),
  },
  features: {
    en: () => ({ title: "Why teams choose us", subtitle: "", items: [1, 2, 3].map((n) => ({ id: newId("f"), title: `Feature ${n}`, description: "Describe the benefit in a sentence." })) }),
    ar: () => ({ title: "لماذا تختارنا الفرق", subtitle: "", items: [1, 2, 3].map((n) => ({ id: newId("f"), title: `ميزة ${n}`, description: "صف الفائدة في جملة واحدة." })) }),
  },
  faq: {
    en: () => ({ title: "Frequently asked questions", items: [{ id: newId("q"), question: "A common question?", answer: "A short, direct answer." }] }),
    ar: () => ({ title: "الأسئلة الشائعة", items: [{ id: newId("q"), question: "سؤال شائع؟", answer: "إجابة قصيرة ومباشرة." }] }),
  },
  cta: {
    en: () => ({ title: "Ready to start?", body: "Set up in minutes. No card needed.", buttonLabel: "Create your account", buttonHref: "/signup" }),
    ar: () => ({ title: "هل أنت جاهز للبدء؟", body: "الإعداد في دقائق. لا حاجة لبطاقة.", buttonLabel: "أنشئ حسابك", buttonHref: "/signup" }),
  },
  text: {
    en: () => ({ html: "<p>Write your text here.</p>" }),
    ar: () => ({ html: "<p>اكتب نصك هنا.</p>" }),
  },
};

/** A new section of `type` with placeholder content in `lang`. */
export function createSection<K extends LandingSectionType>(type: K, lang: LandingLang = "en"): Extract<LandingSection, { type: K }> {
  return { id: newId("s"), type, visible: true, data: DEFAULTS[type][lang]() } as unknown as Extract<LandingSection, { type: K }>;
}

/** Moves the section at `index` one step (`-1` up, `1` down). Returns the same array when it cannot move. */
export function moveSection<T>(list: readonly T[], index: number, step: -1 | 1): T[] {
  const to = index + step;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list as T[];
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(to, 0, item!);
  return next;
}

/** Replaces the data of the section with `id`, merging `patch` into it. */
export function patchSection(list: readonly LandingSection[], id: string, patch: Partial<SectionDataMap[LandingSectionType]>): LandingSection[] {
  return list.map((s) => (s.id === id ? ({ ...s, data: { ...s.data, ...patch } } as LandingSection) : s));
}

/** A copy of the section with fresh ids for it and its items. */
export function duplicateSection(section: LandingSection): LandingSection {
  const copy = structuredClone(section);
  copy.id = newId("s");
  const data = copy.data as { items?: { id: string }[] };
  if (Array.isArray(data.items)) for (const item of data.items) item.id = newId("i");
  return copy;
}

/** Lowercases, turns spaces and underscores into hyphens and drops everything else that a URL segment should not hold. Latin only: Arabic titles need a typed slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** Search-result limits: titles past 60 characters and descriptions past 160 are usually cut. */
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

/** Only http(s), mailto, tel, relative and in-page links are allowed as a button target. */
export function isSafeHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href.trim());
}

/** Why the page cannot be published yet, as keys. Empty when it can. */
export function publishBlockers(page: LandingPage): ("title" | "slug" | "sections" | "href")[] {
  const out: ("title" | "slug" | "sections" | "href")[] = [];
  if (!page.title.trim()) out.push("title");
  if (!isValidSlug(page.slug)) out.push("slug");
  if (!page.sections.some((s) => s.visible)) out.push("sections");
  const hrefs: string[] = [];
  for (const s of page.sections) {
    if (s.type === "hero") hrefs.push(s.data.primaryHref, ...(s.data.secondaryHref ? [s.data.secondaryHref] : []));
    if (s.type === "cta") hrefs.push(s.data.buttonHref);
  }
  if (hrefs.some((h) => !isSafeHref(h))) out.push("href");
  return out;
}
