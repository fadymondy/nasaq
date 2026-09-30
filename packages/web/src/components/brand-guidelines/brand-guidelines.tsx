"use client";

import type { BrandKey } from "@nasaq/brands";
import { Check, Download, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card } from "../card";
import { CopyButton } from "../copy-button";
import { ProductLogo, ProductMark } from "../product-mark";
import { ScrollFade, UserText } from "../text-utilities";
import { brandMarkDownloads, brandPalette } from "./brand-guidelines-data";
import { type BrandColor, type BrandDownload, brandColorCopyValue, ogSizeLabel } from "./brand-guidelines-logic";

const STRINGS = {
  en: {
    guidelines: "Brand guidelines",
    sections: "Sections",
    logo: "Logo",
    logoIntro: "The mark is drawn from the brand's own specification. Use these files as they are.",
    color: "Colour",
    colorIntro: "Copy a value and use it exactly. Do not adjust a brand colour to suit a layout.",
    typography: "Typography",
    typographyIntro: "The typefaces the brand is set in. Font files are not shared here. Get them from their licence holder.",
    usage: "Usage",
    usageIntro: "How the marks and colours are and are not used.",
    social: "Social cards",
    socialIntro: "What a link to the product looks like when it is shared.",
    download: "Download",
    downloadFor: "Download {name}",
    onLight: "Mark on a light ground",
    onDark: "Mark on a dark ground",
    copy: "Copy {value}",
    copied: "Copied {value}",
    sample: "Aa",
    licence: "Licence",
    weights: "Weights",
    do: "Do",
    dont: "Don't",
    role: "Role",
    "brand-light": "Brand, light",
    "brand-dark": "Brand, dark",
    "action-light": "Action, light",
    "action-dark": "Action, dark",
    accent: "Accent",
    noSections: "Nothing to show yet.",
    defaultDos: [
      { id: "d1", title: "Use the mark as supplied", description: "Take the file from this page. It is generated from the brand's specification." },
      { id: "d2", title: "Keep clear space", description: "Leave at least the width of one cube on every side." },
      { id: "d3", title: "Use the colour pairs listed", description: "The dark-ground colours are for dark grounds, the light ones for light." },
    ],
    defaultDonts: [
      { id: "n1", title: "Do not recolour the mark", description: "Its body and its accent cube keep their colours on every ground." },
      { id: "n2", title: "Do not mirror, stretch or redraw it", description: "It does not flip in right-to-left layouts." },
      { id: "n3", title: "Do not swap in a generic icon", description: "If the mark is unavailable, use the brand name as text." },
      { id: "n4", title: "Do not invent colours", description: "Use only the palette on this page." },
    ],
  },
  ar: {
    guidelines: "دليل الهوية",
    sections: "الأقسام",
    logo: "الشعار",
    logoIntro: "الشعار مرسوم من مواصفات العلامة نفسها. استخدم هذه الملفات كما هي.",
    color: "الألوان",
    colorIntro: "انسخ القيمة واستخدمها كما هي. لا تعدّل لون العلامة ليناسب التصميم.",
    typography: "الخطوط",
    typographyIntro: "الخطوط التي تُكتب بها العلامة. ملفات الخطوط غير متاحة هنا. احصل عليها من صاحب الترخيص.",
    usage: "الاستخدام",
    usageIntro: "كيف تُستخدم الشعارات والألوان وكيف لا تُستخدم.",
    social: "بطاقات المشاركة",
    socialIntro: "كيف يبدو رابط المنتج عند مشاركته.",
    download: "تنزيل",
    downloadFor: "تنزيل {name}",
    onLight: "الشعار على خلفية فاتحة",
    onDark: "الشعار على خلفية داكنة",
    copy: "نسخ {value}",
    copied: "تم نسخ {value}",
    sample: "أبج",
    licence: "الترخيص",
    weights: "الأوزان",
    do: "افعل",
    dont: "لا تفعل",
    role: "الدور",
    "brand-light": "لون العلامة، فاتح",
    "brand-dark": "لون العلامة، داكن",
    "action-light": "لون الإجراء، فاتح",
    "action-dark": "لون الإجراء، داكن",
    accent: "اللون المميّز",
    noSections: "لا شيء للعرض بعد.",
    defaultDos: [
      { id: "d1", title: "استخدم الشعار كما هو", description: "خذ الملف من هذه الصفحة. فهو مولَّد من مواصفات العلامة." },
      { id: "d2", title: "اترك مساحة حرة", description: "اترك عرض مكعب واحد على الأقل من كل جانب." },
      { id: "d3", title: "استخدم أزواج الألوان المذكورة", description: "ألوان الخلفية الداكنة للخلفيات الداكنة، والفاتحة للفاتحة." },
    ],
    defaultDonts: [
      { id: "n1", title: "لا تغيّر ألوان الشعار", description: "يحتفظ جسمه ومكعبه المميّز بلونيهما على كل خلفية." },
      { id: "n2", title: "لا تعكسه ولا تمطّه ولا تعِد رسمه", description: "لا ينقلب في التخطيطات من اليمين إلى اليسار." },
      { id: "n3", title: "لا تستبدله بأيقونة عامة", description: "إن لم يتوفر الشعار فاستخدم اسم العلامة نصًا." },
      { id: "n4", title: "لا تخترع ألوانًا", description: "استخدم اللوحة الواردة في هذه الصفحة فقط." },
    ],
  },
};

export type BrandGuidelinesLabels = Partial<Omit<(typeof STRINGS)["en"], "defaultDos" | "defaultDonts">> & { defaultDos?: BrandRule[]; defaultDonts?: BrandRule[] };

function useStrings(labels?: BrandGuidelinesLabels) {
  const ar = useOptionalNasaq()?.locale?.startsWith("ar") ?? false;
  return { ar, t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as (typeof STRINGS)["en"] };
}

const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

/* ------------------------------------------------------------- types */

/** A downloadable brand file. Pass the ones you have; `preview` draws it instead of the default mark. */
export interface BrandAsset extends Omit<BrandDownload, "ground"> {
  description?: string;
  ground?: "light" | "dark";
  /** What to show in the tile. Default: the brand's mark on `ground`. */
  preview?: ReactNode;
}

export interface BrandFont {
  id: string;
  /** The family name, as the licence holder calls it. */
  family: string;
  /** What it is used for ("Headings and body", "Numbers and labels"). */
  role: string;
  /** A line set in the font. It uses the app's own faces, so it only matches when the font is loaded. */
  sample?: string;
  kind?: "sans" | "mono";
  weights?: string;
  /** One line about the licence, for example "Licensed to Fady Mondy. Not for redistribution." */
  licence?: string;
  /** Where to get the font: the foundry or licence page. */
  href?: string;
}

export interface BrandRule {
  id: string;
  title: string;
  description?: string;
  /** An example the caller supplies. Never draw a distorted logo here. */
  example?: ReactNode;
}

export interface BrandOgCard {
  id: string;
  title: string;
  description?: string;
  /** The finished image. Without it a live layout with the brand's mark and this text is drawn. */
  image?: string;
  imageAlt?: string;
  /** Default 1200 × 630. */
  size?: string | readonly [number, number];
  /** Download link for the finished image. */
  href?: string;
  filename?: string;
  /** Brand for the drawn layout. Default: the page's `brand`. */
  brand?: BrandKey | (string & {});
}

/* ------------------------------------------------------------- parts */

export interface BrandAssetCardProps extends Omit<ComponentProps<typeof Card>, "children"> {
  asset: BrandAsset;
  brand?: BrandKey | (string & {});
  onDownload?: (asset: BrandAsset) => void;
  labels?: BrandGuidelinesLabels;
}

/** One downloadable file on a light or dark ground, with the file type and a download link. */
export function BrandAssetCard({ asset, brand, onDownload, labels, className, ...props }: BrandAssetCardProps) {
  const { t } = useStrings(labels);
  const dark = asset.ground === "dark";
  return (
    <Card data-slot="brand-asset-card" className={cn("overflow-hidden", className)} {...props}>
      <div data-theme={dark ? "dark" : "light"} className="flex aspect-[16/10] items-center justify-center border-b border-border bg-background p-6">
        {asset.preview ?? <ProductMark brand={brand} size={72} onDark={dark} title="" />}
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2 text-label text-foreground">
            <UserText className="truncate">{asset.name}</UserText>
            <Badge variant="outline">{asset.format}</Badge>
          </span>
          {asset.description ? <span className="text-caption text-muted-foreground">{asset.description}</span> : null}
        </div>
        <Button variant="secondary" size="sm" nativeButton={false} aria-label={fill(t.downloadFor, { name: asset.name })} render={<a href={asset.href} download={asset.filename} onClick={() => onDownload?.(asset)} />}>
          <Download aria-hidden />
          {t.download}
        </Button>
      </div>
    </Card>
  );
}

export interface BrandSwatchProps extends Omit<ComponentProps<"div">, "children" | "color"> {
  color: BrandColor;
  labels?: BrandGuidelinesLabels;
}

/** One colour: the fill, its name and role, and its value with a button that copies it exactly. */
export function BrandSwatch({ color, labels, className, ...props }: BrandSwatchProps) {
  const { t } = useStrings(labels);
  const name = color.name ?? (t as unknown as Record<string, string>)[color.id] ?? color.id;
  const value = brandColorCopyValue(color);
  return (
    <div data-slot="brand-swatch" className={cn("flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card", className)} {...props}>
      <div className="flex h-20 items-end justify-between p-3" style={{ backgroundColor: color.value }}>
        {color.onColor ? (
          <span className="text-h3" style={{ color: color.onColor }}>
            {t.sample}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-label text-foreground">{name}</span>
          <bdi dir="ltr" className="font-mono text-caption uppercase text-muted-foreground">
            {value}
          </bdi>
          {color.usage ? <span className="mt-1 text-caption text-muted-foreground">{color.usage}</span> : null}
        </div>
        <CopyButton value={value} label={fill(t.copy, { value })} copiedLabel={fill(t.copied, { value })} size="icon-sm" />
      </div>
    </div>
  );
}

export interface BrandDoDontProps extends Omit<ComponentProps<"div">, "children"> {
  dos: readonly BrandRule[];
  donts: readonly BrandRule[];
  labels?: BrandGuidelinesLabels;
}

/** Two columns of rules, each item with a check or a cross and a word ("Do", "Don't"), so meaning never rests on colour. */
export function BrandDoDont({ dos, donts, labels, className, ...props }: BrandDoDontProps) {
  const { t } = useStrings(labels);
  const column = (kind: "do" | "dont", rules: readonly BrandRule[]) => (
    <section aria-label={kind === "do" ? t.do : t.dont} className="flex min-w-0 flex-col gap-3">
      <h4 className={cn("flex items-center gap-2 text-label", kind === "do" ? "text-nq-success-text" : "text-nq-danger-text")}>
        {kind === "do" ? <Check aria-hidden className="size-4" /> : <X aria-hidden className="size-4" />}
        {kind === "do" ? t.do : t.dont}
      </h4>
      <ul className="flex flex-col gap-3">
        {rules.map((rule) => (
          <li key={rule.id} className={cn("flex flex-col gap-1 rounded-card border bg-card p-3", kind === "do" ? "border-nq-success/40" : "border-nq-danger/40")}>
            {rule.example ? <div className="mb-1 flex items-center justify-center rounded-control bg-secondary p-4">{rule.example}</div> : null}
            <span className="text-label text-foreground">{rule.title}</span>
            {rule.description ? <span className="text-body-sm text-muted-foreground">{rule.description}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <div data-slot="brand-do-dont" className={cn("grid gap-6 sm:grid-cols-2", className)} {...props}>
      {column("do", dos)}
      {column("dont", donts)}
    </div>
  );
}

export interface BrandOgCardViewProps extends Omit<ComponentProps<"figure">, "children"> {
  card: BrandOgCard;
  brand?: BrandKey | (string & {});
  labels?: BrandGuidelinesLabels;
}

/** A social share card: the finished image when you have one, otherwise a live layout with the mark and the text. */
export function BrandOgCardView({ card, brand, labels, className, ...props }: BrandOgCardViewProps) {
  const { t } = useStrings(labels);
  const size = card.size ?? [1200, 630];
  const ratio = Array.isArray(size) ? `${size[0]} / ${size[1]}` : "1200 / 630";
  return (
    <figure data-slot="brand-og-card" className={cn("flex min-w-0 flex-col gap-2", className)} {...props}>
      <div className="overflow-hidden rounded-card border border-border bg-card" style={{ aspectRatio: ratio }}>
        {card.image ? (
          <img src={card.image} alt={card.imageAlt ?? card.title} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col justify-between gap-2 p-[6%]">
            <ProductLogo brand={card.brand ?? brand} size={28} />
            <div className="flex flex-col gap-1">
              <UserText block lines={2} className="text-h2 text-foreground">
                {card.title}
              </UserText>
              {card.description ? (
                <UserText block lines={2} className="text-body-sm text-muted-foreground">
                  {card.description}
                </UserText>
              ) : null}
            </div>
          </div>
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-3 text-caption text-muted-foreground">
        <span className="flex items-center gap-2">
          <UserText className="text-label text-foreground">{card.title}</UserText>
          <bdi dir="ltr" className="tabular-nums">
            {ogSizeLabel(card.size)}
          </bdi>
        </span>
        {card.href ? (
          <Button variant="ghost" size="sm" nativeButton={false} aria-label={fill(t.downloadFor, { name: card.title })} render={<a href={card.href} download={card.filename} />}>
            <Download aria-hidden />
            {t.download}
          </Button>
        ) : null}
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------- page */

export interface BrandGuidelinesProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  /** The brand this page documents. Its mark, palette and downloads come from the brand package. */
  brand: BrandKey | (string & {});
  /** Page title. Default: the guidelines label. */
  title?: ReactNode;
  /** One or two sentences about the brand, above the sections. */
  intro?: ReactNode;
  /** Logo downloads. Default: the official mark on a light and a dark ground, generated by the brand package. */
  assets?: readonly BrandAsset[];
  /** Colours. Default: the brand's own palette. Never invent one here. */
  colors?: readonly BrandColor[];
  fonts?: readonly BrandFont[];
  /** Rules. Default: the built-in logo and colour rules. Pass `[]` to hide a column. */
  dos?: readonly BrandRule[];
  donts?: readonly BrandRule[];
  ogCards?: readonly BrandOgCard[];
  onDownload?: (asset: BrandAsset) => void;
  labels?: BrandGuidelinesLabels;
}

/**
 * A brand guidelines page: the logo with downloads, the palette with copyable values, typography, do and don't, and the
 * social cards. It shows the assets you pass in, and by default the brand package's own mark and palette. It never
 * draws a logo of its own and never offers font files.
 */
export function BrandGuidelines({ brand, title, intro, assets, colors, fonts = [], dos, donts, ogCards = [], onDownload, labels, className, ...props }: BrandGuidelinesProps) {
  const { t } = useStrings(labels);
  const id = useId();
  const downloads: readonly BrandAsset[] = assets ?? brandMarkDownloads(brand, { light: t.onLight, dark: t.onDark });
  const palette = colors ?? brandPalette(brand);
  const doList = dos ?? t.defaultDos;
  const dontList = donts ?? t.defaultDonts;

  const sections: { key: string; label: string; show: boolean }[] = [
    { key: "logo", label: t.logo, show: downloads.length > 0 },
    { key: "color", label: t.color, show: palette.length > 0 },
    { key: "typography", label: t.typography, show: fonts.length > 0 },
    { key: "usage", label: t.usage, show: doList.length + dontList.length > 0 },
    { key: "social", label: t.social, show: ogCards.length > 0 },
  ];
  const visible = sections.filter((s) => s.show);
  const heading = (key: string, label: string, intro: string) => (
    <div className="flex flex-col gap-1">
      <h2 id={`${id}-${key}`} className="text-h2 text-foreground">
        {label}
      </h2>
      <p className="max-w-prose text-body text-muted-foreground">{intro}</p>
    </div>
  );

  return (
    <div data-slot="brand-guidelines" className={cn("flex min-w-0 flex-col gap-10", className)} {...props}>
      <header className="flex flex-col gap-4">
        <ProductLogo brand={brand} size={40} />
        <h1 className="text-h1 text-foreground">{title ?? t.guidelines}</h1>
        {intro ? <p className="max-w-prose text-body text-muted-foreground">{intro}</p> : null}
        {visible.length > 1 ? (
          <nav aria-label={t.sections}>
            <ScrollFade label={t.sections}>
              {visible.map((s) => (
                <Button key={s.key} variant="secondary" size="sm" nativeButton={false} render={<a href={`#${id}-${s.key}`} />}>
                  {s.label}
                </Button>
              ))}
            </ScrollFade>
          </nav>
        ) : null}
      </header>

      {downloads.length ? (
        <section aria-labelledby={`${id}-logo`} className="flex flex-col gap-4">
          {heading("logo", t.logo, t.logoIntro)}
          <div className="grid gap-4 sm:grid-cols-2">
            {downloads.map((asset) => (
              <BrandAssetCard key={asset.id} asset={asset} brand={brand} onDownload={onDownload} labels={labels} />
            ))}
          </div>
        </section>
      ) : null}

      {palette.length ? (
        <section aria-labelledby={`${id}-color`} className="flex flex-col gap-4">
          {heading("color", t.color, t.colorIntro)}
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
            {palette.map((color) => (
              <BrandSwatch key={color.id} color={color} labels={labels} />
            ))}
          </div>
        </section>
      ) : null}

      {fonts.length ? (
        <section aria-labelledby={`${id}-typography`} className="flex flex-col gap-4">
          {heading("typography", t.typography, t.typographyIntro)}
          <ul className="grid gap-4 sm:grid-cols-2">
            {fonts.map((font) => (
              <li key={font.id} className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-card p-4">
                <span className="flex items-center justify-between gap-2">
                  <bdi dir="ltr" className="text-label text-foreground">
                    {font.family}
                  </bdi>
                  <Badge variant="outline">{font.role}</Badge>
                </span>
                {font.sample ? (
                  <UserText block className={cn("text-h2 text-foreground", font.kind === "mono" ? "font-mono" : "font-sans")}>
                    {font.sample}
                  </UserText>
                ) : null}
                <dl className="flex flex-col gap-0.5 text-caption text-muted-foreground">
                  {font.weights ? (
                    <div className="flex gap-2">
                      <dt>{t.weights}</dt>
                      <dd dir="ltr">{font.weights}</dd>
                    </div>
                  ) : null}
                  {font.licence ? (
                    <div className="flex gap-2">
                      <dt>{t.licence}</dt>
                      <dd>{font.href ? <a className="underline underline-offset-4" href={font.href} target="_blank" rel="noopener noreferrer">{font.licence}</a> : font.licence}</dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {doList.length + dontList.length > 0 ? (
        <section aria-labelledby={`${id}-usage`} className="flex flex-col gap-4">
          {heading("usage", t.usage, t.usageIntro)}
          <BrandDoDont dos={doList} donts={dontList} labels={labels} />
        </section>
      ) : null}

      {ogCards.length ? (
        <section aria-labelledby={`${id}-social`} className="flex flex-col gap-4">
          {heading("social", t.social, t.socialIntro)}
          <div className="grid gap-4 sm:grid-cols-2">
            {ogCards.map((card) => (
              <BrandOgCardView key={card.id} card={card} brand={brand} labels={labels} />
            ))}
          </div>
        </section>
      ) : null}

      {visible.length === 0 ? <p className="text-body text-muted-foreground">{t.noSections}</p> : null}
    </div>
  );
}
