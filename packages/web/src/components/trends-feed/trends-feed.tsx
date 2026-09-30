"use client";

import { Bookmark, CheckCheck, ChevronDown, CircleAlert, CircleCheck, CircleX, Ellipsis, ExternalLink, EyeOff, Flame, RotateCcw, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent } from "../card";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../collapsible";
import { type ContextMenuAction, ContextMenuActions, openContextMenuAt } from "../context-menu";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { formatDate, formatRelativeTime, Num } from "../numeric";
import { EmptyState, ErrorState, LoadingState } from "../states";
import { Switch } from "../switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import {
  actionsFor,
  countByState,
  groupTopicsByDay,
  isSourceUsable,
  resolveActiveTier,
  TREND_STATES,
  type SourceHealth,
  type SourceTier,
  type TrendAction,
  type TrendState,
} from "./trends-feed-math";

const STRINGS = {
  en: {
    states: { new: "New", saved: "Saved", reviewed: "Reviewed", dismissed: "Dismissed" } as Record<TrendState, string>,
    tabs: "Topic state",
    actions: { save: "Save", review: "Mark reviewed", dismiss: "Dismiss", restore: "Restore" } as Record<TrendAction, string>,
    moreFor: (title: string) => `Actions for ${title}`,
    score: "Score",
    hot: "Hot",
    why: "Why it is trending",
    outlets: (n: number) => (n === 1 ? "1 outlet" : `${n} outlets`),
    items: (n: number) => (n === 1 ? "1 article" : `${n} articles`),
    showItems: (n: number) => `Show ${n === 1 ? "1 article" : `${n} articles`}`,
    hideItems: "Hide articles",
    open: "Open",
    failed: (action: string) => `Could not ${action.toLowerCase()}. Try again.`,
    emptyTitle: (state: string) => `No ${state.toLowerCase()} topics`,
    emptyBody: "Topics appear here as they are found.",
    today: "Today",
    yesterday: "Yesterday",
    // Sources
    tier: (n: number) => `Tier ${n}`,
    tierHint: { 1: "Primary sources. Preferred whenever one is working.", 2: "Backup sources. Used when tier 1 has nothing working.", 3: "Last resort. Used when tiers 1 and 2 have nothing working." } as Record<SourceTier, string>,
    active: "Active",
    activeNote: (n: number) => `Feeding the trends: tier ${n}`,
    fellBack: (from: string, to: number) => `${from} has no working source, so tier ${to} is being used.`,
    noneWorking: "No source is working, so no new topics will arrive.",
    health: { ok: "Working", degraded: "Slow", down: "Down" } as Record<SourceHealth, string>,
    enabled: (name: string) => `${name} enabled`,
    lastFetched: "Last fetched",
    never: "Never",
    perDay: (n: string) => `${n} a day`,
    enable: "Enable",
    disable: "Disable",
    retry: "Retry now",
    visit: "Open the site",
    sourcesEmpty: "No sources yet.",
    toggleFailed: "Could not change the source. Try again.",
    sources: "Sources",
  },
  ar: {
    states: { new: "جديدة", saved: "محفوظة", reviewed: "تمت مراجعتها", dismissed: "مستبعدة" } as Record<TrendState, string>,
    tabs: "حالة الموضوع",
    actions: { save: "حفظ", review: "تمت المراجعة", dismiss: "استبعاد", restore: "استعادة" } as Record<TrendAction, string>,
    moreFor: (title: string) => `إجراءات ${title}`,
    score: "الدرجة",
    hot: "رائج جدًا",
    why: "لماذا هو رائج",
    outlets: (n: number) => (n === 1 ? "منفذ واحد" : n === 2 ? "منفذان" : `${n} منافذ`),
    items: (n: number) => (n === 1 ? "مقال واحد" : n === 2 ? "مقالان" : `${n} مقالات`),
    showItems: (n: number) => `عرض ${n === 1 ? "مقال واحد" : n === 2 ? "مقالين" : `${n} مقالات`}`,
    hideItems: "إخفاء المقالات",
    open: "فتح",
    failed: (action: string) => `تعذّر تنفيذ «${action}». حاول مرة أخرى.`,
    emptyTitle: (state: string) => `لا مواضيع ${state}`,
    emptyBody: "تظهر المواضيع هنا عند رصدها.",
    today: "اليوم",
    yesterday: "أمس",
    tier: (n: number) => `المستوى ${n}`,
    tierHint: { 1: "المصادر الأساسية. تُفضَّل متى عمل أحدها.", 2: "مصادر احتياطية. تُستخدم عندما لا يعمل شيء في المستوى 1.", 3: "الملاذ الأخير. يُستخدم عندما لا يعمل شيء في المستويين 1 و2." } as Record<SourceTier, string>,
    active: "نشط",
    activeNote: (n: number) => `يغذّي الاتجاهات: المستوى ${n}`,
    fellBack: (from: string, to: number) => `لا يعمل أي مصدر في ${from}، لذا يُستخدم المستوى ${to}.`,
    noneWorking: "لا يعمل أي مصدر، فلن تصل مواضيع جديدة.",
    health: { ok: "يعمل", degraded: "بطيء", down: "متوقف" } as Record<SourceHealth, string>,
    enabled: (name: string) => `تفعيل ${name}`,
    lastFetched: "آخر جلب",
    never: "لم يُجلب بعد",
    perDay: (n: string) => `${n} يوميًا`,
    enable: "تفعيل",
    disable: "تعطيل",
    retry: "أعد المحاولة الآن",
    visit: "فتح الموقع",
    sourcesEmpty: "لا مصادر بعد.",
    toggleFailed: "تعذّر تغيير المصدر. حاول مرة أخرى.",
    sources: "المصادر",
  },
};

export type TrendsFeedLabels = typeof STRINGS.en;

const actionIcon = { save: Bookmark, review: CheckCheck, dismiss: EyeOff, restore: RotateCcw } as const;

export interface TrendOutlet {
  id: string;
  name: string;
}

export interface TrendItem {
  id: string;
  title: string;
  outlet: string;
  url?: string;
  publishedAt: Date | string | number;
}

export interface TrendTopic {
  id: string;
  title: string;
  summary?: string;
  /** 0 to 100. */
  score: number;
  /** Short reasons in words: "Mentioned by 6 outlets", "Up 340% since yesterday". */
  reasons?: readonly string[];
  outlets: readonly TrendOutlet[];
  items: readonly TrendItem[];
  detectedAt: Date | string | number;
  state: TrendState;
}

export interface TrendsFeedProps extends Omit<ComponentProps<"section">, "children"> {
  topics: readonly TrendTopic[];
  /** Selected tab (controlled). */
  state?: TrendState;
  defaultState?: TrendState;
  onStateChange?: (state: TrendState) => void;
  /** Apply an action. Async: the buttons wait, and a rejection shows an error on the topic. Update `topics` when it resolves. */
  onAction?: (topic: TrendTopic, action: TrendAction) => void | Promise<void>;
  /** Extra items for a topic's menu (open in editor, share). */
  extraActions?: (topic: TrendTopic) => ContextMenuAction[];
  /** Zone for the day headings. Default: the browser's. */
  timeZone?: string;
  /** "Now" for Today, Yesterday and relative times. Default: the current time. */
  now?: Date;
  /** Scores at or above this get the Hot badge. Default 80. */
  hotAt?: number;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  labels?: Partial<TrendsFeedLabels>;
}

/**
 * Trending topics found in the news, grouped by the day they were detected and split into New, Saved, Reviewed and
 * Dismissed tabs with counts. A topic shows its score with the reasons behind it, the outlets that carry it and, on
 * request, its articles. Save, review, dismiss and restore work from buttons and from the topic's context menu.
 */
export function TrendsFeed({ topics, state: stateProp, defaultState = "new", onStateChange, onAction, extraActions, timeZone, now, hotAt = 80, loading, error, onRetry, labels, className, ...props }: TrendsFeedProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const locale = useOptionalNasaq()?.locale ?? "en";
  const [inner, setInner] = useState<TrendState>(defaultState);
  const state = stateProp ?? inner;
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [failed, setFailed] = useState<Record<string, string>>({});
  const counts = useMemo(() => countByState(topics), [topics]);
  const groups = useMemo(() => groupTopicsByDay(topics.filter((x) => x.state === state), timeZone), [topics, state, timeZone]);
  const today = new Date(now ?? Date.now());
  const dayLabel = (day: string) => {
    const base = new Date(today).getTime();
    const key = (d: number) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(base - d * 86400000));
    if (day === key(0)) return t.today;
    if (day === key(1)) return t.yesterday;
    return formatDate(`${day}T12:00:00Z`, locale, { dateStyle: "full", timeZone: "UTC" });
  };

  const run = async (topic: TrendTopic, action: TrendAction) => {
    if (!onAction || busy.has(topic.id)) return;
    setBusy((b) => new Set(b).add(topic.id));
    setFailed((f) => {
      const { [topic.id]: _drop, ...rest } = f;
      return rest;
    });
    try {
      await onAction(topic, action);
    } catch {
      setFailed((f) => ({ ...f, [topic.id]: t.failed(t.actions[action]) }));
    } finally {
      setBusy((b) => {
        const next = new Set(b);
        next.delete(topic.id);
        return next;
      });
    }
  };

  const menuFor = (topic: TrendTopic): ContextMenuAction[] => [
    ...actionsFor(topic.state).map((a) => ({ id: a, label: t.actions[a], icon: actionIcon[a], danger: a === "dismiss", disabled: busy.has(topic.id), onSelect: () => void run(topic, a) })),
    ...(extraActions?.(topic) ?? []).map((a) => ({ ...a, group: a.group ?? "more" })),
  ];

  return (
    <section data-slot="trends-feed" className={cn("flex flex-col gap-4", className)} {...props}>
      <Tabs value={state} onValueChange={(v) => { if (stateProp === undefined) setInner(v as TrendState); onStateChange?.(v as TrendState); }}>
        <TabsList aria-label={t.tabs} className="max-w-full overflow-x-auto">
          {TREND_STATES.map((s) => (
            <TabsTab key={s} value={s}>
              {t.states[s]}
              <Badge variant="neutral" className="ms-1.5">
                <Num value={counts[s]} />
              </Badge>
            </TabsTab>
          ))}
        </TabsList>
        {TREND_STATES.map((s) => (
          <TabsPanel key={s} value={s} className="mt-4">
            {s !== state ? null : error ? (
              <ErrorState title={typeof error === "string" ? error : undefined} actions={onRetry ? <Button onClick={onRetry}>{t.retry}</Button> : undefined} />
            ) : loading ? (
              <LoadingState rows={3} />
            ) : groups.length === 0 ? (
              <EmptyState title={t.emptyTitle(t.states[s])} description={t.emptyBody} />
            ) : (
              <div className="flex flex-col gap-6">
                {groups.map((g) => (
                  <div key={g.day} className="flex flex-col gap-3">
                    <h3 className="text-label font-medium text-muted-foreground">{dayLabel(g.day)}</h3>
                    <ul className="flex flex-col gap-3">
                      {g.topics.map((topic) => (
                        <TopicCard key={topic.id} topic={topic} t={t} locale={locale} now={today} hot={topic.score >= hotAt} pending={busy.has(topic.id)} error={failed[topic.id]} menu={menuFor(topic)} onRun={(a) => void run(topic, a)} canAct={!!onAction} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </TabsPanel>
        ))}
      </Tabs>
    </section>
  );
}

interface TopicCardProps {
  topic: TrendTopic;
  t: TrendsFeedLabels;
  locale: string;
  now: Date;
  hot: boolean;
  pending: boolean;
  error?: string;
  menu: ContextMenuAction[];
  onRun: (a: TrendAction) => void;
  canAct: boolean;
}

function TopicCard({ topic, t, locale, now, hot, pending, error, menu, onRun, canAct }: TopicCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <ContextMenuActions actions={menu} render={<li className="min-w-0" />}>
      <Card className="w-full">
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h4 className="text-body font-medium">{topic.title}</h4>
              {topic.summary ? <p className="text-body-sm text-muted-foreground">{topic.summary}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {hot ? (
                <Badge variant="danger">
                  <Flame aria-hidden />
                  {t.hot}
                </Badge>
              ) : null}
              <Badge variant="outline">
                {t.score} <Num value={topic.score} />
              </Badge>
            </div>
          </div>
          {topic.reasons?.length ? (
            <div>
              <p className="text-caption font-medium text-muted-foreground">{t.why}</p>
              <ul className="mt-1 list-disc ps-5 text-body-sm">
                {topic.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-caption text-muted-foreground">{t.outlets(topic.outlets.length)}</span>
            {topic.outlets.map((o) => (
              <Badge key={o.id} variant="neutral">
                {o.name}
              </Badge>
            ))}
          </div>
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger render={<Button variant="ghost" size="sm" className="-ms-2" />}>
              <ChevronDown aria-hidden className={cn("transition-transform motion-reduce:transition-none", open && "rotate-180")} />
              {open ? t.hideItems : t.showItems(topic.items.length)}
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <ul className="mt-2 flex flex-col divide-y divide-border rounded-control border border-border">
                {topic.items.map((it) => (
                  <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      {it.url ? (
                        <a href={it.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-body-sm font-medium underline-offset-2 hover:underline">
                          {it.title}
                          <ExternalLink aria-hidden className="size-3 rtl:-scale-x-100" />
                          <span className="sr-only">{t.open}</span>
                        </a>
                      ) : (
                        <span className="text-body-sm font-medium">{it.title}</span>
                      )}
                      <p className="text-caption text-muted-foreground">
                        {it.outlet} · {formatRelativeTime(it.publishedAt, locale, { now })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CollapsiblePanel>
          </Collapsible>
          {error ? (
            <p role="alert" className="flex items-center gap-1.5 text-body-sm text-nq-danger-text">
              <CircleAlert aria-hidden className="size-4" />
              {error}
            </p>
          ) : null}
          {canAct ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              {actionsFor(topic.state).map((a) => {
                const Icon = actionIcon[a];
                return (
                  <Button key={a} variant={a === "dismiss" ? "ghost" : "secondary"} size="sm" loading={pending} disabled={pending} onClick={() => onRun(a)}>
                    <Icon aria-hidden />
                    {t.actions[a]}
                  </Button>
                );
              })}
              <Button variant="ghost" size="icon-sm" className="ms-auto" aria-label={t.moreFor(topic.title)} onClick={(e) => openContextMenuAt(e.currentTarget.closest("li") as HTMLElement)}>
                <Ellipsis aria-hidden />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </ContextMenuActions>
  );
}


/* ------------------------------------------------------------------------------------------ SourcesCatalogue */

export interface TrendSource {
  id: string;
  name: string;
  url?: string;
  tier: SourceTier;
  enabled: boolean;
  health: SourceHealth;
  lastFetchedAt?: Date | string | number;
  /** Average articles per day. */
  perDay?: number;
}

export interface SourcesCatalogueProps extends Omit<ComponentProps<"section">, "children"> {
  sources: readonly TrendSource[];
  /** Turn a source on or off. Async: the switch waits, and a rejection shows an error. Update `sources` when it resolves. */
  onEnabledChange?: (source: TrendSource, enabled: boolean) => void | Promise<void>;
  /** Fetch a source again now. Offered for sources that are not working. */
  onRetry?: (source: TrendSource) => void | Promise<void>;
  /** "Now" for the last fetched times. Default: the current time. */
  now?: Date;
  labels?: Partial<TrendsFeedLabels>;
}

const healthBadge: Record<SourceHealth, { variant: "success" | "warning" | "danger"; icon: typeof CircleCheck }> = {
  ok: { variant: "success", icon: CircleCheck },
  degraded: { variant: "warning", icon: TriangleAlert },
  down: { variant: "danger", icon: CircleX },
};

/**
 * The news sources in three tiers. Tier 1 feeds the trends while it has a working source; when it has none the feed
 * falls back to tier 2, then tier 3, and the catalogue says so. Each source has a switch, its health and its last fetch.
 */
export function SourcesCatalogue({ sources, onEnabledChange, onRetry, now, labels, className, ...props }: SourcesCatalogueProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const locale = useOptionalNasaq()?.locale ?? "en";
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const active = useMemo(() => resolveActiveTier(sources), [sources]);
  const reference = now ?? new Date();

  const run = async (source: TrendSource, job: () => void | Promise<void>) => {
    if (busy.has(source.id)) return;
    setBusy((b) => new Set(b).add(source.id));
    setFailed((f) => {
      const next = new Set(f);
      next.delete(source.id);
      return next;
    });
    try {
      await job();
    } catch {
      setFailed((f) => new Set(f).add(source.id));
    } finally {
      setBusy((b) => {
        const next = new Set(b);
        next.delete(source.id);
        return next;
      });
    }
  };

  const menuFor = (s: TrendSource): ContextMenuAction[] => [
    ...(onEnabledChange ? [{ id: "toggle", label: s.enabled ? t.disable : t.enable, onSelect: () => void run(s, () => onEnabledChange(s, !s.enabled)) }] : []),
    ...(onRetry && s.enabled && s.health !== "ok" ? [{ id: "retry", label: t.retry, onSelect: () => void run(s, () => onRetry(s)) }] : []),
    ...(s.url ? [{ id: "visit", label: t.visit, group: "more", onSelect: () => window.open(s.url, "_blank", "noreferrer") }] : []),
  ];

  return (
    <section data-slot="sources-catalogue" className={cn("flex flex-col gap-4", className)} {...props}>
      {active.tier === null && sources.length ? (
        <p role="status" className="flex items-center gap-2 rounded-control border border-nq-danger/40 bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden className="size-4 shrink-0" />
          {t.noneWorking}
        </p>
      ) : active.fellBack && active.tier ? (
        <p role="status" className="flex items-center gap-2 rounded-control border border-nq-warning/40 bg-nq-warning-soft px-3 py-2 text-body-sm text-nq-warning-text">
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          {t.fellBack(active.skipped.map((n) => t.tier(n)).join(", "), active.tier)}
        </p>
      ) : null}
      {sources.length === 0 ? <EmptyState title={t.sourcesEmpty} /> : null}
      {([1, 2, 3] as const).map((tier) => {
        const list = sources.filter((s) => s.tier === tier);
        if (!list.length) return null;
        const isActive = active.tier === tier;
        return (
          <div key={tier} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-label font-medium">{t.tier(tier)}</h3>
              {isActive ? (
                <Badge variant="success">
                  <CircleCheck aria-hidden />
                  {t.active}
                </Badge>
              ) : null}
              <p className="text-caption text-muted-foreground">{t.tierHint[tier]}</p>
            </div>
            <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
              {list.map((s) => {
                const H = healthBadge[s.health];
                const Icon = H.icon;
                return (
                  <ContextMenuActions key={s.id} actions={menuFor(s)} render={<li className={cn("flex flex-wrap items-center gap-3 px-4 py-3", !isSourceUsable(s) && "opacity-90")} />}>
                    <Switch checked={s.enabled} disabled={!onEnabledChange || busy.has(s.id)} aria-label={t.enabled(s.name)} onCheckedChange={(v) => void run(s, () => onEnabledChange?.(s, v))} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-medium">{s.name}</p>
                      <p className="text-caption text-muted-foreground">
                        {t.lastFetched}: {s.lastFetchedAt ? formatRelativeTime(s.lastFetchedAt, locale, { now: reference }) : t.never}
                        {s.perDay !== undefined ? <> · {t.perDay(new Intl.NumberFormat("en").format(s.perDay))}</> : null}
                      </p>
                      {failed.has(s.id) ? (
                        <p role="alert" className="text-caption text-nq-danger-text">
                          {t.toggleFailed}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant={H.variant}>
                      <Icon aria-hidden />
                      {t.health[s.health]}
                    </Badge>
                    {menuFor(s).length ? (
                      <Button variant="ghost" size="icon-sm" aria-label={t.moreFor(s.name)} onClick={(e) => openContextMenuAt(e.currentTarget.closest("li") as HTMLElement)}>
                        <Ellipsis aria-hidden />
                      </Button>
                    ) : null}
                  </ContextMenuActions>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
