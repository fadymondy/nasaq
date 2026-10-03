// Types, strings and the pure helpers of the error-tracking components (ported from error-tracking-format.ts).
// Helper names are prefixed `et` because the package index is `export *`.

export type ErrorLevel = "fatal" | "error" | "warning" | "info";
export type ErrorStatus = "unresolved" | "resolved" | "ignored";
export type ErrorTrend = "up" | "down" | "flat";
export type HttpTone = "success" | "info" | "warning" | "danger" | "neutral";
export type BreadcrumbType = "navigation" | "http" | "console" | "ui" | "error";

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

export const ERROR_TRACKING_STRINGS = {
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
    levels: { fatal: "Fatal", error: "Error", warning: "Warning", info: "Info" } as Record<ErrorLevel, string>,
    statuses: { unresolved: "Unresolved", resolved: "Resolved", ignored: "Ignored" } as Record<ErrorStatus, string>,
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
    crumbTypes: { navigation: "Navigation", http: "Request", console: "Console", ui: "Click", error: "Error" } as Record<BreadcrumbType, string>,
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
    levels: { fatal: "قاتل", error: "خطأ", warning: "تحذير", info: "معلومة" } as Record<ErrorLevel, string>,
    statuses: { unresolved: "غير محلول", resolved: "تم حله", ignored: "متجاهَل" } as Record<ErrorStatus, string>,
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
    crumbTypes: { navigation: "تنقّل", http: "طلب", console: "وحدة التحكم", ui: "نقرة", error: "خطأ" } as Record<BreadcrumbType, string>,
  },
};
export type ErrorTrackingLabels = typeof ERROR_TRACKING_STRINGS.en;

const LEVEL_RANK: Record<ErrorLevel, number> = { fatal: 0, error: 1, warning: 2, info: 3 };
const stamp = (v: Date | number | string) => new Date(v).getTime();

/** Unresolved first, then by severity, then the most recent. Resolved and ignored sink to the end. */
export function etSortIssues<T extends { level: ErrorLevel; status: ErrorStatus; lastSeen: Date | number | string }>(issues: T[]): T[] {
  const open = (i: T) => (i.status === "unresolved" ? 0 : 1);
  return [...issues].sort((a, b) => open(a) - open(b) || LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || stamp(b.lastSeen) - stamp(a.lastSeen));
}

/** Events in a frequency series. */
export function etTotalEvents(series: number[] | undefined): number {
  return (series ?? []).reduce((a, b) => a + b, 0);
}

/** Compares the second half of the series with the first: more than 20 % either way is a trend. */
export function etSeriesTrend(series: number[] | undefined): ErrorTrend {
  const s = series ?? [];
  if (s.length < 4) return "flat";
  const mid = Math.floor(s.length / 2);
  const before = etTotalEvents(s.slice(0, mid));
  const after = etTotalEvents(s.slice(s.length - mid));
  if (before === 0 && after === 0) return "flat";
  if (after > before * 1.2) return "up";
  if (after < before * 0.8) return "down";
  return "flat";
}

/** `src/app.ts:42:7`, dropping what is missing. */
export function etFrameLocation(frame: { file: string; line?: number; column?: number }): string {
  let out = frame.file;
  if (frame.line !== undefined) out += `:${frame.line}`;
  if (frame.line !== undefined && frame.column !== undefined) out += `:${frame.column}`;
  return out;
}

/** A network entry's status colour: 2xx success, 3xx info, 4xx warning, 5xx or a failed request danger. */
export function etHttpTone(status: number | undefined): HttpTone {
  if (status === undefined || status === 0) return "danger";
  if (status >= 500) return "danger";
  if (status >= 400) return "warning";
  if (status >= 300) return "info";
  if (status >= 200) return "success";
  return "neutral";
}

/** `840 ms` or `1.4 s`. */
export function etFormatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(Math.round(ms / 100) / 10).toString()} s`;
}
