// nqLandingPageEditor: a landing page editor in three panes (outline, live preview, inspector). The markup is the React LandingPageEditor's
// (see the Blade component); the page, the section types and every string come from the options.
//
//   <div data-slot="landing-page-editor" x-data="nqLandingPageEditor({ page: {...}, sectionTypes: [...], labels: {...} })"> … </div>
//
// Options: page { title, slug, seoTitle, seoDescription, dir, status, sections }, sectionTypes (default all five), locale, canSave, canPublish, labels.
// Events (bubbling; set detail.promise to a Promise, or one resolving to { error }):
//   nq-landing-save     { page }                    on success the page is the saved baseline
//   nq-landing-publish  { page }                    page.status is "published"; on success the page becomes published
// With no listener each action succeeds on the spot. `page` is x-modelable.

import type { Magics, Register } from "./types";

/* ------------------------------------------------------------ pure helpers (same as the React landing-page.ts) */

type SectionType = "hero" | "features" | "faq" | "cta" | "text";
type Lang = "en" | "ar";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>;
interface Section {
  id: string;
  type: SectionType;
  visible: boolean;
  data: Data;
}
interface Page {
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  dir: "ltr" | "rtl";
  sections: Section[];
  status: "draft" | "published";
}
type Blocker = "title" | "slug" | "sections" | "href";

const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 160;

let serial = 0;
const newId = (prefix = "id"): string => {
  serial += 1;
  return `${prefix}-${Date.now().toString(36)}${serial.toString(36)}`;
};

const DEFAULTS: Record<SectionType, Record<Lang, () => Data>> = {
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

const isValidSlug = (slug: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
const isSafeHref = (href: string): boolean => /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href.trim());

const publishBlockers = (page: Page): Blocker[] => {
  const out: Blocker[] = [];
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
};

/* ------------------------------------------------------------ component */

interface Options {
  page?: Partial<Page>;
  sectionTypes?: SectionType[];
  locale?: string;
  canSave?: boolean;
  canPublish?: boolean;
  labels?: Record<string, unknown>;
}
type Message = { tone: "danger" | "success"; text: string };
type Result = void | { error?: string } | undefined;

interface State extends Magics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: any;
  page: Page;
  labels: Record<string, string> & { types: Record<string, string>; blockers: Record<string, string> };
  lang: Lang;
  locale: string;
  saved: string;
  selectedId: string | null;
  panel: "section" | "page";
  pane: "sections" | "edit" | "preview";
  device: "desktop" | "mobile";
  busy: null | "save" | "publish";
  message: Message | null;
  root: HTMLElement | null;
  selected: Section | null;
  select(id: string): void;
}

export const landingPageEditor: Register = (Alpine) => {
  Alpine.data("nqLandingPageEditor", (options: Options = {}) => {
    const locale = options.locale ?? (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en");
    const lang: Lang = locale.startsWith("ar") ? "ar" : "en";
    const given = options.page ?? {};
    const page: Page = {
      title: "",
      slug: "",
      seoTitle: "",
      seoDescription: "",
      dir: lang === "ar" ? "rtl" : "ltr",
      status: "draft",
      ...given,
      sections: (given.sections ?? []).map((s) => structuredClone(s)),
    };
    return {
      page,
      labels: (options.labels ?? {}) as State["labels"],
      lang,
      locale,
      sectionTypes: options.sectionTypes ?? (["hero", "features", "faq", "cta", "text"] as SectionType[]),
      canSave: options.canSave !== false,
      canPublish: options.canPublish !== false,
      saved: JSON.stringify(page),
      selectedId: (page.sections[0]?.id ?? null) as string | null,
      panel: "section" as "section" | "page",
      pane: "sections" as "sections" | "edit" | "preview",
      device: "desktop" as "desktop" | "mobile",
      busy: null as null | "save" | "publish",
      message: null as Message | null,
      root: null as HTMLElement | null,
      seoTitleMax: SEO_TITLE_MAX,
      seoDescriptionMax: SEO_DESCRIPTION_MAX,

      init(this: State) {
        this.root = this.$el;
      },

      /* strings */
      fmt(this: State, key: string, vars: Record<string, string> = {}): string {
        return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), String(this.labels[key] ?? ""));
      },
      num(this: State, n: number): string {
        return new Intl.NumberFormat(this.locale).format(n);
      },
      typeName(this: State, type: string): string {
        return this.labels.types[type] ?? type;
      },

      /* derived */
      get selected(): Section | null {
        const s = this as unknown as State;
        return s.page.sections.find((x) => x.id === s.selectedId) ?? null;
      },
      get visibleSections(): Section[] {
        return (this as unknown as State).page.sections.filter((s) => s.visible);
      },
      get dirty(): boolean {
        const s = this as unknown as State;
        return JSON.stringify(s.page) !== s.saved;
      },
      get blockers(): Blocker[] {
        return publishBlockers((this as unknown as State).page);
      },
      get blockerTexts(): string[] {
        const s = this as unknown as State;
        return s.blockers.map((b: string) => s.labels.blockers[b] ?? b);
      },
      get publishDisabled(): boolean {
        const s = this as unknown as State & { blockers: Blocker[] };
        return s.blockers.length > 0 || s.busy === "save" || (!(s as unknown as { dirty: boolean }).dirty && s.page.status === "published");
      },
      get slugInvalid(): boolean {
        const p = (this as unknown as State).page;
        return !!p.slug && !isValidSlug(p.slug);
      },
      get seoTitleCount(): string {
        const s = this as unknown as State;
        return s.fmt("characters", { n: s.num(s.page.seoTitle.length), max: s.num(SEO_TITLE_MAX) });
      },
      get seoDescriptionCount(): string {
        const s = this as unknown as State;
        return s.fmt("characters", { n: s.num(s.page.seoDescription.length), max: s.num(SEO_DESCRIPTION_MAX) });
      },
      linkInvalid(value: string | undefined): boolean {
        return !!value && !isSafeHref(value);
      },
      summary(s: Section): string {
        if (s.type === "hero") return s.data.headline;
        if (s.type === "text") return String(s.data.html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        return s.data.title;
      },
      itemTitle(this: State, s: Section, item: Data, i: number): string {
        if (s.type === "faq") return item.question || this.fmt("faqItem", { n: this.num(i + 1) });
        return item.title || this.fmt("feature", { n: this.num(i + 1) });
      },
      normalizeSlug(this: State) {
        this.page.slug = this.page.slug.toLowerCase().replace(/\s+/g, "-");
      },

      /* sections */
      select(this: State, id: string) {
        this.selectedId = id;
        this.panel = "section";
        this.pane = "edit";
      },
      add(this: State, type: SectionType) {
        const section: Section = { id: newId("s"), type, visible: true, data: DEFAULTS[type][this.lang]() };
        // New sections go after the selected one, or at the end.
        const at = this.selected ? this.page.sections.findIndex((s) => s.id === this.selected!.id) + 1 : this.page.sections.length;
        this.page.sections.splice(at, 0, section);
        this.select(section.id);
      },
      remove(this: State, id: string) {
        const index = this.page.sections.findIndex((s) => s.id === id);
        this.page.sections = this.page.sections.filter((s) => s.id !== id);
        if (this.selectedId === id) this.selectedId = this.page.sections[Math.min(index, this.page.sections.length - 1)]?.id ?? null;
      },
      move(this: State, index: number, step: -1 | 1) {
        const to = index + step;
        const list = this.page.sections;
        if (index < 0 || index >= list.length || to < 0 || to >= list.length) return;
        const [item] = list.splice(index, 1);
        list.splice(to, 0, item!);
      },
      toggleVisible(this: State, id: string) {
        const s = this.page.sections.find((x) => x.id === id);
        if (s) s.visible = !s.visible;
      },
      duplicate(this: State, index: number) {
        const copy = structuredClone(JSON.parse(JSON.stringify(this.page.sections[index]))) as Section;
        copy.id = newId("s");
        if (Array.isArray(copy.data.items)) for (const item of copy.data.items) item.id = newId("i");
        this.page.sections.splice(index + 1, 0, copy);
        this.select(copy.id);
      },

      /* items of a features or faq section */
      get itemMax(): number {
        return (this as unknown as State).selected?.type === "faq" ? 12 : 8;
      },
      get itemMin(): number {
        return (this as unknown as State).selected?.type === "faq" ? 0 : 1;
      },
      addItem(this: State) {
        const s = this.selected;
        if (!s || !Array.isArray(s.data.items)) return;
        const max = s.type === "faq" ? 12 : 8;
        if (s.data.items.length >= max) return;
        s.data.items.push(s.type === "faq" ? { id: newId("q"), question: "", answer: "" } : { id: newId("f"), title: "", description: "" });
      },
      removeItem(this: State, i: number) {
        const s = this.selected;
        if (!s || !Array.isArray(s.data.items) || s.data.items.length <= (s.type === "faq" ? 0 : 1)) return;
        s.data.items.splice(i, 1);
      },
      moveItem(this: State, i: number, step: -1 | 1) {
        const s = this.selected;
        if (!s || !Array.isArray(s.data.items)) return;
        const to = i + step;
        if (to < 0 || to >= s.data.items.length) return;
        const [item] = s.data.items.splice(i, 1);
        s.data.items.splice(to, 0, item);
      },

      /* async actions */
      async ask(this: State, event: string, detail: Record<string, unknown>): Promise<Result> {
        const d: { promise?: unknown } & Record<string, unknown> = { ...detail };
        this.root?.dispatchEvent(new CustomEvent(event, { bubbles: true, detail: d }));
        return (await d.promise) as Result;
      },
      async run(this: State, kind: "save" | "publish") {
        if (this.busy) return;
        const current = JSON.parse(JSON.stringify(this.page)) as Page;
        const sending: Page = kind === "publish" ? { ...current, status: "published" } : current;
        this.busy = kind;
        this.message = null;
        try {
          const r = await this.ask(kind === "publish" ? "nq-landing-publish" : "nq-landing-save", { page: sending });
          if (r && r.error) {
            this.message = { tone: "danger", text: r.error };
          } else {
            if (kind === "publish") this.page.status = "published";
            this.saved = JSON.stringify(this.page);
            this.message = { tone: "success", text: (kind === "publish" ? this.labels.publishedOk : this.labels.saved) ?? "" };
          }
        } catch {
          this.message = { tone: "danger", text: this.labels.failed ?? "" };
        }
        this.busy = null;
      },
    };
  });
};
