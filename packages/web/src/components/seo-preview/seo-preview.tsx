"use client";

import { ChevronRight, ImageIcon, Monitor, Smartphone } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Field, FieldLabel, Input, Textarea } from "../field";
import { Meter } from "../progress";
import { Status } from "../status";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { Toggle, ToggleGroup } from "../toggle-group";
import { type LengthStatus, type SeoField, breadcrumbFor, hostOf, lengthMeter, truncateAt } from "./seo-math";

const STRINGS = {
  en: {
    title: "SEO preview",
    description: "How this page looks in search results and when it is shared.",
    google: "Google",
    openGraph: "Open Graph",
    x: "X",
    whatsapp: "WhatsApp",
    linkedin: "LinkedIn",
    desktop: "Desktop",
    mobile: "Mobile",
    device: "Device",
    fieldTitle: "Title",
    fieldDescription: "Meta description",
    fieldImage: "Share image URL",
    fieldUrl: "Page URL",
    length: (n: number, max: number) => `${n} of ${max} characters`,
    empty: "Empty",
    short: "Too short",
    good: "Good length",
    long: (n: number) => (n === 1 ? "1 character too long" : `${n} characters too long`),
    lengthOf: (what: string) => `${what} length`,
    noTitle: "Untitled page",
    noDescription: "No description. Search engines will pick text from the page.",
    noImage: "No share image",
    siteFallback: "Your site",
  },
  ar: {
    title: "معاينة SEO",
    description: "كيف تظهر هذه الصفحة في نتائج البحث وعند مشاركتها.",
    google: "Google",
    openGraph: "Open Graph",
    x: "X",
    whatsapp: "WhatsApp",
    linkedin: "LinkedIn",
    desktop: "سطح المكتب",
    mobile: "الجوال",
    device: "الجهاز",
    fieldTitle: "العنوان",
    fieldDescription: "الوصف التعريفي",
    fieldImage: "رابط صورة المشاركة",
    fieldUrl: "رابط الصفحة",
    length: (n: number, max: number) => `${n} من ${max} حرفًا`,
    empty: "فارغ",
    short: "قصير جدًا",
    good: "طول مناسب",
    long: (n: number) => (n === 1 ? "حرف واحد زائد" : `${n} حرفًا زائدًا`),
    lengthOf: (what: string) => `طول ${what}`,
    noTitle: "صفحة بلا عنوان",
    noDescription: "لا وصف. ستختار محركات البحث نصًا من الصفحة.",
    noImage: "لا صورة للمشاركة",
    siteFallback: "موقعك",
  },
};

export type SeoPreviewLabels = typeof STRINGS.en;
export type SeoPreviewPlatform = "google" | "open-graph" | "x" | "whatsapp" | "linkedin";

export interface SeoMeta {
  title: string;
  description: string;
  /** The full page URL. Shown left-to-right. */
  url: string;
  /** Site name for the result header and share cards. Default: the host. */
  siteName?: string;
  /** Favicon URL. Without one the first letter of the site name is drawn. */
  favicon?: string;
  /** Share image (Open Graph and X card). Without one a placeholder is drawn. */
  image?: string;
  /** Replaces the breadcrumb built from the URL, e.g. ["nasaq.dev", "Blog", "RTL guide"]. */
  breadcrumb?: readonly string[];
}

const TONE: Record<LengthStatus, "neutral" | "warning" | "success" | "danger"> = { empty: "neutral", short: "warning", good: "success", long: "danger" };

/* ------------------------------------------------------------------ length meter */

export interface LengthMeterProps {
  field: SeoField;
  text: string;
  /** Visible name, e.g. "Title". Default: the field name. */
  label?: ReactNode;
  className?: string;
  labels?: Partial<SeoPreviewLabels>;
}

/** A character-count meter for a title or meta description: the count against the limit, a toned bar and the verdict in words. */
export function LengthMeter({ field, text, label, className, labels }: LengthMeterProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const m = lengthMeter(field, text);
  const tone = TONE[m.status];
  const verdict = m.status === "long" ? t.long(m.over) : t[m.status];
  const name = typeof label === "string" ? label : field === "title" ? t.fieldTitle : t.fieldDescription;
  return (
    <div data-slot="length-meter" data-status={m.status} className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-caption">
        <span className="min-w-0 truncate text-muted-foreground">{label ?? name}</span>
        <bdi className="shrink-0 tabular-nums text-muted-foreground">{t.length(m.length, m.max)}</bdi>
      </div>
      <Meter value={m.length} min={0} max={m.max} tone={tone === "neutral" ? "default" : tone} size="sm" aria-label={t.lengthOf(name)} valueText={t.length(m.length, m.max)} showValue={false} />
      <Status tone={tone} className="text-caption">
        {verdict}
      </Status>
    </div>
  );
}

/* ------------------------------------------------------------------ previews */

function Favicon({ meta, className }: { meta: SeoMeta; className?: string }) {
  const site = meta.siteName || hostOf(meta.url);
  return meta.favicon ? (
    <img src={meta.favicon} alt="" className={cn("size-[18px] shrink-0 rounded-full", className)} />
  ) : (
    <span aria-hidden className={cn("flex size-[18px] shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold uppercase text-muted-foreground", className)}>
      {[...site][0]}
    </span>
  );
}

function ShareImage({ meta, t, className }: { meta: SeoMeta; t: SeoPreviewLabels; className?: string }) {
  return meta.image ? (
    <img src={meta.image} alt="" className={cn("aspect-[1.91/1] w-full object-cover", className)} />
  ) : (
    <div className={cn("flex aspect-[1.91/1] w-full flex-col items-center justify-center gap-1 bg-secondary text-caption text-muted-foreground", className)}>
      <ImageIcon aria-hidden className="size-6" />
      {t.noImage}
    </div>
  );
}

function GooglePreview({ meta, mobile, t }: { meta: SeoMeta; mobile: boolean; t: SeoPreviewLabels }) {
  const site = meta.siteName || hostOf(meta.url) || t.siteFallback;
  const crumbs = breadcrumbFor(meta.url, meta.breadcrumb);
  const title = meta.title.trim() ? truncateAt(meta.title, mobile ? 70 : 60) : t.noTitle;
  const desc = meta.description.trim() ? truncateAt(meta.description, mobile ? 120 : 160) : t.noDescription;
  return (
    <div data-slot="seo-google" data-device={mobile ? "mobile" : "desktop"} className={cn("flex flex-col gap-1 rounded-card border border-border bg-card p-4", mobile ? "w-full max-w-[22rem]" : "max-w-[41rem]")}>
      <div className="flex items-center gap-2.5">
        <Favicon meta={meta} className="size-7 border border-border" />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-body-sm text-foreground" dir="auto">
            {site}
          </span>
          <span dir="ltr" className="flex min-w-0 items-center gap-1 text-caption text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={`${c}-${i}`} className="flex min-w-0 items-center gap-1">
                {i > 0 ? <ChevronRight aria-hidden className="size-3 shrink-0" /> : null}
                <span className="truncate">{c}</span>
              </span>
            ))}
          </span>
        </div>
      </div>
      <p dir="auto" className={cn("mt-1 font-medium text-nq-info-text", mobile ? "line-clamp-2 text-body" : "line-clamp-1 text-h5")}>
        {title}
      </p>
      <p dir="auto" className={cn("text-body-sm text-muted-foreground", mobile ? "line-clamp-3" : "line-clamp-2")}>
        {desc}
      </p>
    </div>
  );
}

function OpenGraphPreview({ meta, t }: { meta: SeoMeta; t: SeoPreviewLabels }) {
  return (
    <div data-slot="seo-open-graph" className="w-full max-w-[32rem] overflow-hidden rounded-card border border-border bg-card">
      <ShareImage meta={meta} t={t} />
      <div className="flex flex-col gap-0.5 border-t border-border bg-secondary/50 p-3">
        <span dir="ltr" className="truncate text-start text-caption uppercase text-muted-foreground">
          {hostOf(meta.url)}
        </span>
        <p dir="auto" className="line-clamp-2 text-label text-foreground">
          {meta.title.trim() || t.noTitle}
        </p>
        <p dir="auto" className="line-clamp-2 text-caption text-muted-foreground">
          {meta.description.trim() || t.noDescription}
        </p>
      </div>
    </div>
  );
}

function XPreview({ meta, t }: { meta: SeoMeta; t: SeoPreviewLabels }) {
  return (
    <div data-slot="seo-x" className="w-full max-w-[32rem]">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <ShareImage meta={meta} t={t} className="aspect-[2/1]" />
        <span dir="auto" className="absolute bottom-2 start-2 max-w-[80%] truncate rounded-md bg-foreground/70 px-1.5 py-0.5 text-caption text-background">
          {meta.title.trim() || t.noTitle}
        </span>
      </div>
      <p dir="ltr" className="mt-1 px-1 text-start text-caption text-muted-foreground">
        {hostOf(meta.url)}
      </p>
    </div>
  );
}

function WhatsAppPreview({ meta, t }: { meta: SeoMeta; t: SeoPreviewLabels }) {
  return (
    <div data-slot="seo-whatsapp" className="flex w-full max-w-[24rem] flex-col gap-1 rounded-card bg-secondary p-2">
      <div className="overflow-hidden rounded-md bg-card">
        <ShareImage meta={meta} t={t} />
        <div className="flex flex-col gap-0.5 p-2.5">
          <p dir="auto" className="line-clamp-2 text-label text-foreground">
            {meta.title.trim() || t.noTitle}
          </p>
          <p dir="auto" className="line-clamp-2 text-caption text-muted-foreground">
            {meta.description.trim() || t.noDescription}
          </p>
          <span dir="ltr" className="truncate text-start text-caption text-muted-foreground">
            {hostOf(meta.url)}
          </span>
        </div>
      </div>
      <span dir="ltr" className="truncate px-1 text-start text-caption text-nq-info-text">
        {meta.url}
      </span>
    </div>
  );
}

function LinkedInPreview({ meta, t }: { meta: SeoMeta; t: SeoPreviewLabels }) {
  return (
    <div data-slot="seo-linkedin" className="w-full max-w-[32rem] overflow-hidden rounded-card border border-border bg-card">
      <ShareImage meta={meta} t={t} />
      <div className="flex flex-col gap-0.5 p-3">
        <p dir="auto" className="line-clamp-2 text-label text-foreground">
          {meta.title.trim() || t.noTitle}
        </p>
        <span dir="ltr" className="truncate text-start text-caption text-muted-foreground">
          {hostOf(meta.url)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ component */

export interface SeoPreviewProps {
  value?: SeoMeta;
  defaultValue?: SeoMeta;
  /** Turns on the title, description and image fields. Called on every change. */
  onValueChange?: (value: SeoMeta) => void;
  /** Which preview shows first. Default "google". */
  defaultPlatform?: SeoPreviewPlatform;
  /** Show the fields even when `onValueChange` is missing. Default: only with `onValueChange`. */
  editable?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  labels?: Partial<SeoPreviewLabels>;
}

const EMPTY: SeoMeta = { title: "", description: "", url: "" };

/**
 * A Google result (desktop and mobile) and Open Graph, X, WhatsApp and LinkedIn share cards for one page, with the
 * title and description length meters and optional editing fields. Platform names are text: no logo is drawn.
 */
export function SeoPreview({ value: valueProp, defaultValue, onValueChange, defaultPlatform = "google", editable, title, description, className, labels }: SeoPreviewProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const [state, setState] = useState<SeoMeta>(defaultValue ?? EMPTY);
  const [platform, setPlatform] = useState<SeoPreviewPlatform>(defaultPlatform);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const meta = valueProp ?? state;
  const canEdit = editable ?? !!onValueChange;
  const set = (patch: Partial<SeoMeta>) => {
    const next = { ...meta, ...patch };
    if (valueProp === undefined) setState(next);
    onValueChange?.(next);
  };
  return (
    <Card data-slot="seo-preview" className={className}>
      <CardHeader>
        <CardTitle as="h3">{title ?? t.title}</CardTitle>
        <CardDescription>{description ?? t.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Tabs value={platform} onValueChange={(v) => setPlatform(v as SeoPreviewPlatform)}>
          <TabsList variant="underline">
            <TabsTab value="google">{t.google}</TabsTab>
            <TabsTab value="open-graph">{t.openGraph}</TabsTab>
            <TabsTab value="x">{t.x}</TabsTab>
            <TabsTab value="whatsapp">{t.whatsapp}</TabsTab>
            <TabsTab value="linkedin">{t.linkedin}</TabsTab>
          </TabsList>
          <TabsPanel value="google" className="flex flex-col gap-3 pt-4">
            <ToggleGroup value={[device]} onValueChange={(v) => v[0] && setDevice(v[0] as "desktop" | "mobile")} aria-label={t.device}>
              <Toggle value="desktop">
                <Monitor aria-hidden />
                {t.desktop}
              </Toggle>
              <Toggle value="mobile">
                <Smartphone aria-hidden />
                {t.mobile}
              </Toggle>
            </ToggleGroup>
            <GooglePreview meta={meta} mobile={device === "mobile"} t={t} />
          </TabsPanel>
          <TabsPanel value="open-graph" className="pt-4">
            <OpenGraphPreview meta={meta} t={t} />
          </TabsPanel>
          <TabsPanel value="x" className="pt-4">
            <XPreview meta={meta} t={t} />
          </TabsPanel>
          <TabsPanel value="whatsapp" className="pt-4">
            <WhatsAppPreview meta={meta} t={t} />
          </TabsPanel>
          <TabsPanel value="linkedin" className="pt-4">
            <LinkedInPreview meta={meta} t={t} />
          </TabsPanel>
        </Tabs>
        <div className="grid gap-4 md:grid-cols-2">
          {canEdit ? (
            <>
              <Field>
                <FieldLabel>{t.fieldTitle}</FieldLabel>
                <Input dir="auto" value={meta.title} onChange={(e) => set({ title: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel>{t.fieldUrl}</FieldLabel>
                <Input ltr value={meta.url} onChange={(e) => set({ url: e.target.value })} />
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel>{t.fieldDescription}</FieldLabel>
                <Textarea dir="auto" rows={3} value={meta.description} onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel>{t.fieldImage}</FieldLabel>
                <Input ltr value={meta.image ?? ""} onChange={(e) => set({ image: e.target.value || undefined })} />
              </Field>
            </>
          ) : null}
          <LengthMeter field="title" text={meta.title} labels={labels} />
          <LengthMeter field="description" text={meta.description} labels={labels} />
        </div>
      </CardContent>
    </Card>
  );
}
