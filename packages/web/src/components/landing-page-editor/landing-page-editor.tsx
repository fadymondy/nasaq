"use client";

import {
  ArrowDown,
  ArrowUp,
  CircleHelp,
  Copy,
  Eye,
  EyeOff,
  LayoutTemplate,
  type LucideIcon,
  Megaphone,
  MoreHorizontal,
  Monitor,
  Plus,
  Rocket,
  Smartphone,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import { Field, FieldDescription, FieldLabel, Input, Textarea } from "../field";
import { formatNumber } from "../numeric";
import { Repeater } from "../repeater";
import { RichTextEditor } from "../rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Tabs, TabsList, TabsTab } from "../tabs";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  createSection,
  duplicateSection,
  isSafeHref,
  isValidSlug,
  type LandingFaqItem,
  type LandingItem,
  type LandingPage,
  type LandingSection,
  type LandingSectionType,
  moveSection,
  newId,
  patchSection,
  publishBlockers,
  SECTION_TYPES,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  type SectionDataMap,
} from "./landing-page";

export * from "./landing-page";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    editor: "Landing page editor",
    sections: "Sections",
    addSection: "Add section",
    noSections: "No sections yet",
    noSectionsHint: "Add a hero to start the page.",
    types: { hero: "Hero", features: "Features", faq: "FAQ", cta: "Call to action", text: "Text" },
    hidden: "Hidden",
    sectionActions: (n: string) => `Actions for ${n}`,
    moveUp: "Move up",
    moveDown: "Move down",
    hide: "Hide section",
    show: "Show section",
    duplicate: "Duplicate",
    remove: "Delete",
    section: "Section",
    page: "Page",
    edit: "Edit",
    preview: "Preview",
    desktop: "Desktop",
    mobile: "Mobile",
    selectHint: "Select a section to edit it.",
    pageTitle: "Page title",
    slug: "Address",
    slugHint: "Lowercase letters, numbers and hyphens.",
    slugInvalid: "Use lowercase letters, numbers and hyphens only.",
    seoTitle: "Search title",
    seoDescription: "Search description",
    characters: (n: string, max: string) => `${n} of ${max} characters`,
    direction: "Page direction",
    ltr: "Left to right",
    rtl: "Right to left",
    eyebrow: "Small label above",
    headline: "Headline",
    subheadline: "Subheadline",
    primaryLabel: "Main button text",
    primaryHref: "Main button link",
    secondaryLabel: "Second button text",
    secondaryHref: "Second button link",
    align: "Alignment",
    alignStart: "Start",
    alignCenter: "Center",
    title: "Title",
    subtitle: "Subtitle",
    items: "Items",
    itemTitle: "Title",
    itemDescription: "Description",
    feature: (n: string) => `Feature ${n}`,
    question: "Question",
    answer: "Answer",
    faqItem: (n: string) => `Question ${n}`,
    addFeature: "Add feature",
    addQuestion: "Add question",
    body: "Text",
    buttonLabel: "Button text",
    buttonHref: "Button link",
    linkInvalid: "Use https://, a path starting with /, or #.",
    draft: "Draft",
    published: "Published",
    unsaved: "Unsaved changes",
    saveDraft: "Save draft",
    publish: "Publish",
    update: "Publish changes",
    saved: "Draft saved.",
    publishedOk: "Page published.",
    failed: "Something went wrong. Try again.",
    blockers: {
      title: "Give the page a title.",
      slug: "Set a valid address for the page.",
      sections: "Show at least one section.",
      href: "Fix the invalid button links.",
    },
    previewLabel: "Page preview",
    previewSelect: (n: string) => `Edit ${n}`,
    untitled: "Untitled page",
  },
  ar: {
    editor: "محرر صفحة الهبوط",
    sections: "الأقسام",
    addSection: "إضافة قسم",
    noSections: "لا توجد أقسام بعد",
    noSectionsHint: "أضف قسمًا رئيسيًا لتبدأ الصفحة.",
    types: { hero: "الواجهة الرئيسية", features: "المزايا", faq: "الأسئلة الشائعة", cta: "دعوة لاتخاذ إجراء", text: "نص" },
    hidden: "مخفي",
    sectionActions: (n: string) => `إجراءات ${n}`,
    moveUp: "نقل لأعلى",
    moveDown: "نقل لأسفل",
    hide: "إخفاء القسم",
    show: "إظهار القسم",
    duplicate: "تكرار",
    remove: "حذف",
    section: "القسم",
    page: "الصفحة",
    edit: "تحرير",
    preview: "معاينة",
    desktop: "حاسوب",
    mobile: "جوال",
    selectHint: "اختر قسمًا لتحريره.",
    pageTitle: "عنوان الصفحة",
    slug: "العنوان",
    slugHint: "حروف لاتينية صغيرة وأرقام وشرطات.",
    slugInvalid: "استخدم حروفًا لاتينية صغيرة وأرقامًا وشرطات فقط.",
    seoTitle: "عنوان البحث",
    seoDescription: "وصف البحث",
    characters: (n: string, max: string) => `${n} من ${max} حرفًا`,
    direction: "اتجاه الصفحة",
    ltr: "من اليسار إلى اليمين",
    rtl: "من اليمين إلى اليسار",
    eyebrow: "عبارة صغيرة أعلاه",
    headline: "العنوان الرئيسي",
    subheadline: "العنوان الفرعي",
    primaryLabel: "نص الزر الرئيسي",
    primaryHref: "رابط الزر الرئيسي",
    secondaryLabel: "نص الزر الثاني",
    secondaryHref: "رابط الزر الثاني",
    align: "المحاذاة",
    alignStart: "البداية",
    alignCenter: "الوسط",
    title: "العنوان",
    subtitle: "العنوان الفرعي",
    items: "العناصر",
    itemTitle: "العنوان",
    itemDescription: "الوصف",
    feature: (n: string) => `الميزة ${n}`,
    question: "السؤال",
    answer: "الإجابة",
    faqItem: (n: string) => `السؤال ${n}`,
    addFeature: "إضافة ميزة",
    addQuestion: "إضافة سؤال",
    body: "النص",
    buttonLabel: "نص الزر",
    buttonHref: "رابط الزر",
    linkInvalid: "استخدم https:// أو مسارًا يبدأ بـ / أو #.",
    draft: "مسودة",
    published: "منشورة",
    unsaved: "تغييرات غير محفوظة",
    saveDraft: "حفظ المسودة",
    publish: "نشر",
    update: "نشر التغييرات",
    saved: "تم حفظ المسودة.",
    publishedOk: "تم نشر الصفحة.",
    failed: "حدث خطأ. حاول مرة أخرى.",
    blockers: {
      title: "أعطِ الصفحة عنوانًا.",
      slug: "حدّد عنوانًا صالحًا للصفحة.",
      sections: "أظهر قسمًا واحدًا على الأقل.",
      href: "صحّح روابط الأزرار غير الصالحة.",
    },
    previewLabel: "معاينة الصفحة",
    previewSelect: (n: string) => `تحرير ${n}`,
    untitled: "صفحة بلا عنوان",
  },
};
export type LandingPageEditorLabels = Omit<typeof STRINGS.en, "types" | "blockers"> & {
  types: Record<LandingSectionType, string>;
  blockers: Record<"title" | "slug" | "sections" | "href", string>;
};
type LabelOverrides = Partial<Omit<LandingPageEditorLabels, "types" | "blockers">> & {
  types?: Partial<LandingPageEditorLabels["types"]>;
  blockers?: Partial<LandingPageEditorLabels["blockers"]>;
};
type Strings = ReturnType<typeof useStrings>["t"];

function useStrings(labels?: LabelOverrides) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t = { ...base, ...labels, types: { ...base.types, ...labels?.types }, blockers: { ...base.blockers, ...labels?.blockers } };
  return { locale, lang: (locale.startsWith("ar") ? "ar" : "en") as "en" | "ar", t };
}

const TYPE_ICON: Record<LandingSectionType, LucideIcon> = { hero: Rocket, features: Sparkles, faq: CircleHelp, cta: Megaphone, text: Type };

/** A one-line summary of a section for the outline. */
function summary(section: LandingSection): string {
  switch (section.type) {
    case "hero":
      return section.data.headline;
    case "features":
    case "faq":
    case "cta":
      return section.data.title;
    case "text":
      return section.data.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

/* ------------------------------------------------------------------ props */

export type LandingPageResult = void | { error?: string };

export interface LandingPageEditorProps {
  /** The page. Controlled. */
  value?: LandingPage;
  defaultValue?: LandingPage;
  onValueChange?: (page: LandingPage) => void;
  /** Save as draft. Resolve with `{ error }` to show a message. */
  onSave?: (page: LandingPage) => Promise<LandingPageResult>;
  /** Publish the page. The button is disabled while the page has blockers (no title, bad address, nothing visible, unsafe links). */
  onPublish?: (page: LandingPage) => Promise<LandingPageResult>;
  /** Which section types can be added. Default all five. */
  sectionTypes?: readonly LandingSectionType[];
  labels?: LabelOverrides;
  className?: string;
}

/* ------------------------------------------------------------------ small fields */

function TextField({ label, value, onChange, ltr, multiline, hint, error, placeholder }: { label: string; value: string; onChange: (v: string) => void; ltr?: boolean; multiline?: boolean; hint?: string; error?: string; placeholder?: string }) {
  return (
    <Field invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} dir="auto" rows={3} placeholder={placeholder} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} ltr={ltr} dir={ltr ? "ltr" : "auto"} placeholder={placeholder} />
      )}
      {error ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {error}
        </p>
      ) : hint ? (
        <FieldDescription>{hint}</FieldDescription>
      ) : null}
    </Field>
  );
}

function LinkField({ label, value, onChange, t }: { label: string; value: string; onChange: (v: string) => void; t: Strings }) {
  return <TextField label={label} value={value} onChange={onChange} ltr error={value && !isSafeHref(value) ? t.linkInvalid : undefined} />;
}

/* ------------------------------------------------------------------ section forms */

function SectionForm({ section, onPatch, t, lang }: { section: LandingSection; onPatch: (patch: Partial<SectionDataMap[LandingSectionType]>) => void; t: Strings; lang: "en" | "ar" }) {
  const id = useId();
  switch (section.type) {
    case "hero": {
      const d = section.data;
      const alignItems = [
        { value: "start", label: t.alignStart },
        { value: "center", label: t.alignCenter },
      ];
      return (
        <div className="flex flex-col gap-4">
          <TextField label={t.eyebrow} value={d.eyebrow ?? ""} onChange={(v) => onPatch({ eyebrow: v })} />
          <TextField label={t.headline} value={d.headline} onChange={(v) => onPatch({ headline: v })} multiline />
          <TextField label={t.subheadline} value={d.subheadline} onChange={(v) => onPatch({ subheadline: v })} multiline />
          <TextField label={t.primaryLabel} value={d.primaryLabel} onChange={(v) => onPatch({ primaryLabel: v })} />
          <LinkField label={t.primaryHref} value={d.primaryHref} onChange={(v) => onPatch({ primaryHref: v })} t={t} />
          <TextField label={t.secondaryLabel} value={d.secondaryLabel ?? ""} onChange={(v) => onPatch({ secondaryLabel: v })} />
          <LinkField label={t.secondaryHref} value={d.secondaryHref ?? ""} onChange={(v) => onPatch({ secondaryHref: v })} t={t} />
          <Field>
            <FieldLabel>{t.align}</FieldLabel>
            <Select items={alignItems} value={d.align} onValueChange={(v) => v && onPatch({ align: v as "start" | "center" })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {alignItems.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      );
    }
    case "features": {
      const d = section.data;
      return (
        <div className="flex flex-col gap-4">
          <TextField label={t.title} value={d.title} onChange={(v) => onPatch({ title: v })} />
          <TextField label={t.subtitle} value={d.subtitle ?? ""} onChange={(v) => onPatch({ subtitle: v })} />
          <Repeater<LandingItem>
            label={t.items}
            value={d.items}
            onValueChange={(items) => onPatch({ items })}
            createItem={() => ({ id: newId("f"), title: "", description: "" })}
            cloneItem={(i) => ({ ...i, id: newId("f") })}
            rowTitle={(i, n) => i.title || t.feature(formatNumber(n + 1, lang))}
            rowLabel={(i, n) => i.title || t.feature(formatNumber(n + 1, lang))}
            addLabel={t.addFeature}
            min={1}
            max={8}
            renderRow={(item, { update }) => (
              <div className="flex flex-col gap-3">
                <TextField label={t.itemTitle} value={item.title} onChange={(v) => update({ ...item, title: v })} />
                <TextField label={t.itemDescription} value={item.description} onChange={(v) => update({ ...item, description: v })} multiline />
              </div>
            )}
          />
        </div>
      );
    }
    case "faq": {
      const d = section.data;
      return (
        <div className="flex flex-col gap-4">
          <TextField label={t.title} value={d.title} onChange={(v) => onPatch({ title: v })} />
          <Repeater<LandingFaqItem>
            label={t.items}
            value={d.items}
            onValueChange={(items) => onPatch({ items })}
            createItem={() => ({ id: newId("q"), question: "", answer: "" })}
            cloneItem={(i) => ({ ...i, id: newId("q") })}
            rowTitle={(i, n) => i.question || t.faqItem(formatNumber(n + 1, lang))}
            rowLabel={(i, n) => i.question || t.faqItem(formatNumber(n + 1, lang))}
            addLabel={t.addQuestion}
            max={12}
            renderRow={(item, { update }) => (
              <div className="flex flex-col gap-3">
                <TextField label={t.question} value={item.question} onChange={(v) => update({ ...item, question: v })} />
                <TextField label={t.answer} value={item.answer} onChange={(v) => update({ ...item, answer: v })} multiline />
              </div>
            )}
          />
        </div>
      );
    }
    case "cta": {
      const d = section.data;
      return (
        <div className="flex flex-col gap-4">
          <TextField label={t.title} value={d.title} onChange={(v) => onPatch({ title: v })} />
          <TextField label={t.body} value={d.body} onChange={(v) => onPatch({ body: v })} multiline />
          <TextField label={t.buttonLabel} value={d.buttonLabel} onChange={(v) => onPatch({ buttonLabel: v })} />
          <LinkField label={t.buttonHref} value={d.buttonHref} onChange={(v) => onPatch({ buttonHref: v })} t={t} />
        </div>
      );
    }
    case "text":
      return (
        <div className="flex flex-col gap-1.5">
          <span id={`${id}-text`} className="text-label text-foreground">
            {t.body}
          </span>
          <RichTextEditor aria-labelledby={`${id}-text`} value={section.data.html} onValueChange={(html) => onPatch({ html })} minHeight="10rem" toolbar={["bold", "italic", "h2", "h3", "bulletList", "orderedList", "link"]} />
        </div>
      );
  }
}

/* ------------------------------------------------------------------ page settings */

function PageSettings({ page, onChange, t }: { page: LandingPage; onChange: (patch: Partial<LandingPage>) => void; t: Strings }) {
  const { locale } = useStrings();
  const dirItems = [
    { value: "ltr", label: t.ltr },
    { value: "rtl", label: t.rtl },
  ];
  const count = (n: number, max: number) => t.characters(formatNumber(n, locale), formatNumber(max, locale));
  return (
    <div className="flex flex-col gap-4">
      <TextField label={t.pageTitle} value={page.title} onChange={(v) => onChange({ title: v })} />
      <TextField label={t.slug} value={page.slug} onChange={(v) => onChange({ slug: v.toLowerCase().replace(/\s+/g, "-") })} ltr hint={t.slugHint} error={page.slug && !isValidSlug(page.slug) ? t.slugInvalid : undefined} />
      <TextField label={t.seoTitle} value={page.seoTitle} onChange={(v) => onChange({ seoTitle: v })} hint={count(page.seoTitle.length, SEO_TITLE_MAX)} />
      <TextField label={t.seoDescription} value={page.seoDescription} onChange={(v) => onChange({ seoDescription: v })} multiline hint={count(page.seoDescription.length, SEO_DESCRIPTION_MAX)} />
      <Field>
        <FieldLabel>{t.direction}</FieldLabel>
        <Select items={dirItems} value={page.dir} onValueChange={(v) => v && onChange({ dir: v as "ltr" | "rtl" })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dirItems.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ live preview */

function PreviewSection({ section }: { section: LandingSection }) {
  switch (section.type) {
    case "hero": {
      const d = section.data;
      const center = d.align === "center";
      return (
        <div className={cn("flex flex-col gap-4 px-6 py-12 @lg:py-16", center ? "items-center text-center" : "items-start text-start")}>
          {d.eyebrow ? <span className="text-caption uppercase tracking-wide text-muted-foreground">{d.eyebrow}</span> : null}
          <h2 className="max-w-2xl text-h1 text-foreground @lg:text-display">{d.headline}</h2>
          <p className="max-w-xl text-body text-muted-foreground">{d.subheadline}</p>
          <div className={cn("flex flex-wrap gap-2 pt-2", center && "justify-center")}>
            {d.primaryLabel ? (
              <Button variant="primary" size="lg" tabIndex={-1} render={<span />} nativeButton={false}>
                {d.primaryLabel}
              </Button>
            ) : null}
            {d.secondaryLabel ? (
              <Button size="lg" tabIndex={-1} render={<span />} nativeButton={false}>
                {d.secondaryLabel}
              </Button>
            ) : null}
          </div>
        </div>
      );
    }
    case "features": {
      const d = section.data;
      return (
        <div className="flex flex-col gap-6 border-t border-border px-6 py-10">
          <div className="flex flex-col gap-1 text-start">
            <h3 className="text-h2 text-foreground">{d.title}</h3>
            {d.subtitle ? <p className="text-body text-muted-foreground">{d.subtitle}</p> : null}
          </div>
          <ul className="grid gap-4 @lg:grid-cols-3">
            {d.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 rounded-card border border-border bg-card p-4 text-start">
                <span className="flex size-8 items-center justify-center rounded-control bg-secondary">
                  <Sparkles aria-hidden className="size-4 text-muted-foreground" />
                </span>
                <span className="pt-1 text-label text-foreground">{item.title}</span>
                <span className="text-body-sm text-muted-foreground">{item.description}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "faq": {
      const d = section.data;
      return (
        <div className="flex flex-col gap-4 border-t border-border px-6 py-10 text-start">
          <h3 className="text-h2 text-foreground">{d.title}</h3>
          <dl className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            {d.items.map((item) => (
              <div key={item.id} className="flex flex-col gap-1 p-4">
                <dt className="text-label text-foreground">{item.question}</dt>
                <dd className="text-body-sm text-muted-foreground">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    }
    case "cta": {
      const d = section.data;
      return (
        <div className="px-6 py-10">
          <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-secondary px-6 py-10 text-center">
            <h3 className="text-h2 text-foreground">{d.title}</h3>
            <p className="max-w-md text-body text-muted-foreground">{d.body}</p>
            {d.buttonLabel ? (
              <Button variant="primary" size="lg" tabIndex={-1} render={<span />} nativeButton={false}>
                {d.buttonLabel}
              </Button>
            ) : null}
          </div>
        </div>
      );
    }
    case "text":
      return (
        <div
          className="border-t border-border px-6 py-8 text-start text-body text-nq-fg-body [&_a]:underline [&_h2]:text-h2 [&_h3]:text-h3 [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:mb-3 [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:ps-6 [&_ul]:ps-6"
          // Authored in the rich text editor, which only produces its own schema (no scripts, safe links).
          dangerouslySetInnerHTML={{ __html: section.data.html }}
        />
      );
  }
}

function Preview({ page, selectedId, onSelect, device, t }: { page: LandingPage; selectedId: string | null; onSelect: (id: string) => void; device: "desktop" | "mobile"; t: Strings }) {
  const visible = page.sections.filter((s) => s.visible);
  return (
    <div className="flex justify-center rounded-card border border-border bg-secondary p-3">
      <div
        role="region"
        aria-label={t.previewLabel}
        dir={page.dir}
        className={cn("@container w-full overflow-hidden rounded-card border border-border bg-background", device === "mobile" ? "max-w-[390px]" : "max-w-[960px]")}
      >
        {visible.length === 0 ? (
          <p className="p-10 text-center text-body-sm text-muted-foreground">{t.noSectionsHint}</p>
        ) : (
          visible.map((s) => (
            // The preview is a pointer shortcut; the Sections list is the keyboard route to every section.
            <div
              key={s.id}
              data-selected={s.id === selectedId || undefined}
              onClick={() => onSelect(s.id)}
              title={t.previewSelect(t.types[s.type])}
              className="relative cursor-pointer outline-offset-[-2px] hover:outline hover:outline-1 hover:outline-nq-line-strong data-selected:outline data-selected:outline-2 data-selected:outline-nq-focus"
            >
              <PreviewSection section={s} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ LandingPageEditor */

/**
 * A landing page editor in three panes: an outline of sections (add, reorder, hide, duplicate, delete), a live preview
 * at desktop or phone width, and a form for the selected section or the page (address, search title and description,
 * direction). Below `lg` the panes become tabs. Controlled or uncontrolled; saving and publishing are async callbacks.
 */
export function LandingPageEditor({ value, defaultValue, onValueChange, onSave, onPublish, sectionTypes = SECTION_TYPES, labels, className }: LandingPageEditorProps) {
  const { locale, lang, t } = useStrings(labels);
  const [inner, setInner] = useState<LandingPage>(defaultValue ?? { title: "", slug: "", seoTitle: "", seoDescription: "", dir: lang === "ar" ? "rtl" : "ltr", sections: [], status: "draft" });
  const page = value ?? inner;
  const [saved, setSaved] = useState(() => JSON.stringify(page));
  const [selectedId, setSelectedId] = useState<string | null>(page.sections[0]?.id ?? null);
  const [panel, setPanel] = useState<"section" | "page">("section");
  const [pane, setPane] = useState<"sections" | "edit" | "preview">("sections");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [busy, setBusy] = useState<null | "save" | "publish">(null);
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);

  const set = (next: LandingPage) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };
  const setSections = (sections: LandingSection[]) => set({ ...page, sections });
  const selected = page.sections.find((s) => s.id === selectedId) ?? null;
  const dirty = JSON.stringify(page) !== saved;
  const blockers = useMemo(() => publishBlockers(page), [page]);

  const select = (id: string) => {
    setSelectedId(id);
    setPanel("section");
    setPane("edit");
  };
  const add = (type: LandingSectionType) => {
    const section = createSection(type, lang);
    // New sections go after the selected one, or at the end.
    const at = selected ? page.sections.findIndex((s) => s.id === selected.id) + 1 : page.sections.length;
    setSections([...page.sections.slice(0, at), section, ...page.sections.slice(at)]);
    select(section.id);
  };
  const remove = (id: string) => {
    const index = page.sections.findIndex((s) => s.id === id);
    const next = page.sections.filter((s) => s.id !== id);
    setSections(next);
    if (selectedId === id) setSelectedId(next[Math.min(index, next.length - 1)]?.id ?? null);
  };

  const run = async (kind: "save" | "publish", fn: ((p: LandingPage) => Promise<LandingPageResult>) | undefined) => {
    if (!fn) return;
    setBusy(kind);
    setMessage(null);
    try {
      const result = await fn(kind === "publish" ? { ...page, status: "published" } : page);
      if (result && result.error) return setMessage({ tone: "danger", text: result.error });
      const next = kind === "publish" ? { ...page, status: "published" as const } : page;
      if (kind === "publish") set(next);
      setSaved(JSON.stringify(next));
      setMessage({ tone: "success", text: kind === "publish" ? t.publishedOk : t.saved });
    } catch {
      setMessage({ tone: "danger", text: t.failed });
    } finally {
      setBusy(null);
    }
  };

  const paneClass = (name: typeof pane) => cn("min-w-0", pane !== name && "max-lg:hidden");

  return (
    <div data-slot="landing-page-editor" role="group" aria-label={t.editor} className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-label text-foreground">{page.title || t.untitled}</span>
          <Badge variant={page.status === "published" ? "success" : "neutral"}>{page.status === "published" ? t.published : t.draft}</Badge>
          {dirty ? <span className="text-caption text-muted-foreground">{t.unsaved}</span> : null}
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <ToggleGroup value={[device]} onValueChange={(v) => v[0] && setDevice(v[0] as "desktop" | "mobile")} aria-label={t.preview} className="max-lg:hidden">
            <Toggle value="desktop" aria-label={t.desktop}>
              <Monitor aria-hidden className="size-4" />
            </Toggle>
            <Toggle value="mobile" aria-label={t.mobile}>
              <Smartphone aria-hidden className="size-4" />
            </Toggle>
          </ToggleGroup>
          {onSave ? (
            <Button loading={busy === "save"} disabled={!dirty || busy === "publish"} onClick={() => void run("save", onSave)}>
              {t.saveDraft}
            </Button>
          ) : null}
          {onPublish ? (
            <Button variant="primary" loading={busy === "publish"} disabled={blockers.length > 0 || busy === "save" || (!dirty && page.status === "published")} onClick={() => void run("publish", onPublish)}>
              <Rocket aria-hidden />
              {page.status === "published" ? t.update : t.publish}
            </Button>
          ) : null}
        </div>
      </div>
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      {blockers.length > 0 && onPublish ? (
        <ul aria-label={t.publish} className="flex flex-col gap-0.5 text-caption text-muted-foreground">
          {blockers.map((b) => (
            <li key={b}>{t.blockers[b]}</li>
          ))}
        </ul>
      ) : null}

      <Tabs value={pane} onValueChange={(v) => setPane(v as typeof pane)} className="lg:hidden">
        <TabsList aria-label={t.editor}>
          <TabsTab value="sections">{t.sections}</TabsTab>
          <TabsTab value="edit">{t.edit}</TabsTab>
          <TabsTab value="preview">{t.preview}</TabsTab>
        </TabsList>
      </Tabs>

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)_20rem]">
        {/* Outline */}
        <section aria-label={t.sections} className={cn(paneClass("sections"), "flex flex-col gap-2")}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-label text-foreground">{t.sections}</h3>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" />}>
                <Plus aria-hidden />
                {t.addSection}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                {sectionTypes.map((type) => {
                  const I = TYPE_ICON[type];
                  return (
                    <DropdownMenuItem key={type} onClick={() => add(type)}>
                      <I aria-hidden />
                      {t.types[type]}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {page.sections.length === 0 ? (
            <EmptyState icon={LayoutTemplate} title={t.noSections} description={t.noSectionsHint} />
          ) : (
            <ol className="flex flex-col gap-1.5">
              {page.sections.map((s, i) => {
                const I = TYPE_ICON[s.type];
                const active = s.id === selectedId;
                const name = t.types[s.type];
                return (
                  <li key={s.id} data-active={active || undefined} className={cn("flex items-center gap-1 rounded-control border bg-card ps-1", active ? "border-nq-focus" : "border-border")}>
                    <button
                      type="button"
                      aria-current={active || undefined}
                      onClick={() => select(s.id)}
                      className={cn("flex min-w-0 flex-1 items-center gap-2 rounded-control p-2 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus", !s.visible && "opacity-60")}
                    >
                      <I aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-1.5 text-label text-foreground">
                          {name}
                          {!s.visible ? <EyeOff aria-label={t.hidden} className="size-3 text-muted-foreground" /> : null}
                        </span>
                        <span dir="auto" className="truncate text-caption text-muted-foreground">
                          {summary(s)}
                        </span>
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t.sectionActions(name)} />}>
                        <MoreHorizontal aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem disabled={i === 0} onClick={() => setSections(moveSection(page.sections, i, -1))}>
                          <ArrowUp aria-hidden />
                          {t.moveUp}
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={i === page.sections.length - 1} onClick={() => setSections(moveSection(page.sections, i, 1))}>
                          <ArrowDown aria-hidden />
                          {t.moveDown}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSections(page.sections.map((x) => (x.id === s.id ? { ...x, visible: !x.visible } : x)))}>
                          {s.visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                          {s.visible ? t.hide : t.show}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const copy = duplicateSection(s);
                            setSections([...page.sections.slice(0, i + 1), copy, ...page.sections.slice(i + 1)]);
                            select(copy.id);
                          }}
                        >
                          <Copy aria-hidden />
                          {t.duplicate}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="danger" onClick={() => remove(s.id)}>
                          <Trash2 aria-hidden />
                          {t.remove}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Preview */}
        <section aria-label={t.preview} className={paneClass("preview")}>
          <div className="mb-2 flex items-center justify-between gap-2 lg:hidden">
            <span className="text-label text-foreground">{t.preview}</span>
            <ToggleGroup value={[device]} onValueChange={(v) => v[0] && setDevice(v[0] as "desktop" | "mobile")} aria-label={t.preview}>
              <Toggle value="desktop" aria-label={t.desktop}>
                <Monitor aria-hidden className="size-4" />
              </Toggle>
              <Toggle value="mobile" aria-label={t.mobile}>
                <Smartphone aria-hidden className="size-4" />
              </Toggle>
            </ToggleGroup>
          </div>
          <Preview page={page} selectedId={selectedId} onSelect={select} device={device} t={t} />
        </section>

        {/* Inspector */}
        <section aria-label={t.edit} className={cn(paneClass("edit"), "flex flex-col gap-4")}>
          <Tabs value={panel} onValueChange={(v) => setPanel(v as typeof panel)}>
            <TabsList>
              <TabsTab value="section">{t.section}</TabsTab>
              <TabsTab value="page">{t.page}</TabsTab>
            </TabsList>
          </Tabs>
          {panel === "page" ? (
            <PageSettings page={page} onChange={(patch) => set({ ...page, ...patch })} t={t} />
          ) : selected ? (
            <>
              <h3 className="text-label text-foreground">{t.types[selected.type]}</h3>
              <SectionForm key={selected.id} section={selected} onPatch={(patch) => setSections(patchSection(page.sections, selected.id, patch))} t={t} lang={locale.startsWith("ar") ? "ar" : "en"} />
            </>
          ) : (
            <p className="text-body-sm text-muted-foreground">{t.selectHint}</p>
          )}
        </section>
      </div>
    </div>
  );
}
