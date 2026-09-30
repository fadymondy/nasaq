"use client";

import { ArrowLeft, ArrowRight, ExternalLink, ImageIcon, LayoutTemplate, Lock, Package, ShieldAlert, ShieldCheck, Store, Upload } from "lucide-react";
import { type FormEvent, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { type CatalogCategory, type CatalogItem, type CatalogLabels, type CatalogResult, CatalogIcon, CatalogStore } from "../catalog-store";
import { Checkbox } from "../checkbox";
import { Chip, ChipGroup } from "../chip-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { InstallButton, type InstallState } from "../install-button";
import { DateTime, formatNumber } from "../numeric";
import { Price } from "../price";
import { Rating } from "../rating";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { TagInput } from "../tag-input";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";
import { Toggle, ToggleGroup } from "../toggle-group";
import { highestRisk, type PermissionRisk, type PublishDraft, type PublishErrors, pickFeatured, sortPermissions, validateDraft } from "./marketplace-format";

export type { PermissionRisk, PublishDraft, PublishErrors } from "./marketplace-format";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    extensions: "Extensions",
    templates: "Templates",
    view: "Browse",
    featured: "Featured",
    publish: "Publish",
    back: "Back to the store",
    install: "Install",
    overview: "Overview",
    changelog: "Changelog",
    reviews: "Reviews",
    screenshots: "Screenshots",
    permissions: "Permissions",
    permissionsHint: "What this extension can do once installed.",
    noPermissions: "It asks for no permissions.",
    risk: { low: "Low", medium: "Medium", high: "High" } satisfies Record<PermissionRisk, string>,
    links: "Links",
    details: "Details",
    publisher: "Publisher",
    version: "Version",
    updated: "Updated",
    category: "Category",
    compatibility: "Works with",
    size: "Size",
    license: "License",
    tags: "Tags",
    installs: "installs",
    by: (p: string) => `by ${p}`,
    noChangelog: "No release notes yet.",
    noReviews: "No reviews yet.",
    related: "More like this",
    uninstall: "Uninstall",
    uninstalling: "Removing",
    failed: "Something went wrong. Try again.",
    free: "Free",
    /* publish form */
    publishTitle: "Publish an extension",
    publishBody: "Send it for review. Once approved it appears in the store.",
    name: "Name",
    summary: "One-line summary",
    summaryHint: (n: string) => `Up to ${n} characters.`,
    description: "Description",
    categoryLabel: "Category",
    categoryPlaceholder: "Choose a category",
    versionLabel: "Version",
    repository: "Source repository",
    repositoryHint: "A public https link, for review.",
    pricing: "Price",
    pricingFree: "Free",
    pricingPaid: "Paid",
    priceAmount: "Price per month",
    tagsLabel: "Tags",
    tagsPlaceholder: "Add a tag and press Enter",
    permissionsLabel: "Permissions it asks for",
    cancel: "Cancel",
    submit: "Submit for review",
    submitting: "Sending",
    submitted: "Sent for review. We will email you when it is approved.",
    errors: { required: "This is required.", invalid: "Check this value.", tooLong: "This is too long." },
    /* templates */
    templatesSearch: "Templates",
    useTemplate: "Use template",
    using: "Creating",
    uses: "uses",
    noTemplates: "No templates here yet",
    noTemplatesBody: "Pick another category.",
    allTemplates: "All",
    templateCategories: "Template categories",
    preview: "Preview",
  },
  ar: {
    extensions: "الإضافات",
    templates: "القوالب",
    view: "تصفّح",
    featured: "مميّزة",
    publish: "انشر",
    back: "العودة إلى المتجر",
    install: "تثبيت",
    overview: "نظرة عامة",
    changelog: "سجل التغييرات",
    reviews: "التقييمات",
    screenshots: "لقطات الشاشة",
    permissions: "الصلاحيات",
    permissionsHint: "ما تستطيع هذه الإضافة فعله بعد تثبيتها.",
    noPermissions: "لا تطلب أي صلاحيات.",
    risk: { low: "منخفضة", medium: "متوسطة", high: "عالية" } satisfies Record<PermissionRisk, string>,
    links: "الروابط",
    details: "التفاصيل",
    publisher: "الناشر",
    version: "الإصدار",
    updated: "آخر تحديث",
    category: "الفئة",
    compatibility: "يعمل مع",
    size: "الحجم",
    license: "الترخيص",
    tags: "الوسوم",
    installs: "تثبيت",
    by: (p: string) => `من ${p}`,
    noChangelog: "لا ملاحظات إصدار بعد.",
    noReviews: "لا تقييمات بعد.",
    related: "المزيد مثلها",
    uninstall: "إزالة",
    uninstalling: "جارٍ الإزالة",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    free: "مجاني",
    publishTitle: "انشر إضافة",
    publishBody: "أرسلها للمراجعة. عند الموافقة تظهر في المتجر.",
    name: "الاسم",
    summary: "ملخص في سطر",
    summaryHint: (n: string) => `حتى ${n} حرفًا.`,
    description: "الوصف",
    categoryLabel: "الفئة",
    categoryPlaceholder: "اختر فئة",
    versionLabel: "الإصدار",
    repository: "مستودع المصدر",
    repositoryHint: "رابط https عام، للمراجعة.",
    pricing: "السعر",
    pricingFree: "مجاني",
    pricingPaid: "مدفوع",
    priceAmount: "السعر شهريًا",
    tagsLabel: "الوسوم",
    tagsPlaceholder: "أضف وسمًا واضغط Enter",
    permissionsLabel: "الصلاحيات التي تطلبها",
    cancel: "إلغاء",
    submit: "أرسل للمراجعة",
    submitting: "جارٍ الإرسال",
    submitted: "أُرسلت للمراجعة. سنراسلك عند الموافقة عليها.",
    errors: { required: "هذا الحقل مطلوب.", invalid: "تحقق من هذه القيمة.", tooLong: "النص أطول من اللازم." },
    templatesSearch: "القوالب",
    useTemplate: "استخدم القالب",
    using: "جارٍ الإنشاء",
    uses: "استخدام",
    noTemplates: "لا قوالب هنا بعد",
    noTemplatesBody: "اختر فئة أخرى.",
    allTemplates: "الكل",
    templateCategories: "فئات القوالب",
    preview: "معاينة",
  },
};
export type MarketplaceLabels = typeof STRINGS.en;

function useT(labels?: Partial<MarketplaceLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as MarketplaceLabels, locale, ar };
}

/* ------------------------------------------------------------------ types */

export interface MarketplacePermission {
  id: string;
  label: string;
  description?: string;
  /** Default `low`. */
  risk?: PermissionRisk;
}

export interface MarketplaceRelease {
  version: string;
  date: Date | number | string;
  notes: string[];
}

export interface MarketplaceReview {
  id: string;
  author: string;
  rating: number;
  date: Date | number | string;
  body: string;
}

export interface MarketplaceListing extends CatalogItem {
  /** Shown in the featured strip at the top of the store. */
  featured?: boolean;
  /** Image URLs for the detail page. */
  screenshots?: { src: string; alt: string }[];
  permissions?: MarketplacePermission[];
  changelog?: MarketplaceRelease[];
  reviews?: MarketplaceReview[];
  /** Website, docs, source: `{ label, href }`. */
  links?: { label: string; href: string }[];
  /** "Works with": products or versions. */
  compatibility?: string;
  license?: string;
  /** e.g. "1.2 MB". */
  size?: string;
}

export interface MarketplaceTemplate {
  id: string;
  name: string;
  summary: string;
  /** Matches a template category id. */
  category: string;
  /** Preview image URL. Without one a tile with `icon` shows. */
  preview?: string;
  previewAlt?: string;
  icon?: CatalogItem["icon"];
  author?: string;
  uses?: number;
  tags?: string[];
}

export type MarketplaceResult = CatalogResult;

const riskVariant: Record<PermissionRisk, "neutral" | "warning" | "danger"> = { low: "neutral", medium: "warning", high: "danger" };

/* ------------------------------------------------------------------ permissions */

export interface PermissionListProps {
  permissions: MarketplacePermission[];
  className?: string;
  labels?: Partial<MarketplaceLabels>;
}

/** What an extension asks to do, most sensitive first. Risk is spelled out, never colour alone. */
export function PermissionList({ permissions, className, labels }: PermissionListProps) {
  const { t } = useT(labels);
  if (permissions.length === 0) return <p className={cn("text-body-sm text-muted-foreground", className)}>{t.noPermissions}</p>;
  return (
    <ul data-slot="permission-list" className={cn("flex flex-col divide-y divide-border rounded-card border border-border bg-card", className)}>
      {sortPermissions(permissions).map((p) => {
        const risk = p.risk ?? "low";
        const Icon = risk === "high" ? ShieldAlert : risk === "medium" ? ShieldCheck : Lock;
        return (
          <li key={p.id} data-risk={risk} className="flex items-start gap-3 px-3 py-2.5">
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p dir="auto" className="text-body-sm text-foreground">
                {p.label}
              </p>
              {p.description ? (
                <p dir="auto" className="text-caption text-muted-foreground">
                  {p.description}
                </p>
              ) : null}
            </div>
            <Badge variant={riskVariant[risk]} className="shrink-0">
              {t.risk[risk]}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ detail page */

export interface MarketplaceDetailProps {
  listing: MarketplaceListing;
  /** Install state. Uncontrolled from `listing.installed` when omitted. */
  state?: InstallState;
  onInstall?: (listing: MarketplaceListing) => Promise<MarketplaceResult>;
  onUninstall?: (listing: MarketplaceListing) => Promise<MarketplaceResult>;
  onOpen?: (listing: MarketplaceListing) => void;
  /** Shows the back link. */
  onBack?: () => void;
  className?: string;
  labels?: Partial<MarketplaceLabels>;
}

/**
 * An extension's page: install header, tabs for overview (with screenshots), changelog and reviews, and a side
 * column with details, permissions, links and tags.
 */
export function MarketplaceDetail({ listing, state, onInstall, onUninstall, onOpen, onBack, className, labels }: MarketplaceDetailProps) {
  const { t, locale, ar } = useT(labels);
  const [installed, setInstalled] = useState(listing.installed ?? false);
  const [busy, setBusy] = useState<"install" | "uninstall" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current: InstallState = state ?? (busy === "install" ? "installing" : installed ? "installed" : "available");
  const Back = ar ? ArrowRight : ArrowLeft;
  const free = !listing.price || listing.price.amount === 0;
  const perms = listing.permissions ?? [];
  const risk = highestRisk(perms);

  async function run(kind: "install" | "uninstall") {
    const fn = kind === "install" ? onInstall : onUninstall;
    if (!fn) return;
    setBusy(kind);
    setError(null);
    try {
      const res = await fn(listing);
      if (res && res.error) setError(res.error);
      else setInstalled(kind === "install");
    } catch {
      setError(t.failed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div data-slot="marketplace-detail" data-listing={listing.id} className={cn("flex min-w-0 flex-col gap-5", className)}>
      {onBack ? (
        <div>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <Back aria-hidden />
            {t.back}
          </Button>
        </div>
      ) : null}
      <header className="flex flex-wrap items-start gap-4">
        <CatalogIcon item={listing} className="size-16 [&_svg]:size-8" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-title-lg text-foreground">{listing.name}</h1>
            {listing.badge ? <Badge variant="outline">{listing.badge}</Badge> : null}
          </div>
          <p dir="auto" className="text-body text-muted-foreground">
            {listing.summary}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
            {listing.publisher ? <span>{t.by(listing.publisher)}</span> : null}
            {listing.rating !== undefined ? <Rating value={listing.rating} {...(listing.ratingCount !== undefined ? { count: listing.ratingCount } : {})} /> : null}
            {listing.installs !== undefined ? (
              <span>
                <bdi>{formatNumber(listing.installs, locale, { notation: "compact" })}</bdi> {t.installs}
              </span>
            ) : null}
            {free ? <span>{t.free}</span> : listing.price ? <Price amount={listing.price.amount} {...(listing.price.currency ? { currency: listing.price.currency } : {})} {...(listing.price.period ? { period: listing.price.period } : {})} size="sm" /> : null}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 max-sm:w-full sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <InstallButton
              state={current}
              appName={listing.name}
              free={free}
              size="lg"
              variant="primary"
              {...(onInstall ? { onInstall: () => void run("install") } : {})}
              {...(onOpen ? { onOpen: () => onOpen(listing) } : {})}
            />
            {installed && onUninstall ? (
              <Button variant="ghost" size="lg" loading={busy === "uninstall"} onClick={() => void run("uninstall")}>
                {busy === "uninstall" ? t.uninstalling : t.uninstall}
              </Button>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="text-caption text-nq-danger-text">
              {error}
            </p>
          ) : null}
        </div>
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Tabs defaultValue="overview" className="min-w-0">
          <TabsList variant="underline">
            <TabsTab value="overview">{t.overview}</TabsTab>
            <TabsTab value="changelog">{t.changelog}</TabsTab>
            <TabsTab value="reviews">
              {t.reviews} {listing.reviews?.length ? <bdi className="text-caption tabular-nums opacity-70">{formatNumber(listing.reviews.length, locale)}</bdi> : null}
            </TabsTab>
            <TabsIndicator />
          </TabsList>
          <TabsPanel value="overview" className="flex flex-col gap-5">
            {(listing.description ?? listing.summary).split("\n\n").map((para) => (
              <p key={para} dir="auto" className="text-body text-foreground">
                {para}
              </p>
            ))}
            {listing.screenshots?.length ? (
              <section className="flex flex-col gap-2" aria-label={t.screenshots}>
                <h2 className="eyebrow">{t.screenshots}</h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {listing.screenshots.map((s) => (
                    <li key={s.src} className="overflow-hidden rounded-card border border-border bg-muted">
                      <img src={s.src} alt={s.alt} className="block h-auto w-full" />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </TabsPanel>
          <TabsPanel value="changelog">
            {listing.changelog?.length ? (
              <ol className="flex flex-col gap-4">
                {listing.changelog.map((r) => (
                  <li key={r.version} className="flex flex-col gap-1.5 rounded-card border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-label text-foreground">
                        <bdi dir="ltr">v{r.version}</bdi>
                      </span>
                      <span className="text-caption text-muted-foreground">
                        <DateTime value={r.date} />
                      </span>
                    </div>
                    <ul className="list-disc ps-5 text-body-sm text-foreground">
                      {r.notes.map((n) => (
                        <li key={n} dir="auto">
                          {n}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-body-sm text-muted-foreground">{t.noChangelog}</p>
            )}
          </TabsPanel>
          <TabsPanel value="reviews">
            {listing.reviews?.length ? (
              <ul className="flex flex-col gap-3">
                {listing.reviews.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1.5 rounded-card border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <Avatar name={r.author} size="sm" />
                      <span className="text-label text-foreground">{r.author}</span>
                      <Rating value={r.rating} className="ms-auto" />
                    </div>
                    <p dir="auto" className="text-body-sm text-foreground">
                      {r.body}
                    </p>
                    <span className="text-caption text-muted-foreground">
                      <DateTime value={r.date} relative />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-muted-foreground">{t.noReviews}</p>
            )}
          </TabsPanel>
        </Tabs>

        <aside className="flex min-w-0 flex-col gap-5 self-start">
          <section className="flex flex-col gap-2" aria-label={t.details}>
            <h2 className="eyebrow">{t.details}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-card border border-border bg-card p-3 text-body-sm">
              {listing.publisher ? <Row label={t.publisher}>{listing.publisher}</Row> : null}
              {listing.version ? (
                <Row label={t.version}>
                  <bdi dir="ltr">{listing.version}</bdi>
                </Row>
              ) : null}
              {listing.updatedAt !== undefined ? (
                <Row label={t.updated}>
                  <DateTime value={listing.updatedAt} />
                </Row>
              ) : null}
              {listing.compatibility ? <Row label={t.compatibility}>
                  <bdi dir="ltr">{listing.compatibility}</bdi>
                </Row> : null}
              {listing.size ? (
                <Row label={t.size}>
                  <bdi dir="ltr">{listing.size}</bdi>
                </Row>
              ) : null}
              {listing.license ? (
                <Row label={t.license}>
                  <bdi dir="ltr">{listing.license}</bdi>
                </Row>
              ) : null}
            </dl>
          </section>
          <section className="flex flex-col gap-2" aria-label={t.permissions}>
            <h2 className="eyebrow flex items-center gap-2">
              {t.permissions}
              {risk ? <Badge variant={riskVariant[risk]}>{t.risk[risk]}</Badge> : null}
            </h2>
            <PermissionList permissions={perms} {...(labels ? { labels } : {})} />
          </section>
          {listing.links?.length ? (
            <section className="flex flex-col gap-2" aria-label={t.links}>
              <h2 className="eyebrow">{t.links}</h2>
              <ul className="flex flex-col gap-1">
                {listing.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-body-sm text-nq-info-text underline-offset-2 hover:underline">
                      {l.label}
                      <ExternalLink aria-hidden className="size-3.5 rtl:-scale-x-100" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {listing.tags?.length ? (
            <section className="flex flex-col gap-2" aria-label={t.tags}>
              <h2 className="eyebrow">{t.tags}</h2>
              <div className="flex flex-wrap gap-1.5">
                {listing.tags.map((tag) => (
                  <Badge key={tag} variant="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="col-span-2 grid grid-cols-subgrid">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-foreground">{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ publish form */

export interface PublishFormProps {
  categories: CatalogCategory[];
  /** Permissions the author can declare. */
  permissionOptions?: MarketplacePermission[];
  /** Send it for review. Resolve to finish; return `{ error }` to show why it failed. */
  onSubmit: (draft: PublishDraft) => Promise<MarketplaceResult>;
  onCancel?: () => void;
  /** Longest allowed summary. Default 140. */
  summaryMax?: number;
  className?: string;
  labels?: Partial<MarketplaceLabels>;
}

const emptyDraft: PublishDraft = { name: "", summary: "", description: "", category: "", version: "1.0.0", repository: "", price: 0, tags: [], permissions: [] };

/** The submission form for a new extension: identity, category, version, source, price, tags and permissions. */
export function PublishForm({ categories, permissionOptions = [], onSubmit, onCancel, summaryMax = 140, className, labels }: PublishFormProps) {
  const { t, locale } = useT(labels);
  const id = useId();
  const [draft, setDraft] = useState<PublishDraft>(emptyDraft);
  const [paid, setPaid] = useState(false);
  const [errors, setErrors] = useState<PublishErrors>({});
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const set = <K extends keyof PublishDraft>(k: K, v: PublishDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const items = categories.map((c) => ({ value: c.id, label: c.label }));
  const err = (k: keyof PublishErrors) => (errors[k] ? t.errors[errors[k] as "required"] : undefined);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validateDraft({ ...draft, price: paid ? draft.price : 0 }, summaryMax);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setPending(true);
    setFormError(null);
    try {
      const res = await onSubmit({ ...draft, price: paid ? draft.price : 0 });
      if (res && res.error) setFormError(res.error);
      else setDone(true);
    } catch {
      setFormError(t.failed);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div data-slot="publish-form" className={cn("flex flex-col gap-3", className)}>
        <p role="status" className="rounded-card border border-border bg-card p-4 text-body text-foreground">
          {t.submitted}
        </p>
        {onCancel ? (
          <div>
            <Button variant="secondary" onClick={onCancel}>
              {t.cancel}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form data-slot="publish-form" noValidate onSubmit={submit} className={cn("flex min-w-0 flex-col gap-4", className)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field invalid={!!errors.name}>
          <FieldLabel>{t.name}</FieldLabel>
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} required autoComplete="off" />
          {errors.name ? <FieldError match>{err("name")}</FieldError> : null}
        </Field>
        <Field invalid={!!errors.category}>
          <FieldLabel>{t.categoryLabel}</FieldLabel>
          <Select items={items} value={draft.category || null} onValueChange={(v) => set("category", v ?? "")}>
            <SelectTrigger aria-invalid={!!errors.category || undefined}>
              <SelectValue placeholder={t.categoryPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {items.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category ? <FieldError match>{err("category")}</FieldError> : null}
        </Field>
      </div>
      <Field invalid={!!errors.summary}>
        <FieldLabel>{t.summary}</FieldLabel>
        <Input value={draft.summary} onChange={(e) => set("summary", e.target.value)} />
        <FieldDescription>
          {t.summaryHint(formatNumber(summaryMax, locale))} <bdi className="tabular-nums">{formatNumber(draft.summary.trim().length, locale)}</bdi>
        </FieldDescription>
        {errors.summary ? <FieldError match>{err("summary")}</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel>{t.description}</FieldLabel>
        <Textarea rows={4} value={draft.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field invalid={!!errors.version}>
          <FieldLabel>{t.versionLabel}</FieldLabel>
          <Input ltr value={draft.version} onChange={(e) => set("version", e.target.value)} placeholder="1.0.0" />
          {errors.version ? <FieldError match>{err("version")}</FieldError> : null}
        </Field>
        <Field invalid={!!errors.repository}>
          <FieldLabel>{t.repository}</FieldLabel>
          <Input ltr type="url" value={draft.repository} onChange={(e) => set("repository", e.target.value)} placeholder="https://github.com/acme/extension" />
          <FieldDescription>{t.repositoryHint}</FieldDescription>
          {errors.repository ? <FieldError match>{err("repository")}</FieldError> : null}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>{t.pricing}</FieldLabel>
          <ToggleGroup value={[paid ? "paid" : "free"]} onValueChange={(v) => v[0] && setPaid(v[0] === "paid")} aria-label={t.pricing}>
            <Toggle value="free">{t.pricingFree}</Toggle>
            <Toggle value="paid">{t.pricingPaid}</Toggle>
          </ToggleGroup>
        </Field>
        {paid ? (
          <Field invalid={!!errors.price}>
            <FieldLabel>{t.priceAmount}</FieldLabel>
            <Input ltr type="number" min={0} step="0.5" value={draft.price} onChange={(e) => set("price", Number(e.target.value))} />
            {errors.price ? <FieldError match>{err("price")}</FieldError> : null}
          </Field>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-label text-foreground" id={`${id}-tags`}>
          {t.tagsLabel}
        </span>
        <TagInput aria-labelledby={`${id}-tags`} value={draft.tags} onValueChange={(v) => set("tags", v)} placeholder={t.tagsPlaceholder} maxTags={6} />
      </div>
      {permissionOptions.length ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-label text-foreground">{t.permissionsLabel}</legend>
          <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            {permissionOptions.map((p) => (
              <li key={p.id} className="flex items-start gap-3 px-3 py-2">
                <Checkbox
                  id={`${id}-${p.id}`}
                  className="mt-0.5"
                  checked={draft.permissions.includes(p.id)}
                  onCheckedChange={(on) => set("permissions", on ? [...draft.permissions, p.id] : draft.permissions.filter((x) => x !== p.id))}
                />
                <label htmlFor={`${id}-${p.id}`} className="grid min-w-0 flex-1 cursor-pointer gap-0.5">
                  <span dir="auto" className="text-body-sm text-foreground">
                    {p.label}
                  </span>
                  {p.description ? (
                    <span dir="auto" className="text-caption text-muted-foreground">
                      {p.description}
                    </span>
                  ) : null}
                </label>
                <Badge variant={riskVariant[p.risk ?? "low"]}>{t.risk[p.risk ?? "low"]}</Badge>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}
      {formError ? (
        <p role="alert" className="text-body-sm text-nq-danger-text">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
            {t.cancel}
          </Button>
        ) : null}
        <Button type="submit" variant="primary" loading={pending}>
          <Upload aria-hidden />
          {pending ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ template gallery */

export interface TemplateGalleryProps {
  templates: MarketplaceTemplate[];
  categories: CatalogCategory[];
  /** Create something from the template. Resolve to finish; return `{ error }` to show why it failed. */
  onUse?: (template: MarketplaceTemplate) => Promise<MarketplaceResult>;
  className?: string;
  labels?: Partial<MarketplaceLabels>;
}

/** Ready-made starting points: a preview, name, summary and a "Use template" button, filtered by category. */
export function TemplateGallery({ templates, categories, onUse, className, labels }: TemplateGalleryProps) {
  const { t, locale } = useT(labels);
  const [category, setCategory] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const shown = category === "all" ? templates : templates.filter((x) => x.category === category);

  async function use(tpl: MarketplaceTemplate) {
    if (!onUse) return;
    setBusy(tpl.id);
    setError(null);
    try {
      const res = await onUse(tpl);
      if (res && res.error) setError({ id: tpl.id, message: res.error });
    } catch {
      setError({ id: tpl.id, message: t.failed });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div data-slot="template-gallery" className={cn("flex min-w-0 flex-col gap-4", className)}>
      <ChipGroup value={category} onValueChange={setCategory} aria-label={t.templateCategories}>
        <Chip value="all">{t.allTemplates}</Chip>
        {categories.map((c) => (
          <Chip key={c.id} value={c.id}>
            {c.label}
          </Chip>
        ))}
      </ChipGroup>
      {shown.length === 0 ? (
        <EmptyState title={t.noTemplates} description={t.noTemplatesBody} />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
          {shown.map((tpl) => {
            const Icon = tpl.icon ?? LayoutTemplate;
            return (
              <li key={tpl.id} className="min-w-0">
                <article data-template={tpl.id} className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-xs">
                  <div className="flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-border bg-secondary text-muted-foreground">
                    {tpl.preview ? <img src={tpl.preview} alt={tpl.previewAlt ?? ""} className="size-full object-cover" /> : <Icon aria-hidden className="size-10" />}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 dir="auto" className="text-label text-foreground">
                      {tpl.name}
                    </h3>
                    <p dir="auto" className="line-clamp-2 text-body-sm text-muted-foreground">
                      {tpl.summary}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                      <span className="min-w-0 truncate text-caption text-muted-foreground">
                        {tpl.uses !== undefined ? (
                          <>
                            <bdi>{formatNumber(tpl.uses, locale, { notation: "compact" })}</bdi> {t.uses}
                          </>
                        ) : (
                          tpl.author
                        )}
                      </span>
                      {onUse ? (
                        <Button size="sm" variant="secondary" loading={busy === tpl.id} onClick={() => void use(tpl)}>
                          {busy === tpl.id ? t.using : t.useTemplate}
                        </Button>
                      ) : null}
                    </div>
                    {error?.id === tpl.id ? (
                      <p role="alert" className="text-caption text-nq-danger-text">
                        {error.message}
                      </p>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ marketplace */

export interface MarketplaceProps {
  listings: MarketplaceListing[];
  categories: CatalogCategory[];
  /** Adds the Templates view and the gallery. */
  templates?: MarketplaceTemplate[];
  templateCategories?: CatalogCategory[];
  /** Permissions an author can declare in the publish form. */
  permissionOptions?: MarketplacePermission[];
  onInstall?: (listing: MarketplaceListing) => Promise<MarketplaceResult>;
  onUninstall?: (listing: MarketplaceListing) => Promise<MarketplaceResult>;
  onOpen?: (listing: MarketplaceListing) => void;
  /** Shows the Publish button and its form. */
  onPublish?: (draft: PublishDraft) => Promise<MarketplaceResult>;
  onUseTemplate?: (template: MarketplaceTemplate) => Promise<MarketplaceResult>;
  /** Called when a detail page opens or closes (`null`). */
  onSelectedChange?: (id: string | null) => void;
  className?: string;
  labels?: Partial<MarketplaceLabels> & { store?: Partial<CatalogLabels> };
}

/**
 * A store with a featured strip, categories and search (built on `CatalogStore`), a detail page for each
 * extension, a publish form and a template gallery. It calls no backend: pass data and async callbacks.
 */
export function Marketplace({ listings, categories, templates, templateCategories = [], permissionOptions, onInstall, onUninstall, onOpen, onPublish, onUseTemplate, onSelectedChange, className, labels }: MarketplaceProps) {
  const { store, ...own } = labels ?? {};
  const { t, locale } = useT(own);
  const [view, setView] = useState<"extensions" | "templates">("extensions");
  const [selected, setSelected] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [installed, setInstalled] = useState<Record<string, boolean>>({});
  const items = useMemo(() => listings.map((l) => ({ ...l, installed: installed[l.id] ?? l.installed ?? false })), [listings, installed]);
  const byId = useMemo(() => new Map(items.map((l) => [l.id, l])), [items]);
  const featured = useMemo(() => pickFeatured(items, 3), [items]);
  const open = selected ? byId.get(selected) : undefined;

  const select = (id: string | null) => {
    setSelected(id);
    onSelectedChange?.(id);
  };
  const install = onInstall
    ? async (item: CatalogItem) => {
        const res = await onInstall(byId.get(item.id) as MarketplaceListing);
        if (!(res && res.error)) setInstalled((m) => ({ ...m, [item.id]: true }));
        return res;
      }
    : undefined;
  const uninstall = onUninstall
    ? async (item: CatalogItem) => {
        const res = await onUninstall(byId.get(item.id) as MarketplaceListing);
        if (!(res && res.error)) setInstalled((m) => ({ ...m, [item.id]: false }));
        return res;
      }
    : undefined;

  if (open) {
    return (
      <MarketplaceDetail
        listing={open}
        onBack={() => select(null)}
        {...(install ? { onInstall: install } : {})}
        {...(uninstall ? { onUninstall: uninstall } : {})}
        {...(onOpen ? { onOpen: (l: MarketplaceListing) => onOpen(l) } : {})}
        className={className}
        labels={own}
      />
    );
  }

  const switcher =
    templates || onPublish ? (
      <div className="flex flex-wrap items-center justify-between gap-2">
        {templates ? (
          <ToggleGroup value={[view]} onValueChange={(v) => v[0] && setView(v[0] as "extensions" | "templates")} aria-label={t.view}>
            <Toggle value="extensions">
              <Store aria-hidden />
              {t.extensions}
            </Toggle>
            <Toggle value="templates">
              <LayoutTemplate aria-hidden />
              {t.templates}
            </Toggle>
          </ToggleGroup>
        ) : (
          <span />
        )}
        {onPublish ? (
          <Button variant="primary" onClick={() => setPublishing(true)}>
            <Upload aria-hidden />
            {t.publish}
          </Button>
        ) : null}
      </div>
    ) : null;

  return (
    <div data-slot="marketplace" className={cn("flex min-w-0 flex-col gap-5", className)}>
      {switcher}
      {view === "templates" && templates ? (
        <TemplateGallery templates={templates} categories={templateCategories} {...(onUseTemplate ? { onUse: onUseTemplate } : {})} labels={own} />
      ) : (
        <>
          {featured.length ? (
            <section aria-label={t.featured} className="flex flex-col gap-2">
              <h2 className="eyebrow">{t.featured}</h2>
              <ul className="grid gap-3 md:grid-cols-3">
                {featured.map((f) => (
                  <li key={f.id} className="min-w-0">
                    <article data-featured={f.id} className="relative flex h-full items-start gap-3 rounded-card border border-border bg-secondary p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nq-focus hover:bg-nq-hover">
                      <CatalogIcon item={f} className="size-12" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-label text-foreground">
                          <button type="button" onClick={() => select(f.id)} className="text-start outline-none after:absolute after:inset-0 after:content-['']">
                            {f.name}
                          </button>
                        </h3>
                        <p dir="auto" className="line-clamp-2 text-body-sm text-muted-foreground">
                          {f.summary}
                        </p>
                        {f.rating !== undefined ? <Rating value={f.rating} className="mt-1" {...(f.ratingCount !== undefined ? { count: f.ratingCount } : {})} /> : null}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <CatalogStore
            items={items}
            categories={categories}
            onSelect={(i) => select(i.id)}
            {...(install ? { onInstall: install } : {})}
            {...(uninstall ? { onUninstall: uninstall } : {})}
            {...(onOpen ? { onOpen: (i: CatalogItem) => onOpen(byId.get(i.id) as MarketplaceListing) } : {})}
            {...(store ? { labels: store } : {})}
          />
        </>
      )}
      {onPublish ? (
        <Dialog open={publishing} onOpenChange={setPublishing}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.publishTitle}</DialogTitle>
              <DialogDescription>{t.publishBody}</DialogDescription>
            </DialogHeader>
            <PublishForm categories={categories} {...(permissionOptions ? { permissionOptions } : {})} onSubmit={onPublish} onCancel={() => setPublishing(false)} labels={own} />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

/** A placeholder tile for a screenshot that has not loaded. */
export function ScreenshotPlaceholder({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex aspect-video items-center justify-center rounded-card border border-border bg-muted text-muted-foreground", className)}>
      <ImageIcon className="size-8" />
      <Package className="sr-only" />
    </div>
  );
}
