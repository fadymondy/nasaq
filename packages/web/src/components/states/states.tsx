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
  /** Number of skeleton rows. Skeletons over spinners: they preview the layout that is coming. */
  rows?: number;
}

export function LoadingState({ label, rows = 3, className, ...props }: LoadingStateProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  label ??= ar ? "جارٍ التحميل…" : "Loading…";
  return (
    <div data-slot="loading-state" role="status" aria-live="polite" className={cn("flex flex-col gap-2", className)} {...props}>
      <span className="sr-only">{label}</span>
      {rows > 0 ? (
        Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex h-row items-center gap-3 border-b border-border px-1">
            <Skeleton className="size-5 rounded-[4px]" />
            <Skeleton className="h-3" style={{ inlineSize: `${[62, 44, 54, 38][i % 4]}%` }} />
          </div>
        ))
      ) : (
        <div className="flex items-center justify-center gap-2 py-8 text-body-sm text-muted-foreground">
          <Spinner /> <span aria-hidden="true">{label}</span>
        </div>
      )}
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
