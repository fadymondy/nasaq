"use client";

import { ArrowLeft, ArrowRight, Bug, CheckCheck, ChevronRight, EyeOff, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Sparkline } from "../chart";
import type { DataTableColumn, DataTableRowAction } from "../data-table";
import { CardMeta, type EntityFacet, EntityList, type EntityListProps } from "../entity-list";
import { DateTime, formatNumber } from "../numeric";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";
import {
  type ErrorLevel,
  type ErrorStatus,
  type ErrorTrend,
  formatDuration,
  frameLocation,
  type HttpTone,
  httpTone,
  seriesTrend,
  sortIssues,
  totalEvents,
} from "./error-tracking-format";

export type { ErrorLevel, ErrorStatus, ErrorTrend } from "./error-tracking-format";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    label: "Errors",
    search: "Search errors…",
    error: "Error",
    level: "Level",
    status: "Status",
    events: "Events",
    users: "Users",
    frequency: "Frequency",
    lastSeen: "Last seen",
    firstSeen: "First seen",
    levels: { fatal: "Fatal", error: "Error", warning: "Warning", info: "Info" } satisfies Record<ErrorLevel, string>,
    statuses: { unresolved: "Unresolved", resolved: "Resolved", ignored: "Ignored" } satisfies Record<ErrorStatus, string>,
    resolve: "Resolve",
    ignore: "Ignore",
    reopen: "Reopen",
    back: "All errors",
    open: "Open",
    empty: "No errors captured",
    emptyHint: "When something breaks in your app it shows up here.",
    trendUp: "Rising",
    trendDown: "Falling",
    trendFlat: "Steady",
    frequencyLabel: (n: string) => `${n} events over the period`,
    stack: "Stack trace",
    breadcrumbs: "Breadcrumbs",
    tags: "Tags",
    diagnostics: "Diagnostics",
    noStack: "No stack trace was captured.",
    noBreadcrumbs: "No breadcrumbs were recorded.",
    noTags: "No tags.",
    inApp: "Your code",
    library: "Library",
    showContext: "Show source",
    hideContext: "Hide source",
    release: "Release",
    environment: "Environment",
    culprit: "Where",
    summary: "Summary",
    errorFailed: "Could not update the error. Try again.",
    screenshot: "Screenshot",
    console: "Console",
    network: "Network",
    screenshotAlt: "What the user saw when the error happened",
    noScreenshot: "No screenshot was captured.",
    noConsole: "The console was empty.",
    noNetwork: "No requests were captured.",
    method: "Method",
    url: "URL",
    duration: "Time",
    failedOnly: "Failed only",
    allRequests: "All requests",
    crumbTypes: { navigation: "Navigation", http: "Request", console: "Console", ui: "Click", error: "Error" },
  },
  ar: {
    label: "الأخطاء",
    search: "ابحث في الأخطاء…",
    error: "الخطأ",
    level: "المستوى",
    status: "الحالة",
    events: "الحوادث",
    users: "المستخدمون",
    frequency: "التكرار",
    lastSeen: "آخر ظهور",
    firstSeen: "أول ظهور",
    levels: { fatal: "قاتل", error: "خطأ", warning: "تحذير", info: "معلومة" } satisfies Record<ErrorLevel, string>,
    statuses: { unresolved: "غير محلول", resolved: "تم حله", ignored: "متجاهَل" } satisfies Record<ErrorStatus, string>,
    resolve: "حلّ",
    ignore: "تجاهل",
    reopen: "إعادة فتح",
    back: "كل الأخطاء",
    open: "فتح",
    empty: "لا أخطاء مسجّلة",
    emptyHint: "عندما يتعطل شيء في تطبيقك سيظهر هنا.",
    trendUp: "في ازدياد",
    trendDown: "في تراجع",
    trendFlat: "مستقر",
    frequencyLabel: (n: string) => `${n} حادثة خلال الفترة`,
    stack: "مسار الاستدعاء",
    breadcrumbs: "خطوات ما قبل الخطأ",
    tags: "الوسوم",
    diagnostics: "التشخيص",
    noStack: "لم يُلتقط مسار استدعاء.",
    noBreadcrumbs: "لم تُسجَّل خطوات.",
    noTags: "لا وسوم.",
    inApp: "شيفرتك",
    library: "مكتبة",
    showContext: "عرض المصدر",
    hideContext: "إخفاء المصدر",
    release: "الإصدار",
    environment: "البيئة",
    culprit: "الموضع",
    summary: "الملخص",
    errorFailed: "تعذّر تحديث الخطأ. حاول مرة أخرى.",
    screenshot: "لقطة الشاشة",
    console: "وحدة التحكم",
    network: "الشبكة",
    screenshotAlt: "ما رآه المستخدم لحظة وقوع الخطأ",
    noScreenshot: "لم تُلتقط لقطة شاشة.",
    noConsole: "كانت وحدة التحكم فارغة.",
    noNetwork: "لم تُلتقط طلبات.",
    method: "الطريقة",
    url: "العنوان",
    duration: "المدة",
    failedOnly: "الفاشلة فقط",
    allRequests: "كل الطلبات",
    crumbTypes: { navigation: "تنقّل", http: "طلب", console: "وحدة التحكم", ui: "نقرة", error: "خطأ" },
  },
};
export type ErrorTrackingLabels = typeof STRINGS.en;

function useT(labels?: Partial<ErrorTrackingLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as ErrorTrackingLabels, locale, ar };
}

/* ------------------------------------------------------------------ types */

export interface ErrorFrame {
  /** File path or module, shown left-to-right. */
  file: string;
  /** Function or method name. */
  fn?: string;
  line?: number;
  column?: number;
  /** True for your own code; false for libraries. Library frames are dimmed. */
  inApp?: boolean;
  /** A few source lines around the failing one. */
  context?: { line: number; code: string }[];
}

export type BreadcrumbType = "navigation" | "http" | "console" | "ui" | "error";

export interface ErrorBreadcrumb {
  at: Date | number | string;
  type: BreadcrumbType;
  message: string;
}

export interface CapturedConsoleEntry {
  at: Date | number | string;
  level: "log" | "info" | "warn" | "error";
  message: string;
}

export interface CapturedRequest {
  at: Date | number | string;
  method: string;
  url: string;
  /** HTTP status; 0 or omitted for a request that never got an answer. */
  status?: number;
  /** Milliseconds. */
  duration?: number;
}

/** What was captured in the browser when the error happened. */
export interface ErrorDiagnostics {
  /** Image URL of the page at the time. */
  screenshot?: string;
  console?: CapturedConsoleEntry[];
  network?: CapturedRequest[];
}

export interface ErrorIssue {
  id: string;
  /** The error's type and message, e.g. "TypeError: Cannot read properties of undefined". */
  title: string;
  /** File and function where it was thrown. Shown left-to-right. */
  culprit?: string;
  level: ErrorLevel;
  status: ErrorStatus;
  /** Total events. */
  count: number;
  /** Distinct users affected. */
  users?: number;
  firstSeen: Date | number | string;
  lastSeen: Date | number | string;
  /** Events per bucket over the period, oldest first. Draws the frequency sparkline. */
  series?: number[];
  release?: string;
  environment?: string;
  tags?: Record<string, string>;
  frames?: ErrorFrame[];
  breadcrumbs?: ErrorBreadcrumb[];
  diagnostics?: ErrorDiagnostics;
}

export type ErrorActionResult = void | { error?: string };

const levelTone: Record<ErrorLevel, StatusTone> = { fatal: "danger", error: "danger", warning: "warning", info: "info" };
const levelBadge: Record<ErrorLevel, "danger" | "warning" | "info"> = { fatal: "danger", error: "danger", warning: "warning", info: "info" };
const statusTone: Record<ErrorStatus, StatusTone> = { unresolved: "warning", resolved: "success", ignored: "neutral" };
const httpBadge: Record<HttpTone, "success" | "info" | "warning" | "danger" | "neutral"> = { success: "success", info: "info", warning: "warning", danger: "danger", neutral: "neutral" };
const trendColor: Record<ErrorTrend, string> = { up: "var(--nq-danger)", down: "var(--nq-success)", flat: "var(--primary)" };

/* ------------------------------------------------------------------ diagnostics */

export interface DiagnosticsViewerProps {
  diagnostics: ErrorDiagnostics;
  className?: string;
  labels?: Partial<ErrorTrackingLabels>;
}

/** The screenshot, console output and network requests captured with an error, in three tabs. */
export function DiagnosticsViewer({ diagnostics, className, labels }: DiagnosticsViewerProps) {
  const { t, locale } = useT(labels);
  const [failedOnly, setFailedOnly] = useState(false);
  const net = diagnostics.network ?? [];
  const shown = failedOnly ? net.filter((r) => httpTone(r.status) === "danger" || httpTone(r.status) === "warning") : net;
  const first = diagnostics.screenshot ? "screenshot" : diagnostics.console?.length ? "console" : "network";
  const num = (n: number) => formatNumber(n, locale);
  return (
    <Tabs data-slot="diagnostics-viewer" defaultValue={first} className={cn("gap-3", className)}>
      <TabsList>
        <TabsTab value="screenshot">{t.screenshot}</TabsTab>
        <TabsTab value="console">
          {t.console} <bdi className="text-caption tabular-nums opacity-70">{num(diagnostics.console?.length ?? 0)}</bdi>
        </TabsTab>
        <TabsTab value="network">
          {t.network} <bdi className="text-caption tabular-nums opacity-70">{num(net.length)}</bdi>
        </TabsTab>
        <TabsIndicator />
      </TabsList>
      <TabsPanel value="screenshot">
        {diagnostics.screenshot ? (
          <figure className="overflow-hidden rounded-card border border-border bg-muted">
            <img src={diagnostics.screenshot} alt={t.screenshotAlt} className="block h-auto w-full" />
          </figure>
        ) : (
          <p className="text-body-sm text-muted-foreground">{t.noScreenshot}</p>
        )}
      </TabsPanel>
      <TabsPanel value="console">
        {diagnostics.console?.length ? (
          <ul dir="ltr" className="flex flex-col divide-y divide-border rounded-card border border-border bg-card font-mono text-code">
            {diagnostics.console.map((c, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: captured output has no ids
              <li key={i} data-level={c.level} className="flex items-start gap-3 px-3 py-1.5">
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <DateTime value={c.at} format={{ timeStyle: "medium" }} />
                </span>
                <Badge variant={c.level === "error" ? "danger" : c.level === "warn" ? "warning" : "neutral"} className="shrink-0">
                  {c.level}
                </Badge>
                <span className="min-w-0 whitespace-pre-wrap break-words text-foreground">{c.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-muted-foreground">{t.noConsole}</p>
        )}
      </TabsPanel>
      <TabsPanel value="network" className="flex flex-col gap-2">
        {net.length ? (
          <>
            <div className="flex gap-2">
              <Button size="sm" variant={failedOnly ? "secondary" : "primary"} aria-pressed={!failedOnly} onClick={() => setFailedOnly(false)}>
                {t.allRequests}
              </Button>
              <Button size="sm" variant={failedOnly ? "primary" : "secondary"} aria-pressed={failedOnly} onClick={() => setFailedOnly(true)}>
                {t.failedOnly}
              </Button>
            </div>
            <Table label={t.network}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.method}</TableHead>
                  <TableHead>{t.url}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead className="text-end">{t.duration}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((r, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: captured requests have no ids
                  <TableRow key={i}>
                    <TableCell>
                      <bdi dir="ltr" className="font-mono text-code">
                        {r.method}
                      </bdi>
                    </TableCell>
                    <TableCell className="max-w-72 truncate">
                      <bdi dir="ltr" className="font-mono text-code" title={r.url}>
                        {r.url}
                      </bdi>
                    </TableCell>
                    <TableCell>
                      <Badge variant={httpBadge[httpTone(r.status)]}>
                        <bdi>{r.status ? r.status : "—"}</bdi>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      <bdi>{r.duration === undefined ? "—" : formatDuration(r.duration)}</bdi>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <p className="text-body-sm text-muted-foreground">{t.noNetwork}</p>
        )}
      </TabsPanel>
    </Tabs>
  );
}

/* ------------------------------------------------------------------ detail */

function StackFrame({ frame, t }: { frame: ErrorFrame; t: ErrorTrackingLabels }) {
  const [open, setOpen] = useState(false);
  const hasContext = !!frame.context?.length;
  return (
    <li data-in-app={frame.inApp ? "true" : "false"} className={cn("flex flex-col gap-2 px-3 py-2", frame.inApp === false && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-2">
        {hasContext ? (
          <Button size="icon-sm" variant="ghost" aria-expanded={open} aria-label={open ? t.hideContext : t.showContext} onClick={() => setOpen((o) => !o)}>
            <ChevronRight aria-hidden className={cn("transition-transform rtl:-scale-x-100", open && "rotate-90 rtl:rotate-90")} />
          </Button>
        ) : null}
        <bdi dir="ltr" className="min-w-0 break-all font-mono text-code text-foreground">
          {frame.fn ? <span className="font-semibold">{frame.fn} </span> : null}
          <span className="text-muted-foreground">{frameLocation(frame)}</span>
        </bdi>
        <Badge variant={frame.inApp ? "info" : "neutral"} className="ms-auto">
          {frame.inApp ? t.inApp : t.library}
        </Badge>
      </div>
      {open && hasContext ? (
        <ol dir="ltr" className="overflow-x-auto rounded-control border border-border bg-muted py-1 font-mono text-code">
          {frame.context?.map((c) => (
            <li key={c.line} data-hot={c.line === frame.line ? "true" : undefined} className={cn("flex gap-3 px-3", c.line === frame.line && "bg-nq-danger-soft")}>
              <span aria-hidden className="w-8 shrink-0 select-none text-end tabular-nums text-muted-foreground">
                {c.line}
              </span>
              <code className="whitespace-pre text-foreground">{c.code}</code>
            </li>
          ))}
        </ol>
      ) : null}
    </li>
  );
}

export interface ErrorIssueDetailProps {
  issue: ErrorIssue;
  /** Shows a back button (the list view). */
  onBack?: () => void;
  /** Resolve, ignore or reopen. Return `{ error }` to show why it failed. */
  onStatusChange?: (issue: ErrorIssue, status: ErrorStatus) => Promise<ErrorActionResult>;
  className?: string;
  labels?: Partial<ErrorTrackingLabels>;
}

/** One error: summary, resolve/ignore, then stack trace, breadcrumbs, tags and the captured diagnostics. */
export function ErrorIssueDetail({ issue, onBack, onStatusChange, className, labels }: ErrorIssueDetailProps) {
  const { t, locale, ar } = useT(labels);
  const [busy, setBusy] = useState<ErrorStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<{ id: string; status: ErrorStatus } | null>(null);
  const status = local?.id === issue.id ? local.status : issue.status;
  const Back = ar ? ArrowRight : ArrowLeft;
  const trend = seriesTrend(issue.series);
  const TrendIcon = trend === "down" ? TrendingDown : TrendingUp;
  const num = (n: number) => formatNumber(n, locale);

  async function change(next: ErrorStatus) {
    if (!onStatusChange) return;
    setBusy(next);
    setError(null);
    try {
      const res = await onStatusChange({ ...issue, status }, next);
      if (res && res.error) setError(res.error);
      else setLocal({ id: issue.id, status: next });
    } catch {
      setError(t.errorFailed);
    } finally {
      setBusy(null);
    }
  }

  const stackFrames = issue.frames ?? [];
  const tags = Object.entries(issue.tags ?? {});
  const d = issue.diagnostics;
  const hasDiag = !!d && (!!d.screenshot || !!d.console?.length || !!d.network?.length);

  return (
    <div data-slot="error-detail" data-status={status} className={cn("flex min-w-0 flex-col gap-4", className)}>
      {onBack ? (
        <div>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <Back aria-hidden />
            {t.back}
          </Button>
        </div>
      ) : null}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={levelBadge[issue.level]}>{t.levels[issue.level]}</Badge>
            <Status tone={statusTone[status]}>{t.statuses[status]}</Status>
          </div>
          <h2 dir="auto" className="break-words text-h3 text-foreground">
            {issue.title}
          </h2>
          {issue.culprit ? (
            <p className="text-body-sm text-muted-foreground">
              {t.culprit}:{" "}
              <bdi dir="ltr" className="font-mono text-code">
                {issue.culprit}
              </bdi>
            </p>
          ) : null}
        </div>
        {onStatusChange ? (
          <div className="flex flex-wrap gap-2">
            {status === "unresolved" ? (
              <>
                <Button variant="primary" loading={busy === "resolved"} onClick={() => void change("resolved")}>
                  <CheckCheck aria-hidden />
                  {t.resolve}
                </Button>
                <Button variant="secondary" loading={busy === "ignored"} onClick={() => void change("ignored")}>
                  <EyeOff aria-hidden />
                  {t.ignore}
                </Button>
              </>
            ) : (
              <Button variant="secondary" loading={busy === "unresolved"} onClick={() => void change("unresolved")}>
                <RotateCcw aria-hidden />
                {t.reopen}
              </Button>
            )}
          </div>
        ) : null}
      </header>
      {error ? (
        <p role="alert" className="text-body-sm text-nq-danger-text">
          {error}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <Tabs defaultValue="stack">
            <TabsList variant="underline">
              <TabsTab value="stack">{t.stack}</TabsTab>
              <TabsTab value="breadcrumbs">{t.breadcrumbs}</TabsTab>
              <TabsTab value="tags">{t.tags}</TabsTab>
              {hasDiag ? <TabsTab value="diagnostics">{t.diagnostics}</TabsTab> : null}
              <TabsIndicator />
            </TabsList>
            <TabsPanel value="stack">
              {stackFrames.length ? (
                <ol className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
                  {stackFrames.map((f, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: frames have no ids
                    <StackFrame key={i} frame={f} t={t} />
                  ))}
                </ol>
              ) : (
                <p className="text-body-sm text-muted-foreground">{t.noStack}</p>
              )}
            </TabsPanel>
            <TabsPanel value="breadcrumbs">
              {issue.breadcrumbs?.length ? (
                <ol className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
                  {issue.breadcrumbs.map((b, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: breadcrumbs have no ids
                    <li key={i} data-type={b.type} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
                      <Badge variant={b.type === "error" ? "danger" : "neutral"} className="shrink-0">
                        {t.crumbTypes[b.type]}
                      </Badge>
                      <bdi dir="auto" className="min-w-0 flex-1 break-words text-body-sm text-foreground">
                        {b.message}
                      </bdi>
                      <span className="text-caption tabular-nums text-muted-foreground">
                        <DateTime value={b.at} format={{ timeStyle: "medium" }} />
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-body-sm text-muted-foreground">{t.noBreadcrumbs}</p>
              )}
            </TabsPanel>
            <TabsPanel value="tags">
              {tags.length ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-card border border-border bg-card p-3 text-body-sm">
                  {tags.map(([k, v]) => (
                    <div key={k} className="col-span-2 grid grid-cols-subgrid">
                      <dt className="text-muted-foreground">
                        <bdi dir="ltr">{k}</bdi>
                      </dt>
                      <dd className="text-foreground">
                        <bdi dir="ltr">{v}</bdi>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-body-sm text-muted-foreground">{t.noTags}</p>
              )}
            </TabsPanel>
            {hasDiag && d ? (
              <TabsPanel value="diagnostics">
                <DiagnosticsViewer diagnostics={d} {...(labels ? { labels } : {})} />
              </TabsPanel>
            ) : null}
          </Tabs>
        </div>

        <aside aria-label={t.summary} className="flex flex-col gap-3 self-start rounded-card border border-border bg-card p-4">
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-caption text-muted-foreground">{t.events}</dt>
              <dd className="text-h3 tabular-nums">
                <bdi>{num(issue.count)}</bdi>
              </dd>
            </div>
            <div>
              <dt className="text-caption text-muted-foreground">{t.users}</dt>
              <dd className="text-h3 tabular-nums">
                <bdi>{issue.users === undefined ? "—" : num(issue.users)}</bdi>
              </dd>
            </div>
          </dl>
          {issue.series?.length ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-caption text-muted-foreground">
                <span>{t.frequency}</span>
                <span className="inline-flex items-center gap-1">
                  {trend !== "flat" ? <TrendIcon aria-hidden className="size-3.5" /> : null}
                  {trend === "up" ? t.trendUp : trend === "down" ? t.trendDown : t.trendFlat}
                </span>
              </div>
              <Sparkline data={issue.series} color={trendColor[trend]} label={t.frequencyLabel(num(totalEvents(issue.series)))} className="h-12 w-full" />
            </div>
          ) : null}
          <dl className="flex flex-col gap-1.5 text-body-sm">
            <Meta label={t.firstSeen}>
              <DateTime value={issue.firstSeen} relative />
            </Meta>
            <Meta label={t.lastSeen}>
              <DateTime value={issue.lastSeen} relative />
            </Meta>
            {issue.release ? (
              <Meta label={t.release}>
                <bdi dir="ltr" className="font-mono text-code">
                  {issue.release}
                </bdi>
              </Meta>
            ) : null}
            {issue.environment ? (
              <Meta label={t.environment}>
                <Badge variant="outline">{issue.environment}</Badge>
              </Meta>
            ) : null}
          </dl>
        </aside>
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-foreground">{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ list + page */

export interface ErrorTrackingProps
  extends Omit<EntityListProps<ErrorIssue>, "data" | "columns" | "getRowId" | "renderCard" | "label" | "facets" | "labels" | "rowActions" | "onRowClick"> {
  issues: ErrorIssue[];
  /** Resolve, ignore or reopen. Resolve to finish; return `{ error }` to show why it failed. */
  onStatusChange?: (issue: ErrorIssue, status: ErrorStatus) => Promise<ErrorActionResult>;
  /** Called when an error is opened (its detail shows in place). */
  onOpenIssue?: (issue: ErrorIssue) => void;
  label?: string;
  labels?: Partial<ErrorTrackingLabels> & EntityListProps<ErrorIssue>["labels"];
}

/**
 * Captured errors: a list with a frequency sparkline per error, filters by status and level, and the detail of
 * the one you open (stack trace, breadcrumbs, tags, diagnostics) with resolve and ignore. Rows and cards open the
 * same actions from the ⋯ menu and the context menu.
 */
export function ErrorTracking({ issues, onStatusChange, onOpenIssue, label, labels, empty, ...props }: ErrorTrackingProps) {
  const { t, locale } = useT(labels as Partial<ErrorTrackingLabels> | undefined);
  const labelKey = JSON.stringify(labels);
  const [openId, setOpenId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Record<string, ErrorStatus>>({});
  const rows = useMemo(() => sortIssues(issues.map((i) => ({ ...i, status: overlay[i.id] ?? i.status }))), [issues, overlay]);
  const num = (n: number) => formatNumber(n, locale);

  async function change(issue: ErrorIssue, status: ErrorStatus): Promise<ErrorActionResult> {
    const res = onStatusChange ? await onStatusChange(issue, status) : undefined;
    if (!(res && res.error)) setOverlay((o) => ({ ...o, [issue.id]: status }));
    return res;
  }
  function open(i: ErrorIssue) {
    setOpenId(i.id);
    onOpenIssue?.(i);
  }

  const columns = useMemo<DataTableColumn<ErrorIssue>[]>(
    () => [
      {
        id: "title",
        header: t.error,
        hideable: false,
        className: "min-w-72",
        cell: (i) => (
          <div className="flex min-w-0 flex-col">
            <span dir="auto" className="truncate text-label text-foreground">
              {i.title}
            </span>
            {i.culprit ? (
              <bdi dir="ltr" className="truncate font-mono text-code text-muted-foreground">
                {i.culprit}
              </bdi>
            ) : null}
          </div>
        ),
        sortValue: (i) => i.title,
        searchValue: (i) => `${i.title} ${i.culprit ?? ""} ${i.release ?? ""}`,
      },
      { id: "level", header: t.level, cell: (i) => <Status tone={levelTone[i.level]}>{t.levels[i.level]}</Status>, sortValue: (i) => i.level },
      { id: "status", header: t.status, cell: (i) => <Status tone={statusTone[i.status]}>{t.statuses[i.status]}</Status>, sortValue: (i) => i.status },
      {
        id: "frequency",
        header: t.frequency,
        cell: (i) => (i.series?.length ? <Sparkline data={i.series} color={trendColor[seriesTrend(i.series)]} label={t.frequencyLabel(num(totalEvents(i.series)))} className="h-8 w-28" /> : "—"),
      },
      { id: "events", header: t.events, align: "end", cell: (i) => <span className="tabular-nums">{num(i.count)}</span>, sortValue: (i) => i.count },
      { id: "users", header: t.users, align: "end", defaultHidden: true, cell: (i) => <span className="tabular-nums">{i.users === undefined ? "—" : num(i.users)}</span>, sortValue: (i) => i.users },
      { id: "lastSeen", header: t.lastSeen, align: "end", cell: (i) => <DateTime value={i.lastSeen} relative />, sortValue: (i) => new Date(i.lastSeen) },
    ],
    // `t` is rebuilt every render; its values only change with the locale or the labels.
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above
    [locale, labelKey],
  );

  const facets = useMemo<EntityFacet<ErrorIssue>[]>(
    () => [
      { id: "status", title: t.status, options: (["unresolved", "resolved", "ignored"] as const).map((v) => ({ value: v, label: t.statuses[v] })), getValues: (i) => [i.status] },
      { id: "level", title: t.level, options: (["fatal", "error", "warning", "info"] as const).map((v) => ({ value: v, label: t.levels[v] })), getValues: (i) => [i.level] },
    ],
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above
    [locale, labelKey],
  );

  const openIssue = openId ? rows.find((i) => i.id === openId) : undefined;
  if (openIssue) {
    return <ErrorIssueDetail issue={openIssue} onBack={() => setOpenId(null)} {...(onStatusChange ? { onStatusChange: change } : {})} labels={labels as Partial<ErrorTrackingLabels> | undefined} />;
  }

  const actions = (i: ErrorIssue): DataTableRowAction[] => {
    const list: DataTableRowAction[] = [{ id: "open", label: t.open, icon: Bug, onSelect: () => open(i) }];
    if (onStatusChange) {
      if (i.status === "unresolved") {
        list.push({ id: "resolve", label: t.resolve, icon: CheckCheck, group: "status", onSelect: () => void change(i, "resolved") });
        list.push({ id: "ignore", label: t.ignore, icon: EyeOff, group: "status", onSelect: () => void change(i, "ignored") });
      } else list.push({ id: "reopen", label: t.reopen, icon: RotateCcw, group: "status", onSelect: () => void change(i, "unresolved") });
    }
    return list;
  };

  return (
    <EntityList<ErrorIssue>
      data={rows}
      columns={columns}
      getRowId={(i) => i.id}
      rowLabel={(i) => i.title}
      label={label ?? t.label}
      facets={facets}
      searchPlaceholder={t.search}
      selectable={false}
      empty={empty ?? <EmptyState icon={Bug} title={t.empty} description={t.emptyHint} className="border-0" />}
      labels={labels as EntityListProps<ErrorIssue>["labels"]}
      rowActions={actions}
      onRowClick={open}
      renderCard={(i) => (
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-1 pe-(--entity-card-controls)">
            <span dir="auto" className="line-clamp-2 text-label text-foreground">
              {i.title}
            </span>
            {i.culprit ? (
              <bdi dir="ltr" className="truncate font-mono text-code text-muted-foreground">
                {i.culprit}
              </bdi>
            ) : null}
          </div>
          {i.series?.length ? <Sparkline data={i.series} color={trendColor[seriesTrend(i.series)]} label={t.frequencyLabel(num(totalEvents(i.series)))} className="h-10 w-full" /> : null}
          <div className="flex flex-col gap-1.5">
            <CardMeta label={t.level}>
              <Status tone={levelTone[i.level]}>{t.levels[i.level]}</Status>
            </CardMeta>
            <CardMeta label={t.status}>
              <Status tone={statusTone[i.status]}>{t.statuses[i.status]}</Status>
            </CardMeta>
            <CardMeta label={t.events}>
              <span className="tabular-nums">{num(i.count)}</span>
            </CardMeta>
            <CardMeta label={t.lastSeen}>
              <DateTime value={i.lastSeen} relative />
            </CardMeta>
          </div>
        </div>
      )}
      {...props}
    />
  );
}
