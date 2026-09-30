"use client";

import { Camera, Cpu, Ellipsis, HardDrive, History, MemoryStick, Play, Power, PowerOff, RotateCw, SlidersHorizontal, Trash2 } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Sparkline } from "../chart";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../context-menu";
import { CopyButton } from "../copy-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../dropdown-menu";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { DateTime } from "../numeric";
import { Meter } from "../progress";
import { Skeleton } from "../states";
import { Status, type StatusTone } from "../status";
import {
  clampPercent,
  formatDisk,
  formatMemory,
  isTransitional,
  LIMIT_RANGES,
  type LimitError,
  type ServerLimitField,
  type PowerAction,
  powerActionsFor,
  type ServerLimits,
  type ServerStatus,
  validateLimits,
} from "./server-format";

export { formatDisk, formatMemory, isTransitional, LIMIT_RANGES, type LimitError, type ServerLimitField, type PowerAction, powerActionsFor, type ServerLimits, type ServerStatus, validateLimits } from "./server-format";

const STRINGS = {
  en: {
    status: { running: "Running", stopped: "Stopped", starting: "Starting", stopping: "Stopping", restarting: "Restarting", provisioning: "Setting up", suspended: "Suspended", error: "Error" } satisfies Record<ServerStatus, string>,
    copyAddress: "Copy address",
    hardware: "Hardware",
    cores: (n: number) => (n === 1 ? "1 vCPU" : `${n} vCPU`),
    cpu: "CPU",
    memory: "Memory",
    disk: "Disk",
    usage: "Live usage",
    cpuTrend: (name: string) => `CPU load of ${name}, recent`,
    noMetrics: "Live usage is not available while the server is off.",
    lastDeploy: "Last deploy",
    noDeploy: "No deploys yet",
    deployStatus: { success: "Succeeded", failed: "Failed", running: "In progress" },
    by: (name: string) => `by ${name}`,
    power: "Power",
    powerActions: { start: "Start", stop: "Stop", restart: "Restart", "force-stop": "Force stop" } satisfies Record<PowerAction, string>,
    powerConfirmTitle: (action: string, name: string) => `${action} ${name}?`,
    powerConfirmBody: {
      start: "The server boots and services start.",
      restart: "The server reboots. Connections drop for a minute or so.",
      stop: "The server shuts down cleanly. Sites and services on it go offline until you start it again.",
      "force-stop": "The power is cut without a clean shutdown. Unsaved data can be lost. Use it only when a normal stop does not work.",
    } satisfies Record<PowerAction, string>,
    snapshots: "Snapshots",
    snapshotsBody: "Point-in-time copies of the disk. Roll back to return to one.",
    takeSnapshot: "Take snapshot",
    snapshotName: "Name",
    snapshotNameHint: "Optional. Leave empty to name it by date.",
    snapshotCreate: "Create snapshot",
    snapshotsEmpty: "No snapshots yet.",
    snapshotCreating: "Creating",
    rollback: "Roll back",
    rollbackTitle: (name: string) => `Roll back to ${name}?`,
    rollbackBody: "The disk returns to how it was in this snapshot. Everything written after it is lost, and the server restarts.",
    remove: "Delete",
    removeTitle: (name: string) => `Delete ${name}?`,
    removeBody: "The snapshot is removed for good. You will not be able to roll back to it.",
    actionsFor: (name: string) => `Actions for ${name}`,
    limits: "Resource limits",
    limitsBody: "The most this server may use. Changes apply after a restart.",
    limitFields: { cpuCores: "CPU cores", memoryMb: "Memory (MB)", diskGb: "Disk (GB)" } satisfies Record<ServerLimitField, string>,
    limitErrors: { integer: "Enter a whole number.", range: (min: number, max: number) => `Enter a number from ${min} to ${max}.` },
    limitsSave: "Save limits",
    cancel: "Cancel",
    genericError: "Something went wrong. Try again.",
    loading: "Loading server",
  },
  ar: {
    status: { running: "يعمل", stopped: "متوقف", starting: "قيد التشغيل", stopping: "قيد الإيقاف", restarting: "يعاد تشغيله", provisioning: "قيد الإعداد", suspended: "معلّق", error: "خطأ" } satisfies Record<ServerStatus, string>,
    copyAddress: "نسخ العنوان",
    hardware: "العتاد",
    cores: (n: number) => (n === 1 ? "معالج افتراضي واحد" : `${n} معالجات افتراضية`),
    cpu: "المعالج",
    memory: "الذاكرة",
    disk: "القرص",
    usage: "الاستخدام المباشر",
    cpuTrend: (name: string) => `حمل معالج ${name} مؤخرًا`,
    noMetrics: "الاستخدام المباشر غير متاح والخادم متوقف.",
    lastDeploy: "آخر نشر",
    noDeploy: "لا توجد عمليات نشر بعد",
    deployStatus: { success: "نجح", failed: "فشل", running: "قيد التنفيذ" },
    by: (name: string) => `بواسطة ${name}`,
    power: "الطاقة",
    powerActions: { start: "تشغيل", stop: "إيقاف", restart: "إعادة تشغيل", "force-stop": "إيقاف قسري" } satisfies Record<PowerAction, string>,
    powerConfirmTitle: (action: string, name: string) => `${action} ${name}؟`,
    powerConfirmBody: {
      start: "يُقلع الخادم وتبدأ الخدمات.",
      restart: "يُعاد إقلاع الخادم وتنقطع الاتصالات نحو دقيقة.",
      stop: "يُغلق الخادم بشكل سليم، وتتوقف المواقع والخدمات عليه حتى تشغّله مجددًا.",
      "force-stop": "تُقطع الطاقة دون إغلاق سليم وقد تضيع بيانات غير محفوظة. استخدمه فقط إذا لم ينفع الإيقاف العادي.",
    } satisfies Record<PowerAction, string>,
    snapshots: "اللقطات",
    snapshotsBody: "نسخ من القرص في لحظة معينة. ارجع إلى إحداها عند الحاجة.",
    takeSnapshot: "التقاط لقطة",
    snapshotName: "الاسم",
    snapshotNameHint: "اختياري. اتركه فارغًا ليُسمّى بالتاريخ.",
    snapshotCreate: "إنشاء اللقطة",
    snapshotsEmpty: "لا توجد لقطات بعد.",
    snapshotCreating: "قيد الإنشاء",
    rollback: "استرجاع",
    rollbackTitle: (name: string) => `الرجوع إلى ${name}؟`,
    rollbackBody: "يعود القرص إلى حالته في هذه اللقطة. يضيع كل ما كُتب بعدها ويُعاد تشغيل الخادم.",
    remove: "حذف",
    removeTitle: (name: string) => `حذف ${name}؟`,
    removeBody: "تُحذف اللقطة نهائيًا ولن تتمكن من الرجوع إليها.",
    actionsFor: (name: string) => `إجراءات ${name}`,
    limits: "حدود الموارد",
    limitsBody: "أقصى ما يستهلكه هذا الخادم. تسري التغييرات بعد إعادة التشغيل.",
    limitFields: { cpuCores: "أنوية المعالج", memoryMb: "الذاكرة (ميغابايت)", diskGb: "القرص (غيغابايت)" } satisfies Record<ServerLimitField, string>,
    limitErrors: { integer: "أدخل عددًا صحيحًا.", range: (min: number, max: number) => `أدخل رقمًا من ${min} إلى ${max}.` },
    limitsSave: "حفظ الحدود",
    cancel: "إلغاء",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    loading: "جارٍ تحميل الخادم",
  },
};

export type ServerCardLabels = Partial<typeof STRINGS.en>;
export type ServerCardResult = void | { error?: string };

export interface ServerSnapshot {
  id: string;
  name: string;
  createdAt: Date | number | string;
  sizeLabel?: string;
  status?: "ready" | "creating";
}

export interface ServerMetrics {
  /** Percentages, 0 to 100. */
  cpu: number;
  memory: number;
  disk: number;
  /** Recent CPU load, oldest first, for the sparkline. */
  cpuHistory?: readonly number[];
}

export interface ServerDeploy {
  ref: string;
  at: Date | number | string;
  status: "success" | "failed" | "running";
  by?: string;
}

export interface ServerInfo {
  id: string;
  name: string;
  status: ServerStatus;
  /** Public IP or hostname. Stays left to right. */
  address: string;
  /** Free text, for example "Frankfurt" or "Riyadh". */
  region?: string;
  os?: string;
  limits: ServerLimits;
  metrics?: ServerMetrics;
  lastDeploy?: ServerDeploy;
  snapshots: readonly ServerSnapshot[];
}

export interface ServerCardProps extends Omit<ComponentProps<typeof Card>, "children"> {
  server: ServerInfo;
  loading?: boolean;
  /** Run a power action, after the confirm for stop and force stop. Resolve `{ error }` to show a message. */
  onPower: (action: PowerAction) => Promise<ServerCardResult>;
  /** Take a snapshot. `name` is empty when the user left it blank. Shows the button when set. */
  onTakeSnapshot?: (name: string) => Promise<ServerCardResult>;
  /** Roll the disk back to a snapshot, after the confirm. */
  onRollback?: (snapshotId: string) => Promise<ServerCardResult>;
  onDeleteSnapshot?: (snapshotId: string) => Promise<ServerCardResult>;
  /** Save new resource limits. Shows the limits editor button when set. */
  onSaveLimits?: (limits: ServerLimits) => Promise<ServerCardResult>;
  labels?: ServerCardLabels;
}

const statusTone: Record<ServerStatus, StatusTone> = { running: "success", stopped: "neutral", starting: "info", stopping: "info", restarting: "info", provisioning: "info", suspended: "warning", error: "danger" };
const powerIcon = { start: Play, stop: Power, restart: RotateCw, "force-stop": PowerOff } as const;
const deployBadge = { success: "success", failed: "danger", running: "info" } as const;

type Pending = { kind: "power"; action: PowerAction } | { kind: "rollback"; snap: ServerSnapshot } | { kind: "delete"; snap: ServerSnapshot };

function metricLabel(icon: ReactNode, text: string) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {text}
    </span>
  );
}

/**
 * One server: status and address, hardware, live CPU, memory and disk meters with a CPU trend, the last
 * deploy, power controls that depend on the state (stopping and force-stopping ask first), snapshots with
 * take, roll back and delete (also on context-click), and a resource limits editor. Presentational: your
 * callbacks talk to the provider and you pass the updated `server` back.
 */
export function ServerCard({ server, loading = false, onPower, onTakeSnapshot, onRollback, onDeleteSnapshot, onSaveLimits, labels, className, ...props }: ServerCardProps) {
  const nasaq = useOptionalNasaq();
  const ar = (nasaq?.locale ?? "en").startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [snapOpen, setSnapOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);

  async function run(fn: () => Promise<ServerCardResult>) {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (result && result.error) setError(result.error);
    } catch {
      setError(t.genericError);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Card data-slot="server-card" aria-busy="true" aria-label={t.loading} className={className} {...props}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  const actions = powerActionsFor(server.status);
  const transitional = isTransitional(server.status);
  const m = server.metrics;
  const live = m && (server.status === "running" || server.status === "error");
  const confirmCopy = (p: Pending): { title: string; body: string; confirm: string } =>
    p.kind === "power"
      ? { title: t.powerConfirmTitle(t.powerActions[p.action], server.name), body: t.powerConfirmBody[p.action], confirm: t.powerActions[p.action] }
      : p.kind === "rollback"
        ? { title: t.rollbackTitle(p.snap.name), body: t.rollbackBody, confirm: t.rollback }
        : { title: t.removeTitle(p.snap.name), body: t.removeBody, confirm: t.remove };

  function requestPower(action: PowerAction) {
    if (action === "start" || action === "restart") void run(() => onPower(action));
    else setPending({ kind: "power", action });
  }

  function confirmPending() {
    const p = pending;
    setPending(null);
    if (!p) return;
    if (p.kind === "power") void run(() => onPower(p.action));
    else if (p.kind === "rollback" && onRollback) void run(() => onRollback(p.snap.id));
    else if (p.kind === "delete" && onDeleteSnapshot) void run(() => onDeleteSnapshot(p.snap.id));
  }

  return (
    <Card data-slot="server-card" data-status={server.status} className={cn("w-full", className)} {...props}>
      <CardHeader className="gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h3" className="min-w-0 truncate" dir="auto">
            {server.name}
          </CardTitle>
          <Status tone={statusTone[server.status]} tinted aria-live="polite">
            {t.status[server.status]}
          </Status>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <bdi dir="ltr" className="font-mono text-body-sm tabular-nums">
              {server.address}
            </bdi>
            <CopyButton value={server.address} size="icon-sm" variant="ghost" label={t.copyAddress} />
          </span>
          {server.region ? <span dir="auto">{server.region}</span> : null}
          {server.os ? <bdi dir="ltr">{server.os}</bdi> : null}
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-5">
        {error ? (
          <Alert tone="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <ul className="flex flex-wrap gap-2" aria-label={t.hardware}>
          <li>
            <Badge variant="outline">
              <Cpu aria-hidden /> <bdi>{t.cores(server.limits.cpuCores)}</bdi>
            </Badge>
          </li>
          <li>
            <Badge variant="outline">
              <MemoryStick aria-hidden /> <bdi dir="ltr">{formatMemory(server.limits.memoryMb)}</bdi>
            </Badge>
          </li>
          <li>
            <Badge variant="outline">
              <HardDrive aria-hidden /> <bdi dir="ltr">{formatDisk(server.limits.diskGb)}</bdi>
            </Badge>
          </li>
        </ul>

        <section aria-label={t.usage} className="grid gap-3">
          {live && m ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="grid gap-3">
                <Meter aria-label={t.cpu} label={metricLabel(<Cpu aria-hidden className="size-3.5" />, t.cpu)} value={clampPercent(m.cpu)} valueText={<bdi dir="ltr">{Math.round(m.cpu)}%</bdi>} size="sm" />
                <Meter aria-label={t.memory} label={metricLabel(<MemoryStick aria-hidden className="size-3.5" />, t.memory)} value={clampPercent(m.memory)} valueText={<bdi dir="ltr">{Math.round(m.memory)}%</bdi>} size="sm" />
                <Meter aria-label={t.disk} label={metricLabel(<HardDrive aria-hidden className="size-3.5" />, t.disk)} value={clampPercent(m.disk)} valueText={<bdi dir="ltr">{Math.round(m.disk)}%</bdi>} size="sm" />
              </div>
              {m.cpuHistory && m.cpuHistory.length > 1 ? <Sparkline data={m.cpuHistory} label={t.cpuTrend(server.name)} className="h-12 w-full sm:w-40" /> : null}
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">{t.noMetrics}</p>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
          <span className="text-muted-foreground">{t.lastDeploy}</span>
          {server.lastDeploy ? (
            <>
              <Badge variant={deployBadge[server.lastDeploy.status]}>{t.deployStatus[server.lastDeploy.status]}</Badge>
              <bdi dir="ltr" className="font-mono text-caption">
                {server.lastDeploy.ref}
              </bdi>
              <DateTime value={server.lastDeploy.at} relative className="text-muted-foreground" />
              {server.lastDeploy.by ? <span className="text-muted-foreground">{t.by(server.lastDeploy.by)}</span> : null}
            </>
          ) : (
            <span className="text-muted-foreground">{t.noDeploy}</span>
          )}
        </div>

        <section aria-label={t.power} className="flex flex-wrap items-center gap-2" data-slot="server-power">
          {actions.map((a) => {
            const Icon = powerIcon[a];
            return (
              <Button key={a} type="button" size="sm" variant={a === "force-stop" ? "danger" : a === "start" ? "primary" : "secondary"} disabled={busy} onClick={() => requestPower(a)}>
                <Icon aria-hidden />
                {t.powerActions[a]}
              </Button>
            );
          })}
          {transitional ? <span className="text-body-sm text-muted-foreground">{t.status[server.status]}…</span> : null}
          <span className="flex-1" />
          {onSaveLimits ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setLimitsOpen(true)}>
              <SlidersHorizontal aria-hidden />
              {t.limits}
            </Button>
          ) : null}
        </section>

        {onTakeSnapshot || server.snapshots.length ? (
          <section aria-labelledby={`${server.id}-snaps`} className="grid gap-2 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 id={`${server.id}-snaps`} className="text-label text-foreground">
                  {t.snapshots}
                </h4>
                <p className="text-body-sm text-muted-foreground">{t.snapshotsBody}</p>
              </div>
              {onTakeSnapshot ? (
                <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setSnapOpen(true)}>
                  <Camera aria-hidden />
                  {t.takeSnapshot}
                </Button>
              ) : null}
            </div>
            {server.snapshots.length === 0 ? (
              <p className="rounded-control border border-dashed border-border p-3 text-body-sm text-muted-foreground">{t.snapshotsEmpty}</p>
            ) : (
              <ul className="grid gap-1.5">
                {server.snapshots.map((s) => {
                  const creating = s.status === "creating";
                  const items = [
                    onRollback && !creating ? { id: "rollback", label: t.rollback, icon: History, run: () => setPending({ kind: "rollback", snap: s }), danger: false } : null,
                    onDeleteSnapshot && !creating ? { id: "delete", label: t.remove, icon: Trash2, run: () => setPending({ kind: "delete", snap: s }), danger: true } : null,
                  ].filter((x): x is NonNullable<typeof x> => x !== null);
                  return (
                    <ContextMenu key={s.id}>
                      <ContextMenuTrigger
                        render={<li tabIndex={0} data-slot="server-snapshot" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-border px-3 py-2 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus" />}
                      >
                        <span className="min-w-0 flex-1 truncate text-label text-foreground" dir="auto" title={s.name}>
                          {s.name}
                        </span>
                        {creating ? <Badge variant="info">{t.snapshotCreating}</Badge> : null}
                        {s.sizeLabel ? (
                          <bdi dir="ltr" className="text-caption tabular-nums text-muted-foreground">
                            {s.sizeLabel}
                          </bdi>
                        ) : null}
                        <DateTime value={s.createdAt} relative className="text-caption text-muted-foreground" />
                        {items.length ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t.actionsFor(s.name)} className="text-muted-foreground" />}>
                              <Ellipsis aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-40">
                              {items.map((i) => (
                                <DropdownMenuItem key={i.id} variant={i.danger ? "danger" : "default"} onClick={i.run}>
                                  <i.icon aria-hidden />
                                  {i.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </ContextMenuTrigger>
                      {items.length ? (
                        <ContextMenuContent className="min-w-40">
                          {items.map((i) => (
                            <ContextMenuItem key={i.id} variant={i.danger ? "danger" : "default"} onClick={i.run}>
                              <i.icon aria-hidden />
                              {i.label}
                            </ContextMenuItem>
                          ))}
                        </ContextMenuContent>
                      ) : null}
                    </ContextMenu>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}
      </CardContent>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          {pending ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmCopy(pending).title}</AlertDialogTitle>
                <AlertDialogDescription>{confirmCopy(pending).body}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={confirmPending}>{confirmCopy(pending).confirm}</AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>

      {onTakeSnapshot ? <SnapshotDialog open={snapOpen} onOpenChange={setSnapOpen} t={t} onCreate={(name) => run(() => onTakeSnapshot(name))} /> : null}
      {onSaveLimits ? <LimitsDialog open={limitsOpen} onOpenChange={setLimitsOpen} limits={server.limits} t={t} onSave={(l) => run(() => onSaveLimits(l))} /> : null}
    </Card>
  );
}

type T = typeof STRINGS.en;

function SnapshotDialog({ open, onOpenChange, onCreate, t }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (name: string) => Promise<void>; t: T }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setName("");
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent data-slot="server-snapshot-dialog">
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              await onCreate(name.trim());
            } finally {
              setSaving(false);
              onOpenChange(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.takeSnapshot}</DialogTitle>
            <DialogDescription>{t.snapshotsBody}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>{t.snapshotName}</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} dir="auto" />
            <FieldDescription>{t.snapshotNameHint}</FieldDescription>
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {t.snapshotCreate}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LimitsDialog({ open, onOpenChange, limits, onSave, t }: { open: boolean; onOpenChange: (o: boolean) => void; limits: ServerLimits; onSave: (l: ServerLimits) => Promise<void>; t: T }) {
  const initial = (): Record<ServerLimitField, string> => ({ cpuCores: String(limits.cpuCores), memoryMb: String(limits.memoryMb), diskGb: String(limits.diskGb) });
  const [raw, setRaw] = useState(initial);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when the dialog opens
  useEffect(() => {
    if (open) {
      setRaw(initial());
      setTried(false);
    }
  }, [open]);
  const { value, errors } = validateLimits(raw);
  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent data-slot="server-limits">
        <form
          className="grid gap-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setTried(true);
            if (!value) return;
            setSaving(true);
            try {
              await onSave(value);
            } finally {
              setSaving(false);
              onOpenChange(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.limits}</DialogTitle>
            <DialogDescription>{t.limitsBody}</DialogDescription>
          </DialogHeader>
          {(Object.keys(LIMIT_RANGES) as ServerLimitField[]).map((key) => {
            const err = tried ? errors[key] : undefined;
            return (
              <Field key={key} invalid={Boolean(err)}>
                <FieldLabel>{t.limitFields[key]}</FieldLabel>
                <Input ltr inputMode="numeric" value={raw[key]} onChange={(e) => setRaw((r) => ({ ...r, [key]: e.target.value }))} />
                {err ? <FieldError match>{err === "integer" ? t.limitErrors.integer : t.limitErrors.range(LIMIT_RANGES[key].min, LIMIT_RANGES[key].max)}</FieldError> : null}
              </Field>
            );
          })}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {t.limitsSave}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
