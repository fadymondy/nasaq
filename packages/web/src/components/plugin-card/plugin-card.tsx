"use client";

import { ExternalLink, Puzzle, Settings2 } from "lucide-react";
import { type ComponentProps, type ElementType, type MouseEvent, type ReactNode, useId, useRef } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge, type TagHue } from "../badge";
import { buttonVariants } from "../button";
import { Sparkline } from "../chart";
import { Checkbox } from "../checkbox";
import { IconByName } from "../icon-picker";
import { DateTime, formatNumber } from "../numeric";
import { humanizeKind, type PluginActivity, pluginActivity } from "./plugin-card-logic";

export * from "./plugin-card-logic";

const STRINGS = {
  en: {
    enabled: "Enabled",
    disabled: "Disabled",
    never: "No activity",
    lastActive: "Last active",
    details: "Details",
    page: "Page",
    openDetails: "Open {name} details",
    openPage: "Open {name} page",
    select: "Select {name}",
    noDescription: "No description.",
    activity: "{name} activity",
    kinds: {
      capability: "Capability",
      source: "Source",
      ai_provider: "AI provider",
      pipeline: "Pipeline",
      enrichment: "Enrichment",
      copilot: "Copilot",
      tool: "Tool",
      skill: "Skill",
      agent: "Agent",
      mcp: "MCP",
      memory: "Memory",
      persona: "Persona",
      core: "Core",
      system: "System",
    } as Record<string, string>,
  },
  ar: {
    enabled: "مفعّلة",
    disabled: "معطّلة",
    never: "لا نشاط",
    lastActive: "آخر نشاط",
    details: "التفاصيل",
    page: "الصفحة",
    openDetails: "فتح تفاصيل {name}",
    openPage: "فتح صفحة {name}",
    select: "تحديد {name}",
    noDescription: "لا يوجد وصف.",
    activity: "نشاط {name}",
    kinds: {
      capability: "قدرة",
      source: "مصدر",
      ai_provider: "مزوّد ذكاء",
      pipeline: "خط معالجة",
      enrichment: "إثراء",
      copilot: "مساعد",
      tool: "أداة",
      skill: "مهارة",
      agent: "وكيل",
      mcp: "MCP",
      memory: "ذاكرة",
      persona: "شخصية",
      core: "أساس",
      system: "نظام",
    } as Record<string, string>,
  },
};

export type PluginCardLabels = (typeof STRINGS)["en"];

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

export interface PluginCardItem {
  id: string;
  name: string;
  description?: string;
  /** What the plugin is: `source`, `capability`, `ai_provider`, `tool`… Known kinds are translated; others are spelled out. */
  kind?: string;
  version?: string;
  /** An icon name (`"database"`, `"bx-bot"`), an image URL, or a node. */
  icon?: ReactNode | string;
  /** The plugin's colour for its icon tile and sparkline. Default `"gray"`. */
  hue?: TagHue;
  /** `false` shows Disabled; `undefined` shows nothing. */
  enabled?: boolean;
  lastActiveAt?: number | string | Date | null;
  /** The headline figure, e.g. 12400 records. */
  count?: number;
  /** The words under the figure, e.g. "records", "tokens", "invocations". */
  countLabel?: string;
  /** Recent activity, oldest first, for the sparkline. */
  series?: readonly number[];
  /** Shown in the footer, monospaced. Default `id`. */
  slug?: string;
}

export interface PluginCardProps extends Omit<ComponentProps<"article">, "children" | "onSelect"> {
  plugin: PluginCardItem;
  /** Shows a checkbox; clicking the card toggles it and a long press on touch selects it. */
  selectable?: boolean;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Details: a link when `detailHref` is set, a button with `onOpen`. */
  detailHref?: string;
  onOpen?: () => void;
  /** The plugin's own page: a link with `pageHref`, a button with `onOpenPage`. */
  pageHref?: string;
  onOpenPage?: () => void;
  /** More badges after the kind and status, e.g. a `SourceBadge`. */
  badges?: ReactNode;
  /** Extra footer actions, before Page and Details. */
  actions?: ReactNode;
  headingAs?: ElementType;
  now?: number;
  labels?: Partial<PluginCardLabels>;
}

const activityBadge: Record<PluginActivity, "success" | "warning" | "outline"> = {
  live: "success",
  recent: "warning",
  idle: "outline",
  never: "outline",
};

const LONG_PRESS_MS = 500;

/**
 * A plugin in a catalogue or admin grid: icon, name, version, kind, enabled state and last activity, a description,
 * a headline count with a sparkline, and Page and Details actions. With `selectable` it becomes a checkbox card for
 * bulk actions.
 */
export function PluginCard({
  plugin,
  selectable = false,
  selected = false,
  onSelectedChange,
  detailHref,
  onOpen,
  pageHref,
  onOpenPage,
  badges,
  actions,
  headingAs: Heading = "h3",
  now,
  labels,
  className,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  ...props
}: PluginCardProps) {
  const nasaq = useOptionalNasaq();
  const locale = nasaq?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t = { ...base, ...labels, kinds: { ...base.kinds, ...labels?.kinds } };
  const titleId = useId();
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressed = useRef(false);
  const name = plugin.name;
  const kind = plugin.kind ? (t.kinds[plugin.kind] ?? humanizeKind(plugin.kind)) : null;
  const hue = plugin.hue ?? "gray";
  const activity = pluginActivity(plugin.lastActiveAt, now);
  const series = plugin.series?.length ? plugin.series : null;
  const icon =
    typeof plugin.icon === "string" ? (
      <IconByName name={plugin.icon} className="size-5" fallback={<Puzzle aria-hidden className="size-5" />} />
    ) : (
      (plugin.icon ?? <Puzzle aria-hidden className="size-5" />)
    );

  const cancelPress = () => {
    if (press.current) clearTimeout(press.current);
    press.current = null;
  };

  const action = (kindOf: "page" | "details") => {
    const href = kindOf === "page" ? pageHref : detailHref;
    const handler = kindOf === "page" ? onOpenPage : onOpen;
    if (!href && !handler) return null;
    const content =
      kindOf === "page" ? (
        <>
          <ExternalLink aria-hidden />
          {t.page}
        </>
      ) : (
        <>
          <Settings2 aria-hidden />
          {t.details}
        </>
      );
    const aria = fill(kindOf === "page" ? t.openPage : t.openDetails, { name });
    const cls = buttonVariants({ variant: "ghost", size: "sm" });
    return href ? (
      <a href={href} aria-label={aria} className={cls}>
        {content}
      </a>
    ) : (
      <button type="button" aria-label={aria} className={cls} onClick={handler}>
        {content}
      </button>
    );
  };

  return (
    <article
      data-slot="plugin-card"
      data-selected={selected || undefined}
      data-activity={activity}
      aria-labelledby={titleId}
      className={cn(
        "flex h-full flex-col rounded-card border bg-card transition-colors duration-150 ease-nq",
        selected ? "border-primary bg-nq-selected" : "border-border",
        selectable && "cursor-pointer select-none hover:border-nq-line-strong",
        className,
      )}
      onClick={(e: MouseEvent<HTMLElement>) => {
        onClick?.(e);
        if (!selectable || e.defaultPrevented) return;
        if (pressed.current) {
          pressed.current = false;
          return;
        }
        if ((e.target as HTMLElement).closest("a, button, input, label, [role='checkbox'], [role='button']")) return;
        onSelectedChange?.(!selected);
      }}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (!selectable || e.pointerType === "mouse" || selected) return;
        cancelPress();
        press.current = setTimeout(() => {
          pressed.current = true;
          onSelectedChange?.(true);
        }, LONG_PRESS_MS);
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        cancelPress();
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        cancelPress();
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        cancelPress();
      }}
      {...props}
    >
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          {selectable ? (
            <Checkbox
              checked={selected}
              onCheckedChange={(v) => onSelectedChange?.(v === true)}
              aria-label={fill(t.select, { name })}
              className="mt-0.5"
            />
          ) : null}
          <span
            aria-hidden
            data-slot="plugin-card-icon"
            className="flex size-11 shrink-0 items-center justify-center rounded-control bg-[var(--tile-soft)] text-[var(--tile-solid)]"
            style={{ "--tile-solid": `var(--nq-tag-${hue})`, "--tile-soft": `var(--nq-tag-${hue}-soft)` } as React.CSSProperties}
          >
            {icon}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-baseline gap-2">
                <Heading id={titleId} dir="auto" className="truncate text-label text-foreground" title={name}>
                  {name}
                </Heading>
                {plugin.version ? (
                  <bdi dir="ltr" className="shrink-0 font-mono text-caption text-muted-foreground">
                    {plugin.version}
                  </bdi>
                ) : null}
              </div>
              <Badge variant={activityBadge[activity]} className="shrink-0" data-slot="plugin-card-activity">
                <span aria-hidden className={cn("size-1.5 rounded-full", activity === "live" ? "bg-nq-success" : activity === "recent" ? "bg-nq-warning" : "bg-muted-foreground")} />
                <span className="sr-only">{t.lastActive}: </span>
                {activity === "never" || plugin.lastActiveAt == null ? t.never : <DateTime value={plugin.lastActiveAt} relative />}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {kind ? <Badge variant="neutral">{kind}</Badge> : null}
              {plugin.enabled === undefined ? null : plugin.enabled ? (
                <Badge variant="success">{t.enabled}</Badge>
              ) : (
                <Badge variant="outline">{t.disabled}</Badge>
              )}
              {badges}
            </div>
          </div>
        </div>
        <p dir="auto" className={cn("line-clamp-2 text-body-sm", plugin.description ? "text-muted-foreground" : "text-muted-foreground/70 italic")}>
          {plugin.description || t.noDescription}
        </p>
      </div>
      {plugin.count !== undefined || series ? (
        <div data-slot="plugin-card-metric" className="flex items-end justify-between gap-3 border-t border-border bg-secondary/40 px-4 py-3">
          <div className="flex min-w-0 flex-col">
            {plugin.countLabel ? <span className="truncate text-caption text-muted-foreground">{plugin.countLabel}</span> : null}
            {plugin.count !== undefined ? (
              <bdi className="text-h3 tabular-nums" title={formatNumber(plugin.count, locale)}>
                {formatNumber(plugin.count, locale, { notation: "compact", maximumFractionDigits: 1 })}
              </bdi>
            ) : null}
          </div>
          {series ? <Sparkline data={series} color={`var(--nq-tag-${hue})`} label={fill(t.activity, { name })} className="h-10 w-28" /> : null}
        </div>
      ) : null}
      <footer className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <bdi dir="ltr" className="min-w-0 truncate font-mono text-caption text-muted-foreground" title={plugin.slug ?? plugin.id}>
          {plugin.slug ?? plugin.id}
        </bdi>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          {action("page")}
          {action("details")}
        </div>
      </footer>
    </article>
  );
}

/** A responsive grid for `PluginCard`s. */
export function PluginCardGrid({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="plugin-card-grid" className={cn("grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4", className)} {...props} />;
}
