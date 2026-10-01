"use client";
import { CircleAlert, Inbox, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Spinner } from "../spinner";

export interface StateProps extends Omit<ComponentProps<"div">, "title"> {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Actions, usually one primary Button and optionally one secondary. */
  actions?: ReactNode;
  /** Hatched ground (grid expression); off automatically in the native expression. */
  hatch?: boolean;
}

function StateFrame({
  icon: Glyph,
  iconClassName,
  title,
  description,
  actions,
  hatch = false,
  className,
  children,
  ...props
}: StateProps & { iconClassName?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 border border-dashed border-border px-6 py-12 text-center",
        "rounded-card",
        hatch && "hatch",
        className,
      )}
      {...props}
    >
      {Glyph ? (
        <span
          data-slot="state-icon"
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-control border border-border bg-card [&_svg]:size-5",
            iconClassName ?? "text-muted-foreground",
          )}
        >
          <Glyph aria-hidden="true" />
        </span>
      ) : null}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-label text-foreground">{title}</p>
        {description ? <p className="text-body-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
      {actions ? <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ icon = Inbox, ...props }: StateProps) {
  return <StateFrame data-slot="empty-state" icon={icon} {...props} />;
}

/** Errors carry an icon and words, never colour alone. */
export function ErrorState({ icon = CircleAlert, ...props }: StateProps) {
  return <StateFrame data-slot="error-state" role="alert" icon={icon} iconClassName="text-nq-danger-text" {...props} />;
}

export interface LoadingStateProps extends ComponentProps<"div"> {
  /** Announced to assistive tech; also shown when `rows` is 0. Defaults to "Loading…" / "جارٍ التحميل…" by locale. */
  label?: string;
  /**
   * Number of skeleton items (rows, cards or events). Skeletons over spinners: they preview the layout that is
   * coming. `0` shows a spinner with the label instead.
   */
  rows?: number;
  /** The layout to preview: list `rows`, a `grid` of cards, or a `timeline` of events. Default `"rows"`. */
  shape?: "rows" | "grid" | "timeline";
  /** Columns for `shape="grid"` from the `sm` breakpoint up (one column below). Default 3. */
  columns?: 1 | 2 | 3 | 4;
  /** Visible text under the skeleton, e.g. "Fetching the last 30 days…". Also announced. */
  caption?: ReactNode;
}

const WIDTHS = [62, 44, 54, 38];
const GRID_COLS = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" } as const;

export function LoadingState({ label, rows = 3, shape = "rows", columns = 3, caption, className, ...props }: LoadingStateProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  label ??= ar ? "جارٍ التحميل…" : "Loading…";
  const items = Array.from({ length: rows }, (_, i) => i);
  return (
    <div
      data-slot="loading-state"
      data-shape={shape}
      role="status"
      aria-live="polite"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {caption ? null : <span className="sr-only">{label}</span>}
      {rows <= 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-body-sm text-muted-foreground">
          <Spinner /> <span aria-hidden="true">{label}</span>
        </div>
      ) : shape === "grid" ? (
        <div className={cn("grid grid-cols-1 gap-3", GRID_COLS[columns])}>
          {items.map((i) => (
            <div key={i} data-slot="loading-card" className="flex flex-col gap-3 rounded-card border border-border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-control" />
                <Skeleton className="h-3" style={{ inlineSize: `${WIDTHS[i % 4]}%` }} />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3" style={{ inlineSize: `${WIDTHS[(i + 2) % 4]! + 20}%` }} />
            </div>
          ))}
        </div>
      ) : shape === "timeline" ? (
        <ol className="flex flex-col">
          {items.map((i) => (
            <li key={i} data-slot="loading-event" className="relative flex gap-3 pb-5 last:pb-0">
              {i < rows - 1 ? <span aria-hidden className="absolute start-[9px] top-6 bottom-1 w-px bg-border" /> : null}
              <Skeleton className="mt-0.5 size-5 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                <Skeleton className="h-3" style={{ inlineSize: `${WIDTHS[i % 4]}%` }} />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        items.map((i) => (
          <div key={i} className="flex h-row items-center gap-3 border-b border-border px-1">
            <Skeleton className="size-5 rounded-[4px]" />
            <Skeleton className="h-3" style={{ inlineSize: `${WIDTHS[i % 4]}%` }} />
          </div>
        ))
      )}
      {caption && rows > 0 ? <p className="flex items-center gap-2 pt-1 text-caption text-muted-foreground">{caption}</p> : null}
      {caption && rows <= 0 ? <span className="sr-only">{caption}</span> : null}
    </div>
  );
}

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-[4px] bg-secondary motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}
