"use client";

import { Ban, CirclePlay, CircleStop, Cpu, KeyRound, ListRestart, PackageCheck, Plus, Power, RefreshCw, RotateCw, ServerCog, ShieldAlert, Trash2, Undo2 } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Checkbox } from "../checkbox";
import { CodeBlock } from "../code-block";
import {
  type DataTableColumn,
  type DataTableRowAction,
  DataTable,
  DataTableBulkActions,
  DataTableFacetFilter,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  useDataTable,
} from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { DateTime, Num } from "../numeric";
import { Spinner } from "../spinner";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";
import {
  type DateLike,
  type JobStatus,
  type PackageKind,
  type ServiceAction,
  type ServiceState,
  type SshKeyProblem,
  type SshKeyType,
  canForgetJob,
  canRetryJob,
  errorHeadline,
  formatBytes,
  isDisruptive,
  JOB_STATUSES,
  jobCounts,
  keyCoverage,
  kindRank,
  parseSshPublicKey,
  serviceActionsFor,
  shortFingerprint,
  summarizeUpdates,
} from "./server-admin-format";

export {
  canForgetJob,
  canRetryJob,
  errorHeadline,
  isDisruptive,
  isTransitionalState,
  JOB_STATUSES,
  type JobStatus,
  jobCounts,
  type KeyCoverage,
  keyCoverage,
  type PackageKind,
  type ParsedSshKey,
  parseSshPublicKey,
  type ServiceAction,
  type ServiceState,
  serviceActionsFor,
  shortFingerprint,
  type SshKeyProblem,
  type SshKeyType,
  summarizeUpdates,
  type UpdateSummary,
} from "./server-admin-format";

const STRINGS = {
  en: {
    genericError: "Something went wrong. Try again.",
    cancel: "Cancel",
    dismiss: "Dismiss",
    search: "Search…",
    // services
    servicesTitle: "Services",
    servicesDescription: "Systemd units on this server. Start, stop, restart or choose what runs at boot.",
    servicesTable: "Service units",
    service: "Service",
    state: "State",
    boot: "At boot",
    memory: "Memory",
    since: "Since",
    states: { active: "Running", inactive: "Stopped", failed: "Failed", activating: "Starting", deactivating: "Stopping", reloading: "Reloading" } satisfies Record<ServiceState, string>,
    enabledAtBoot: "Enabled",
    disabledAtBoot: "Disabled",
    actions: { start: "Start", stop: "Stop", restart: "Restart", reload: "Reload", enable: "Enable at boot", disable: "Disable at boot" } satisfies Record<ServiceAction, string>,
    viewLogs: "View logs",
    working: "Working",
    confirmAction: (action: string, name: string) => `${action} ${name}?`,
    confirmStop: "Anything that depends on this service stops working until it is started again.",
    confirmRestart: "The service is interrupted for a moment while it restarts.",
    confirmDisable: "The service will not start by itself after a reboot.",
    servicesEmpty: "No services",
    // packages
    packagesTitle: "Package updates",
    packagesDescription: "Updates waiting on this server.",
    packagesTable: "Available updates",
    package: "Package",
    version: "Version",
    kind: "Type",
    size: "Size",
    kinds: { security: "Security", kernel: "Kernel", regular: "Update" } satisfies Record<PackageKind, string>,
    upToDate: "Everything is up to date",
    upToDateBody: "There are no updates waiting.",
    lastChecked: "Last checked",
    neverChecked: "Not checked yet",
    checkNow: "Check for updates",
    checking: "Checking",
    updateAll: "Update all",
    updateAllTitle: (n: number) => `Update ${n} packages?`,
    updateAllBody: "Services that use an updated library may restart.",
    updateSelected: "Update selected",
    updateOne: "Update",
    updating: "Updating",
    securityCount: (n: number) => `${n} security`,
    totalCount: (n: number) => (n === 1 ? "1 update" : `${n} updates`),
    download: (size: string) => `${size} to download`,
    rebootTitle: "A restart is needed",
    rebootBody: "A kernel or core library was updated. Restart the server to use it.",
    reboot: "Restart server",
    rebootConfirmTitle: "Restart the server?",
    rebootConfirmBody: "Everything on it is offline for a minute or two.",
    // ssh
    sshTitle: "SSH keys",
    sshDescription: "Which keys can sign in to which server. Tick a box to install or remove a key.",
    sshTable: "SSH keys by server",
    sshKey: "Key",
    sshCoverage: (n: number, total: number) => `${n} of ${total}`,
    sshServers: "Servers",
    addKey: "Add key",
    addKeyTitle: "Add an SSH key",
    addKeyBody: "Paste the public key, the one that ends in .pub. Never paste a private key.",
    keyName: "Name",
    keyNamePlaceholder: "Laptop",
    keyNameRequired: "Give the key a name.",
    publicKey: "Public key",
    keyProblems: {
      empty: "Paste the public key.",
      format: "A public key is one line: the type, the key, and an optional comment.",
      type: "This key type is not recognised. Use ssh-ed25519, ssh-rsa or ecdsa.",
      body: "The key text looks damaged. Copy it again.",
      private: "That is a private key. Never paste it. Paste the .pub file instead.",
    } satisfies Record<SshKeyProblem, string>,
    keyDetected: (type: string, comment: string) => (comment ? `${type} key, ${comment}` : `${type} key`),
    addedOn: "Added",
    lastUsed: "Last used",
    never: "Never",
    installOnAll: "Install on all servers",
    removeFromAll: "Remove from all servers",
    deleteKey: "Delete key",
    deleteKeyTitle: (name: string) => `Delete ${name}?`,
    deleteKeyBody: "The key is removed from every server it is installed on. Anyone using it can no longer sign in.",
    installedOn: (key: string, server: string) => `${key} on ${server}`,
    noKeys: "No SSH keys yet",
    noKeysBody: "Add a public key, then choose the servers it can sign in to.",
    // jobs
    jobsTitle: "Job queue",
    jobsDescription: "Background work, by status. Retry what failed, or forget it.",
    jobsTable: "Jobs",
    job: "Job",
    queue: "Queue",
    attempts: "Attempts",
    when: "When",
    status: "Status",
    jobStatuses: { waiting: "Waiting", active: "Running", delayed: "Delayed", completed: "Done", failed: "Failed" } satisfies Record<JobStatus, string>,
    retry: "Retry",
    forget: "Forget",
    retryFailed: "Retry all failed",
    forgetFailed: "Forget all failed",
    forgetTitle: (n: number) => (n === 1 ? "Forget this job?" : `Forget ${n} jobs?`),
    forgetBody: "They are removed from the queue and the history. This cannot be undone.",
    retryTitle: (n: number) => (n === 1 ? "Retry this job?" : `Retry ${n} jobs?`),
    retryBody: "They go back to the queue and run again.",
    details: "Details",
    errorLabel: "Error",
    payloadLabel: "Payload",
    noError: "No error recorded.",
    close: "Close",
    jobsEmpty: "No jobs",
    of: (a: number, b: number) => `${a}/${b}`,
    queueFilter: "Queue",
    statusGroup: "Job status",
  },
  ar: {
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    cancel: "إلغاء",
    dismiss: "إغلاق",
    search: "بحث…",
    servicesTitle: "الخدمات",
    servicesDescription: "وحدات systemd على هذا الخادم. شغّلها أو أوقفها أو أعد تشغيلها أو اختر ما يعمل عند الإقلاع.",
    servicesTable: "وحدات الخدمات",
    service: "الخدمة",
    state: "الحالة",
    boot: "عند الإقلاع",
    memory: "الذاكرة",
    since: "منذ",
    states: { active: "تعمل", inactive: "متوقفة", failed: "فشلت", activating: "قيد البدء", deactivating: "قيد الإيقاف", reloading: "قيد إعادة التحميل" } satisfies Record<ServiceState, string>,
    enabledAtBoot: "مفعّلة",
    disabledAtBoot: "معطّلة",
    actions: { start: "تشغيل", stop: "إيقاف", restart: "إعادة التشغيل", reload: "إعادة تحميل الإعدادات", enable: "تفعيل عند الإقلاع", disable: "تعطيل عند الإقلاع" } satisfies Record<ServiceAction, string>,
    viewLogs: "عرض السجلات",
    working: "جارٍ التنفيذ",
    confirmAction: (action: string, name: string) => `${action}: ${name}؟`,
    confirmStop: "كل ما يعتمد على هذه الخدمة يتوقف عن العمل إلى أن تُشغَّل من جديد.",
    confirmRestart: "تتوقف الخدمة لحظة أثناء إعادة التشغيل.",
    confirmDisable: "لن تبدأ الخدمة وحدها بعد إعادة تشغيل الخادم.",
    servicesEmpty: "لا توجد خدمات",
    packagesTitle: "تحديثات الحزم",
    packagesDescription: "التحديثات المتاحة لهذا الخادم.",
    packagesTable: "التحديثات المتاحة",
    package: "الحزمة",
    version: "الإصدار",
    kind: "النوع",
    size: "الحجم",
    kinds: { security: "أمني", kernel: "النواة", regular: "تحديث" } satisfies Record<PackageKind, string>,
    upToDate: "كل شيء محدَّث",
    upToDateBody: "لا توجد تحديثات بانتظارك.",
    lastChecked: "آخر فحص",
    neverChecked: "لم يُفحص بعد",
    checkNow: "فحص التحديثات",
    checking: "جارٍ الفحص",
    updateAll: "تحديث الكل",
    updateAllTitle: (n: number) => `تحديث ${n} حزمة؟`,
    updateAllBody: "قد تُعاد تشغيل الخدمات التي تستخدم مكتبة محدَّثة.",
    updateSelected: "تحديث المحدد",
    updateOne: "تحديث",
    updating: "جارٍ التحديث",
    securityCount: (n: number) => `${n} أمنية`,
    totalCount: (n: number) => (n === 1 ? "تحديث واحد" : n === 2 ? "تحديثان" : n <= 10 ? `${n} تحديثات` : `${n} تحديثًا`),
    download: (size: string) => `${size} للتنزيل`,
    rebootTitle: "يلزم إعادة التشغيل",
    rebootBody: "حُدِّثت النواة أو مكتبة أساسية. أعد تشغيل الخادم لتفعيلها.",
    reboot: "إعادة تشغيل الخادم",
    rebootConfirmTitle: "إعادة تشغيل الخادم؟",
    rebootConfirmBody: "كل ما عليه يتوقف دقيقة أو دقيقتين.",
    sshTitle: "مفاتيح SSH",
    sshDescription: "أي مفتاح يمكنه الدخول إلى أي خادم. علّم المربع لتثبيت المفتاح أو إزالته.",
    sshTable: "مفاتيح SSH حسب الخادم",
    sshKey: "المفتاح",
    sshCoverage: (n: number, total: number) => `${n} من ${total}`,
    sshServers: "الخوادم",
    addKey: "إضافة مفتاح",
    addKeyTitle: "إضافة مفتاح SSH",
    addKeyBody: "الصق المفتاح العام، وهو الذي ينتهي بـ .pub. لا تلصق المفتاح الخاص أبدًا.",
    keyName: "الاسم",
    keyNamePlaceholder: "الحاسوب المحمول",
    keyNameRequired: "أعطِ المفتاح اسمًا.",
    publicKey: "المفتاح العام",
    keyProblems: {
      empty: "الصق المفتاح العام.",
      format: "المفتاح العام سطر واحد: النوع ثم المفتاح ثم تعليق اختياري.",
      type: "نوع المفتاح غير معروف. استخدم ssh-ed25519 أو ssh-rsa أو ecdsa.",
      body: "نص المفتاح يبدو تالفًا. انسخه مرة أخرى.",
      private: "هذا مفتاح خاص. لا تلصقه أبدًا. الصق ملف .pub بدلًا منه.",
    } satisfies Record<SshKeyProblem, string>,
    keyDetected: (type: string, comment: string) => (comment ? `مفتاح ${type}، ${comment}` : `مفتاح ${type}`),
    addedOn: "أُضيف",
    lastUsed: "آخر استخدام",
    never: "أبدًا",
    installOnAll: "تثبيت على كل الخوادم",
    removeFromAll: "إزالة من كل الخوادم",
    deleteKey: "حذف المفتاح",
    deleteKeyTitle: (name: string) => `حذف ${name}؟`,
    deleteKeyBody: "يُزال المفتاح من كل خادم ثُبِّت عليه، ولا يستطيع من يستخدمه الدخول بعد الآن.",
    installedOn: (key: string, server: string) => `${key} على ${server}`,
    noKeys: "لا توجد مفاتيح SSH بعد",
    noKeysBody: "أضف مفتاحًا عامًا ثم اختر الخوادم التي يمكنه الدخول إليها.",
    jobsTitle: "طابور المهام",
    jobsDescription: "العمل في الخلفية حسب الحالة. أعد محاولة ما فشل أو انسَه.",
    jobsTable: "المهام",
    job: "المهمة",
    queue: "الطابور",
    attempts: "المحاولات",
    when: "الوقت",
    status: "الحالة",
    jobStatuses: { waiting: "بالانتظار", active: "تعمل", delayed: "مؤجلة", completed: "منتهية", failed: "فاشلة" } satisfies Record<JobStatus, string>,
    retry: "إعادة المحاولة",
    forget: "نسيان",
    retryFailed: "إعادة محاولة كل الفاشلة",
    forgetFailed: "نسيان كل الفاشلة",
    forgetTitle: (n: number) => (n === 1 ? "نسيان هذه المهمة؟" : `نسيان ${n} مهام؟`),
    forgetBody: "تُزال من الطابور ومن السجل. لا يمكن التراجع.",
    retryTitle: (n: number) => (n === 1 ? "إعادة محاولة هذه المهمة؟" : `إعادة محاولة ${n} مهام؟`),
    retryBody: "تعود إلى الطابور وتعمل من جديد.",
    details: "التفاصيل",
    errorLabel: "الخطأ",
    payloadLabel: "البيانات",
    noError: "لا يوجد خطأ مسجَّل.",
    close: "إغلاق",
    jobsEmpty: "لا توجد مهام",
    of: (a: number, b: number) => `${a}/${b}`,
    queueFilter: "الطابور",
    statusGroup: "حالة المهام",
  },
};

export type ServerAdminLabels = (typeof STRINGS)["en"];
export type ServerAdminResult = void | { error?: string };

function useServerAdminLabels(labels: Partial<ServerAdminLabels> | undefined) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { locale, ar, t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as ServerAdminLabels };
}

/** Runs host callbacks, tracks which keys are busy and keeps the last error. A thrown error becomes the generic message. */
function useRunner(genericError: string) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function run(keys: readonly string[], task: () => Promise<ServerAdminResult> | ServerAdminResult) {
    setError(null);
    setBusy((prev) => new Set([...prev, ...keys]));
    try {
      const result = await task();
      if (result && result.error && mounted.current) setError(result.error);
    } catch {
      if (mounted.current) setError(genericError);
    } finally {
      if (mounted.current) {
        setBusy((prev) => {
          const next = new Set(prev);
          for (const k of keys) next.delete(k);
          return next;
        });
      }
    }
  }
  return { error, setError, busy, run };
}

interface ConfirmRequest {
  title: string;
  body: string;
  confirm: string;
  /** Default true: the confirm button is the danger variant. */
  danger?: boolean;
  run: () => Promise<void> | void;
}

/** One confirm dialog opened from a menu item (ConfirmButton needs its own trigger). */
function ConfirmDialog({ request, onClose, cancel }: { request: ConfirmRequest | null; onClose: () => void; cancel: string }) {
  const [held, setHeld] = useState<ConfirmRequest | null>(request);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (request) setHeld(request);
  }, [request]);
  return (
    <AlertDialog open={request !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent data-slot="server-admin-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>{held?.title}</AlertDialogTitle>
          <AlertDialogDescription>{held?.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancel}</AlertDialogCancel>
          <Button
            variant={held?.danger === false ? "primary" : "danger"}
            loading={pending}
            onClick={async () => {
              setPending(true);
              try {
                await held?.run();
              } finally {
                setPending(false);
                onClose();
              }
            }}
          >
            {held?.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const stateTone: Record<ServiceState, StatusTone> = { active: "success", inactive: "neutral", failed: "danger", activating: "info", deactivating: "info", reloading: "info" };

const actionIcon = { start: CirclePlay, stop: CircleStop, restart: ListRestart, reload: RotateCw, enable: Power, disable: Ban } as const;

const dash = <span className="text-muted-foreground">{"—"}</span>;

/* ------------------------------------------------------------------ services */

export interface ServiceUnit {
  id: string;
  /** The unit name, such as `nginx.service`. Stays left-to-right. */
  name: string;
  description?: string;
  state: ServiceState;
  /** Starts at boot. */
  enabled: boolean;
  canReload?: boolean;
  memoryBytes?: number;
  /** When the current state began. */
  since?: DateLike;
}

export interface ServiceUnitsListProps extends Omit<ComponentProps<typeof Card>, "children" | "title"> {
  services: readonly ServiceUnit[];
  /** Run an action. Resolve, or resolve `{ error }` to show it. The host then passes the updated `services`. */
  onAction: (id: string, action: ServiceAction) => Promise<ServerAdminResult>;
  /** Adds View logs to the row menu. */
  onViewLogs?: (id: string) => void;
  loading?: boolean;
  /** Replaces the rows with an error state. */
  error?: ReactNode;
  onRetry?: () => void;
  labels?: Partial<ServerAdminLabels>;
}

/**
 * The systemd units of one server: state, whether they start at boot, memory and uptime, with start, stop, restart, reload and
 * enable or disable in the row menu (also from the context menu). Stopping, restarting and disabling ask first.
 */
export function ServiceUnitsList({ services, onAction, onViewLogs, loading = false, error, onRetry, labels, className, ...props }: ServiceUnitsListProps) {
  const { t } = useServerAdminLabels(labels);
  const runner = useRunner(t.genericError);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const columns = useMemo<DataTableColumn<ServiceUnit>[]>(
    () => [
      {
        id: "service",
        header: t.service,
        label: t.service,
        hideable: false,
        sortValue: (s) => s.name,
        searchValue: (s) => `${s.name} ${s.description ?? ""}`,
        cell: (s) => (
          <div className="flex min-w-0 flex-col">
            <bdi dir="ltr" className="truncate text-start font-mono text-code text-foreground">
              {s.name}
            </bdi>
            {s.description ? (
              <span dir="auto" className="truncate text-caption text-muted-foreground">
                {s.description}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "state",
        header: t.state,
        label: t.state,
        sortValue: (s) => s.state,
        filterValue: (s) => s.state,
        cell: (s) =>
          runner.busy.has(s.id) ? (
            <span className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
              <Spinner /> {t.working}
            </span>
          ) : (
            <Status tone={stateTone[s.state]}>{t.states[s.state]}</Status>
          ),
      },
      {
        id: "boot",
        header: t.boot,
        label: t.boot,
        sortValue: (s) => (s.enabled ? 1 : 0),
        cell: (s) => <Badge variant={s.enabled ? "neutral" : "outline"}>{s.enabled ? t.enabledAtBoot : t.disabledAtBoot}</Badge>,
      },
      {
        id: "memory",
        header: t.memory,
        label: t.memory,
        align: "end",
        sortValue: (s) => s.memoryBytes ?? -1,
        cell: (s) =>
          s.memoryBytes === undefined ? (
            dash
          ) : (
            <bdi dir="ltr" className="tabular-nums">
              {formatBytes(s.memoryBytes)}
            </bdi>
          ),
      },
      {
        id: "since",
        header: t.since,
        label: t.since,
        sortValue: (s) => (s.since === undefined ? null : new Date(s.since)),
        cell: (s) => (s.since === undefined ? dash : <DateTime value={s.since} relative className="text-muted-foreground" />),
      },
    ],
    [t, runner.busy],
  );

  const table = useDataTable({ data: services as ServiceUnit[], columns, getRowId: (s) => s.id, defaultSort: { id: "service", direction: "asc" }, pageSize: 10 });

  function perform(unit: ServiceUnit, action: ServiceAction) {
    const start = () => runner.run([unit.id], () => onAction(unit.id, action));
    if (!isDisruptive(action)) return void start();
    const label = t.actions[action];
    setConfirm({
      title: t.confirmAction(label, unit.name),
      body: action === "stop" ? t.confirmStop : action === "restart" ? t.confirmRestart : t.confirmDisable,
      confirm: label,
      danger: action !== "restart",
      run: start,
    });
  }

  const rowActions = (unit: ServiceUnit): DataTableRowAction[] => {
    const locked = runner.busy.has(unit.id);
    const list: DataTableRowAction[] = serviceActionsFor(unit).map((action) => ({
      id: action,
      label: t.actions[action],
      icon: actionIcon[action],
      disabled: locked,
      danger: action === "stop",
      group: action === "enable" || action === "disable" ? "boot" : "run",
      onSelect: () => perform(unit, action),
    }));
    if (onViewLogs) list.push({ id: "logs", label: t.viewLogs, icon: ServerCog, group: "inspect", onSelect: () => onViewLogs(unit.id) });
    return list;
  };

  return (
    <Card data-slot="service-units" className={cn("w-full", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2">{t.servicesTitle}</CardTitle>
        <CardDescription>{t.servicesDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {runner.error ? (
          <Alert tone="danger" onDismiss={() => runner.setError(null)} dismissLabel={t.dismiss}>
            {runner.error}
          </Alert>
        ) : null}
        <DataTableToolbar>
          <DataTableSearch table={table} placeholder={t.search} />
          <DataTableFacetFilter table={table} column="state" title={t.state} options={(Object.keys(t.states) as ServiceState[]).map((s) => ({ value: s, label: t.states[s] }))} />
        </DataTableToolbar>
        <DataTable
          table={table}
          label={t.servicesTable}
          rowLabel={(s) => s.name}
          loading={loading}
          error={error}
          onRetry={onRetry}
          empty={<EmptyState icon={ServerCog} title={t.servicesEmpty} />}
          rowActions={rowActions}
        />
        <DataTablePagination table={table} />
      </CardContent>
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} cancel={t.cancel} />
    </Card>
  );
}

/* ------------------------------------------------------------------ package updates */

export interface PackageUpdate {
  /** The package name. Stays left-to-right. */
  name: string;
  currentVersion: string;
  newVersion: string;
  kind: PackageKind;
  sizeBytes?: number;
}

export interface PackageUpdatesPanelProps extends Omit<ComponentProps<typeof Card>, "children" | "title"> {
  packages: readonly PackageUpdate[];
  lastCheckedAt?: DateLike | null;
  /** The server must restart to finish an update. */
  rebootRequired?: boolean;
  /** Names of packages being updated now: they show a spinner and cannot be picked. */
  updating?: readonly string[];
  /** A check for new updates is running. */
  checking?: boolean;
  /** Look for new updates. */
  onCheck: () => Promise<ServerAdminResult>;
  /** Install these packages (the rows chosen, or all of them). */
  onUpdate: (names: string[]) => Promise<ServerAdminResult>;
  /** Restart the server. Shows the button when a restart is required. */
  onReboot?: () => Promise<ServerAdminResult>;
  loading?: boolean;
  labels?: Partial<ServerAdminLabels>;
}

const kindBadge: Record<PackageKind, "danger" | "warning" | "outline"> = { security: "danger", kernel: "warning", regular: "outline" };

/**
 * The updates waiting on a server: counts by type (security first), the download size, a table with the current and new version
 * of each package, update selected or update all, a check button, and a banner when the server has to restart.
 */
export function PackageUpdatesPanel({
  packages,
  lastCheckedAt,
  rebootRequired = false,
  updating = [],
  checking = false,
  onCheck,
  onUpdate,
  onReboot,
  loading = false,
  labels,
  className,
  ...props
}: PackageUpdatesPanelProps) {
  const { t } = useServerAdminLabels(labels);
  const runner = useRunner(t.genericError);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const summary = useMemo(() => summarizeUpdates(packages), [packages]);
  const busyNames = useMemo(() => new Set(updating), [updating]);

  const columns = useMemo<DataTableColumn<PackageUpdate>[]>(
    () => [
      {
        id: "package",
        header: t.package,
        label: t.package,
        hideable: false,
        sortValue: (p) => p.name,
        searchValue: (p) => p.name,
        cell: (p) => (
          <bdi dir="ltr" className="inline-flex items-center gap-2 font-mono text-code text-foreground">
            {p.name}
            {busyNames.has(p.name) || runner.busy.has(p.name) ? <Spinner label={t.updating} /> : null}
          </bdi>
        ),
      },
      {
        id: "version",
        header: t.version,
        label: t.version,
        cell: (p) => (
          <bdi dir="ltr" className="font-mono text-code text-muted-foreground">
            {p.currentVersion} {"→"} <span className="text-foreground">{p.newVersion}</span>
          </bdi>
        ),
      },
      {
        id: "kind",
        header: t.kind,
        label: t.kind,
        sortValue: (p) => kindRank(p.kind),
        filterValue: (p) => p.kind,
        cell: (p) => <Badge variant={kindBadge[p.kind]}>{t.kinds[p.kind]}</Badge>,
      },
      {
        id: "size",
        header: t.size,
        label: t.size,
        align: "end",
        sortValue: (p) => p.sizeBytes ?? -1,
        cell: (p) =>
          p.sizeBytes === undefined ? (
            dash
          ) : (
            <bdi dir="ltr" className="tabular-nums">
              {formatBytes(p.sizeBytes)}
            </bdi>
          ),
      },
    ],
    [t, busyNames, runner.busy],
  );

  const table = useDataTable({ data: packages as PackageUpdate[], columns, getRowId: (p) => p.name, selectable: true, defaultSort: { id: "kind", direction: "asc" }, pageSize: 10 });

  const install = (names: string[]) => runner.run(names, () => onUpdate(names));
  const selected = table.selectedRows.filter((p) => !busyNames.has(p.name)).map((p) => p.name);

  return (
    <Card data-slot="package-updates" className={cn("w-full", className)} {...props}>
      <CardHeader className="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle as="h2">{t.packagesTitle}</CardTitle>
          <CardDescription>{t.packagesDescription}</CardDescription>
        </div>
        <CardAction className="mt-3 flex flex-wrap gap-2 sm:mt-0">
          <Button type="button" variant="secondary" loading={checking || runner.busy.has("check")} onClick={() => runner.run(["check"], onCheck)}>
            <RefreshCw aria-hidden />
            {checking ? t.checking : t.checkNow}
          </Button>
          {summary.total > 0 ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => setConfirm({ title: t.updateAllTitle(summary.total), body: t.updateAllBody, confirm: t.updateAll, danger: false, run: () => install(packages.map((p) => p.name)) })}
            >
              <PackageCheck aria-hidden />
              {t.updateAll}
            </Button>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rebootRequired ? (
          <Alert
            tone="warning"
            title={t.rebootTitle}
            action={
              onReboot ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setConfirm({ title: t.rebootConfirmTitle, body: t.rebootConfirmBody, confirm: t.reboot, run: () => runner.run(["reboot"], onReboot) })}
                >
                  <Power aria-hidden />
                  {t.reboot}
                </Button>
              ) : undefined
            }
          >
            {t.rebootBody}
          </Alert>
        ) : null}
        {runner.error ? (
          <Alert tone="danger" onDismiss={() => runner.setError(null)} dismissLabel={t.dismiss}>
            {runner.error}
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-body-sm text-muted-foreground">
          <span className="text-label text-foreground">{t.totalCount(summary.total)}</span>
          {summary.security > 0 ? (
            <Badge variant="danger">
              <ShieldAlert aria-hidden />
              {t.securityCount(summary.security)}
            </Badge>
          ) : null}
          {summary.downloadBytes > 0 ? <span>{t.download(formatBytes(summary.downloadBytes))}</span> : null}
          <span>
            {t.lastChecked}: {lastCheckedAt ? <DateTime value={lastCheckedAt} relative /> : t.neverChecked}
          </span>
        </div>
        <DataTableToolbar>
          <DataTableSearch table={table} placeholder={t.search} />
          <DataTableFacetFilter table={table} column="kind" title={t.kind} options={(Object.keys(t.kinds) as PackageKind[]).map((k) => ({ value: k, label: t.kinds[k] }))} />
        </DataTableToolbar>
        <DataTableBulkActions table={table}>
          <Button type="button" size="sm" variant="primary" disabled={selected.length === 0} onClick={() => void install(selected)}>
            {t.updateSelected}
          </Button>
        </DataTableBulkActions>
        <DataTable
          table={table}
          label={t.packagesTable}
          rowLabel={(p) => p.name}
          loading={loading}
          empty={<EmptyState icon={PackageCheck} title={t.upToDate} description={t.upToDateBody} />}
          rowActions={(p) => [{ id: "update", label: t.updateOne, icon: PackageCheck, disabled: busyNames.has(p.name), onSelect: () => void install([p.name]) }]}
        />
        <DataTablePagination table={table} />
      </CardContent>
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} cancel={t.cancel} />
    </Card>
  );
}

/* ------------------------------------------------------------------ ssh keys */

export interface SshServer {
  id: string;
  name: string;
}

export interface SshKeyRecord {
  id: string;
  name: string;
  type: SshKeyType;
  /** For example `SHA256:uNiVztksCsDhcc0u9e8BujQXVUpKZIDTMczCvj3tD2s`. */
  fingerprint: string;
  comment?: string;
  addedAt: DateLike;
  lastUsedAt?: DateLike | null;
  /** Ids of the servers the key is installed on. */
  installedOn: readonly string[];
}

export interface SshKeyInput {
  name: string;
  /** The public key line. */
  publicKey: string;
}

export interface SshKeyManagerProps extends Omit<ComponentProps<typeof Card>, "children" | "title"> {
  servers: readonly SshServer[];
  keys: readonly SshKeyRecord[];
  /** Install (`installed: true`) or remove a key on one server. The host then passes the updated `keys`. */
  onInstallChange: (keyId: string, serverId: string, installed: boolean) => Promise<ServerAdminResult>;
  /** Save a new public key. */
  onAdd: (input: SshKeyInput) => Promise<ServerAdminResult>;
  /** Delete a key everywhere. Adds Delete to the row menu. */
  onRemove?: (keyId: string) => Promise<ServerAdminResult>;
  loading?: boolean;
  labels?: Partial<ServerAdminLabels>;
}

function AddKeyDialog({ open, onOpenChange, onAdd, t }: { open: boolean; onOpenChange: (open: boolean) => void; onAdd: SshKeyManagerProps["onAdd"]; t: ServerAdminLabels }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setName("");
      setText("");
      setTouched(false);
      setError(null);
    }
  }, [open]);
  const parsed = parseSshPublicKey(text);
  const nameError = touched && name.trim() === "";
  const keyError = touched && !parsed.ok ? t.keyProblems[parsed.problem] : null;
  // A private key is dangerous enough to warn about the moment it is pasted, not only on submit.
  const privateKey = !parsed.ok && parsed.problem === "private" ? t.keyProblems.private : null;

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    setTouched(true);
    if (!name.trim() || !parsed.ok) return;
    setPending(true);
    setError(null);
    try {
      const result = await onAdd({ name: name.trim(), publicKey: text.trim() });
      if (result && result.error) setError(result.error);
      else onOpenChange(false);
    } catch {
      setError(t.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent data-slot="ssh-key-add" className="max-w-lg">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t.addKeyTitle}</DialogTitle>
            <DialogDescription>{t.addKeyBody}</DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          {privateKey ? <Alert tone="danger">{privateKey}</Alert> : null}
          <Field invalid={nameError}>
            <FieldLabel>{t.keyName}</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.keyNamePlaceholder} autoComplete="off" />
            {nameError ? <FieldError match>{t.keyNameRequired}</FieldError> : null}
          </Field>
          <Field invalid={keyError !== null && !privateKey}>
            <FieldLabel>{t.publicKey}</FieldLabel>
            <Textarea
              dir="ltr"
              rows={4}
              spellCheck={false}
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ssh-ed25519 AAAAC3Nza… you@laptop"
              className="text-start font-mono text-code"
            />
            {keyError && !privateKey ? <FieldError match>{keyError}</FieldError> : null}
            {parsed.ok ? <FieldDescription>{t.keyDetected(parsed.type, parsed.comment)}</FieldDescription> : null}
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t.addKey}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Which SSH keys can sign in to which servers: one row per key, one column per server, a checkbox in each cell. A checkbox
 * installs or removes the key on that server. The row menu (also from the context menu) installs a key everywhere, removes it
 * everywhere, or deletes it. Adding a key checks that it is a public key and never accepts a private one.
 */
export function SshKeyManager({ servers, keys, onInstallChange, onAdd, onRemove, loading = false, labels, className, ...props }: SshKeyManagerProps) {
  const { t } = useServerAdminLabels(labels);
  const runner = useRunner(t.genericError);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const serverIds = useMemo(() => servers.map((s) => s.id), [servers]);

  const columns = useMemo<DataTableColumn<SshKeyRecord>[]>(
    () => [
      {
        id: "key",
        header: t.sshKey,
        label: t.sshKey,
        hideable: false,
        sortValue: (k) => k.name,
        searchValue: (k) => `${k.name} ${k.fingerprint} ${k.comment ?? ""}`,
        cell: (k) => (
          <div className="flex min-w-0 flex-col">
            <span dir="auto" className="flex items-center gap-2 text-label text-foreground">
              <KeyRound aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{k.name}</span>
              <Badge variant="outline">{k.type}</Badge>
            </span>
            <bdi dir="ltr" title={k.fingerprint} className="truncate text-start font-mono text-caption text-muted-foreground">
              {shortFingerprint(k.fingerprint)}
            </bdi>
          </div>
        ),
      },
      {
        id: "coverage",
        header: t.sshServers,
        label: t.sshServers,
        sortValue: (k) => keyCoverage(k.installedOn, serverIds).installed,
        cell: (k) => {
          const c = keyCoverage(k.installedOn, serverIds);
          return <Badge variant={c.level === "all" ? "success" : c.level === "none" ? "outline" : "neutral"}>{t.sshCoverage(c.installed, c.total)}</Badge>;
        },
      },
      ...servers.map<DataTableColumn<SshKeyRecord>>((server) => ({
        id: `server:${server.id}`,
        header: <bdi dir="auto">{server.name}</bdi>,
        label: server.name,
        align: "center",
        headerClassName: "whitespace-nowrap",
        cell: (k) => {
          const installed = k.installedOn.includes(server.id);
          const cellKey = `${k.id}:${server.id}`;
          return (
            <Checkbox
              checked={installed}
              disabled={runner.busy.has(cellKey)}
              aria-label={t.installedOn(k.name, server.name)}
              onCheckedChange={(next) => void runner.run([cellKey], () => onInstallChange(k.id, server.id, next === true))}
            />
          );
        },
      })),
      {
        id: "added",
        header: t.addedOn,
        label: t.addedOn,
        defaultHidden: true,
        sortValue: (k) => new Date(k.addedAt),
        cell: (k) => <DateTime value={k.addedAt} format={{ dateStyle: "medium" }} className="text-muted-foreground" />,
      },
      {
        id: "used",
        header: t.lastUsed,
        label: t.lastUsed,
        defaultHidden: true,
        sortValue: (k) => (k.lastUsedAt ? new Date(k.lastUsedAt) : null),
        cell: (k) => (k.lastUsedAt ? <DateTime value={k.lastUsedAt} relative className="text-muted-foreground" /> : <span className="text-muted-foreground">{t.never}</span>),
      },
    ],
    [t, servers, serverIds, runner.busy, onInstallChange],
  );

  const table = useDataTable({ data: keys as SshKeyRecord[], columns, getRowId: (k) => k.id, defaultSort: { id: "key", direction: "asc" } });

  function setEverywhere(key: SshKeyRecord, installed: boolean) {
    const todo = serverIds.filter((id) => key.installedOn.includes(id) !== installed);
    if (todo.length === 0) return;
    void runner.run(
      todo.map((id) => `${key.id}:${id}`),
      async () => {
        for (const id of todo) {
          const result = await onInstallChange(key.id, id, installed);
          if (result && result.error) return result;
        }
      },
    );
  }

  const rowActions = (key: SshKeyRecord): DataTableRowAction[] => {
    const c = keyCoverage(key.installedOn, serverIds);
    const list: DataTableRowAction[] = [];
    if (c.level !== "all") list.push({ id: "all", label: t.installOnAll, icon: Plus, group: "install", onSelect: () => setEverywhere(key, true) });
    if (c.level !== "none") list.push({ id: "none", label: t.removeFromAll, icon: Undo2, group: "install", onSelect: () => setEverywhere(key, false) });
    if (onRemove)
      list.push({
        id: "delete",
        label: t.deleteKey,
        icon: Trash2,
        danger: true,
        group: "danger",
        onSelect: () => setConfirm({ title: t.deleteKeyTitle(key.name), body: t.deleteKeyBody, confirm: t.deleteKey, run: () => runner.run([key.id], () => onRemove(key.id)) }),
      });
    return list;
  };

  return (
    <Card data-slot="ssh-key-manager" className={cn("w-full", className)} {...props}>
      <CardHeader className="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle as="h2">{t.sshTitle}</CardTitle>
          <CardDescription>{t.sshDescription}</CardDescription>
        </div>
        <Button type="button" variant="primary" className="mt-3 sm:mt-0" onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          {t.addKey}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {runner.error ? (
          <Alert tone="danger" onDismiss={() => runner.setError(null)} dismissLabel={t.dismiss}>
            {runner.error}
          </Alert>
        ) : null}
        <DataTable
          table={table}
          label={t.sshTable}
          rowLabel={(k) => k.name}
          loading={loading}
          empty={<EmptyState icon={KeyRound} title={t.noKeys} description={t.noKeysBody} />}
          rowActions={rowActions}
        />
      </CardContent>
      <AddKeyDialog open={adding} onOpenChange={setAdding} onAdd={onAdd} t={t} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} cancel={t.cancel} />
    </Card>
  );
}

/* ------------------------------------------------------------------ job queue */

export interface QueueJob {
  id: string;
  /** The job class or name, such as `SendInvoiceEmail`. Stays left-to-right. */
  name: string;
  queue: string;
  status: JobStatus;
  attempts: number;
  maxAttempts?: number;
  /** When it was queued, started or failed. */
  at: DateLike;
  /** The error message, first line first. A stack trace can follow. */
  error?: string;
  /** The job payload as text, usually JSON. */
  payload?: string;
}

export interface JobQueueMonitorProps extends Omit<ComponentProps<typeof Card>, "children" | "title"> {
  jobs: readonly QueueJob[];
  /** Put failed jobs back in the queue. */
  onRetry: (ids: string[]) => Promise<ServerAdminResult>;
  /** Remove jobs from the queue and the history. Shows Forget. */
  onForget?: (ids: string[]) => Promise<ServerAdminResult>;
  loading?: boolean;
  error?: ReactNode;
  /** Try loading the list again, after `error`. */
  onRetryLoad?: () => void;
  labels?: Partial<ServerAdminLabels>;
}

const jobTone: Record<JobStatus, StatusTone> = { waiting: "neutral", active: "info", delayed: "warning", completed: "success", failed: "danger" };

/**
 * A queue monitor: a count per status that filters the list, a table of jobs with queue, attempts and the first line of the
 * error, and retry and forget for one job, a selection or everything that failed. A dialog shows the full error and payload.
 */
export function JobQueueMonitor({ jobs, onRetry, onForget, loading = false, error, onRetryLoad, labels, className, ...props }: JobQueueMonitorProps) {
  const { t } = useServerAdminLabels(labels);
  const runner = useRunner(t.genericError);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [detail, setDetail] = useState<QueueJob | null>(null);
  const counts = useMemo(() => jobCounts(jobs), [jobs]);
  const shown = useMemo(() => (status ? jobs.filter((j) => j.status === status) : jobs), [jobs, status]);
  const queues = useMemo(() => [...new Set(jobs.map((j) => j.queue))].sort(), [jobs]);

  const columns = useMemo<DataTableColumn<QueueJob>[]>(
    () => [
      {
        id: "job",
        header: t.job,
        label: t.job,
        hideable: false,
        sortValue: (j) => j.name,
        searchValue: (j) => `${j.name} ${j.id} ${j.error ?? ""}`,
        cell: (j) => (
          <div className="flex min-w-0 flex-col">
            <bdi dir="ltr" className="truncate text-start font-mono text-code text-foreground">
              {j.name}
            </bdi>
            {j.error ? (
              <bdi dir="ltr" className="truncate text-start text-caption text-nq-danger-text">
                {errorHeadline(j.error)}
              </bdi>
            ) : (
              <bdi dir="ltr" className="text-start font-mono text-caption text-muted-foreground">
                {j.id}
              </bdi>
            )}
          </div>
        ),
      },
      {
        id: "queue",
        header: t.queue,
        label: t.queue,
        sortValue: (j) => j.queue,
        filterValue: (j) => j.queue,
        cell: (j) => (
          <Badge variant="outline" dir="ltr">
            {j.queue}
          </Badge>
        ),
      },
      { id: "status", header: t.status, label: t.status, sortValue: (j) => j.status, cell: (j) => <Status tone={jobTone[j.status]}>{t.jobStatuses[j.status]}</Status> },
      {
        id: "attempts",
        header: t.attempts,
        label: t.attempts,
        align: "end",
        sortValue: (j) => j.attempts,
        cell: (j) => <Num value={j.attempts} className="text-muted-foreground" />,
      },
      { id: "when", header: t.when, label: t.when, sortValue: (j) => new Date(j.at), cell: (j) => <DateTime value={j.at} relative className="text-muted-foreground" /> },
    ],
    [t],
  );

  const table = useDataTable({ data: shown as QueueJob[], columns, getRowId: (j) => j.id, selectable: true, defaultSort: { id: "when", direction: "desc" }, pageSize: 10 });

  const retry = (ids: string[]) => runner.run(ids, () => onRetry(ids));
  function askForget(ids: string[]) {
    if (!onForget || ids.length === 0) return;
    setConfirm({ title: t.forgetTitle(ids.length), body: t.forgetBody, confirm: t.forget, run: () => runner.run(ids, () => onForget(ids)) });
  }
  function askRetry(ids: string[]) {
    if (ids.length === 0) return;
    setConfirm({ title: t.retryTitle(ids.length), body: t.retryBody, confirm: t.retry, danger: false, run: () => retry(ids) });
  }

  const failedIds = useMemo(() => jobs.filter((j) => j.status === "failed").map((j) => j.id), [jobs]);
  const selected = table.selectedRows;
  const retryable = selected.filter((j) => canRetryJob(j.status)).map((j) => j.id);
  const forgettable = selected.filter((j) => canForgetJob(j.status)).map((j) => j.id);

  return (
    <Card data-slot="job-queue-monitor" className={cn("w-full", className)} {...props}>
      <CardHeader className="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle as="h2">{t.jobsTitle}</CardTitle>
          <CardDescription>{t.jobsDescription}</CardDescription>
        </div>
        {failedIds.length > 0 ? (
          <CardAction className="mt-3 flex flex-wrap gap-2 sm:mt-0">
            <Button type="button" variant="secondary" onClick={() => askRetry(failedIds)}>
              <RotateCw aria-hidden />
              {t.retryFailed}
            </Button>
            {onForget ? (
              <Button type="button" variant="ghost" onClick={() => askForget(failedIds)}>
                <Trash2 aria-hidden />
                {t.forgetFailed}
              </Button>
            ) : null}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div role="group" aria-label={t.statusGroup} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {JOB_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(status === s ? null : s)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-control border border-border bg-card px-3 py-2 text-start outline-none transition-colors hover:bg-nq-hover",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                status === s && "border-primary ring-1 ring-primary",
              )}
            >
              <span className="text-h3 tabular-nums text-foreground">
                <Num value={counts[s]} />
              </span>
              <Status tone={jobTone[s]}>{t.jobStatuses[s]}</Status>
            </button>
          ))}
        </div>
        {runner.error ? (
          <Alert tone="danger" onDismiss={() => runner.setError(null)} dismissLabel={t.dismiss}>
            {runner.error}
          </Alert>
        ) : null}
        <DataTableToolbar>
          <DataTableSearch table={table} placeholder={t.search} />
          {queues.length > 1 ? <DataTableFacetFilter table={table} column="queue" title={t.queueFilter} options={queues.map((q) => ({ value: q, label: q }))} /> : null}
        </DataTableToolbar>
        <DataTableBulkActions table={table}>
          <Button type="button" size="sm" variant="secondary" disabled={retryable.length === 0} onClick={() => askRetry(retryable)}>
            {t.retry}
          </Button>
          {onForget ? (
            <Button type="button" size="sm" variant="ghost" disabled={forgettable.length === 0} onClick={() => askForget(forgettable)}>
              {t.forget}
            </Button>
          ) : null}
        </DataTableBulkActions>
        <DataTable
          table={table}
          label={t.jobsTable}
          rowLabel={(j) => j.name}
          loading={loading}
          error={error}
          onRetry={onRetryLoad}
          onRowClick={(j) => setDetail(j)}
          empty={<EmptyState icon={Cpu} title={t.jobsEmpty} />}
          rowActions={(j) => [
            { id: "details", label: t.details, icon: ServerCog, group: "inspect", onSelect: () => setDetail(j) },
            ...(canRetryJob(j.status) ? [{ id: "retry", label: t.retry, icon: RotateCw, group: "run", disabled: runner.busy.has(j.id), onSelect: () => void retry([j.id]) }] : []),
            ...(onForget && canForgetJob(j.status) ? [{ id: "forget", label: t.forget, icon: Trash2, danger: true, group: "danger", disabled: runner.busy.has(j.id), onSelect: () => askForget([j.id]) }] : []),
          ]}
        />
        <DataTablePagination table={table} />
      </CardContent>
      <JobDialog job={detail} onClose={() => setDetail(null)} t={t} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} cancel={t.cancel} />
    </Card>
  );
}

function JobDialog({ job, onClose, t }: { job: QueueJob | null; onClose: () => void; t: ServerAdminLabels }) {
  const [held, setHeld] = useState<QueueJob | null>(job);
  useEffect(() => {
    if (job) setHeld(job);
  }, [job]);
  return (
    <Dialog open={job !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-slot="job-detail" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <bdi dir="ltr">{held?.name}</bdi>
          </DialogTitle>
          <DialogDescription>
            {held ? (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Status tone={jobTone[held.status]}>{t.jobStatuses[held.status]}</Status>
                <bdi dir="ltr" className="font-mono text-caption">
                  {held.queue} / {held.id}
                </bdi>
                <span>
                  {t.attempts}: {held.maxAttempts ? t.of(held.attempts, held.maxAttempts) : held.attempts}
                </span>
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        {held?.error ? <CodeBlock code={held.error} language="text" label={t.errorLabel} filename={t.errorLabel} preClassName="max-h-64" /> : <p className="text-body-sm text-muted-foreground">{t.noError}</p>}
        {held?.payload ? <CodeBlock code={held.payload} language="json" label={t.payloadLabel} filename={t.payloadLabel} preClassName="max-h-48" /> : null}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
