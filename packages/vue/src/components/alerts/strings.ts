// Built-in English and Arabic strings, copied from packages/web/src/components/alerts/alerts.tsx.
import type { AlertEventType, AlertSeverity, AlertSort, AlertStatus, SecurityCategory } from "./types";

export const STRINGS = {
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

export const alertsStrings = (locale: string, labels?: Partial<AlertsLabels>): AlertsLabels => ({ ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels }) as AlertsLabels;

export interface AlertAction {
  id: string;
  label: string;
  variant?: "secondary" | "danger";
}

export const DEFAULT_SECURITY_ACTIONS = {
  en: [
    { id: "block-ip", label: "Block IP", variant: "danger" },
    { id: "false-positive", label: "Mark as false positive", variant: "secondary" },
  ] satisfies AlertAction[],
  ar: [
    { id: "block-ip", label: "حظر عنوان IP", variant: "danger" },
    { id: "false-positive", label: "تحديد كإنذار كاذب", variant: "secondary" },
  ] satisfies AlertAction[],
};
