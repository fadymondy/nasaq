"use client";

import { Activity, CirclePause, Pencil, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { DataTable, type DataTableColumn, type DataTableRowAction, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldError, FieldLabel, Input } from "../field";
import { DateTime, Num } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Timeline, TimelineItem } from "../timeline";
import { Toggle, ToggleGroup } from "../toggle-group";
import { Status, type StatusTone } from "../status";
import {
  type CheckResult,
  computeUptime,
  formatIncidentDuration,
  formatUptime,
  incidentMinutes,
  type IncidentImpact,
  type IncidentStatus,
  isOpenIncident,
  type MonitorStatus,
  overallStatus,
  type OverallStatus,
  responseLabel,
  UPTIME_PERIODS,
  type UptimePeriod,
  type UptimeTone,
  uptimeTone,
} from "./uptime-format";

export {
  type CheckResult,
  computeUptime,
  formatIncidentDuration,
  formatUptime,
  incidentMinutes,
  type IncidentImpact,
  type IncidentStatus,
  isOpenIncident,
  type MonitorStatus,
  overallStatus,
  type OverallStatus,
  responseLabel,
  UPTIME_PERIODS,
  type UptimePeriod,
  type UptimeTone,
  uptimeTone,
} from "./uptime-format";

const STRINGS = {
  en: {
    title: "Uptime monitors",
    description: "Checks that run against your sites and services, and the incidents they raise.",
    add: "Add monitor",
    search: "Search monitors",
    table: "Monitors",
    period: "Period",
    periods: { "24h": "24 hours", "7d": "7 days", "30d": "30 days" } satisfies Record<UptimePeriod, string>,
    periodShort: { "24h": "24h", "7d": "7d", "30d": "30d" } satisfies Record<UptimePeriod, string>,
    cols: { monitor: "Monitor", status: "Status", uptime: "Uptime", history: "Recent checks", response: "Response", checked: "Last check" },
    status: { up: "Up", degraded: "Slow", down: "Down", paused: "Paused", unknown: "No data" } satisfies Record<MonitorStatus, string>,
    checkNames: { up: "Up", degraded: "Slow", down: "Down", none: "No check" } satisfies Record<CheckResult, string>,
    historyFor: (name: string, up: number, total: number) => `${name}: ${up} of ${total} recent checks were up`,
    uptimeFor: (pct: string, period: string) => `${pct} uptime over ${period}`,
    kinds: { http: "HTTP", tcp: "TCP port", ping: "Ping", keyword: "Keyword" },
    every: (s: number) => (s % 60 === 0 ? `Every ${s / 60} min` : `Every ${s} s`),
    empty: "No monitors yet. Add one to start checking a site.",
    checkNow: "Check now",
    pause: "Pause",
    resume: "Resume",
    edit: "Edit",
    remove: "Delete",
    deleteTitle: (name: string) => `Delete ${name}?`,
    deleteBody: "Checks stop and its uptime history is removed.",
    cancel: "Cancel",
    dialogNew: "New monitor",
    dialogEdit: "Edit monitor",
    dialogBody: "Checks the address at a fixed interval and raises an incident after failures in a row.",
    name: "Name",
    target: "Address",
    targetHint: "A URL for HTTP and keyword monitors, or host:port for TCP.",
    kind: "Type",
    interval: "Check every",
    intervals: { 30: "30 seconds", 60: "1 minute", 300: "5 minutes", 900: "15 minutes" },
    required: "This field is required.",
    save: "Save monitor",
    incidents: "Incidents",
    incidentsEmpty: "No incidents in this period.",
    open: "Open",
    resolved: "Resolved",
    incidentStatus: { investigating: "Investigating", identified: "Identified", monitoring: "Monitoring", resolved: "Resolved" } satisfies Record<IncidentStatus, string>,
    impact: { minor: "Minor", major: "Major", maintenance: "Maintenance" } satisfies Record<IncidentImpact, string>,
    duration: { d: "d", h: "h", m: "min" },
    lasted: (d: string) => `Lasted ${d}`,
    started: "Started",
    updates: "Updates",
    genericError: "Something went wrong. Try again.",
    overall: { operational: "All systems operational", degraded: "Degraded performance", "partial-outage": "Partial outage", "major-outage": "Major outage", maintenance: "Maintenance in progress" } satisfies Record<OverallStatus, string>,
  },
  ar: {
    title: "مراقبة التشغيل",
    description: "فحوص تعمل على مواقعك وخدماتك، والحوادث التي تنتج عنها.",
    add: "إضافة مراقب",
    search: "بحث في المراقبين",
    table: "المراقبون",
    period: "الفترة",
    periods: { "24h": "24 ساعة", "7d": "7 أيام", "30d": "30 يومًا" } satisfies Record<UptimePeriod, string>,
    periodShort: { "24h": "24س", "7d": "7أ", "30d": "30ي" } satisfies Record<UptimePeriod, string>,
    cols: { monitor: "المراقب", status: "الحالة", uptime: "وقت التشغيل", history: "آخر الفحوص", response: "الاستجابة", checked: "آخر فحص" },
    status: { up: "يعمل", degraded: "بطيء", down: "متوقف", paused: "موقوف مؤقتًا", unknown: "لا بيانات" } satisfies Record<MonitorStatus, string>,
    checkNames: { up: "يعمل", degraded: "بطيء", down: "متوقف", none: "لا فحص" } satisfies Record<CheckResult, string>,
    historyFor: (name: string, up: number, total: number) => `${name}: ${up} من ${total} فحوص حديثة كانت ناجحة`,
    uptimeFor: (pct: string, period: string) => `${pct} وقت تشغيل خلال ${period}`,
    kinds: { http: "HTTP", tcp: "منفذ TCP", ping: "Ping", keyword: "كلمة مفتاحية" },
    every: (s: number) => (s % 60 === 0 ? `كل ${s / 60} دقيقة` : `كل ${s} ثانية`),
    empty: "لا يوجد مراقبون بعد. أضف واحدًا لبدء فحص موقع.",
    checkNow: "افحص الآن",
    pause: "إيقاف مؤقت",
    resume: "استئناف",
    edit: "تعديل",
    remove: "حذف",
    deleteTitle: (name: string) => `حذف ${name}؟`,
    deleteBody: "تتوقف الفحوص ويُحذف سجل وقت التشغيل.",
    cancel: "إلغاء",
    dialogNew: "مراقب جديد",
    dialogEdit: "تعديل المراقب",
    dialogBody: "يفحص العنوان بفاصل ثابت ويرفع حادثة بعد عدة إخفاقات متتالية.",
    name: "الاسم",
    target: "العنوان",
    targetHint: "رابط لمراقبات HTTP والكلمات المفتاحية، أو host:port لمراقبة TCP.",
    kind: "النوع",
    interval: "الفحص كل",
    intervals: { 30: "30 ثانية", 60: "دقيقة", 300: "5 دقائق", 900: "15 دقيقة" },
    required: "هذا الحقل مطلوب.",
    save: "حفظ المراقب",
    incidents: "الحوادث",
    incidentsEmpty: "لا حوادث في هذه الفترة.",
    open: "مفتوحة",
    resolved: "محلولة",
    incidentStatus: { investigating: "قيد التحقق", identified: "تم تحديد السبب", monitoring: "تحت المراقبة", resolved: "تم الحل" } satisfies Record<IncidentStatus, string>,
    impact: { minor: "طفيف", major: "كبير", maintenance: "صيانة" } satisfies Record<IncidentImpact, string>,
    duration: { d: "ي", h: "س", m: "د" },
    lasted: (d: string) => `استمرت ${d}`,
    started: "بدأت",
    updates: "التحديثات",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    overall: { operational: "كل الأنظمة تعمل", degraded: "أداء متدهور", "partial-outage": "انقطاع جزئي", "major-outage": "انقطاع كبير", maintenance: "صيانة جارية" } satisfies Record<OverallStatus, string>,
  },
};

type T = typeof STRINGS.en;
export type UptimeMonitorsLabels = Partial<T>;
export type UptimeResult = void | { error?: string };

export interface UptimeMonitor {
  id: string;
  name: string;
  /** URL, or host:port. Stays left to right. */
  target: string;
  kind: "http" | "tcp" | "ping" | "keyword";
  status: MonitorStatus;
  /** Uptime in percent per period. `null` when there is no data. */
  uptime: Partial<Record<UptimePeriod, number | null>>;
  /** Recent checks, oldest first, for the strip. */
  checks?: readonly CheckResult[];
  responseMs?: number;
  lastCheckAt?: Date | number | string;
  intervalSec?: number;
}

export interface IncidentUpdate {
  at: Date | number | string;
  status: IncidentStatus;
  body: string;
}

export interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  startedAt: Date | number | string;
  resolvedAt?: Date | number | string;
  /** Names of the services affected. */
  services?: string[];
  /** Oldest first. */
  updates?: IncidentUpdate[];
}

export type MonitorInput = { name: string; target: string; kind: UptimeMonitor["kind"]; intervalSec: number };

const monitorTone: Record<MonitorStatus, StatusTone> = { up: "success", degraded: "warning", down: "danger", paused: "neutral", unknown: "neutral" };
const segment: Record<CheckResult, string> = { up: "bg-nq-success", degraded: "bg-nq-warning", down: "bg-nq-danger", none: "bg-border" };
const badgeVariant: Record<UptimeTone, "success" | "warning" | "danger" | "neutral"> = { success: "success", warning: "warning", danger: "danger", neutral: "neutral" };
const impactVariant: Record<IncidentImpact, "warning" | "danger" | "info"> = { minor: "warning", major: "danger", maintenance: "info" };

function useT(labels: UptimeMonitorsLabels | undefined): T {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

export interface UptimeBarProps extends Omit<ComponentProps<"div">, "children"> {
  checks: readonly CheckResult[];
  /** Accessible summary. Default: how many of the checks were up. */
  label?: string;
  labels?: UptimeMonitorsLabels;
}

/** A strip of thin segments, one per check, oldest first. It reads right to left in RTL. Status is also in the title of each segment. */
export function UptimeBar({ checks, label, labels, className, ...props }: UptimeBarProps) {
  const t = useT(labels);
  const measured = checks.filter((c) => c !== "none");
  const up = measured.filter((c) => c !== "down").length;
  return (
    <div data-slot="uptime-bar" role="img" aria-label={label ?? t.historyFor("", up, measured.length).replace(/^: /, "")} className={cn("flex h-6 min-w-24 items-stretch gap-px", className)} {...props}>
      {checks.map((c, i) => (
        <span key={i} title={t.checkNames[c]} className={cn("min-w-px flex-1 rounded-[1px]", segment[c])} />
      ))}
    </div>
  );
}

export interface UptimeBadgeProps extends Omit<ComponentProps<typeof Badge>, "children"> {
  percent: number | null | undefined;
  /** Shown after the figure, like "30d". */
  period?: string;
}

/** The uptime figure as a badge, coloured by how healthy it is (99.9 and up, 99 and up, below). */
export function UptimeBadge({ percent, period, ...props }: UptimeBadgeProps) {
  return (
    <Badge data-slot="uptime-badge" variant={badgeVariant[uptimeTone(percent)]} {...props}>
      <bdi dir="ltr" className="tabular-nums">
        {formatUptime(percent)}
      </bdi>
      {period ? <span className="font-normal opacity-80">{period}</span> : null}
    </Badge>
  );
}

export interface IncidentListProps extends Omit<ComponentProps<"ul">, "children"> {
  incidents: readonly Incident[];
  /** Show each incident's updates as a timeline. Default true. */
  showUpdates?: boolean;
  labels?: UptimeMonitorsLabels;
}

/** Incidents newest first: title, impact, status, when it started and how long it lasted, and optionally the update timeline. */
export function IncidentList({ incidents, showUpdates = true, labels, className, ...props }: IncidentListProps) {
  const t = useT(labels);
  if (incidents.length === 0) return <p className="rounded-control border border-dashed border-border p-4 text-body-sm text-muted-foreground">{t.incidentsEmpty}</p>;
  const sorted = [...incidents].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return (
    <ul data-slot="incident-list" className={cn("grid gap-3", className)} {...props}>
      {sorted.map((i) => (
        <li key={i.id} data-slot="incident" data-status={i.status} className="grid gap-2 rounded-control border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="min-w-0 flex-1 text-label text-foreground" dir="auto">
              {i.title}
            </h4>
            <Badge variant={impactVariant[i.impact]}>{t.impact[i.impact]}</Badge>
            <Badge variant={isOpenIncident(i) ? "warning" : "success"}>{t.incidentStatus[i.status]}</Badge>
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
            <span>
              {t.started} <DateTime value={i.startedAt} relative />
            </span>
            {i.resolvedAt ? <span>{t.lasted(formatIncidentDuration(incidentMinutes(i.startedAt, i.resolvedAt), t.duration))}</span> : null}
            {i.services?.length ? <span dir="auto">{i.services.join(", ")}</span> : null}
          </p>
          {showUpdates && i.updates?.length ? (
            <Timeline aria-label={t.updates} className="mt-1">
              {[...i.updates].reverse().map((u, n) => (
                <TimelineItem key={n} title={t.incidentStatus[u.status]} description={u.body} time={u.at} />
              ))}
            </Timeline>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function MonitorDialog({ open, onOpenChange, monitor, onSave, t }: { open: boolean; onOpenChange: (o: boolean) => void; monitor: UptimeMonitor | null; onSave: (input: MonitorInput, id?: string) => Promise<UptimeResult>; t: T }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [kind, setKind] = useState<UptimeMonitor["kind"]>("http");
  const [interval, setIntervalSec] = useState("60");
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setName(monitor?.name ?? "");
    setTarget(monitor?.target ?? "");
    setKind(monitor?.kind ?? "http");
    setIntervalSec(String(monitor?.intervalSec ?? 60));
    setTried(false);
    setError(null);
  }, [open, monitor]);
  const kindItems = (Object.keys(t.kinds) as UptimeMonitor["kind"][]).map((k) => ({ value: k, label: t.kinds[k] }));
  const intervalItems = (Object.keys(t.intervals) as unknown as (keyof typeof t.intervals)[]).map((k) => ({ value: String(k), label: t.intervals[k] }));
  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent data-slot="monitor-dialog">
        <form
          className="grid gap-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setTried(true);
            if (!name.trim() || !target.trim()) return;
            setSaving(true);
            setError(null);
            try {
              const result = await onSave({ name: name.trim(), target: target.trim(), kind, intervalSec: Number(interval) }, monitor?.id);
              if (result && result.error) setError(result.error);
              else onOpenChange(false);
            } catch {
              setError(t.genericError);
            } finally {
              setSaving(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{monitor ? t.dialogEdit : t.dialogNew}</DialogTitle>
            <DialogDescription>{t.dialogBody}</DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field invalid={tried && !name.trim()}>
            <FieldLabel>{t.name}</FieldLabel>
            <Input dir="auto" value={name} onChange={(e) => setName(e.target.value)} />
            {tried && !name.trim() ? <FieldError match>{t.required}</FieldError> : null}
          </Field>
          <Field invalid={tried && !target.trim()}>
            <FieldLabel>{t.target}</FieldLabel>
            <Input ltr value={target} placeholder="https://example.com/health" onChange={(e) => setTarget(e.target.value)} />
            {tried && !target.trim() ? <FieldError match>{t.required}</FieldError> : <p className="mt-1 text-caption text-muted-foreground">{t.targetHint}</p>}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t.kind}</FieldLabel>
              <Select items={kindItems} value={kind} onValueChange={(v) => v && setKind(v as UptimeMonitor["kind"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kindItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t.interval}</FieldLabel>
              <Select items={intervalItems} value={interval} onValueChange={(v) => v && setIntervalSec(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intervalItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface UptimeMonitorsProps extends Omit<ComponentProps<typeof Card>, "children" | "onPause" | "onResume" | "onDelete"> {
  monitors: readonly UptimeMonitor[];
  incidents?: readonly Incident[];
  loading?: boolean;
  /** Which period the uptime badge shows first. Default "30d". */
  defaultPeriod?: UptimePeriod;
  /** Create (no `id`) or edit a monitor. Shows Add monitor and Edit when set. */
  onSave?: (input: MonitorInput, id?: string) => Promise<UptimeResult>;
  onDelete?: (id: string) => Promise<UptimeResult>;
  onPause?: (id: string) => Promise<UptimeResult>;
  onResume?: (id: string) => Promise<UptimeResult>;
  onCheckNow?: (id: string) => Promise<UptimeResult>;
  labels?: UptimeMonitorsLabels;
}

/**
 * The admin side of uptime: a table of monitors with status, a recent-checks strip, an uptime badge for 24 hours,
 * 7 days or 30 days (switch the period above the table), response time and last check, plus the incidents they
 * raised. Check now, pause, resume, edit and delete are row actions and also open on context-click.
 */
export function UptimeMonitors({ monitors, incidents = [], loading = false, defaultPeriod = "30d", onSave, onDelete, onPause, onResume, onCheckNow, labels, className, ...props }: UptimeMonitorsProps) {
  const t = useT(labels);
  const [period, setPeriod] = useState<UptimePeriod>(defaultPeriod);
  const [editing, setEditing] = useState<UptimeMonitor | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<UptimeMonitor | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(fn: () => Promise<UptimeResult>) {
    setNotice(null);
    try {
      const result = await fn();
      if (result && result.error) setNotice(result.error);
    } catch {
      setNotice(t.genericError);
    }
  }

  const columns = useMemo<DataTableColumn<UptimeMonitor>[]>(
    () => [
      {
        id: "monitor",
        header: t.cols.monitor,
        label: t.cols.monitor,
        sortValue: (m) => m.name,
        searchValue: (m) => `${m.name} ${m.target}`,
        cell: (m) => (
          <span className="grid min-w-0 gap-0.5">
            <span className="truncate text-label text-foreground" dir="auto">
              {m.name}
            </span>
            <bdi dir="ltr" className="truncate font-mono text-caption text-muted-foreground">
              {m.target}
            </bdi>
          </span>
        ),
      },
      { id: "status", header: t.cols.status, label: t.cols.status, sortValue: (m) => m.status, filterValue: (m) => m.status, cell: (m) => <Status tone={monitorTone[m.status]}>{t.status[m.status]}</Status> },
      {
        id: "history",
        header: t.cols.history,
        label: t.cols.history,
        cell: (m) => (m.checks?.length ? <UptimeBar checks={m.checks} labels={labels} label={t.historyFor(m.name, m.checks.filter((c) => c !== "none" && c !== "down").length, m.checks.filter((c) => c !== "none").length)} className="w-40" /> : null),
        className: "max-md:hidden",
        headerClassName: "max-md:hidden",
      },
      { id: "uptime", header: `${t.cols.uptime} (${t.periodShort[period]})`, label: t.cols.uptime, sortValue: (m) => m.uptime[period] ?? -1, cell: (m) => <UptimeBadge percent={m.uptime[period]} aria-label={t.uptimeFor(formatUptime(m.uptime[period]), t.periods[period])} /> },
      { id: "response", header: t.cols.response, label: t.cols.response, sortValue: (m) => m.responseMs, cell: (m) => <bdi dir="ltr" className="tabular-nums text-body-sm text-muted-foreground">{responseLabel(m.responseMs)}</bdi>, align: "end", className: "max-lg:hidden", headerClassName: "max-lg:hidden" },
      { id: "checked", header: t.cols.checked, label: t.cols.checked, sortValue: (m) => (m.lastCheckAt ? new Date(m.lastCheckAt) : null), cell: (m) => (m.lastCheckAt ? <DateTime value={m.lastCheckAt} relative className="text-muted-foreground" /> : null), className: "max-lg:hidden", headerClassName: "max-lg:hidden" },
    ],
    [t, period, labels],
  );
  const table = useDataTable({ data: [...monitors], columns, getRowId: (m) => m.id });

  function actions(m: UptimeMonitor): DataTableRowAction[] {
    const paused = m.status === "paused";
    return [
      ...(onCheckNow ? [{ id: "check", label: t.checkNow, icon: RefreshCw, group: "run", disabled: paused, onSelect: () => void run(() => onCheckNow(m.id)) }] : []),
      ...(paused && onResume ? [{ id: "resume", label: t.resume, icon: Play, group: "run", onSelect: () => void run(() => onResume(m.id)) }] : []),
      ...(!paused && onPause ? [{ id: "pause", label: t.pause, icon: CirclePause, group: "run", onSelect: () => void run(() => onPause(m.id)) }] : []),
      ...(onSave ? [{ id: "edit", label: t.edit, icon: Pencil, group: "edit", onSelect: () => (setEditing(m), setOpen(true)) }] : []),
      ...(onDelete ? [{ id: "delete", label: t.remove, icon: Trash2, group: "danger", danger: true, onSelect: () => setDeleting(m) }] : []),
    ];
  }

  const openCount = incidents.filter(isOpenIncident).length;
  const overall = overallStatus(monitors.map((m) => m.status));

  return (
    <Card data-slot="uptime-monitors" className={cn("w-full", className)} {...props}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h3" className="flex items-center gap-2">
            <Activity aria-hidden className="size-4 text-muted-foreground" />
            {t.title}
          </CardTitle>
          <Badge variant={overall === "operational" ? "success" : overall === "degraded" || overall === "partial-outage" ? "warning" : overall === "maintenance" ? "info" : "danger"}>{t.overall[overall]}</Badge>
        </div>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <DataTableToolbar className="justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <DataTableSearch table={table} placeholder={t.search} />
            <ToggleGroup aria-label={t.period} value={[period]} onValueChange={(v) => v[0] && setPeriod(v[0] as UptimePeriod)}>
              {UPTIME_PERIODS.map((p) => (
                <Toggle key={p} value={p} aria-label={t.periods[p]}>
                  <bdi>{t.periodShort[p]}</bdi>
                </Toggle>
              ))}
            </ToggleGroup>
          </div>
          {onSave ? (
            <Button type="button" variant="primary" size="sm" onClick={() => (setEditing(null), setOpen(true))}>
              <Plus aria-hidden />
              {t.add}
            </Button>
          ) : null}
        </DataTableToolbar>
        {notice ? (
          <Alert tone="danger" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        ) : null}
        <DataTable table={table} label={t.table} rowLabel={(m) => m.name} rowActions={actions} loading={loading} empty={t.empty} />
        {incidents.length || !loading ? (
          <section aria-labelledby="uptime-incidents" className="grid gap-3">
            <h4 id="uptime-incidents" className="flex items-center gap-2 text-label text-foreground">
              {t.incidents}
              {openCount ? (
                <Badge variant="warning">
                  <Num value={openCount} /> {t.open}
                </Badge>
              ) : null}
            </h4>
            <IncidentList incidents={incidents} labels={labels} />
          </section>
        ) : null}
      </CardContent>
      {onSave ? <MonitorDialog open={open} onOpenChange={setOpen} monitor={editing} onSave={onSave} t={t} /> : null}
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          {deleting ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.deleteTitle(deleting.name)}</AlertDialogTitle>
                <AlertDialogDescription>{t.deleteBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const id = deleting.id;
                    setDeleting(null);
                    if (onDelete) void run(() => onDelete(id));
                  }}
                >
                  {t.remove}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
