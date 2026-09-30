"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge, type BadgeProps } from "../badge";
import { CopyButton } from "../copy-button";
import { DateTime, Num } from "../numeric";

const STRINGS = {
  en: { empty: "Not set", yes: "Yes", no: "No", copy: "Copy" },
  ar: { empty: "غير محدد", yes: "نعم", no: "لا", copy: "نسخ" },
};
export type InfolistLabels = Partial<(typeof STRINGS)["en"]>;

type Variant = NonNullable<BadgeProps["variant"]>;

/** One choice of an enum value: how it reads and which badge colour it gets. */
export interface InfolistEnumOption {
  label: string;
  labelAr?: string;
  variant?: Variant;
  icon?: LucideIcon;
}

export type InfolistItemType = "text" | "number" | "date" | "datetime" | "boolean" | "enum" | "email" | "url" | "tel" | "code" | "list";

export interface InfolistItem {
  id: string;
  label: string;
  labelAr?: string;
  /** The value. Its shape follows `type`: booleans are `boolean`, dates are ISO strings or `Date`, lists are arrays. */
  value?: unknown;
  /** Default `text`. */
  type?: InfolistItemType;
  /** For `enum`: choices keyed by the stored value. */
  options?: Record<string, InfolistEnumOption>;
  /** Adds a copy button. Codes, emails and ids are usually copyable. */
  copyable?: boolean;
  /** Unit shown after a number ("kg", "SAR"). */
  unit?: string;
  /** Spans the whole row: for long text. */
  wide?: boolean;
  /** Replaces the rendering of the value. */
  render?: (value: unknown) => ReactNode;
  hint?: string;
  hintAr?: string;
}

export interface InfolistSection {
  id: string;
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  items: readonly InfolistItem[];
}

export interface InfolistProps {
  /** Flat rows. Use `sections` for groups. */
  items?: readonly InfolistItem[];
  sections?: readonly InfolistSection[];
  /** Columns from the `sm` breakpoint up. Default 2. */
  columns?: 1 | 2 | 3;
  /** `stacked` puts the label above the value, `inline` puts them on one row. Default `stacked`. */
  layout?: "stacked" | "inline";
  /** Show a dash-word ("Not set") for missing values. Default true; `false` hides the row. */
  showEmpty?: boolean;
  /** Accessible name for the list. */
  label?: string;
  locale?: string;
  labels?: InfolistLabels;
  className?: string;
}

const isBlank = (value: unknown) => value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

/** Picks the badge for an enum value, falling back to the raw value as a neutral badge. */
function EnumValue({ item, ar }: { item: InfolistItem; ar: boolean }) {
  const key = String(item.value);
  const opt = item.options?.[key];
  const Icon = opt?.icon;
  return (
    <Badge variant={opt?.variant ?? "neutral"}>
      {Icon ? <Icon aria-hidden /> : null}
      <bdi dir="auto">{opt ? (ar ? opt.labelAr || opt.label : opt.label) : key}</bdi>
    </Badge>
  );
}

function ItemValue({ item, ar, t }: { item: InfolistItem; ar: boolean; t: Required<InfolistLabels> }) {
  const v = item.value;
  if (item.render) return <>{item.render(v)}</>;
  switch (item.type) {
    case "boolean":
      return v ? (
        <Badge variant="success">
          <Check aria-hidden />
          {t.yes}
        </Badge>
      ) : (
        <Badge variant="neutral">
          <X aria-hidden />
          {t.no}
        </Badge>
      );
    case "enum":
      return <EnumValue item={item} ar={ar} />;
    case "number":
      return (
        <span className="inline-flex items-baseline gap-1">
          <Num value={Number(v)} />
          {item.unit ? <bdi dir="auto" className="text-muted-foreground">{item.unit}</bdi> : null}
        </span>
      );
    case "date":
      return <DateTime value={v as string | Date} />;
    case "datetime":
      return <DateTime value={v as string | Date} relative />;
    case "email":
      return (
        <a href={`mailto:${String(v)}`} dir="ltr" className="break-all text-foreground underline underline-offset-2">
          {String(v)}
        </a>
      );
    case "tel":
      return (
        <a href={`tel:${String(v).replace(/\s+/g, "")}`} dir="ltr" className="text-foreground underline underline-offset-2">
          {String(v)}
        </a>
      );
    case "url": {
      const href = String(v);
      const safe = /^https?:\/\//i.test(href);
      return safe ? (
        <a href={href} target="_blank" rel="noreferrer noopener" dir="ltr" className="break-all text-foreground underline underline-offset-2">
          {href}
        </a>
      ) : (
        <span dir="ltr" className="break-all">
          {href}
        </span>
      );
    }
    case "code":
      return (
        <code dir="ltr" className="rounded-control bg-muted px-1.5 py-0.5 font-mono text-caption break-all">
          {String(v)}
        </code>
      );
    case "list":
      return (
        <span className="flex flex-wrap gap-1">
          {(v as unknown[]).map((entry, i) => {
            const opt = item.options?.[String(entry)];
            return (
              <Badge key={`${String(entry)}-${i}`} variant={opt?.variant ?? "outline"}>
                <bdi dir="auto">{opt ? (ar ? opt.labelAr || opt.label : opt.label) : String(entry)}</bdi>
              </Badge>
            );
          })}
        </span>
      );
    default:
      return <bdi dir="auto" className="whitespace-pre-line">{String(v)}</bdi>;
  }
}

function copyText(item: InfolistItem): string | null {
  if (!item.copyable || isBlank(item.value)) return null;
  return Array.isArray(item.value) ? item.value.join(", ") : String(item.value);
}

function Rows({ items, columns, layout, showEmpty, ar, t }: { items: readonly InfolistItem[]; columns: number; layout: "stacked" | "inline"; showEmpty: boolean; ar: boolean; t: Required<InfolistLabels> }) {
  const grid = columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  const span = columns === 3 ? "sm:col-span-3" : columns === 2 ? "sm:col-span-2" : "";
  return (
    <dl className={cn("grid grid-cols-1 gap-x-8 gap-y-4", grid)}>
      {items
        .filter((item) => showEmpty || !isBlank(item.value))
        .map((item) => {
          const blank = isBlank(item.value) && !(item.type === "boolean" && item.value === false);
          const copy = copyText(item);
          const hint = ar ? item.hintAr || item.hint : item.hint;
          return (
            <div
              key={item.id}
              data-slot="infolist-item"
              className={cn("min-w-0", layout === "inline" ? "flex items-baseline justify-between gap-4 border-b border-border pb-3" : "flex flex-col gap-1", item.wide && span)}
            >
              <dt className={cn("text-caption text-muted-foreground", layout === "inline" && "shrink-0")}>
                <bdi dir="auto">{ar ? item.labelAr || item.label : item.label}</bdi>
              </dt>
              <dd className={cn("m-0 flex min-w-0 items-center gap-1.5 text-body text-foreground", layout === "inline" && "justify-end text-end")}>
                {blank ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Minus aria-hidden className="size-3.5" />
                    {t.empty}
                  </span>
                ) : (
                  <ItemValue item={item} ar={ar} t={t} />
                )}
                {copy ? <CopyButton value={copy} label={t.copy} size="icon-sm" /> : null}
              </dd>
              {hint ? <p className="text-caption text-muted-foreground">{hint}</p> : null}
            </div>
          );
        })}
    </dl>
  );
}

/**
 * A read-only description list: label and value pairs for a record's detail page. Booleans and enums become badges,
 * emails and links are clickable, codes and ids can be copied, missing values say so, and sections group the rows.
 */
export function Infolist({ items, sections, columns = 2, layout = "stacked", showEmpty = true, label, locale: localeProp, labels, className }: InfolistProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const ar = (localeProp ?? ambient).startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as Required<InfolistLabels>;
  const groups: InfolistSection[] = sections ? [...sections] : [{ id: "_", items: items ?? [] }];
  return (
    <div data-slot="infolist" role="group" aria-label={label} className={cn("flex flex-col gap-8", className)}>
      {groups.map((group) => {
        const title = ar ? group.titleAr || group.title : group.title;
        const description = ar ? group.descriptionAr || group.description : group.description;
        return (
          <section key={group.id} aria-label={title} className="flex flex-col gap-4">
            {title || description ? (
              <header className="flex flex-col gap-0.5 border-b border-border pb-2">
                {title ? <h3 className="text-h4 font-semibold text-foreground">{title}</h3> : null}
                {description ? <p className="text-caption text-muted-foreground">{description}</p> : null}
              </header>
            ) : null}
            <Rows items={group.items} columns={columns} layout={layout} showEmpty={showEmpty} ar={ar} t={t} />
          </section>
        );
      })}
    </div>
  );
}
