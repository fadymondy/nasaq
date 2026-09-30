"use client";

import { Check, Plus } from "lucide-react";
import { type ComponentProps, type ElementType, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";

const STRINGS = {
  en: { add: "Add widget", added: "Added", remove: "Remove", size: "Size", sizes: "Widget size", gallery: "Widget gallery", small: "Small", medium: "Medium", large: "Large", circular: "Circular", inline: "Inline", empty: "No widgets match" },
  ar: { add: "إضافة الودجت", added: "تمت الإضافة", remove: "إزالة", size: "الحجم", sizes: "حجم الودجت", gallery: "معرض الودجت", small: "صغير", medium: "متوسط", large: "كبير", circular: "دائري", inline: "سطري", empty: "لا توجد ودجات مطابقة" },
};

export type GlanceLabels = Partial<(typeof STRINGS)["en"]>;

function useGlanceStrings(labels?: GlanceLabels) {
  const ar = useOptionalNasaq()?.locale?.startsWith("ar") ?? false;
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } };
}

export type GlanceTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneText: Record<GlanceTone, string> = {
  neutral: "text-foreground",
  success: "text-nq-success-text",
  warning: "text-nq-warning-text",
  danger: "text-nq-danger-text",
  info: "text-nq-info-text",
};

/* ------------------------------------------------------------------ row */

export interface GlanceRowProps extends Omit<ComponentProps<"div">, "onSelect"> {
  /** A lucide icon component. */
  icon?: ElementType;
  label: string;
  /** The figure or state at the inline end. Numbers keep their own direction. */
  value?: ReactNode;
  /** A second line under the label. */
  detail?: string;
  tone?: GlanceTone;
  /** Makes the row a button. */
  onSelect?: () => void;
  /** Smaller type and tighter padding, for a watch. */
  dense?: boolean;
}

/** One line of a glance: an icon, a label with an optional detail, and a value. */
export function GlanceRow({ icon: Glyph, label, value, detail, tone = "neutral", onSelect, dense, className, ...props }: GlanceRowProps) {
  const body = (
    <>
      {Glyph ? <Glyph aria-hidden className={cn("shrink-0", dense ? "size-4" : "size-[18px]", toneText[tone] === toneText.neutral ? "text-muted-foreground" : toneText[tone])} /> : null}
      <span className="min-w-0 flex-1 text-start">
        <span className={cn("block truncate text-foreground", dense ? "text-caption" : "text-label")}>{label}</span>
        {detail ? <span className="block truncate text-caption text-muted-foreground">{detail}</span> : null}
      </span>
      {value !== undefined ? <span className={cn("shrink-0 tabular-nums", dense ? "text-caption font-medium" : "text-label font-medium", toneText[tone])}>{value}</span> : null}
    </>
  );
  const base = cn("flex w-full items-center gap-2.5 rounded-control", dense ? "px-2 py-1" : "px-3 py-2");
  if (onSelect) {
    return (
      <div data-slot="glance-row" className={className} {...props}>
        <button type="button" onClick={onSelect} className={cn(base, "outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus")}>
          {body}
        </button>
      </div>
    );
  }
  return (
    <div data-slot="glance-row" className={cn(base, className)} {...props}>
      {body}
    </div>
  );
}

/* ------------------------------------------------------------------ tray popover */

export interface TrayPopoverAction {
  id: string;
  label: string;
  icon?: ElementType;
  onSelect: () => void;
  shortcut?: string;
  danger?: boolean;
}

export interface TrayPopoverProps extends Omit<ComponentProps<"div">, "title"> {
  title: string;
  subtitle?: string;
  /** A status badge or switch at the inline end of the header. */
  headerEnd?: ReactNode;
  /** Where the caret points along the top edge, at the tray icon. `false` hides it. Default `end`. */
  caret?: "start" | "center" | "end" | false;
  /** Footer commands: open the app, settings, quit. */
  actions?: readonly TrayPopoverAction[];
  children?: ReactNode;
}

/**
 * The popover that drops from a menu-bar or system-tray icon: a caret, a small header, glance rows and a footer of
 * commands. Position it under the icon yourself (or place it in a `Popover`); this is the surface.
 */
export function TrayPopover({ title, subtitle, headerEnd, caret = "end", actions = [], children, className, ...props }: TrayPopoverProps) {
  return (
    <div
      data-slot="tray-popover"
      role="group"
      aria-label={title}
      className={cn("relative w-80 max-w-full rounded-xl border border-border bg-card text-foreground shadow-lg", className)}
      {...props}
    >
      {caret ? (
        <span
          aria-hidden
          className={cn(
            "absolute -top-1.5 size-3 rotate-45 border-t border-s border-border bg-card",
            caret === "start" && "start-5",
            caret === "end" && "end-5",
            caret === "center" && "start-1/2 -ms-1.5",
          )}
        />
      ) : null}
      <header className="relative flex items-center gap-3 px-4 pt-3.5 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-label font-semibold">{title}</h2>
          {subtitle ? <p className="truncate text-caption text-muted-foreground">{subtitle}</p> : null}
        </div>
        {headerEnd}
      </header>
      {children ? <div className="flex flex-col px-1 pb-1">{children}</div> : null}
      {actions.length ? (
        <footer className="flex flex-col gap-0.5 border-t border-border p-1">
          {actions.map((action) => {
            const Glyph = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onSelect}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-control px-3 text-label outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
                  action.danger ? "text-nq-danger-text" : "text-foreground",
                )}
              >
                {Glyph ? <Glyph aria-hidden className="size-4 text-current opacity-70" /> : null}
                <span className="flex-1 text-start">{action.label}</span>
                {action.shortcut ? <kbd dir="ltr" className="text-caption text-muted-foreground">{action.shortcut}</kbd> : null}
              </button>
            );
          })}
        </footer>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ watch glance */

export interface WatchGlanceProps extends Omit<ComponentProps<"div">, "title"> {
  /** Time or date in the header. Keep it short. */
  title: string;
  /** Text at the inline end of the header (battery, a complication). */
  headerEnd?: ReactNode;
  /** `round` clips to a circle, `square` to a rounded square. Default `square`. */
  shape?: "round" | "square";
  /** GlanceRows (use `dense`). */
  children: ReactNode;
}

/** A watch face sized frame with a title line and a stack of dense glance rows. */
export function WatchGlance({ title, headerEnd, shape = "square", children, className, ...props }: WatchGlanceProps) {
  return (
    <div
      data-slot="watch-glance"
      data-shape={shape}
      className={cn(
        "flex aspect-[4/5] w-48 flex-col overflow-hidden border-4 border-nq-line-strong bg-background text-foreground",
        shape === "round" ? "aspect-square rounded-full px-6 py-5" : "rounded-[2rem] px-2 py-3",
        className,
      )}
      {...props}
    >
      <div className={cn("flex items-center justify-between gap-2 px-2 text-caption", shape === "round" && "justify-center")}>
        <span className="font-semibold tabular-nums">{title}</span>
        {headerEnd ? <span className="text-muted-foreground">{headerEnd}</span> : null}
      </div>
      <div className="mt-1 flex min-h-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ widget tile */

export type WidgetSize = "circular" | "inline" | "small" | "medium" | "large";

const SIZE_CLASS: Record<WidgetSize, string> = {
  circular: "size-16 rounded-full p-0",
  inline: "h-8 w-56 rounded-full px-3",
  small: "size-38 rounded-3xl p-4",
  medium: "h-38 w-80 rounded-3xl p-4",
  large: "size-80 rounded-3xl p-5",
};

export interface WidgetTileProps extends Omit<ComponentProps<"div">, "title"> {
  size?: WidgetSize;
  /** `home` is opaque; `lock` is translucent so a wallpaper shows through. */
  surface?: "home" | "lock";
  title: string;
  /** A lucide icon component. */
  icon?: ElementType;
  /** The main figure. */
  value?: ReactNode;
  caption?: string;
  /** 0 to 100. Draws a ring around the value in `circular`, and a bar in the other sizes. */
  progress?: number;
  tone?: GlanceTone;
  /** Extra content for `medium` and `large`: a list, a chart, glance rows. */
  children?: ReactNode;
  /** Makes the tile a button that opens the app. */
  onOpen?: () => void;
}

function ProgressRing({ value, tone }: { value: number; tone: GlanceTone }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg aria-hidden viewBox="0 0 64 64" className="absolute inset-0 size-full -rotate-90 rtl:scale-y-[-1]">
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-nq-line-strong/60" />
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className={tone === "neutral" ? "stroke-primary" : tone === "success" ? "stroke-nq-success" : tone === "warning" ? "stroke-nq-warning" : tone === "danger" ? "stroke-nq-danger" : "stroke-nq-info"} />
    </svg>
  );
}

/**
 * A home-screen or lock-screen widget: small, medium and large tiles, plus the lock screen's circular and inline
 * shapes. Show one glanceable thing; tapping opens the app.
 */
export function WidgetTile({ size = "small", surface = "home", title, icon: Glyph, value, caption, progress, tone = "neutral", children, onOpen, className, ...props }: WidgetTileProps) {
  const surfaceClass = surface === "lock" ? "border border-border/40 bg-card/55 backdrop-blur-md" : "border border-border bg-card shadow-sm";
  const label = [title, typeof value === "string" || typeof value === "number" ? String(value) : "", caption].filter(Boolean).join(", ");
  let body: ReactNode;
  if (size === "circular") {
    body = (
      <>
        {progress !== undefined ? <ProgressRing value={progress} tone={tone} /> : null}
        <span className="relative flex flex-col items-center leading-none">
          {Glyph ? <Glyph aria-hidden className="mb-0.5 size-3.5 text-muted-foreground" /> : null}
          <span className={cn("text-label font-semibold tabular-nums", toneText[tone])}>{value}</span>
        </span>
      </>
    );
  } else if (size === "inline") {
    body = (
      <span className="flex w-full items-center gap-2 text-label">
        {Glyph ? <Glyph aria-hidden className="size-4 shrink-0 text-muted-foreground" /> : null}
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span className={cn("shrink-0 font-medium tabular-nums", toneText[tone])}>{value}</span>
      </span>
    );
  } else {
    body = (
      <>
        <div className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
          {Glyph ? <Glyph aria-hidden className="size-4 shrink-0" /> : null}
          <span className="truncate">{title}</span>
        </div>
        <div className={cn("mt-auto", size === "large" && "mt-3")}>
          {value !== undefined ? <p className={cn("tabular-nums leading-none font-semibold", size === "small" ? "text-h1" : "text-display", toneText[tone])}>{value}</p> : null}
          {caption ? <p className="mt-1 truncate text-caption text-muted-foreground">{caption}</p> : null}
          {progress !== undefined ? (
            <div role="presentation" className="mt-2 h-1.5 overflow-hidden rounded-full bg-nq-line-strong/50">
              <div className={cn("h-full rounded-full", tone === "neutral" ? "bg-primary" : tone === "success" ? "bg-nq-success" : tone === "warning" ? "bg-nq-warning" : tone === "danger" ? "bg-nq-danger" : "bg-nq-info")} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
            </div>
          ) : null}
        </div>
        {size !== "small" && children ? <div className="mt-3 min-h-0 flex-1 overflow-hidden">{children}</div> : null}
      </>
    );
  }
  const classes = cn(
    "relative flex shrink-0 overflow-hidden text-foreground",
    size === "circular" ? "items-center justify-center" : size === "inline" ? "items-center" : "flex-col",
    surfaceClass,
    SIZE_CLASS[size],
    className,
  );
  if (onOpen) {
    return (
      <div data-slot="widget-tile" data-size={size} data-surface={surface} className="contents">
        <button
          type="button"
          onClick={onOpen}
          aria-label={label}
          className={cn(classes, "text-start outline-none transition-transform duration-150 ease-nq active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus")}
        >
          {body}
        </button>
      </div>
    );
  }
  return (
    <div data-slot="widget-tile" data-size={size} data-surface={surface} role="group" aria-label={label} className={classes} {...props}>
      {body}
    </div>
  );
}

/* ------------------------------------------------------------------ widget gallery */

export interface WidgetDefinition {
  id: string;
  title: string;
  description?: string;
  /** Sizes this widget comes in. */
  sizes: readonly WidgetSize[];
  /** Renders the live preview at a size. Return a `WidgetTile`. */
  preview: (size: WidgetSize) => ReactNode;
}

export interface WidgetGalleryProps extends Omit<ComponentProps<"div">, "onChange"> {
  widgets: readonly WidgetDefinition[];
  /** Ids already placed on the screen. */
  added?: readonly string[];
  onAdd: (id: string, size: WidgetSize) => void;
  onRemove?: (id: string) => void;
  labels?: GlanceLabels;
}

/** A catalogue of widgets: each shows a live preview, a size picker and an add or remove button. */
export function WidgetGallery({ widgets, added = [], onAdd, onRemove, labels, className, ...props }: WidgetGalleryProps) {
  const { t } = useGlanceStrings(labels);
  const [sizes, setSizes] = useState<Record<string, WidgetSize>>({});
  return (
    <div data-slot="widget-gallery" role="list" aria-label={t.gallery} className={cn("grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))]", className)} {...props}>
      {widgets.map((widget) => {
        const size: WidgetSize = sizes[widget.id] ?? widget.sizes[0] ?? "small";
        const isAdded = added.includes(widget.id);
        return (
          <article key={widget.id} role="listitem" className="flex flex-col items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4">
            <div className="flex w-full min-h-40 items-center justify-center overflow-hidden">{widget.preview(size)}</div>
            <div className="min-w-0">
              <h3 className="text-label font-semibold text-foreground">{widget.title}</h3>
              {widget.description ? <p className="text-caption text-muted-foreground">{widget.description}</p> : null}
            </div>
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              {widget.sizes.length > 1 ? (
                <div role="radiogroup" aria-label={`${t.sizes}: ${widget.title}`} className="flex gap-0.5 rounded-control bg-secondary p-0.5">
                  {widget.sizes.map((option) => (
                    // biome-ignore lint/a11y/useSemanticElements: a segmented radio; arrow keys are not needed for three short options
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={option === size}
                      onClick={() => setSizes((prev) => ({ ...prev, [widget.id]: option }))}
                      className="h-7 rounded-[calc(var(--radius-control)-2px)] px-2.5 text-caption text-muted-foreground outline-none hover:text-foreground aria-checked:bg-card aria-checked:text-foreground aria-checked:shadow-xs focus-visible:outline-2 focus-visible:outline-nq-focus"
                    >
                      {t[option]}
                    </button>
                  ))}
                </div>
              ) : (
                <span />
              )}
              {isAdded ? (
                <Button size="sm" variant="secondary" onClick={onRemove ? () => onRemove(widget.id) : undefined} disabled={!onRemove}>
                  <Check aria-hidden />
                  {onRemove ? t.remove : t.added}
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={() => onAdd(widget.id, size)}>
                  <Plus aria-hidden />
                  {t.add}
                </Button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
