"use client";

import { Puzzle, RotateCw } from "lucide-react";
import { type ComponentProps, type ElementType, type KeyboardEvent, type ReactNode, useId, useRef } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge, type TagHue } from "../badge";
import { Button } from "../button";
import { Sparkline } from "../chart";
import { IconByName } from "../icon-picker";
import { DateTime, formatNumber } from "../numeric";
import { ErrorState, LoadingState, Skeleton } from "../states";
import { type DetailTabLike, groupDetailTabs, stepDetailTab } from "./detail-layout-logic";

export * from "./detail-layout-logic";

const STRINGS = {
  en: {
    nav: "Sections",
    lastActive: "Last active",
    never: "No activity yet",
    activity: "{name} activity",
    errorTitle: "This page could not load",
    errorBody: "Check your connection and try again.",
    retry: "Try again",
    loading: "Loading",
  },
  ar: {
    nav: "الأقسام",
    lastActive: "آخر نشاط",
    never: "لا نشاط بعد",
    activity: "نشاط {name}",
    errorTitle: "تعذر تحميل هذه الصفحة",
    errorBody: "تحقق من اتصالك ثم أعد المحاولة.",
    retry: "إعادة المحاولة",
    loading: "جارٍ التحميل",
  },
};

export type DetailLayoutLabels = (typeof STRINGS)["en"];

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

export interface DetailTab extends DetailTabLike {
  label: ReactNode;
  /** An icon name, an image URL or a node. */
  icon?: ReactNode | string;
  /** A count or a short badge after the label. */
  badge?: ReactNode;
}

export type DetailStatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface DetailIdentity {
  name: string;
  description?: ReactNode;
  version?: string;
  /** What the thing is ("Source", "Customer"), as a badge. */
  kind?: ReactNode;
  status?: { label: ReactNode; tone?: DetailStatusTone };
  /** An icon name, an image URL or a node. */
  icon?: ReactNode | string;
  /** The icon tile and sparkline colour. Default `"gray"`. */
  hue?: TagHue;
  /** An id or slug under the name, monospaced. */
  slug?: string;
}

export interface DetailActivity {
  count?: number;
  countLabel?: string;
  /** Recent activity, oldest first. */
  series?: readonly number[];
  lastActiveAt?: number | string | Date | null;
}

export interface DetailLayoutProps extends Omit<ComponentProps<"div">, "children"> {
  tabs: readonly DetailTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  identity?: DetailIdentity;
  activity?: DetailActivity;
  /** Buttons at the end of the header, e.g. Enable, Edit. */
  actions?: ReactNode;
  /** Shows skeletons for the header and a loading state for the content. */
  loading?: boolean;
  /** `true` or a message: replaces the header and content with an error and **Try again** (with `onRetry`). */
  error?: boolean | ReactNode;
  onRetry?: () => void;
  /** The active tab's content. */
  children?: ReactNode;
  headingAs?: ElementType;
  labels?: Partial<DetailLayoutLabels>;
}

const toneBadge: Record<DetailStatusTone, "success" | "warning" | "danger" | "info" | "neutral"> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  neutral: "neutral",
};

const glyph = (icon: ReactNode | string | undefined, size: string, fallback?: ReactNode) =>
  typeof icon === "string" ? <IconByName name={icon} className={size} fallback={fallback ?? null} /> : (icon ?? fallback ?? null);

/**
 * A detail page for one thing (a plugin, a customer, a server): a sub-sidebar of tabs grouped in sections, which
 * becomes a scrolling tab bar on small screens, a header with its identity and recent activity, and the active tab's
 * content. Handles loading and error states.
 */
export function DetailLayout({
  tabs,
  activeTab,
  onTabChange,
  identity,
  activity,
  actions,
  loading = false,
  error = false,
  onRetry,
  children,
  headingAs: Heading = "h1",
  labels,
  className,
  ...props
}: DetailLayoutProps) {
  const nasaq = useOptionalNasaq();
  const locale = nasaq?.locale ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const navId = useId();
  const panelId = useId();
  const groups = groupDetailTabs(tabs);
  const ordered = groups.flatMap((g) => g.tabs);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const mobileRefs = useRef(new Map<string, HTMLButtonElement>());

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, vertical: boolean, map: Map<string, HTMLButtonElement>) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const next =
      e.key === "Home" ? "first" : e.key === "End" ? "last"
      : (vertical ? e.key === "ArrowDown" : e.key === (rtl ? "ArrowLeft" : "ArrowRight")) ? 1
      : (vertical ? e.key === "ArrowUp" : e.key === (rtl ? "ArrowRight" : "ArrowLeft")) ? -1
      : null;
    if (next === null) return;
    const tab = stepDetailTab(ordered, activeTab, next);
    if (!tab) return;
    e.preventDefault();
    onTabChange(tab.key);
    map.get(tab.key)?.focus();
  };

  const tabButton = (tab: DetailTab, compact: boolean) => {
    const active = tab.key === activeTab;
    const map = compact ? mobileRefs.current : refs.current;
    return (
      <button
        key={tab.key}
        ref={(el) => {
          if (el) map.set(tab.key, el);
          else map.delete(tab.key);
        }}
        type="button"
        data-slot="detail-tab"
        data-active={active || undefined}
        aria-current={active ? "page" : undefined}
        aria-controls={panelId}
        disabled={tab.disabled}
        tabIndex={active ? 0 : -1}
        onClick={() => onTabChange(tab.key)}
        onKeyDown={(e) => onKey(e, !compact, map)}
        className={cn(
          "flex items-center gap-2 rounded-control text-start outline-none transition-colors duration-150 ease-nq",
          "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50",
          "[&_svg]:size-4 [&_svg]:shrink-0",
          compact ? "h-control-sm shrink-0 whitespace-nowrap px-3 text-label" : "h-control w-full px-3 text-label",
          active ? "bg-nq-selected text-foreground" : "text-muted-foreground hover:bg-nq-hover hover:text-foreground",
        )}
      >
        {glyph(tab.icon, "size-4")}
        <span className="min-w-0 flex-1 truncate">{tab.label}</span>
        {tab.badge !== undefined && tab.badge !== null ? (
          <span className="text-caption tabular-nums text-muted-foreground">{tab.badge}</span>
        ) : null}
      </button>
    );
  };

  const hue = identity?.hue ?? "gray";
  const tile = { "--tile-solid": `var(--nq-tag-${hue})`, "--tile-soft": `var(--nq-tag-${hue}-soft)` } as React.CSSProperties;
  const series = activity?.series?.length ? activity.series : null;

  const header = loading ? (
    <div data-slot="detail-hero" aria-hidden className="flex flex-wrap items-center gap-4 border-b border-border bg-card px-6 py-6">
      <Skeleton className="size-16 rounded-card" />
      <div className="flex min-w-48 flex-1 flex-col gap-2">
        <Skeleton className="h-6 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-16 w-48 rounded-card" />
    </div>
  ) : identity ? (
    <header data-slot="detail-hero" className="flex flex-wrap items-start gap-4 border-b border-border bg-card px-6 py-6">
      <span
        aria-hidden
        className="flex size-16 shrink-0 items-center justify-center rounded-card bg-[var(--tile-soft)] text-[var(--tile-solid)]"
        style={tile}
      >
        {glyph(identity.icon, "size-7", <Puzzle aria-hidden className="size-7" />)}
      </span>
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Heading dir="auto" className="text-h2 text-foreground">
            {identity.name}
          </Heading>
          {identity.version ? (
            <bdi dir="ltr" className="font-mono text-caption text-muted-foreground">
              {identity.version}
            </bdi>
          ) : null}
        </div>
        {identity.kind || identity.status ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {identity.kind ? <Badge variant="neutral">{identity.kind}</Badge> : null}
            {identity.status ? <Badge variant={toneBadge[identity.status.tone ?? "neutral"]}>{identity.status.label}</Badge> : null}
          </div>
        ) : null}
        {identity.description ? (
          <p dir="auto" className="max-w-prose text-body-sm text-muted-foreground">
            {identity.description}
          </p>
        ) : null}
        {identity.slug ? (
          <bdi dir="ltr" className="w-fit font-mono text-caption text-muted-foreground">
            {identity.slug}
          </bdi>
        ) : null}
      </div>
      {activity ? (
        <div data-slot="detail-activity" className="flex items-end gap-4 rounded-card border border-border bg-background px-4 py-3">
          <div className="flex flex-col">
            {activity.countLabel ? <span className="text-caption text-muted-foreground">{activity.countLabel}</span> : null}
            {activity.count !== undefined ? (
              <bdi className="text-h3 tabular-nums" title={formatNumber(activity.count, locale)}>
                {formatNumber(activity.count, locale, { notation: "compact", maximumFractionDigits: 1 })}
              </bdi>
            ) : null}
            <span className="text-caption text-muted-foreground">
              <span className="sr-only">{t.lastActive}: </span>
              {activity.lastActiveAt == null || activity.lastActiveAt === "" ? t.never : <DateTime value={activity.lastActiveAt} relative />}
            </span>
          </div>
          {series ? <Sparkline data={series} color={`var(--nq-tag-${hue})`} label={fill(t.activity, { name: identity.name })} className="h-12 w-32" /> : null}
        </div>
      ) : null}
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  ) : null;

  return (
    <div data-slot="detail-layout" className={cn("flex min-h-0 flex-col md:flex-row", className)} {...props}>
      <aside data-slot="detail-sidebar" className="hidden w-56 shrink-0 border-e border-border bg-card md:block">
        <nav aria-label={t.nav} id={navId} className="flex flex-col gap-4 p-3">
          {groups.map((group, i) => (
            <div key={group.section ?? `__${i}`} className="flex flex-col gap-0.5">
              {group.section ? (
                <p dir="auto" className="px-3 pb-1 text-caption text-muted-foreground">
                  {group.section}
                </p>
              ) : null}
              {group.tabs.map((tab) => tabButton(tab, false))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <nav aria-label={t.nav} data-slot="detail-tabbar" className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {ordered.map((tab) => tabButton(tab, true))}
        </nav>
        {error ? (
          <ErrorState
            title={t.errorTitle}
            description={error === true ? t.errorBody : error}
            className="m-6"
            actions={
              onRetry ? (
                <Button onClick={onRetry}>
                  <RotateCw aria-hidden />
                  {t.retry}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {header}
            <div id={panelId} data-slot="detail-content" className="min-w-0 flex-1 p-6">
              {loading ? <LoadingState label={t.loading} /> : children}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
