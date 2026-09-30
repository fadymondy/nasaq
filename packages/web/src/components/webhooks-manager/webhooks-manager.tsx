"use client";

import { Antenna, Globe, KeyRound, Pencil, RefreshCw, RotateCw, Send, Trash2, Webhook } from "lucide-react";
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
import { CopyField } from "../copy-button";
import { type DataTableColumn, type DataTableRowAction, DataTable, DataTableFacetFilter, DataTablePagination, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { DateTime, Num } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";
import { Switch } from "../switch";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";
import {
  type DeliveryStatus,
  type EndpointField,
  POLL_INTERVALS,
  canReplay,
  groupEvents,
  groupState,
  isSourceStale,
  maskSecret,
  pollUnit,
  prettyJson,
  setEvents,
  validateEndpoint,
  validateEndpointUrl,
  verifySnippet,
} from "./webhooks-format";

export { canReplay, deliveryStats, deliveryStatus, groupEvents, groupState, isSourceStale, isSuccessCode, maskSecret, pollUnit, prettyJson, setEvents, validateEndpoint, validateEndpointUrl, verifySnippet } from "./webhooks-format";
export type { DeliveryStats, DeliveryStatus, EndpointDraft, EndpointField, EventInfo, GroupState, UrlProblem } from "./webhooks-format";

const STRINGS = {
  en: {
    genericError: "Something went wrong. Try again.",
    cancel: "Cancel",
    dismiss: "Dismiss",
    done: "Done",
    title: "Webhooks",
    description: "Send events to other systems and receive events from them.",
    tabEndpoints: "Endpoints",
    tabDeliveries: "Deliveries",
    tabInbound: "Inbound",
    // endpoints
    endpointsTitle: "Endpoints",
    endpointsDescription: "Where events are sent. Each request is signed with the endpoint secret.",
    endpointsTable: "Webhook endpoints",
    search: "Search…",
    endpoint: "Endpoint",
    channel: "Channel",
    events: "Events",
    allEvents: "All events",
    eventsCount: (n: number) => (n === 1 ? "1 event" : `${n} events`),
    enabled: "Enabled",
    disabled: "Paused",
    secret: "Secret",
    lastDelivery: "Last delivery",
    never: "Never",
    endpointsEmpty: "No endpoints yet",
    endpointsEmptyBody: "Add an endpoint to start sending events.",
    addEndpoint: "Add endpoint",
    editEndpoint: "Edit",
    test: "Send test",
    testing: "Sending…",
    testOk: (name: string, code: string, ms: string) => `Test to ${name} succeeded. Status ${code} in ${ms} ms.`,
    testFail: (name: string, detail: string) => `Test to ${name} failed. ${detail}`,
    rotate: "Rotate secret",
    rotateTitle: (name: string) => `Rotate the secret of ${name}?`,
    rotateBody: "The old secret stops working at once. Update your receiver with the new one.",
    rotateConfirm: "Rotate secret",
    delete: "Delete",
    deleteTitle: (name: string) => `Delete ${name}?`,
    deleteBody: "Events stop being sent to it and its delivery history is removed.",
    toggleLabel: (name: string) => `Send events to ${name}`,
    // endpoint dialog
    createTitle: "Add an endpoint",
    editTitle: "Edit endpoint",
    nameLabel: "Name",
    namePlaceholder: "Order updates",
    nameRequired: "Enter a name.",
    urlLabel: "URL",
    urlPlaceholder: "https://example.com/hooks/nasaq",
    urlProblems: {
      empty: "Enter a URL.",
      invalid: "Enter a full URL such as https://example.com/hook.",
      insecure: "Use https. Plain http works only for localhost.",
      credentials: "Remove the user name and password from the URL.",
    },
    channelLabel: "Channel",
    channelPlaceholder: "Slack, Discord, Custom HTTP",
    channelHint: "A name for where this goes. Text only.",
    eventsLabel: "Events",
    eventsRequired: "Pick at least one event.",
    selectAll: "All",
    save: "Save",
    create: "Create endpoint",
    // reveal
    revealTitle: "Signing secret",
    revealBody: "Copy the secret now. It is shown once and cannot be recovered.",
    revealAlert: "Store it in your receiver's configuration. If you lose it, rotate the secret.",
    secretLabel: "Signing secret",
    verifyTitle: "Verify the signature",
    verifyBody: "Sign the raw request body with the secret and compare it to the X-Signature header.",
    // deliveries
    deliveriesTitle: "Delivery log",
    deliveriesDescription: "Every attempt with its response. Send a failed one again.",
    deliveriesTable: "Webhook deliveries",
    status: "Status",
    statuses: { success: "Delivered", failed: "Failed", pending: "Pending" } as Record<DeliveryStatus, string>,
    event: "Event",
    response: "Response",
    duration: "Time",
    when: "When",
    attempt: "Attempt",
    allEndpoints: "All endpoints",
    deliveriesEmpty: "No deliveries yet",
    replay: "Send again",
    replaying: "Sending…",
    view: "Details",
    replayed: (name: string) => `Sent again to ${name}.`,
    detailTitle: "Delivery",
    request: "Request body",
    responseBody: "Response body",
    error: "Error",
    noBody: "Nothing recorded.",
    close: "Close",
    ms: "ms",
    // inbound
    inboundTitle: "Inbound sources",
    inboundDescription: "Systems polled for new events.",
    inboundTable: "Inbound sources",
    source: "Source",
    interval: "Poll every",
    intervals: (seconds: number) => {
      const { value, unit } = pollUnit(seconds);
      const plural = value === 1 ? "" : "s";
      return `${value} ${unit}${plural}`;
    },
    lastStatus: "Last status",
    lastPolled: "Last polled",
    sourceOk: "Healthy",
    sourceError: "Failing",
    sourceNever: "Not polled yet",
    sourceStale: "Late",
    pollNow: "Poll now",
    polling: "Polling…",
    polled: (name: string) => `Polled ${name}.`,
    inboundEmpty: "No inbound sources",
    intervalLabel: (name: string) => `Poll interval for ${name}`,
    // push
    pushTitle: "Push endpoint",
    pushBody: "Send events to this URL from another system. The token is shown once.",
    pushUrl: "URL",
    pushToken: "Token",
    pushDismiss: "I have saved it",
    pushAlert: "Save the token now. After you dismiss this card it cannot be shown again.",
  },
  ar: {
    genericError: "حدث خطأ. حاول مرة أخرى.",
    cancel: "إلغاء",
    dismiss: "إغلاق",
    done: "تم",
    title: "الويب هوك",
    description: "أرسل الأحداث إلى أنظمة أخرى واستقبل الأحداث منها.",
    tabEndpoints: "نقاط الإرسال",
    tabDeliveries: "عمليات التسليم",
    tabInbound: "الوارد",
    endpointsTitle: "نقاط الإرسال",
    endpointsDescription: "المكان الذي تُرسل إليه الأحداث. كل طلب موقّع بسرّ النقطة.",
    endpointsTable: "نقاط إرسال الويب هوك",
    search: "بحث…",
    endpoint: "النقطة",
    channel: "القناة",
    events: "الأحداث",
    allEvents: "كل الأحداث",
    eventsCount: (n: number) => (n === 1 ? "حدث واحد" : `${n} أحداث`),
    enabled: "مفعّلة",
    disabled: "متوقفة",
    secret: "السر",
    lastDelivery: "آخر تسليم",
    never: "أبدًا",
    endpointsEmpty: "لا توجد نقاط بعد",
    endpointsEmptyBody: "أضف نقطة لتبدأ إرسال الأحداث.",
    addEndpoint: "إضافة نقطة",
    editEndpoint: "تعديل",
    test: "إرسال تجربة",
    testing: "جارٍ الإرسال…",
    testOk: (name: string, code: string, ms: string) => `نجحت التجربة إلى ${name}. الحالة ${code} خلال ${ms} مللي ثانية.`,
    testFail: (name: string, detail: string) => `فشلت التجربة إلى ${name}. ${detail}`,
    rotate: "تدوير السر",
    rotateTitle: (name: string) => `تدوير سر ${name}؟`,
    rotateBody: "يتوقف السر القديم فورًا. حدّث المستقبِل بالسر الجديد.",
    rotateConfirm: "تدوير السر",
    delete: "حذف",
    deleteTitle: (name: string) => `حذف ${name}؟`,
    deleteBody: "تتوقف الأحداث عن الإرسال إليها ويُحذف سجل التسليم.",
    toggleLabel: (name: string) => `إرسال الأحداث إلى ${name}`,
    createTitle: "إضافة نقطة إرسال",
    editTitle: "تعديل النقطة",
    nameLabel: "الاسم",
    namePlaceholder: "تحديثات الطلبات",
    nameRequired: "أدخل اسمًا.",
    urlLabel: "الرابط",
    urlPlaceholder: "https://example.com/hooks/nasaq",
    urlProblems: {
      empty: "أدخل رابطًا.",
      invalid: "أدخل رابطًا كاملًا مثل https://example.com/hook.",
      insecure: "استخدم https. الـ http العادي يعمل مع localhost فقط.",
      credentials: "أزل اسم المستخدم وكلمة المرور من الرابط.",
    },
    channelLabel: "القناة",
    channelPlaceholder: "Slack، Discord، HTTP مخصص",
    channelHint: "اسم للوجهة. نص فقط.",
    eventsLabel: "الأحداث",
    eventsRequired: "اختر حدثًا واحدًا على الأقل.",
    selectAll: "الكل",
    save: "حفظ",
    create: "إنشاء النقطة",
    revealTitle: "سر التوقيع",
    revealBody: "انسخ السر الآن. يظهر مرة واحدة ولا يمكن استرجاعه.",
    revealAlert: "احفظه في إعدادات المستقبِل. إذا فقدته فدوّر السر.",
    secretLabel: "سر التوقيع",
    verifyTitle: "التحقق من التوقيع",
    verifyBody: "وقّع نص الطلب الخام بالسر وقارنه بترويسة X-Signature.",
    deliveriesTitle: "سجل التسليم",
    deliveriesDescription: "كل محاولة مع ردّها. أعد إرسال ما فشل.",
    deliveriesTable: "عمليات تسليم الويب هوك",
    status: "الحالة",
    statuses: { success: "تم التسليم", failed: "فشل", pending: "قيد الانتظار" } as Record<DeliveryStatus, string>,
    event: "الحدث",
    response: "الرد",
    duration: "الزمن",
    when: "الوقت",
    attempt: "المحاولة",
    allEndpoints: "كل النقاط",
    deliveriesEmpty: "لا توجد عمليات تسليم بعد",
    replay: "إعادة الإرسال",
    replaying: "جارٍ الإرسال…",
    view: "التفاصيل",
    replayed: (name: string) => `أُعيد الإرسال إلى ${name}.`,
    detailTitle: "عملية التسليم",
    request: "نص الطلب",
    responseBody: "نص الرد",
    error: "الخطأ",
    noBody: "لم يُسجَّل شيء.",
    close: "إغلاق",
    ms: "مللي ثانية",
    inboundTitle: "المصادر الواردة",
    inboundDescription: "أنظمة يُستعلم منها عن أحداث جديدة.",
    inboundTable: "المصادر الواردة",
    source: "المصدر",
    interval: "الاستعلام كل",
    intervals: (seconds: number) => {
      const { value, unit } = pollUnit(seconds);
      const names = { second: "ثانية", minute: "دقيقة", hour: "ساعة" } as const;
      return `${value} ${names[unit]}`;
    },
    lastStatus: "آخر حالة",
    lastPolled: "آخر استعلام",
    sourceOk: "سليم",
    sourceError: "يفشل",
    sourceNever: "لم يُستعلم بعد",
    sourceStale: "متأخر",
    pollNow: "استعلم الآن",
    polling: "جارٍ الاستعلام…",
    polled: (name: string) => `تم الاستعلام من ${name}.`,
    inboundEmpty: "لا توجد مصادر واردة",
    intervalLabel: (name: string) => `فترة الاستعلام لـ ${name}`,
    pushTitle: "نقطة الاستقبال",
    pushBody: "أرسل الأحداث إلى هذا الرابط من نظام آخر. الرمز يظهر مرة واحدة.",
    pushUrl: "الرابط",
    pushToken: "الرمز",
    pushDismiss: "لقد حفظته",
    pushAlert: "احفظ الرمز الآن. بعد إغلاق هذه البطاقة لا يمكن عرضه مجددًا.",
  },
};

export type WebhooksManagerLabels = typeof STRINGS.en;
export type WebhooksResult = void | { error?: string };
/** Save and rotate can return the new signing secret. It is shown once. */
export type WebhooksSecretResult = void | { error?: string; secret?: string };

export interface WebhookEvent {
  id: string;
  /** Localised name. */
  label: string;
  /** Group heading such as "Orders". */
  group?: string;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  /** Where it goes, as text: "Slack", "Custom HTTP". No logos. */
  channel?: string;
  /** Event ids. Empty means none; list them all for "all events". */
  events: readonly string[];
  enabled: boolean;
  /** Last four characters of the secret, for the masked display. */
  secretLast4: string;
  lastDeliveryAt?: Date | number | string;
  lastDeliveryStatus?: DeliveryStatus;
}

export interface EndpointInput {
  /** Set when editing. */
  id?: string;
  name: string;
  url: string;
  channel: string;
  events: string[];
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  status: DeliveryStatus;
  /** HTTP status of the response. */
  code?: number;
  durationMs?: number;
  at: Date | number | string;
  attempt: number;
  request?: string;
  response?: string;
  error?: string;
}

export interface WebhookTestResult {
  ok: boolean;
  code?: number;
  durationMs?: number;
  error?: string;
}

export interface InboundSource {
  id: string;
  name: string;
  /** Where it is polled, text or URL. */
  target?: string;
  intervalSeconds: number;
  lastStatus?: "ok" | "error";
  lastAt?: Date | number | string;
  lastError?: string;
}

export interface PushEndpoint {
  url: string;
  token: string;
}

export interface WebhooksManagerProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  /** The events that can be subscribed to. */
  events: readonly WebhookEvent[];
  endpoints: readonly WebhookEndpoint[];
  deliveries?: readonly WebhookDelivery[];
  sources?: readonly InboundSource[];
  /** When set, a card shows the push endpoint and its token once. */
  pushEndpoint?: PushEndpoint | null;
  onDismissPush?: () => void;
  /** Creates or updates an endpoint. On create, return `{ secret }` to show it once. */
  onSaveEndpoint: (input: EndpointInput) => Promise<WebhooksSecretResult> | WebhooksSecretResult;
  onDeleteEndpoint: (id: string) => Promise<WebhooksResult> | WebhooksResult;
  onToggleEndpoint?: (id: string, enabled: boolean) => Promise<WebhooksResult> | WebhooksResult;
  /** Rotates the secret. Return `{ secret }` to show the new one once. */
  onRotateSecret?: (id: string) => Promise<WebhooksSecretResult> | WebhooksSecretResult;
  /** Sends a test event to one endpoint. */
  onTest?: (id: string) => Promise<WebhookTestResult> | WebhookTestResult;
  onReplay?: (deliveryId: string) => Promise<WebhooksResult> | WebhooksResult;
  onSetInterval?: (sourceId: string, seconds: number) => Promise<WebhooksResult> | WebhooksResult;
  onPollNow?: (sourceId: string) => Promise<WebhooksResult> | WebhooksResult;
  loading?: boolean;
  labels?: Partial<WebhooksManagerLabels>;
}

const statusTone: Record<DeliveryStatus, StatusTone> = { success: "success", failed: "danger", pending: "info" };
const dash = <span className="text-muted-foreground">{"—"}</span>;

interface Confirm {
  title: string;
  body: string;
  confirm: string;
  danger: boolean;
  run: () => Promise<void> | void;
}

interface Reveal {
  title: string;
  secret: string;
}

/**
 * Webhooks in one place: endpoints (URL, channel as text, events, enabled, masked signing secret) with a create and edit
 * dialog, a per-endpoint test, secret rotation and a delete that asks first; a delivery log with endpoint and status filters,
 * a detail dialog and replay; inbound sources with a poll interval, last status and Poll now; and a push endpoint card that
 * shows its token once. A new or rotated secret is revealed once with a snippet for verifying the signature.
 */
export function WebhooksManager({
  events,
  endpoints,
  deliveries = [],
  sources = [],
  pushEndpoint,
  onDismissPush,
  onSaveEndpoint,
  onDeleteEndpoint,
  onToggleEndpoint,
  onRotateSecret,
  onTest,
  onReplay,
  onSetInterval,
  onPollNow,
  loading = false,
  labels,
  className,
  ...props
}: WebhooksManagerProps) {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as WebhooksManagerLabels;

  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function run<T>(key: string, task: () => Promise<T> | T): Promise<T | undefined> {
    setFailure(null);
    setBusy((b) => new Set([...b, key]));
    try {
      return await task();
    } catch {
      if (mounted.current) setFailure(t.genericError);
      return undefined;
    } finally {
      if (mounted.current)
        setBusy((b) => {
          const next = new Set(b);
          next.delete(key);
          return next;
        });
    }
  }
  const fail = (result: { error?: string } | void) => {
    if (result && result.error) {
      setFailure(result.error);
      return true;
    }
    return false;
  };

  const [editing, setEditing] = useState<WebhookEndpoint | "new" | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [detail, setDetail] = useState<WebhookDelivery | null>(null);
  const [endpointFilter, setEndpointFilter] = useState("all");

  const endpointName = (id: string) => endpoints.find((e) => e.id === id)?.name ?? id;

  const endpointColumns = useMemo<DataTableColumn<WebhookEndpoint>[]>(
    () => [
      {
        id: "endpoint",
        header: t.endpoint,
        label: t.endpoint,
        hideable: false,
        sortValue: (e) => e.name,
        searchValue: (e) => `${e.name} ${e.url} ${e.channel ?? ""}`,
        cell: (e) => (
          <div className="flex min-w-0 flex-col">
            <span dir="auto" className="truncate font-medium text-foreground">
              {e.name}
            </span>
            <bdi dir="ltr" className="truncate text-start font-mono text-caption text-muted-foreground">
              {e.url}
            </bdi>
          </div>
        ),
      },
      { id: "channel", header: t.channel, label: t.channel, sortValue: (e) => e.channel ?? "", cell: (e) => (e.channel ? <Badge variant="tag">{e.channel}</Badge> : dash) },
      {
        id: "events",
        header: t.events,
        label: t.events,
        sortValue: (e) => e.events.length,
        cell: (e) => (e.events.length > 0 && e.events.length === events.length ? t.allEvents : t.eventsCount(e.events.length)),
      },
      {
        id: "secret",
        header: t.secret,
        label: t.secret,
        defaultHidden: true,
        cell: (e) => (
          <bdi dir="ltr" className="font-mono text-code text-muted-foreground">
            {maskSecret(e.secretLast4)}
          </bdi>
        ),
      },
      {
        id: "last",
        header: t.lastDelivery,
        label: t.lastDelivery,
        sortValue: (e) => (e.lastDeliveryAt === undefined ? null : new Date(e.lastDeliveryAt)),
        cell: (e) =>
          e.lastDeliveryAt === undefined ? (
            <span className="text-muted-foreground">{t.never}</span>
          ) : (
            <span className="inline-flex items-center gap-2">
              {e.lastDeliveryStatus ? <Status tone={statusTone[e.lastDeliveryStatus]}>{t.statuses[e.lastDeliveryStatus]}</Status> : null}
              <DateTime value={e.lastDeliveryAt} relative className="text-muted-foreground" />
            </span>
          ),
      },
      {
        id: "enabled",
        header: t.enabled,
        label: t.enabled,
        sortValue: (e) => (e.enabled ? 1 : 0),
        cell: (e) =>
          onToggleEndpoint ? (
            <Switch
              aria-label={t.toggleLabel(e.name)}
              checked={e.enabled}
              disabled={busy.has(e.id)}
              onCheckedChange={(next) =>
                void run(e.id, async () => {
                  fail(await onToggleEndpoint(e.id, next));
                })
              }
            />
          ) : (
            <Badge variant={e.enabled ? "success" : "outline"}>{e.enabled ? t.enabled : t.disabled}</Badge>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, events.length, busy, onToggleEndpoint],
  );
  const endpointTable = useDataTable({ data: endpoints as WebhookEndpoint[], columns: endpointColumns, getRowId: (e) => e.id, defaultSort: { id: "endpoint", direction: "asc" }, pageSize: 8 });

  async function sendTest(e: WebhookEndpoint) {
    if (!onTest) return;
    setNotice(null);
    const result = await run(`test:${e.id}`, () => onTest(e.id));
    if (!result || !mounted.current) return;
    if (result.ok) setNotice({ tone: "success", text: t.testOk(e.name, String(result.code ?? 200), String(result.durationMs ?? 0)) });
    else setNotice({ tone: "danger", text: t.testFail(e.name, result.error ?? (result.code ? `HTTP ${result.code}` : "")) });
  }

  const endpointActions = (e: WebhookEndpoint): DataTableRowAction[] => {
    const locked = busy.has(e.id) || busy.has(`test:${e.id}`);
    const list: DataTableRowAction[] = [];
    if (onTest) list.push({ id: "test", label: t.test, icon: Send, disabled: locked, group: "use", onSelect: () => void sendTest(e) });
    list.push({ id: "edit", label: t.editEndpoint, icon: Pencil, disabled: locked, group: "use", onSelect: () => setEditing(e) });
    if (onRotateSecret) {
      list.push({
        id: "rotate",
        label: t.rotate,
        icon: KeyRound,
        disabled: locked,
        group: "secret",
        onSelect: () =>
          setConfirm({
            title: t.rotateTitle(e.name),
            body: t.rotateBody,
            confirm: t.rotateConfirm,
            danger: false,
            run: async () => {
              const result = await run(e.id, () => onRotateSecret(e.id));
              if (!result) return;
              if (fail(result)) return;
              if (result.secret) setReveal({ title: t.revealTitle, secret: result.secret });
            },
          }),
      });
    }
    list.push({
      id: "delete",
      label: t.delete,
      icon: Trash2,
      danger: true,
      disabled: locked,
      group: "danger",
      onSelect: () =>
        setConfirm({
          title: t.deleteTitle(e.name),
          body: t.deleteBody,
          confirm: t.delete,
          danger: true,
          run: async () => {
            const result = await run(e.id, () => onDeleteEndpoint(e.id));
            if (result) fail(result);
          },
        }),
    });
    return list;
  };

  const shownDeliveries = useMemo(() => (endpointFilter === "all" ? deliveries : deliveries.filter((d) => d.endpointId === endpointFilter)), [deliveries, endpointFilter]);

  const deliveryColumns = useMemo<DataTableColumn<WebhookDelivery>[]>(
    () => [
      {
        id: "status",
        header: t.status,
        label: t.status,
        sortValue: (d) => d.status,
        filterValue: (d) => d.status,
        cell: (d) => <Status tone={statusTone[d.status]}>{t.statuses[d.status]}</Status>,
      },
      {
        id: "event",
        header: t.event,
        label: t.event,
        hideable: false,
        sortValue: (d) => d.event,
        searchValue: (d) => `${d.event} ${endpointName(d.endpointId)}`,
        cell: (d) => (
          <div className="flex min-w-0 flex-col">
            <bdi dir="ltr" className="truncate text-start font-mono text-code text-foreground">
              {d.event}
            </bdi>
            <span dir="auto" className="truncate text-caption text-muted-foreground">
              {endpointName(d.endpointId)}
            </span>
          </div>
        ),
      },
      {
        id: "response",
        header: t.response,
        label: t.response,
        sortValue: (d) => d.code ?? 0,
        cell: (d) => (d.code === undefined ? dash : <Num value={d.code} format={{ useGrouping: false }} />),
      },
      {
        id: "duration",
        header: t.duration,
        label: t.duration,
        align: "end",
        defaultHidden: true,
        sortValue: (d) => d.durationMs ?? -1,
        cell: (d) =>
          d.durationMs === undefined ? (
            dash
          ) : (
            <span className="whitespace-nowrap">
              <Num value={d.durationMs} /> {t.ms}
            </span>
          ),
      },
      { id: "attempt", header: t.attempt, label: t.attempt, align: "end", defaultHidden: true, sortValue: (d) => d.attempt, cell: (d) => <Num value={d.attempt} /> },
      { id: "when", header: t.when, label: t.when, sortValue: (d) => new Date(d.at), cell: (d) => <DateTime value={d.at} relative className="text-muted-foreground" /> },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, endpoints],
  );
  const deliveryTable = useDataTable({ data: shownDeliveries as WebhookDelivery[], columns: deliveryColumns, getRowId: (d) => d.id, defaultSort: { id: "when", direction: "desc" }, pageSize: 10 });

  async function replay(d: WebhookDelivery) {
    if (!onReplay) return;
    setNotice(null);
    const result = await run(d.id, () => onReplay(d.id));
    if (result === undefined && failure) return;
    if (result && fail(result)) return;
    if (mounted.current) setNotice({ tone: "success", text: t.replayed(endpointName(d.endpointId)) });
  }

  const deliveryActions = (d: WebhookDelivery): DataTableRowAction[] => {
    const list: DataTableRowAction[] = [{ id: "view", label: t.view, icon: Globe, group: "inspect", onSelect: () => setDetail(d) }];
    if (onReplay) list.push({ id: "replay", label: t.replay, icon: RotateCw, disabled: !canReplay(d.status) || busy.has(d.id), group: "act", onSelect: () => void replay(d) });
    return list;
  };

  const sourceColumns = useMemo<DataTableColumn<InboundSource>[]>(
    () => [
      {
        id: "source",
        header: t.source,
        label: t.source,
        hideable: false,
        sortValue: (s) => s.name,
        searchValue: (s) => `${s.name} ${s.target ?? ""}`,
        cell: (s) => (
          <div className="flex min-w-0 flex-col">
            <span dir="auto" className="truncate font-medium text-foreground">
              {s.name}
            </span>
            {s.target ? (
              <bdi dir="ltr" className="truncate text-start font-mono text-caption text-muted-foreground">
                {s.target}
              </bdi>
            ) : null}
          </div>
        ),
      },
      {
        id: "interval",
        header: t.interval,
        label: t.interval,
        sortValue: (s) => s.intervalSeconds,
        cell: (s) =>
          onSetInterval ? (
            <Select
              items={intervalItems(s.intervalSeconds, t)}
              value={String(s.intervalSeconds)}
              onValueChange={(v) => v && void run(s.id, async () => fail(await onSetInterval(s.id, Number(v))))}
            >
              <SelectTrigger aria-label={t.intervalLabel(s.name)} disabled={busy.has(s.id)} className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {intervalItems(s.intervalSeconds, t).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            t.intervals(s.intervalSeconds)
          ),
      },
      {
        id: "status",
        header: t.lastStatus,
        label: t.lastStatus,
        sortValue: (s) => s.lastStatus ?? "",
        cell: (s) => {
          if (!s.lastStatus) return <Status tone="neutral">{t.sourceNever}</Status>;
          const stale = s.lastStatus === "ok" && isSourceStale(s.lastAt, s.intervalSeconds);
          return (
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              <Status tone={s.lastStatus === "error" ? "danger" : stale ? "warning" : "success"}>{s.lastStatus === "error" ? t.sourceError : stale ? t.sourceStale : t.sourceOk}</Status>
              {s.lastStatus === "error" && s.lastError ? (
                <bdi dir="ltr" className="max-w-56 truncate text-start text-caption text-muted-foreground">
                  {s.lastError}
                </bdi>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "last",
        header: t.lastPolled,
        label: t.lastPolled,
        sortValue: (s) => (s.lastAt === undefined ? null : new Date(s.lastAt)),
        cell: (s) => (s.lastAt === undefined ? dash : <DateTime value={s.lastAt} relative className="text-muted-foreground" />),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, busy, onSetInterval],
  );
  const sourceTable = useDataTable({ data: sources as InboundSource[], columns: sourceColumns, getRowId: (s) => s.id, defaultSort: { id: "source", direction: "asc" }, pageSize: 8 });

  const sourceActions = (s: InboundSource): DataTableRowAction[] =>
    onPollNow
      ? [
          {
            id: "poll",
            label: busy.has(`poll:${s.id}`) ? t.polling : t.pollNow,
            icon: RefreshCw,
            disabled: busy.has(`poll:${s.id}`),
            onSelect: () =>
              void (async () => {
                setNotice(null);
                const result = await run(`poll:${s.id}`, () => onPollNow(s.id));
                if (result && fail(result)) return;
                if (mounted.current) setNotice({ tone: "success", text: t.polled(s.name) });
              })(),
          },
        ]
      : [];

  const endpointFilterItems = [{ value: "all", label: t.allEndpoints }, ...endpoints.map((e) => ({ value: e.id, label: e.name }))];

  return (
    <div data-slot="webhooks-manager" aria-busy={loading || undefined} className={cn("flex w-full flex-col gap-6", className)} {...props}>
      <header className="flex flex-col gap-1">
        <h2 className="text-h3 text-foreground">{t.title}</h2>
        <p className="text-body-sm text-muted-foreground">{t.description}</p>
      </header>

      {pushEndpoint ? (
        <Card data-slot="webhooks-push" className="w-full">
          <CardHeader>
            <CardTitle as="h3">{t.pushTitle}</CardTitle>
            <CardDescription>{t.pushBody}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Alert tone="warning">{t.pushAlert}</Alert>
            <Field>
              <FieldLabel>{t.pushUrl}</FieldLabel>
              <CopyField value={pushEndpoint.url} label={t.pushUrl} />
            </Field>
            <Field>
              <FieldLabel>{t.pushToken}</FieldLabel>
              <CopyField value={pushEndpoint.token} label={t.pushToken} />
            </Field>
            {onDismissPush ? (
              <div className="flex justify-end">
                <Button variant="primary" onClick={onDismissPush}>
                  {t.pushDismiss}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {failure ? (
        <Alert tone="danger" onDismiss={() => setFailure(null)} dismissLabel={t.dismiss}>
          {failure}
        </Alert>
      ) : null}
      {notice ? (
        <Alert tone={notice.tone} onDismiss={() => setNotice(null)} dismissLabel={t.dismiss}>
          {notice.text}
        </Alert>
      ) : null}

      <Tabs defaultValue="endpoints">
        <TabsList variant="underline">
          <TabsTab value="endpoints">{t.tabEndpoints}</TabsTab>
          <TabsTab value="deliveries">{t.tabDeliveries}</TabsTab>
          <TabsTab value="inbound">{t.tabInbound}</TabsTab>
          <TabsIndicator />
        </TabsList>

        <TabsPanel value="endpoints">
          <Card className="w-full">
            <CardHeader>
              <CardTitle as="h3">{t.endpointsTitle}</CardTitle>
              <CardDescription>{t.endpointsDescription}</CardDescription>
              <CardAction>
                <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
                  {t.addEndpoint}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <DataTableToolbar>
                <DataTableSearch table={endpointTable} placeholder={t.search} />
              </DataTableToolbar>
              <DataTable
                table={endpointTable}
                label={t.endpointsTable}
                rowLabel={(e) => e.name}
                loading={loading}
                empty={<EmptyState icon={Webhook} title={t.endpointsEmpty} description={t.endpointsEmptyBody} />}
                rowActions={endpointActions}
              />
              <DataTablePagination table={endpointTable} />
            </CardContent>
          </Card>
        </TabsPanel>

        <TabsPanel value="deliveries">
          <Card className="w-full">
            <CardHeader>
              <CardTitle as="h3">{t.deliveriesTitle}</CardTitle>
              <CardDescription>{t.deliveriesDescription}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <DataTableToolbar>
                <DataTableSearch table={deliveryTable} placeholder={t.search} />
                <Select items={endpointFilterItems} value={endpointFilter} onValueChange={(v) => v && setEndpointFilter(v)}>
                  <SelectTrigger aria-label={t.endpoint} className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {endpointFilterItems.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DataTableFacetFilter table={deliveryTable} column="status" title={t.status} options={(["success", "failed", "pending"] as const).map((s) => ({ value: s, label: t.statuses[s] }))} />
              </DataTableToolbar>
              <DataTable
                table={deliveryTable}
                label={t.deliveriesTable}
                rowLabel={(d) => `${d.event} ${endpointName(d.endpointId)}`}
                loading={loading}
                onRowClick={(d) => setDetail(d)}
                empty={<EmptyState icon={Send} title={t.deliveriesEmpty} />}
                rowActions={deliveryActions}
              />
              <DataTablePagination table={deliveryTable} />
            </CardContent>
          </Card>
        </TabsPanel>

        <TabsPanel value="inbound">
          <Card className="w-full">
            <CardHeader>
              <CardTitle as="h3">{t.inboundTitle}</CardTitle>
              <CardDescription>{t.inboundDescription}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <DataTable
                table={sourceTable}
                label={t.inboundTable}
                rowLabel={(s) => s.name}
                loading={loading}
                empty={<EmptyState icon={Antenna} title={t.inboundEmpty} />}
                rowActions={onPollNow ? sourceActions : undefined}
              />
              <DataTablePagination table={sourceTable} />
            </CardContent>
          </Card>
        </TabsPanel>
      </Tabs>

      <EndpointDialog
        target={editing}
        onClose={() => setEditing(null)}
        events={events}
        t={t}
        onSave={async (input) => {
          const result = await onSaveEndpoint(input);
          if (result && result.error) return result;
          if (result && result.secret) setReveal({ title: t.revealTitle, secret: result.secret });
          return undefined;
        }}
      />

      <RevealDialog reveal={reveal} onClose={() => setReveal(null)} t={t} />
      <DeliveryDialog delivery={detail} name={detail ? endpointName(detail.endpointId) : ""} onClose={() => setDetail(null)} onReplay={onReplay ? (d) => replay(d) : undefined} busy={detail ? busy.has(detail.id) : false} t={t} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} cancel={t.cancel} />
    </div>
  );
}

function intervalItems(current: number, t: WebhooksManagerLabels) {
  const list = POLL_INTERVALS.includes(current) ? [...POLL_INTERVALS] : [...POLL_INTERVALS, current].sort((a, b) => a - b);
  return list.map((s) => ({ value: String(s), label: t.intervals(s) }));
}

function ConfirmDialog({ request, onClose, cancel }: { request: Confirm | null; onClose: () => void; cancel: string }) {
  const [held, setHeld] = useState<Confirm | null>(request);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (request) setHeld(request);
  }, [request]);
  return (
    <AlertDialog open={request !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent data-slot="webhooks-confirm">
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

function RevealDialog({ reveal, onClose, t }: { reveal: Reveal | null; onClose: () => void; t: WebhooksManagerLabels }) {
  const [held, setHeld] = useState<Reveal | null>(reveal);
  useEffect(() => {
    if (reveal) setHeld(reveal);
  }, [reveal]);
  return (
    <Dialog
      open={reveal !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onOpenChangeComplete={(open) => {
        // Drop the secret from memory once the dialog has animated closed.
        if (!open) setHeld(null);
      }}
    >
      <DialogContent showClose={false} data-slot="webhooks-reveal" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{held?.title}</DialogTitle>
          <DialogDescription>{t.revealBody}</DialogDescription>
        </DialogHeader>
        <Alert tone="warning">{t.revealAlert}</Alert>
        <CopyField value={held?.secret ?? ""} label={t.secretLabel} />
        <div className="flex flex-col gap-2">
          <p className="text-label text-foreground">{t.verifyTitle}</p>
          <p className="text-caption text-muted-foreground">{t.verifyBody}</p>
          <CodeBlock code={verifySnippet()} language="js" />
        </div>
        <DialogFooter>
          <Button type="button" variant="primary" onClick={onClose}>
            {t.done}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryDialog({
  delivery,
  name,
  onClose,
  onReplay,
  busy,
  t,
}: {
  delivery: WebhookDelivery | null;
  name: string;
  onClose: () => void;
  onReplay?: (delivery: WebhookDelivery) => Promise<void>;
  busy: boolean;
  t: WebhooksManagerLabels;
}) {
  const [held, setHeld] = useState<{ delivery: WebhookDelivery; name: string } | null>(null);
  useEffect(() => {
    if (delivery) setHeld({ delivery, name });
  }, [delivery, name]);
  const d = held?.delivery;
  const body = (text: string | undefined): ReactNode => (text ? <CodeBlock code={prettyJson(text)} language="json" /> : <p className="text-caption text-muted-foreground">{t.noBody}</p>);
  return (
    <Dialog open={delivery !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-slot="webhooks-delivery" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.detailTitle}</DialogTitle>
          <DialogDescription>
            <bdi dir="ltr" className="font-mono">
              {d?.event}
            </bdi>{" "}
            <span dir="auto">· {held?.name}</span>
          </DialogDescription>
        </DialogHeader>
        {d ? (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            <div className="flex flex-wrap items-center gap-3 text-body-sm">
              <Status tone={statusTone[d.status]}>{t.statuses[d.status]}</Status>
              {d.code !== undefined ? <Num value={d.code} format={{ useGrouping: false }} /> : null}
              {d.durationMs !== undefined ? (
                <span>
                  <Num value={d.durationMs} /> {t.ms}
                </span>
              ) : null}
              <span className="text-muted-foreground">
                {t.attempt} <Num value={d.attempt} />
              </span>
              <DateTime value={d.at} className="text-muted-foreground" format={{ dateStyle: "medium", timeStyle: "medium" }} />
            </div>
            {d.error ? <Alert tone="danger">{d.error}</Alert> : null}
            <section className="flex flex-col gap-1.5">
              <h4 className="text-label text-foreground">{t.request}</h4>
              {body(d.request)}
            </section>
            <section className="flex flex-col gap-1.5">
              <h4 className="text-label text-foreground">{t.responseBody}</h4>
              {body(d.response)}
            </section>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t.close}
          </Button>
          {onReplay && d ? (
            <Button
              variant="primary"
              loading={busy}
              disabled={!canReplay(d.status)}
              onClick={async () => {
                await onReplay(d);
                onClose();
              }}
            >
              {busy ? t.replaying : t.replay}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EndpointDialog({
  target,
  onClose,
  events,
  t,
  onSave,
}: {
  target: WebhookEndpoint | "new" | null;
  onClose: () => void;
  events: readonly WebhookEvent[];
  t: WebhooksManagerLabels;
  onSave: (input: EndpointInput) => Promise<{ error?: string } | undefined>;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [channel, setChannel] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = target !== null;
  const editingEndpoint = target && target !== "new" ? target : null;
  useEffect(() => {
    if (!target) return;
    setName(target === "new" ? "" : target.name);
    setUrl(target === "new" ? "" : target.url);
    setChannel(target === "new" ? "" : (target.channel ?? ""));
    setSelected(target === "new" ? [] : [...target.events]);
    setTouched(false);
    setError(null);
  }, [target]);

  const problems: EndpointField[] = validateEndpoint({ name, url, events: selected });
  const urlCheck = validateEndpointUrl(url);
  const groups = useMemo(() => groupEvents(events), [events]);

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    setTouched(true);
    if (problems.length) return;
    setPending(true);
    setError(null);
    try {
      const result = await onSave({ ...(editingEndpoint ? { id: editingEndpoint.id } : {}), name: name.trim(), url: url.trim(), channel: channel.trim(), events: selected });
      if (result && result.error) setError(result.error);
      else onClose();
    } catch {
      setError(t.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent data-slot="webhooks-endpoint-form" className="max-w-xl">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{editingEndpoint ? t.editTitle : t.createTitle}</DialogTitle>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={touched && problems.includes("name")}>
              <FieldLabel>{t.nameLabel}</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} autoComplete="off" />
              {touched && problems.includes("name") ? <FieldError match>{t.nameRequired}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel>{t.channelLabel}</FieldLabel>
              <Input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder={t.channelPlaceholder} autoComplete="off" />
              <FieldDescription>{t.channelHint}</FieldDescription>
            </Field>
          </div>
          <Field invalid={touched && problems.includes("url")}>
            <FieldLabel>{t.urlLabel}</FieldLabel>
            <Input ltr type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t.urlPlaceholder} autoComplete="off" spellCheck={false} />
            {touched && !urlCheck.ok ? <FieldError match>{t.urlProblems[urlCheck.problem]}</FieldError> : null}
          </Field>
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-1 text-label text-foreground">{t.eventsLabel}</legend>
            <div className="flex max-h-56 flex-col gap-3 overflow-y-auto rounded-control border border-border p-3">
              {groups.map(({ group, events: list }) => {
                const ids = list.map((e) => e.id);
                const state = groupState(selected, ids);
                return (
                  <div key={group || "_"} className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-label text-foreground">
                      <Checkbox checked={state === "all"} indeterminate={state === "some"} onCheckedChange={(next) => setSelected((s) => setEvents(s, ids, next === true))} aria-label={`${t.selectAll}: ${group || t.eventsLabel}`} />
                      {group || t.selectAll}
                    </label>
                    <div className="grid gap-1.5 ps-6 sm:grid-cols-2">
                      {list.map((e) => (
                        <label key={e.id} className="flex items-center gap-2 text-body-sm text-foreground">
                          <Checkbox checked={selected.includes(e.id)} onCheckedChange={(next) => setSelected((s) => setEvents(s, [e.id], next === true))} />
                          <span className="min-w-0">
                            <span dir="auto">{e.label}</span>
                            <bdi dir="ltr" className="block truncate font-mono text-caption text-muted-foreground">
                              {e.id}
                            </bdi>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {touched && problems.includes("events") ? <p className="text-caption text-danger">{t.eventsRequired}</p> : null}
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {editingEndpoint ? t.save : t.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
