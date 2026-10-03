"use client";

import { Bug, Check, MessageSquarePlus, ThumbsUp, Vibrate } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { CodeBlock } from "../code-block";
import { Input } from "../field";
import { DateTime } from "../numeric";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../sheet";
import { EmptyState } from "../states";
import { Switch } from "../switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { ToggleGroup, Toggle } from "../toggle-group";
import {
  countByStatus,
  FEEDBACK_POSITIONS,
  filterHubIssues,
  FEEDBACK_SHAPES,
  feedbackInstallSnippet,
  type FeedbackHubIssue,
  type FeedbackIssueStatus,
  type FeedbackLauncherConfig,
  type FeedbackLauncherPosition,
  type FeedbackLauncherShape,
  type FeedbackLauncherSpot,
  isShake,
  motionDelta,
  moveLauncherSpot,
  normalizePosition,
  parseLauncherSpot,
  snapLauncherSpot,
  spotFromPosition,
} from "./feedback-reporter-utils";

const STRINGS = {
  en: {
    launcher: "Feedback",
    moveHint: "Drag to move it out of the way. Alt + arrow keys move it too.",
    hubTitle: "Reports on this page",
    hubDescription: "What other people already told us about this page. Add your vote instead of sending a duplicate.",
    page: "Page",
    reportNew: "Report a problem",
    all: "All",
    open: "Open",
    inProgress: "In progress",
    resolved: "Resolved",
    emptyTitle: "Nothing reported here",
    emptyBody: "No one has reported a problem on this page yet.",
    emptyFiltered: "No reports with this status.",
    mine: "Mine",
    yours: "Yours",
    emptyMineTitle: "You have not reported anything",
    emptyMine: "Reports you send from this page show up here, with their status.",
    loadMore: "Load more",
    showing: "Showing {shown} of {total}",
    meToo: "Me too",
    voted: "You said this too",
    votes: "{count} people have this",
    by: "by {name}",
    filterLabel: "Filter by status",
    listLabel: "Reports on this page",
    configTitle: "Launcher",
    configDescription: "Choose how the feedback button looks and where it sits, then copy the install code.",
    shape: "Shape",
    position: "Position",
    text: "Button text",
    preview: "Preview",
    shapePill: "Pill",
    shapeCircle: "Circle",
    shapeTab: "Edge tab",
    posBottomEnd: "Bottom end",
    posBottomStart: "Bottom start",
    posTopEnd: "Top end",
    posTopStart: "Top start",
    posEdgeEnd: "Edge end",
    posEdgeStart: "Edge start",
    install: "Install",
    react: "React",
    json: "Config",
    copyCode: "Copy code",
    codeLabel: "Install code",
    shakeTitle: "Something wrong?",
    shakeDescription: "You shook your phone. Do you want to report a problem on this screen?",
    shakeReport: "Report a problem",
    shakeDismiss: "Not now",
    shakeSetting: "Shake to report",
    shakeSettingHint: "Shaking your phone opens this sheet.",
  },
  ar: {
    launcher: "ملاحظات",
    moveHint: "اسحبه لإبعاده عن طريقك. Alt مع الأسهم يحركه أيضًا.",
    hubTitle: "البلاغات على هذه الصفحة",
    hubDescription: "ما أخبرنا به الآخرون عن هذه الصفحة. أضف صوتك بدل إرسال بلاغ مكرر.",
    page: "الصفحة",
    reportNew: "الإبلاغ عن مشكلة",
    all: "الكل",
    open: "مفتوحة",
    inProgress: "قيد المعالجة",
    resolved: "تم حلها",
    emptyTitle: "لا بلاغات هنا",
    emptyBody: "لم يبلّغ أحد عن مشكلة في هذه الصفحة بعد.",
    emptyFiltered: "لا توجد بلاغات بهذه الحالة.",
    mine: "بلاغاتي",
    yours: "بلاغك",
    emptyMineTitle: "لم تبلغ عن شيء بعد",
    emptyMine: "البلاغات التي ترسلها من هذه الصفحة تظهر هنا مع حالتها.",
    loadMore: "عرض المزيد",
    showing: "يعرض {shown} من {total}",
    meToo: "وأنا أيضاً",
    voted: "قلت ذلك أيضاً",
    votes: "{count} أشخاص لديهم المشكلة",
    by: "بواسطة {name}",
    filterLabel: "تصفية حسب الحالة",
    listLabel: "البلاغات على هذه الصفحة",
    configTitle: "زر الملاحظات",
    configDescription: "اختر شكل الزر ومكانه ثم انسخ كود التركيب.",
    shape: "الشكل",
    position: "المكان",
    text: "نص الزر",
    preview: "معاينة",
    shapePill: "كبسولة",
    shapeCircle: "دائرة",
    shapeTab: "لسان جانبي",
    posBottomEnd: "أسفل النهاية",
    posBottomStart: "أسفل البداية",
    posTopEnd: "أعلى النهاية",
    posTopStart: "أعلى البداية",
    posEdgeEnd: "حافة النهاية",
    posEdgeStart: "حافة البداية",
    install: "التركيب",
    react: "React",
    json: "الإعداد",
    copyCode: "نسخ الكود",
    codeLabel: "كود التركيب",
    shakeTitle: "هل من مشكلة؟",
    shakeDescription: "هززت هاتفك. هل تريد الإبلاغ عن مشكلة في هذه الشاشة؟",
    shakeReport: "الإبلاغ عن مشكلة",
    shakeDismiss: "ليس الآن",
    shakeSetting: "الهز للإبلاغ",
    shakeSettingHint: "هز هاتفك يفتح هذه الورقة.",
  },
};

export type FeedbackReporterLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<FeedbackReporterLabels>) {
  const nasaq = useOptionalNasaq();
  const ar = nasaq?.locale.startsWith("ar") ?? false;
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels }, ar };
}

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/* ------------------------------------------------------------------ floating launcher */

const positionClass: Record<FeedbackLauncherPosition, string> = {
  "bottom-end": "bottom-4 end-4",
  "bottom-start": "bottom-4 start-4",
  "top-end": "top-4 end-4",
  "top-start": "top-4 start-4",
  "edge-end": "end-0 top-1/2 -translate-y-1/2",
  "edge-start": "start-0 top-1/2 -translate-y-1/2",
};

export interface FeedbackFloatingLauncherProps extends Omit<ComponentProps<"button">, "children" | "type"> {
  shape?: FeedbackLauncherShape;
  position?: FeedbackLauncherPosition;
  /** The words on the pill and tab, and the accessible name of the circle. Defaults to "Feedback" / "ملاحظات". */
  label?: string;
  /** A count on the corner, for example the reports already open on this page. */
  count?: number;
  /** `fixed` sits on the screen, `absolute` in a `relative` parent (previews). Default `fixed`. */
  placement?: "fixed" | "absolute";
  /** Replaces the default icon. */
  icon?: ReactNode;
  /**
   * Lets the visitor drag the launcher out of the way. On release it snaps to the nearer side and keeps its height;
   * Alt + arrow keys move it too. The spot is remembered under `storageKey`.
   */
  movable?: boolean;
  /** Where a movable launcher's spot is saved in `localStorage`. Default `"nasaq-feedback-launcher"`; `null` keeps it in memory. */
  storageKey?: string | null;
  /** A controlled spot. Without it the launcher keeps its own, starting from `defaultSpot`, the saved one or `position`. */
  spot?: FeedbackLauncherSpot | null;
  defaultSpot?: FeedbackLauncherSpot;
  /** Called when the visitor drops the launcher or moves it with the keyboard. */
  onSpotChange?: (spot: FeedbackLauncherSpot) => void;
  labels?: Partial<FeedbackReporterLabels>;
}

const DRAG_THRESHOLD = 4;

/**
 * The floating feedback button: a pill, a circle or a tab on the screen edge, in a corner or the middle of a side. Sides
 * are logical: `end` is the right in English and the left in Arabic. It only draws the button and calls `onClick`;
 * open `@nasaq/feedback`'s `ReportDialog` from it. With `movable` the visitor can drag it aside and it stays there.
 */
export function FeedbackFloatingLauncher({
  shape = "pill",
  position = "bottom-end",
  label,
  count,
  placement = "fixed",
  icon,
  movable = false,
  storageKey = "nasaq-feedback-launcher",
  spot: spotProp,
  defaultSpot,
  onSpotChange,
  labels,
  className,
  style,
  title,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  ...props
}: FeedbackFloatingLauncherProps) {
  const { t } = useLabels(labels);
  const text = label ?? t.launcher;
  const where = normalizePosition(shape, position);
  const glyph = icon ?? <MessageSquarePlus aria-hidden className="size-4" />;
  const ref = useRef<HTMLButtonElement>(null);
  const [ownSpot, setOwnSpot] = useState<FeedbackLauncherSpot | null>(defaultSpot ?? null);
  const spot = movable ? (spotProp !== undefined ? spotProp : ownSpot) : null;
  // The newest spot, so key repeats faster than a render still add up.
  const latest = useRef(spot);
  latest.current = spot;
  const drag = useRef<{ id: number; startX: number; startY: number; offX: number; offY: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  const [dragAt, setDragAt] = useState<{ left: number; top: number } | null>(null);

  // Read the saved spot after mount, so the server and first client render agree.
  useEffect(() => {
    if (!movable || !storageKey || defaultSpot || typeof localStorage === "undefined") return;
    const saved = parseLauncherSpot(localStorage.getItem(storageKey));
    if (saved) setOwnSpot(saved);
  }, [movable, storageKey, defaultSpot]);

  const commit = (next: FeedbackLauncherSpot) => {
    latest.current = next;
    setOwnSpot(next);
    if (storageKey && typeof localStorage !== "undefined") localStorage.setItem(storageKey, JSON.stringify(next));
    onSpotChange?.(next);
  };

  // The area the launcher moves in: the screen, or its positioned parent in a preview.
  const area = () => {
    const parent = placement === "absolute" ? ref.current?.offsetParent : null;
    return parent ? parent.getBoundingClientRect() : new DOMRect(0, 0, window.innerWidth, window.innerHeight);
  };
  const isRtl = () => (ref.current ? getComputedStyle(ref.current).direction === "rtl" : false);

  const tabSide = spot ? (spot.side === "end" ? "edge-end" : "edge-start") : where;
  const inset = shape === "tab" ? "0px" : "1rem";
  const placed = dragAt
    ? { left: dragAt.left, top: dragAt.top, transition: "none" }
    : spot
      ? { top: `${spot.y * 100}%`, [spot.side === "end" ? "insetInlineEnd" : "insetInlineStart"]: inset }
      : undefined;

  return (
    <button
      ref={ref}
      type="button"
      data-slot="feedback-launcher"
      data-shape={shape}
      data-position={spot ? undefined : where}
      data-side={spot?.side}
      data-movable={movable || undefined}
      data-dragging={dragAt ? true : undefined}
      aria-label={shape === "circle" ? text : undefined}
      aria-keyshortcuts={movable ? "Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight" : undefined}
      title={title ?? (movable ? t.moveHint : undefined)}
      className={cn(
        "z-40 inline-flex items-center justify-center gap-2 bg-primary text-label text-primary-foreground shadow-floating outline-none",
        "transition-[filter,translate] duration-150 ease-nq hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
        placement,
        dragAt ? "cursor-grabbing select-none" : spot ? "-translate-y-1/2" : positionClass[where],
        movable && "touch-none",
        shape === "pill" && "h-control rounded-full px-4",
        shape === "circle" && "relative size-12 rounded-full",
        shape === "tab" && (tabSide === "edge-end" ? "rounded-s-card" : "rounded-e-card") + " flex-col px-2 py-3",
        className,
      )}
      style={{ ...placed, ...style }}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (!movable || e.defaultPrevented || e.button !== 0) return;
        const box = e.currentTarget.getBoundingClientRect();
        drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, offX: e.clientX - box.left, offY: e.clientY - box.top, moved: false };
      }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        if (!d.moved) {
          if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
          d.moved = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        const box = area();
        const el = e.currentTarget;
        setDragAt({
          left: Math.min(Math.max(e.clientX - d.offX - box.left, 0), box.width - el.offsetWidth),
          top: Math.min(Math.max(e.clientY - d.offY - box.top, 0), box.height - el.offsetHeight),
        });
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        const d = drag.current;
        drag.current = null;
        if (!d?.moved || d.id !== e.pointerId) return;
        swallowClick.current = true;
        const box = area();
        const el = e.currentTarget;
        const center = { x: e.clientX - d.offX - box.left + el.offsetWidth / 2, y: e.clientY - d.offY - box.top + el.offsetHeight / 2 };
        setDragAt(null);
        commit(snapLauncherSpot(center, box, isRtl(), el.offsetHeight));
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        drag.current = null;
        setDragAt(null);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (!movable || e.defaultPrevented || !e.altKey) return;
        const rtl = isRtl();
        const move =
          e.key === "ArrowUp" ? "up" : e.key === "ArrowDown" ? "down" : e.key === "ArrowLeft" ? (rtl ? "end" : "start") : e.key === "ArrowRight" ? (rtl ? "start" : "end") : null;
        if (!move) return;
        e.preventDefault();
        commit(moveLauncherSpot(latest.current ?? spotFromPosition(where), move));
      }}
      onClick={(e) => {
        // A drag ends with a click on the button; it should not open the report.
        if (swallowClick.current) {
          swallowClick.current = false;
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...props}
    >
      {glyph}
      {shape === "circle" ? null : (
        <span className={cn(shape === "tab" && "[writing-mode:vertical-rl] rtl:rotate-180")}>{text}</span>
      )}
      {count ? (
        <span
          aria-hidden={shape !== "circle"}
          className={cn(
            "inline-flex min-w-5 items-center justify-center rounded-full bg-background px-1 text-caption text-foreground tabular-nums",
            shape === "circle" && "absolute -end-1 -top-1 h-5 border border-border",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

/* ------------------------------------------------------------------ hub */

export interface FeedbackHubProps extends Omit<ComponentProps<"section">, "children"> {
  /** The address the reports are about, shown under the title. */
  page?: string;
  issues: readonly FeedbackHubIssue[];
  /** "Me too" on a report. Returns `void` or `{ error }`. */
  onVote?: (id: string) => Promise<void | { error?: string }>;
  /** Opens the report dialog. */
  onReportNew?: () => void;
  onOpenIssue?: (id: string) => void;
  labels?: Partial<FeedbackReporterLabels>;
  /** Adds a "Mine" tab for the visitor's own reports. Default: shown when any issue has `mine`. */
  mineTab?: boolean;
  /** Counts from the server, when `issues` is only the first page. Missing ones are counted from `issues`. */
  counts?: Partial<Record<FeedbackHubFilter, number>>;
  /** Called when the tab changes, to fetch that tab from the server. */
  onFilterChange?: (filter: FeedbackHubFilter) => void;
  /** More reports exist than `issues` holds: shows **Load more**. */
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

/** The hub's tabs: a status, all, or the visitor's own reports. */
export type FeedbackHubFilter = FeedbackIssueStatus | "all" | "mine";

const statusBadge = (s: FeedbackIssueStatus, t: FeedbackReporterLabels) =>
  s === "resolved" ? (
    <Badge variant="success">{t.resolved}</Badge>
  ) : s === "in-progress" ? (
    <Badge variant="info">{t.inProgress}</Badge>
  ) : (
    <Badge variant="neutral">{t.open}</Badge>
  );

/**
 * What people already reported on this page, with a status filter and a "Me too" vote, so a visitor adds a vote instead
 * of a duplicate. Report writing and screenshots live in `@nasaq/feedback`'s `ReportDialog`: this is the list around it.
 */
export function FeedbackHub({
  page,
  issues,
  onVote,
  onReportNew,
  onOpenIssue,
  labels,
  mineTab,
  counts: serverCounts,
  onFilterChange,
  hasMore,
  onLoadMore,
  loadingMore,
  className,
  ...props
}: FeedbackHubProps) {
  const { t } = useLabels(labels);
  const titleId = useId();
  const [filter, setFilter] = useState<FeedbackHubFilter>("all");
  const [voting, setVoting] = useState<string | null>(null);
  const counts = { ...countByStatus(issues), mine: issues.filter((i) => i.mine).length, ...serverCounts };
  const shown = filterHubIssues(issues, filter);
  const tabs: [FeedbackHubFilter, string][] = [
    ["all", t.all],
    ["open", t.open],
    ["in-progress", t.inProgress],
    ["resolved", t.resolved],
  ];
  if (mineTab ?? issues.some((i) => i.mine)) tabs.push(["mine", t.mine]);
  const vote = async (id: string) => {
    if (!onVote) return;
    setVoting(id);
    try {
      await onVote(id);
    } finally {
      setVoting(null);
    }
  };

  return (
    <section
      data-slot="feedback-hub"
      aria-labelledby={titleId}
      className={cn("flex w-full max-w-2xl flex-col gap-4 rounded-card border border-border bg-card p-4", className)}
      {...props}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={titleId} className="text-h3">
            {t.hubTitle}
          </h2>
          <p className="text-body-sm text-muted-foreground">{t.hubDescription}</p>
          {page ? (
            <p className="text-caption text-muted-foreground">
              {t.page} <bdi dir="ltr" className="font-mono text-foreground">{page}</bdi>
            </p>
          ) : null}
        </div>
        {onReportNew ? (
          <Button variant="primary" size="sm" className="shrink-0" onClick={onReportNew}>
            <Bug aria-hidden />
            {t.reportNew}
          </Button>
        ) : null}
      </header>
      <ToggleGroup
        aria-label={t.filterLabel}
        value={[filter]}
        className="flex-wrap"
        onValueChange={(v) => {
          const next = (v[0] as FeedbackHubFilter | undefined) ?? "all";
          setFilter(next);
          onFilterChange?.(next);
        }}
      >
        {tabs.map(([value, text]) => (
          <Toggle key={value} value={value}>
            {text}
            <span className="text-caption tabular-nums opacity-70">{counts[value]}</span>
          </Toggle>
        ))}
      </ToggleGroup>
      {shown.length === 0 ? (
        <EmptyState
          icon={Bug}
          title={filter === "mine" ? t.emptyMineTitle : t.emptyTitle}
          description={filter === "all" ? t.emptyBody : filter === "mine" ? t.emptyMine : t.emptyFiltered}
          className="py-8"
        />
      ) : (
        <ul aria-label={t.listLabel} className="flex flex-col divide-y divide-border rounded-control border border-border">
          {shown.map((issue) => (
            <li key={issue.id} className="flex items-start gap-3 p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {onOpenIssue ? (
                  <button type="button" onClick={() => onOpenIssue(issue.id)} dir="auto" className="w-fit max-w-full truncate rounded-control text-start text-label underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus">
                    {issue.title}
                  </button>
                ) : (
                  <span dir="auto" className="truncate text-label">
                    {issue.title}
                  </span>
                )}
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
                  {statusBadge(issue.status, t)}
                  {issue.mine ? <Badge variant="neutral">{t.yours}</Badge> : issue.author ? <span dir="auto">{fill(t.by, { name: issue.author })}</span> : null}
                  {issue.createdAt !== undefined ? <DateTime value={issue.createdAt} relative /> : null}
                </span>
              </div>
              {onVote ? (
                <Button
                  variant={issue.voted ? "secondary" : "ghost"}
                  size="sm"
                  aria-pressed={issue.voted ? true : false}
                  disabled={issue.voted || issue.status === "resolved"}
                  loading={voting === issue.id}
                  title={issue.votes !== undefined ? fill(t.votes, { count: issue.votes }) : undefined}
                  onClick={() => vote(issue.id)}
                >
                  {issue.voted ? <Check aria-hidden /> : <ThumbsUp aria-hidden />}
                  <span>{issue.voted ? t.voted : t.meToo}</span>
                  {issue.votes !== undefined ? <span className="tabular-nums text-muted-foreground">{issue.votes}</span> : null}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {hasMore && onLoadMore ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption text-muted-foreground tabular-nums">
            {fill(t.showing, { shown: shown.length, total: counts[filter] })}
          </span>
          <Button variant="secondary" size="sm" loading={loadingMore} onClick={onLoadMore}>
            {t.loadMore}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ configurator */

export interface FeedbackLauncherConfiguratorProps extends Omit<ComponentProps<"section">, "children" | "onChange"> {
  value: FeedbackLauncherConfig;
  onChange: (value: FeedbackLauncherConfig) => void;
  labels?: Partial<FeedbackReporterLabels>;
}

/**
 * Chooses the launcher's shape, position and text, shows it live in a preview frame, and prints the install code (React
 * next to `@nasaq/feedback`, or the plain config as JSON). It is controlled. The public key is never written into the
 * code: the sample reads it from an environment variable.
 */
export function FeedbackLauncherConfigurator({ value, onChange, labels, className, ...props }: FeedbackLauncherConfiguratorProps) {
  const { t } = useLabels(labels);
  const titleId = useId();
  const textId = useId();
  const shapeNames: Record<FeedbackLauncherShape, string> = { pill: t.shapePill, circle: t.shapeCircle, tab: t.shapeTab };
  const positionNames: Record<FeedbackLauncherPosition, string> = {
    "bottom-end": t.posBottomEnd,
    "bottom-start": t.posBottomStart,
    "top-end": t.posTopEnd,
    "top-start": t.posTopStart,
    "edge-end": t.posEdgeEnd,
    "edge-start": t.posEdgeStart,
  };
  const effective = normalizePosition(value.shape, value.position);
  return (
    <section
      data-slot="feedback-configurator"
      aria-labelledby={titleId}
      className={cn("flex w-full max-w-3xl flex-col gap-4 rounded-card border border-border bg-card p-4", className)}
      {...props}
    >
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-h3">
          {t.configTitle}
        </h2>
        <p className="text-body-sm text-muted-foreground">{t.configDescription}</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-label">{t.shape}</span>
            <ToggleGroup aria-label={t.shape} value={[value.shape]} onValueChange={(v) => v[0] && onChange({ ...value, shape: v[0] as FeedbackLauncherShape })}>
              {FEEDBACK_SHAPES.map((s) => (
                <Toggle key={s} value={s}>
                  {shapeNames[s]}
                </Toggle>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-label">{t.position}</span>
            <ToggleGroup aria-label={t.position} value={[effective]} className="flex-wrap" onValueChange={(v) => v[0] && onChange({ ...value, position: v[0] as FeedbackLauncherPosition })}>
              {FEEDBACK_POSITIONS.map((p) => (
                <Toggle key={p} value={p}>
                  {positionNames[p]}
                </Toggle>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={textId} className="text-label">
              {t.text}
            </label>
            <Input id={textId} value={value.label} maxLength={24} onChange={(e) => onChange({ ...value, label: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-label">{t.preview}</span>
          <div className="relative h-56 overflow-hidden rounded-control border border-dashed border-border bg-background hatch" data-slot="feedback-configurator-preview">
            <FeedbackFloatingLauncher shape={value.shape} position={value.position} label={value.label || undefined} placement="absolute" tabIndex={-1} />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-label">{t.install}</span>
        <Tabs defaultValue="react">
          <TabsList>
            <TabsTab value="react">{t.react}</TabsTab>
            <TabsTab value="json">{t.json}</TabsTab>
          </TabsList>
          <TabsPanel value="react">
            <CodeBlock language="tsx" label={t.codeLabel} copyLabel={t.copyCode} code={feedbackInstallSnippet(value, "react")} preClassName="max-h-72" />
          </TabsPanel>
          <TabsPanel value="json">
            <CodeBlock language="json" label={t.codeLabel} copyLabel={t.copyCode} code={feedbackInstallSnippet(value, "json")} />
          </TabsPanel>
        </Tabs>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ shake to report */

interface MotionPermissionEvent {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export interface ShakeToReportOptions {
  /** Listen for shakes. Default true. */
  enabled?: boolean;
  /** How hard a jolt must be, in m/s² between two readings. Default 18. */
  threshold?: number;
  /** Jolts needed inside about a second. Default 3. */
  jolts?: number;
  /** Called once per shake, then quiet for `cooldown` ms. */
  onShake: () => void;
  /** Quiet time after a shake, in ms. Default 3000. */
  cooldown?: number;
}

/**
 * Detects a shake of the phone with `devicemotion`. iOS asks for permission first: call `requestPermission()` from a
 * tap. `supported` is false where there is no motion sensor (most desktops). It counts jolts, not orientation, so
 * walking does not trigger it.
 */
export function useShakeToReport({ enabled = true, threshold = 18, jolts = 3, onShake, cooldown = 3000 }: ShakeToReportOptions) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const handler = useRef(onShake);
  handler.current = onShake;

  useEffect(() => {
    setSupported(typeof DeviceMotionEvent !== "undefined");
    const request = (DeviceMotionEvent as unknown as MotionPermissionEvent | undefined)?.requestPermission;
    setPermission(request ? "unknown" : "granted");
  }, []);

  const requestPermission = useCallback(async () => {
    const request = (globalThis.DeviceMotionEvent as unknown as MotionPermissionEvent | undefined)?.requestPermission;
    if (!request) {
      setPermission("granted");
      return "granted" as const;
    }
    const result = await request();
    setPermission(result);
    return result;
  }, []);

  useEffect(() => {
    if (!enabled || !supported || permission !== "granted") return;
    let last: { x: number; y: number; z: number } | null = null;
    let spikes: number[] = [];
    let quietUntil = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const now = Date.now();
      const next = { x: a.x, y: a.y, z: a.z };
      if (last && now >= quietUntil && motionDelta(last, next) > threshold) {
        spikes = [...spikes.filter((t) => now - t <= 1500), now];
        if (isShake(spikes, now, jolts)) {
          spikes = [];
          quietUntil = now + cooldown;
          handler.current();
        }
      }
      last = next;
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [enabled, supported, permission, threshold, jolts, cooldown]);

  return { supported, permission, requestPermission };
}

export interface ShakeReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens your report dialog. */
  onReport: () => void;
  /** Lets the person turn shake-to-report off from the sheet itself. Omit to hide the setting. */
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  labels?: Partial<FeedbackReporterLabels>;
}

/**
 * The bottom sheet that answers a shake: "Something wrong? Report a problem", with a way to turn shaking off. Open it from
 * `useShakeToReport`'s `onShake`, and start the report from `onReport`.
 */
export function ShakeReportSheet({ open, onOpenChange, onReport, enabled, onEnabledChange, labels }: ShakeReportSheetProps) {
  const { t } = useLabels(labels);
  const settingId = useId();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" data-slot="shake-report-sheet" className="pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="items-start">
          <span aria-hidden className="mb-1 inline-flex size-10 items-center justify-center rounded-full bg-secondary">
            <Vibrate className="size-5" />
          </span>
          <SheetTitle className="text-h3">{t.shakeTitle}</SheetTitle>
          <SheetDescription className="text-body-sm">{t.shakeDescription}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              onOpenChange(false);
              onReport();
            }}
          >
            <Bug aria-hidden />
            {t.shakeReport}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t.shakeDismiss}
          </Button>
          {onEnabledChange ? (
            <div className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-3">
              <div className="flex flex-col">
                <span id={settingId} className="text-label">
                  {t.shakeSetting}
                </span>
                <span className="text-caption text-muted-foreground">{t.shakeSettingHint}</span>
              </div>
              <Switch checked={enabled ?? true} onCheckedChange={onEnabledChange} aria-labelledby={settingId} />
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
