import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import { pollUnit, type DeliveryStatus } from "./format";

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

export type WebhooksManagerStrings = typeof STRINGS.en;
export type WebhooksManagerLabels = Partial<WebhooksManagerStrings>;
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

export interface WebhooksConfirm {
  title: string;
  body: string;
  confirm: string;
  danger: boolean;
  run: () => Promise<void> | void;
}

/** The strings for the current Nasaq locale, with the caller's overrides on top. */
export function useWebhooksStrings(labels: () => WebhooksManagerLabels | undefined): ComputedRef<WebhooksManagerStrings> {
  const nasaq = useNasaq();
  return computed(() => ({ ...STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels() }));
}
