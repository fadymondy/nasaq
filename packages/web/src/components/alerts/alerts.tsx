"use client";

import { Bell, BellRing, Check, CheckCheck, ChevronDown, CircleAlert, MessageSquare, RotateCcw, Search, ShieldAlert, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Input } from "../field";
import { DateTime } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState, Skeleton } from "../states";
import { Status, type StatusTone } from "../status";
import { Tabs, TabsList, TabsTab } from "../tabs";
import { Timeline, TimelineItem } from "../timeline";
import {
  type AlertSeverity,
  type AlertSort,
  type AlertStatus,
  canAcknowledge,
  canReopen,
  canResolve,
  countAlerts,
  type DateLike,
  filterAlerts,
  SEVERITIES,
  sortAlerts,
  sourcesOf,
} from "./alerts-format";

export {
  type AlertCounts,
  type AlertFilter,
  type AlertLike,
  type AlertSeverity,
  type AlertSort,
  type AlertStatus,
  canAcknowledge,
  canReopen,
  canResolve,
  countAlerts,
  filterAlerts,
  SEVERITIES,
  STATUSES,
  severityRank,
  sortAlerts,
  sourcesOf,
  urgentCount,
} from "./alerts-format";

export type AlertEventType = "created" | "notified" | "acknowledged" | "resolved" | "reopened" | "escalated" | "comment";

export interface AlertEvent {
  id: string;
  type: AlertEventType;
  at: DateLike;
  /** Who did it. Leave out for the system. */
  actor?: string;
  note?: string;
}

export interface AlertItem {
  id: string;
  title: string;
  description?: string;
  severity: AlertSeverity;
  status: AlertStatus;
  /** Where it came from: a service, monitor or check. */
  source: string;
  createdAt: DateLike;
  updatedAt?: DateLike;
  /** How many times it fired. Shown when above 1. */
  count?: number;
  tags?: string[];
  /** Oldest first or newest first, both are sorted here (newest on top). */
  timeline?: AlertEvent[];
}

export type SecurityCategory = "auth" | "network" | "malware" | "data" | "policy" | "other";

export interface SecurityAlertItem extends AlertItem {
  category?: SecurityCategory;
  ip?: string;
  location?: string;
  /** The account involved. */
  account?: string;
  /** What to do about it. */
  recommendation?: string;
}

export interface AlertAction {
  id: string;
  label: string;
  variant?: "secondary" | "danger";
}

type Result = void | { error?: string };

const STRINGS = {
  en: {
    title: "Alerts",
    securityTitle: "Security alerts",
    search: "Search alerts",
    searchPlaceholder: "Search by title, source or ID",
    status: { all: "All", open: "Open", acknowledged: "Acknowledged", resolved: "Resolved" } satisfies Record<AlertStatus | "all", string>,
    severity: { critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Info" } satisfies Record<AlertSeverity, string>,
    allSeverities: "All severities",
    allSources: "All sources",
    severityFilter: "Severity",
    sourceFilter: "Source",
    sortLabel: "Sort",
    sort: { newest: "Newest first", severity: "Most severe first" } satisfies Record<AlertSort, string>,
    acknowledge: "Acknowledge",
    resolve: "Resolve",
    reopen: "Reopen",
    details: "Show details",
    hideDetails: "Hide details",
    timeline: "Timeline",
    noTimeline: "No activity yet.",
    events: {
      created: "Alert raised",
      notified: "Team notified",
      acknowledged: "Acknowledged",
      resolved: "Resolved",
      reopened: "Reopened",
      escalated: "Escalated",
      comment: "Comment",
    } satisfies Record<AlertEventType, string>,
    firedTimes: (n: number) => `Fired ${n} times`,
    source: "Source",
    raised: "Raised",
    emptyTitle: "No alerts",
    emptyBody: "Nothing matches these filters.",
    emptyAll: "All quiet. New alerts will appear here.",
    clear: "Clear filters",
    shown: (n: number, total: number) => `Showing ${n} of ${total}`,
    failed: "That did not work. Try again.",
    category: "Category",
    categories: { auth: "Sign-in", network: "Network", malware: "Malware", data: "Data", policy: "Policy", other: "Other" } satisfies Record<SecurityCategory, string>,
    ip: "IP address",
    location: "Location",
    account: "Account",
    recommendation: "Recommended action",
    stats: "Alert summary",
    label: "Alerts",
    loading: "Loading alerts",
  },
  ar: {
    title: "التنبيهات",
    securityTitle: "تنبيهات الأمان",
    search: "بحث في التنبيهات",
    searchPlaceholder: "ابحث بالعنوان أو المصدر أو المعرّف",
    status: { all: "الكل", open: "مفتوح", acknowledged: "تم الاطلاع", resolved: "تم الحل" } satisfies Record<AlertStatus | "all", string>,
    severity: { critical: "حرج", high: "مرتفع", medium: "متوسط", low: "منخفض", info: "معلومة" } satisfies Record<AlertSeverity, string>,
    allSeverities: "كل المستويات",
    allSources: "كل المصادر",
    severityFilter: "الخطورة",
    sourceFilter: "المصدر",
    sortLabel: "الترتيب",
    sort: { newest: "الأحدث أولًا", severity: "الأشد خطورة أولًا" } satisfies Record<AlertSort, string>,
    acknowledge: "تأكيد الاطلاع",
    resolve: "تم الحل",
    reopen: "إعادة الفتح",
    details: "عرض التفاصيل",
    hideDetails: "إخفاء التفاصيل",
    timeline: "الخط الزمني",
    noTimeline: "لا يوجد نشاط بعد.",
    events: {
      created: "تم إطلاق التنبيه",
      notified: "تم إخطار الفريق",
      acknowledged: "تم الاطلاع",
      resolved: "تم الحل",
      reopened: "أُعيد فتحه",
      escalated: "تم التصعيد",
      comment: "تعليق",
    } satisfies Record<AlertEventType, string>,
    firedTimes: (n: number) => `تكرر ${n} مرات`,
    source: "المصدر",
    raised: "وقت الإطلاق",
    emptyTitle: "لا توجد تنبيهات",
    emptyBody: "لا شيء يطابق هذه المرشحات.",
    emptyAll: "كل شيء هادئ. ستظهر التنبيهات الجديدة هنا.",
    clear: "مسح المرشحات",
    shown: (n: number, total: number) => `عرض ${n} من ${total}`,
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    category: "الفئة",
    categories: { auth: "تسجيل الدخول", network: "الشبكة", malware: "برمجيات خبيثة", data: "البيانات", policy: "السياسات", other: "أخرى" } satisfies Record<SecurityCategory, string>,
    ip: "عنوان IP",
    location: "الموقع",
    account: "الحساب",
    recommendation: "الإجراء المقترح",
    stats: "ملخص التنبيهات",
    label: "التنبيهات",
    loading: "جارٍ تحميل التنبيهات",
  },
};

export type AlertsLabels = (typeof STRINGS)["en"];

const severityBadge: Record<AlertSeverity, "danger" | "warning" | "info" | "outline"> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "outline",
  info: "outline",
};

const severityIcon: Record<AlertSeverity, typeof Bell> = {
  critical: ShieldAlert,
  high: TriangleAlert,
  medium: CircleAlert,
  low: Bell,
  info: Bell,
};

const statusTone: Record<AlertStatus, StatusTone> = { open: "danger", acknowledged: "warning", resolved: "success" };

const eventIcon: Record<AlertEventType, typeof Bell> = {
  created: BellRing,
  notified: Bell,
  acknowledged: Check,
  resolved: CheckCheck,
  reopened: RotateCcw,
  escalated: TriangleAlert,
  comment: MessageSquare,
};

function SeverityBadge({ severity, label }: { severity: AlertSeverity; label: string }) {
  const Icon = severityIcon[severity];
  return (
    <Badge variant={severityBadge[severity]} data-severity={severity}>
      <Icon aria-hidden />
      {label}
    </Badge>
  );
}

interface CoreProps<T extends AlertItem> extends Omit<ComponentProps<"section">, "children" | "title"> {
  alerts: T[];
  loading?: boolean;
  /** Which status tab opens first. Default `open`. */
  defaultStatus?: AlertStatus | "all";
  defaultSort?: AlertSort;
  onAcknowledge?: (id: string) => Promise<Result>;
  onResolve?: (id: string) => Promise<Result>;
  onReopen?: (id: string) => Promise<Result>;
  /** Hide the search and the filters. */
  hideFilters?: boolean;
  /** Replace the heading. */
  title?: ReactNode;
  labels?: Partial<AlertsLabels>;
}

export interface AlertListProps extends CoreProps<AlertItem> {}

export interface SecurityAlertsProps extends CoreProps<SecurityAlertItem> {
  /** Extra actions on each alert that is not resolved. Default: block the IP and mark as a false positive. */
  actions?: AlertAction[];
  onAction?: (actionId: string, alertId: string) => Promise<Result>;
}

const DEFAULT_SECURITY_ACTIONS = {
  en: [
    { id: "block-ip", label: "Block IP", variant: "danger" },
    { id: "false-positive", label: "Mark as false positive", variant: "secondary" },
  ] satisfies AlertAction[],
  ar: [
    { id: "block-ip", label: "حظر عنوان IP", variant: "danger" },
    { id: "false-positive", label: "تحديد كإنذار كاذب", variant: "secondary" },
  ] satisfies AlertAction[],
};

function Ltr({ children }: { children: ReactNode }) {
  return (
    <bdi dir="ltr" className="tabular-nums">
      {children}
    </bdi>
  );
}

function AlertRow<T extends AlertItem>({
  alert,
  t,
  extra,
  actions,
  onAcknowledge,
  onResolve,
  onReopen,
  onAction,
}: {
  alert: T;
  t: AlertsLabels;
  extra?: (a: T) => ReactNode;
  actions?: AlertAction[];
  onAcknowledge?: (id: string) => Promise<Result>;
  onResolve?: (id: string) => Promise<Result>;
  onReopen?: (id: string) => Promise<Result>;
  onAction?: (actionId: string, alertId: string) => Promise<Result>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelId = useId();

  async function run(key: string, fn: () => Promise<Result>) {
    setBusy(key);
    setError(null);
    try {
      const r = await fn();
      if (r && typeof r === "object" && r.error) setError(r.error);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(null);
    }
  }

  const timeline = useMemo(() => [...(alert.timeline ?? [])].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()), [alert.timeline]);
  const disabled = busy !== null;
  const resolved = alert.status === "resolved";

  return (
    <li data-slot="alert-row" data-severity={alert.severity} data-status={alert.status} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} label={t.severity[alert.severity]} />
            <Status tone={statusTone[alert.status]}>{t.status[alert.status]}</Status>
            {alert.count && alert.count > 1 ? <span className="text-caption text-muted-foreground">{t.firedTimes(alert.count)}</span> : null}
          </div>
          <h3 className={cn("text-label text-foreground", resolved && "text-muted-foreground")}>{alert.title}</h3>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
            <span>
              {t.source}: <Ltr>{alert.source}</Ltr>
            </span>
            <DateTime value={alert.createdAt} relative />
            {alert.tags?.map((tag) => (
              <Badge key={tag} variant="outline">
                <Ltr>{tag}</Ltr>
              </Badge>
            ))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onAcknowledge && canAcknowledge(alert.status) ? (
            <Button type="button" size="sm" variant="secondary" disabled={disabled} loading={busy === "ack"} onClick={() => run("ack", () => onAcknowledge(alert.id))}>
              <Check aria-hidden />
              {t.acknowledge}
            </Button>
          ) : null}
          {onResolve && canResolve(alert.status) ? (
            <Button type="button" size="sm" variant="primary" disabled={disabled} loading={busy === "resolve"} onClick={() => run("resolve", () => onResolve(alert.id))}>
              <CheckCheck aria-hidden />
              {t.resolve}
            </Button>
          ) : null}
          {onReopen && canReopen(alert.status) ? (
            <Button type="button" size="sm" variant="secondary" disabled={disabled} loading={busy === "reopen"} onClick={() => run("reopen", () => onReopen(alert.id))}>
              <RotateCcw aria-hidden className="rtl:-scale-x-100" />
              {t.reopen}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
            {open ? t.hideDetails : t.details}
            <ChevronDown aria-hidden className={cn("transition-transform motion-reduce:transition-none", open && "rotate-180")} />
          </Button>
        </div>
      </div>
      {error ? (
        <Alert tone="danger" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {open ? (
        <div id={panelId} className="grid gap-5 border-t border-border pt-4 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            {alert.description ? <p className="text-body-sm text-foreground">{alert.description}</p> : null}
            {extra?.(alert)}
            {actions && actions.length > 0 && onAction && !resolved ? (
              <div className="flex flex-wrap gap-2">
                {actions.map((a) => (
                  <Button key={a.id} type="button" size="sm" variant={a.variant ?? "secondary"} disabled={disabled} loading={busy === a.id} onClick={() => run(a.id, () => onAction(a.id, alert.id))}>
                    {a.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="min-w-0">
            <h4 className="mb-3 text-label text-foreground">{t.timeline}</h4>
            {timeline.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">{t.noTimeline}</p>
            ) : (
              <Timeline>
                {timeline.map((e) => {
                  const Icon = eventIcon[e.type];
                  return (
                    <TimelineItem key={e.id} icon={<Icon aria-hidden />} title={t.events[e.type]} description={[e.actor, e.note].filter(Boolean).join(" - ") || undefined} time={e.at} />
                  );
                })}
              </Timeline>
            )}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function AlertsCore<T extends AlertItem>({
  alerts,
  loading,
  defaultStatus = "open",
  defaultSort = "severity",
  onAcknowledge,
  onResolve,
  onReopen,
  hideFilters,
  title,
  labels,
  className,
  isSecurity,
  extra,
  extraSearch,
  actions,
  onAction,
  ...props
}: CoreProps<T> & {
  isSecurity?: boolean;
  extra?: (a: T) => ReactNode;
  extraSearch?: (a: T) => (string | undefined)[];
  actions?: AlertAction[];
  onAction?: (actionId: string, alertId: string) => Promise<Result>;
}) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as AlertsLabels;
  const [status, setStatus] = useState<AlertStatus | "all">(defaultStatus);
  const [severity, setSeverity] = useState<AlertSeverity | "all">("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState<AlertSort>(defaultSort);
  const [query, setQuery] = useState("");
  const counts = useMemo(() => countAlerts(alerts), [alerts]);
  const sources = useMemo(() => sourcesOf(alerts), [alerts]);
  const visible = useMemo(
    () => sortAlerts(filterAlerts(alerts, { query, severity, status, source }, extraSearch), sort),
    [alerts, query, severity, status, source, sort, extraSearch],
  );
  const filtered = query.trim() !== "" || severity !== "all" || source !== "all";
  const headingId = useId();

  const sevItems = [{ value: "all", label: t.allSeverities }, ...SEVERITIES.map((s) => ({ value: s, label: t.severity[s] }))];
  const srcItems = [{ value: "all", label: t.allSources }, ...sources.map((s) => ({ value: s, label: s }))];
  const sortItems = (["severity", "newest"] as const).map((s) => ({ value: s, label: t.sort[s] }));

  return (
    <section data-slot={isSecurity ? "security-alerts" : "alert-list"} aria-labelledby={headingId} className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-heading-sm text-foreground">
          {title ?? (isSecurity ? t.securityTitle : t.title)}
        </h2>
        <p className="text-caption text-muted-foreground" aria-live="polite">
          {t.shown(visible.length, alerts.length)}
        </p>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as AlertStatus | "all")}>
        <TabsList variant="underline" aria-label={t.label}>
          {(["all", "open", "acknowledged", "resolved"] as const).map((s) => (
            <TabsTab key={s} value={s}>
              {t.status[s]}
              <Badge variant="outline">
                <bdi dir="ltr">{s === "all" ? counts.total : counts.byStatus[s]}</bdi>
              </Badge>
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>

      {hideFilters ? null : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_11rem_12rem]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" aria-label={t.search} placeholder={t.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} className="ps-9" />
          </div>
          <Select items={sevItems} value={severity} onValueChange={(v) => v && setSeverity(v as AlertSeverity | "all")}>
            <SelectTrigger aria-label={t.severityFilter}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sevItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select items={srcItems} value={source} onValueChange={(v) => v && setSource(v)}>
            <SelectTrigger aria-label={t.sourceFilter}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {srcItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select items={sortItems} value={sort} onValueChange={(v) => v && setSort(v as AlertSort)}>
            <SelectTrigger aria-label={t.sortLabel}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortItems.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div role="status" aria-label={t.loading} className="flex flex-col gap-3">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-24 w-full rounded-card" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t.emptyTitle}
          description={alerts.length === 0 ? t.emptyAll : t.emptyBody}
          actions={
            filtered || status !== "all" ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setSeverity("all");
                  setSource("all");
                  setStatus("all");
                }}
              >
                {t.clear}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {visible.map((a) => (
            <AlertRow key={a.id} alert={a} t={t} extra={extra} actions={actions} onAcknowledge={onAcknowledge} onResolve={onResolve} onReopen={onReopen} onAction={onAction} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * A list of alerts to triage: filter by status tab, severity and source, search, sort, then acknowledge, resolve or
 * reopen. Each row expands to its description and a timeline of what happened. Severity and status are words and
 * icons, never colour alone. It is presentational: you own the data and the async callbacks, and a callback can
 * return `{ error }` to show a message on that alert.
 */
export function AlertList(props: AlertListProps) {
  return <AlertsCore {...props} />;
}

const securityFields = (a: SecurityAlertItem) => [a.ip, a.location, a.account, a.category];

/**
 * The alert list for security events. Adds the category, the source IP, location and account, a recommended
 * action, and buttons for follow-up actions (block the IP, mark as a false positive) through `onAction`.
 */
export function SecurityAlerts({ actions, onAction, ...props }: SecurityAlertsProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...props.labels } as AlertsLabels;
  return (
    <AlertsCore
      {...props}
      isSecurity
      extraSearch={securityFields}
      actions={actions ?? DEFAULT_SECURITY_ACTIONS[ar ? "ar" : "en"]}
      onAction={onAction}
      extra={(a) => (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
            {a.category ? (
              <>
                <dt className="text-muted-foreground">{t.category}</dt>
                <dd className="m-0 text-foreground">{t.categories[a.category]}</dd>
              </>
            ) : null}
            {a.ip ? (
              <>
                <dt className="text-muted-foreground">{t.ip}</dt>
                <dd className="m-0 text-foreground">
                  <Ltr>{a.ip}</Ltr>
                </dd>
              </>
            ) : null}
            {a.location ? (
              <>
                <dt className="text-muted-foreground">{t.location}</dt>
                <dd className="m-0 text-foreground">{a.location}</dd>
              </>
            ) : null}
            {a.account ? (
              <>
                <dt className="text-muted-foreground">{t.account}</dt>
                <dd className="m-0 text-foreground">
                  <Ltr>{a.account}</Ltr>
                </dd>
              </>
            ) : null}
          </dl>
          {a.recommendation ? (
            <Alert tone="info" title={t.recommendation}>
              {a.recommendation}
            </Alert>
          ) : null}
        </>
      )}
    />
  );
}
