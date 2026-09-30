"use client";

import { CircleAlert, CircleCheck, CircleDot, CircleX, Circle, type LucideIcon, X } from "lucide-react";
import { type ComponentProps, isValidElement, type ReactElement, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { buttonVariants } from "../button";

/** How urgent an item is. Same shapes as Status, so urgency never depends on colour. */
export type AttentionTone = "danger" | "warning" | "info" | "neutral";

export interface AttentionItem {
  /** Stable id (React key). */
  id: string;
  /** What needs doing, as a short sentence: "3 deployments failed", "Approve MH-721". */
  title: ReactNode;
  /** One line of context. Clamped to one line. */
  description?: ReactNode;
  tone?: AttentionTone;
  /** Replaces the tone shape, e.g. a ProductMark to say which product it comes from. */
  icon?: LucideIcon | ReactElement;
  /** How many things this row stands for (unread messages, failed runs). */
  count?: number;
  /** Pre-formatted relative time ("2h", "منذ ساعتين"). */
  time?: ReactNode;
  /** Machine-readable time for `<time dateTime>`. */
  dateTime?: string;
  /** Makes the whole row a link. */
  href?: string;
  /** Makes the whole row a button (ignored when `href` is set). */
  onSelect?: () => void;
  /** An explicit action at the inline end, e.g. "Review" or "Retry". */
  action?: { label: string; href?: string; onClick?: () => void };
  /** Setup-checklist rows: true when the step is complete. Leave undefined for ordinary items. */
  done?: boolean;
  /** Shows a dismiss button; the host removes the item from `items`. */
  onDismiss?: () => void;
}

const TONE_ICON: Record<AttentionTone, LucideIcon> = { danger: CircleX, warning: CircleAlert, info: CircleDot, neutral: Circle };
const TONE_TEXT: Record<AttentionTone, string> = {
  danger: "text-nq-danger-text",
  warning: "text-nq-warning-text",
  info: "text-nq-info-text",
  neutral: "text-muted-foreground",
};
const TONE_RANK: Record<AttentionTone, number> = { danger: 0, warning: 1, info: 2, neutral: 3 };

const STRINGS = {
  en: {
    title: "Needs your attention",
    showMore: (n: number) => `Show ${n} more`,
    showLess: "Show less",
    viewAll: "View all",
    dismiss: "Dismiss",
    done: "Done",
    progress: (done: number, total: number) => `${done} of ${total} done`,
    loading: "Loading…",
  },
  ar: {
    title: "يحتاج انتباهك",
    showMore: (n: number) => `عرض ${n} أخرى`,
    showLess: "عرض أقل",
    viewAll: "عرض الكل",
    dismiss: "تجاهل",
    done: "تم",
    progress: (done: number, total: number) => `${done} من ${total} مكتملة`,
    loading: "جارٍ التحميل…",
  },
};

export interface AttentionProps extends Omit<ComponentProps<"section">, "title"> {
  items: AttentionItem[];
  /** Section heading. Default "Needs your attention" / "يحتاج انتباهك". */
  title?: ReactNode;
  /** Heading level. Default 2. */
  headingLevel?: 2 | 3 | 4;
  /** Rows shown before "Show more" / "View all". Default 5. */
  max?: number;
  /** Order by tone (danger first), keeping the host's order within a tone. Default true. Done rows always go last. */
  sort?: boolean;
  /** "View all" in the header, e.g. to an inbox. Without it, extra rows expand in place. */
  viewAllHref?: string;
  onViewAll?: () => void;
  /**
   * Shown when there are no items. Default `null`: the whole section disappears, because an empty
   * "all clear" box is noise. Pass a short line ("You're all caught up") where absence would confuse.
   */
  empty?: ReactNode;
  /** Shows placeholder rows while the host loads. */
  loading?: boolean;
  labels?: Partial<Omit<(typeof STRINGS)["en"], "showMore" | "progress">> & {
    showMore?: (hidden: number) => string;
    progress?: (done: number, total: number) => string;
  };
}

/**
 * A short list of things the user should act on now: unread conversations, deals to follow up,
 * failed deployments, approvals, remaining setup steps. Products supply the items; Nasaq only
 * orders, trims and presents them. Answers "What needs my attention?" and nothing else.
 */
export function Attention({
  items,
  title,
  headingLevel = 2,
  max = 5,
  sort = true,
  viewAllHref,
  onViewAll,
  empty = null,
  loading = false,
  labels,
  className,
  ...props
}: AttentionProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const headingId = useId();
  const [expanded, setExpanded] = useState(false);

  const checklist = items.length > 0 && items.every((i) => i.done !== undefined);
  const doneCount = items.filter((i) => i.done).length;
  const ordered = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const done = Number(!!a.item.done) - Number(!!b.item.done);
      if (done !== 0) return done;
      if (!sort || checklist) return a.index - b.index;
      return TONE_RANK[a.item.tone ?? "neutral"] - TONE_RANK[b.item.tone ?? "neutral"] || a.index - b.index;
    })
    .map(({ item }) => item);
  const hidden = Math.max(0, ordered.length - max);
  const visible = expanded ? ordered : ordered.slice(0, max);
  const open = checklist ? items.length - doneCount : items.length;

  if (!loading && items.length === 0 && empty === null) return null;
  const Heading = `h${headingLevel}` as "h2";

  return (
    <section data-slot="attention" aria-labelledby={headingId} aria-busy={loading || undefined} className={cn("flex flex-col", className)} {...props}>
      <header className="flex min-h-control items-center gap-2 pb-2">
        <Heading id={headingId} className="text-label text-foreground">
          {title ?? t.title}
        </Heading>
        {!loading && open > 0 && !checklist ? (
          <span data-slot="attention-count" className="text-caption text-muted-foreground tabular-nums">
            {open}
          </span>
        ) : null}
        {checklist ? (
          <span className="flex items-center gap-2 text-caption text-muted-foreground tabular-nums">
            <span>{t.progress(doneCount, items.length)}</span>
            <span aria-hidden className="h-1 w-16 overflow-hidden rounded-full bg-nq-surface-soft">
              <span className="block h-full rounded-full bg-nq-success transition-[width] duration-300 ease-nq" style={{ width: `${(doneCount / items.length) * 100}%` }} />
            </span>
          </span>
        ) : null}
        {viewAllHref || onViewAll ? (
          viewAllHref ? (
            <a href={viewAllHref} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "ms-auto text-muted-foreground")}>
              {t.viewAll}
            </a>
          ) : (
            <button type="button" onClick={onViewAll} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "ms-auto text-muted-foreground")}>
              {t.viewAll}
            </button>
          )
        ) : null}
      </header>

      {loading ? (
        <ul className="flex flex-col border-t border-border">
          <li className="sr-only">{t.loading}</li>
          {Array.from({ length: Math.min(max, 3) }, (_, i) => (
            <li key={i} aria-hidden className="flex h-row items-center gap-3 border-b border-border px-1">
              <span className="size-4 rounded-full bg-nq-surface-soft" />
              <span className="h-3 flex-1 max-w-64 rounded-sm bg-nq-surface-soft motion-safe:animate-pulse" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="border-t border-border py-3 text-body-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col border-t border-border">
          {visible.map((item) => (
            <AttentionRow key={item.id} item={item} dismissLabel={t.dismiss} doneLabel={t.done} />
          ))}
        </ul>
      )}

      {!loading && hidden > 0 && !viewAllHref && !onViewAll ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mt-1 self-start text-muted-foreground")}
        >
          {expanded ? t.showLess : t.showMore(hidden)}
        </button>
      ) : null}
    </section>
  );
}

export interface AttentionRowProps extends Omit<ComponentProps<"li">, "children"> {
  item: AttentionItem;
  dismissLabel?: string;
  doneLabel?: string;
}

/**
 * One row. The title is the row's link or button and stretches over the row, so the whole row is
 * clickable while the action and dismiss buttons stay separate tab stops.
 */
export function AttentionRow({ item, dismissLabel = "Dismiss", doneLabel = "Done", className, ...props }: AttentionRowProps) {
  const tone = item.done ? "neutral" : (item.tone ?? "neutral");
  const icon = item.done ? (
    <CircleCheck aria-hidden className="size-4 text-nq-success-text" />
  ) : isValidElement(item.icon) ? (
    item.icon
  ) : (
    (() => {
      const Glyph = (item.icon as LucideIcon | undefined) ?? TONE_ICON[tone];
      return <Glyph aria-hidden className={cn("size-4", TONE_TEXT[tone])} />;
    })()
  );
  const titleClass = cn(
    "min-w-0 truncate text-body-sm text-start outline-none",
    item.done ? "text-muted-foreground" : "text-foreground",
    (item.href || item.onSelect) && "after:absolute after:inset-0 after:rounded-control focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-nq-focus",
  );
  const title = item.href ? (
    <a href={item.href} className={titleClass}>
      {item.title}
    </a>
  ) : item.onSelect ? (
    <button type="button" onClick={item.onSelect} className={titleClass}>
      {item.title}
    </button>
  ) : (
    <span className={titleClass}>{item.title}</span>
  );

  return (
    <li
      data-slot="attention-item"
      data-tone={tone}
      data-done={item.done || undefined}
      className={cn(
        "group/attention relative flex min-h-row items-center gap-3 border-b border-border px-1 py-2",
        (item.href || item.onSelect) && "transition-colors duration-150 ease-nq hover:bg-nq-hover",
        className,
      )}
      {...props}
    >
      <span className="relative flex size-5 shrink-0 items-center justify-center [&>svg]:size-4">
        {icon}
        {item.icon && !item.done && tone !== "neutral" ? <ToneBadge tone={tone} /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        {title}
        {item.description ? <span className="truncate text-caption text-muted-foreground">{item.description}</span> : null}
        {item.done ? <span className="sr-only">{doneLabel}</span> : null}
      </span>
      {item.count !== undefined ? (
        <span data-slot="attention-item-count" className="shrink-0 rounded-full border border-border px-1.5 text-caption text-foreground tabular-nums">
          {item.count}
        </span>
      ) : null}
      {item.time ? (
        <time dateTime={item.dateTime} className="shrink-0 text-caption text-muted-foreground tabular-nums">
          {item.time}
        </time>
      ) : null}
      {item.action && !item.done ? (
        item.action.href ? (
          <a href={item.action.href} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "relative z-10")}>
            {item.action.label}
          </a>
        ) : (
          <button type="button" onClick={item.action.onClick} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "relative z-10")}>
            {item.action.label}
          </button>
        )
      ) : null}
      {item.onDismiss ? (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={item.onDismiss}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "relative z-10 text-muted-foreground opacity-0 group-hover/attention:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 [&_svg]:size-3.5",
          )}
        >
          <X aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

/** A custom icon replaces the tone shape, so urgency moves to a small badge on its corner. */
function ToneBadge({ tone }: { tone: AttentionTone }) {
  const Glyph = TONE_ICON[tone];
  return (
    <span data-slot="attention-tone" className="absolute -end-1 -bottom-1 flex rounded-full bg-background">
      <Glyph aria-hidden className={cn("size-2.5", TONE_TEXT[tone])} strokeWidth={3} />
    </span>
  );
}
