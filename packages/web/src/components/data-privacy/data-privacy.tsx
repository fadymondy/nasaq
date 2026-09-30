"use client";

import { CircleAlert, CircleCheck, Clock, Download, FileArchive, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { DangerZone, SettingsSection } from "../account-settings";
import { Alert } from "../alert";
import { AuthLayout, type AuthLayoutProps } from "../auth-layout";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { formatFileSize } from "../file-upload";
import { DateTime, formatNumber } from "../numeric";
import { Progress } from "../progress";
import { daysRemaining, deletionDate, deletionPhase, type ExportStatus, graceElapsed, isExportActive, pollDelay } from "./privacy-rules";

export { daysRemaining, deletionDate, deletionPhase, graceElapsed, isExportActive, pollDelay } from "./privacy-rules";
export type { ExportStatus } from "./privacy-rules";

const STRINGS = {
  en: {
    exportTitle: "Export your data",
    exportBody: "Get a copy of everything we hold about you, as a file you can keep or move elsewhere.",
    includes: "The file includes",
    request: "Request export",
    requesting: "Requesting",
    status: { queued: "Waiting in line", processing: "Preparing your file", ready: "Ready to download", failed: "Failed", expired: "Expired" } as Record<ExportStatus, string>,
    requestedAt: "Requested",
    readyAt: "Ready",
    size: "Size",
    expiresAt: "Download available until",
    download: "Download",
    downloading: "Downloading",
    requestAgain: "Request a new export",
    retryCheck: "Check again",
    emailNote: "We also email you when it is ready. This can take a few minutes.",
    failedBody: "The export could not be prepared. Try again.",
    expiredBody: "This export is no longer available. Request a new one.",
    checkFailed: "We could not check the status. It may still be running.",
    requestFailed: "The export could not be requested. Try again.",
    downloadFailed: "The download did not start. Try again.",
    progressLabel: "Export progress",
    // deletion
    deleteTitle: "Delete account",
    deleteHeading: "Delete your account",
    deleteBody: (days: string) => `Your account and its data are permanently deleted after ${days} days. Until then you can sign in and cancel.`,
    deleteButton: "Delete my account",
    deleteConfirmTitle: "Delete your account?",
    deleteConfirmBody: (days: string) => `You are signed out everywhere. After ${days} days everything is removed for good. You can cancel any time before then.`,
    deletePrompt: (text: string) => `Type ${text} to confirm`,
    deleteAction: "Schedule deletion",
    cancel: "Cancel",
    deleteFailed: "The deletion could not be scheduled. Try again.",
    scheduledTitle: "Your account is scheduled for deletion",
    scheduledOn: "It will be deleted on",
    daysLeft: (n: string) => (n === "1" ? "1 day left" : `${n} days left`),
    lessThanDay: "Less than a day left",
    scheduledBody: "Everything is removed for good on that date. Cancel now to keep your account exactly as it is.",
    cancelDeletion: "Cancel deletion",
    cancelling: "Cancelling",
    cancelFailed: "Deletion could not be cancelled. Try again.",
    cancelledOk: "Deletion cancelled. Your account stays as it was.",
    dueTitle: "Your account is being deleted",
    dueBody: "The grace period has ended. It can no longer be cancelled here. Contact support if this is a mistake.",
    graceProgress: "Grace period used",
    // cancel page
    pageReadyTitle: "Keep your account?",
    pageReadyBody: (date: string) => `Your account is scheduled for deletion on ${date}. Cancel it and nothing is lost.`,
    keep: "Keep my account",
    pageDoneTitle: "Your account is safe",
    pageDoneBody: "The deletion was cancelled. You can sign in as usual.",
    pageExpiredTitle: "This account has been deleted",
    pageExpiredBody: "The grace period ended and the data was removed. It cannot be recovered. You can create a new account any time.",
    pageInvalidTitle: "This link does not work",
    pageInvalidBody: "It may be wrong, already used, or from an older request. Sign in to check your account.",
    signIn: "Sign in",
    signUp: "Create a new account",
    goHome: "Go to the home page",
  },
  ar: {
    exportTitle: "صدّر بياناتك",
    exportBody: "احصل على نسخة من كل ما نحتفظ به عنك، في ملف تحتفظ به أو تنقله إلى مكان آخر.",
    includes: "يتضمن الملف",
    request: "طلب التصدير",
    requesting: "جارٍ الطلب",
    status: { queued: "في الانتظار", processing: "جارٍ تجهيز ملفك", ready: "جاهز للتنزيل", failed: "فشل", expired: "منتهي" } as Record<ExportStatus, string>,
    requestedAt: "تاريخ الطلب",
    readyAt: "تاريخ الجاهزية",
    size: "الحجم",
    expiresAt: "التنزيل متاح حتى",
    download: "تنزيل",
    downloading: "جارٍ التنزيل",
    requestAgain: "طلب تصدير جديد",
    retryCheck: "تحقق مرة أخرى",
    emailNote: "سنراسلك أيضًا عندما يجهز. قد يستغرق ذلك بضع دقائق.",
    failedBody: "تعذّر تجهيز التصدير. حاول مرة أخرى.",
    expiredBody: "لم يعد هذا التصدير متاحًا. اطلب تصديرًا جديدًا.",
    checkFailed: "تعذّر التحقق من الحالة. قد يكون ما زال قيد التنفيذ.",
    requestFailed: "تعذّر طلب التصدير. حاول مرة أخرى.",
    downloadFailed: "لم يبدأ التنزيل. حاول مرة أخرى.",
    progressLabel: "تقدّم التصدير",
    deleteTitle: "حذف الحساب",
    deleteHeading: "احذف حسابك",
    deleteBody: (days: string) => `يُحذف حسابك وبياناته نهائيًا بعد ${days} يومًا. حتى ذلك الحين يمكنك تسجيل الدخول والإلغاء.`,
    deleteButton: "احذف حسابي",
    deleteConfirmTitle: "حذف حسابك؟",
    deleteConfirmBody: (days: string) => `يتم تسجيل خروجك من كل مكان. بعد ${days} يومًا يُزال كل شيء نهائيًا. يمكنك الإلغاء في أي وقت قبل ذلك.`,
    deletePrompt: (text: string) => `اكتب ${text} للتأكيد`,
    deleteAction: "جدولة الحذف",
    cancel: "إلغاء",
    deleteFailed: "تعذّرت جدولة الحذف. حاول مرة أخرى.",
    scheduledTitle: "حسابك مجدول للحذف",
    scheduledOn: "سيُحذف في",
    daysLeft: (n: string) => (n === "1" ? "بقي يوم واحد" : `بقي ${n} أيام`),
    lessThanDay: "بقي أقل من يوم",
    scheduledBody: "يُزال كل شيء نهائيًا في ذلك التاريخ. ألغِ الآن لتبقى حسابك كما هو تمامًا.",
    cancelDeletion: "إلغاء الحذف",
    cancelling: "جارٍ الإلغاء",
    cancelFailed: "تعذّر إلغاء الحذف. حاول مرة أخرى.",
    cancelledOk: "أُلغي الحذف. يبقى حسابك كما كان.",
    dueTitle: "جارٍ حذف حسابك",
    dueBody: "انتهت فترة السماح ولم يعد ممكنًا الإلغاء من هنا. تواصل مع الدعم إن كان ذلك خطأ.",
    graceProgress: "المستهلك من فترة السماح",
    pageReadyTitle: "هل تريد الإبقاء على حسابك؟",
    pageReadyBody: (date: string) => `حسابك مجدول للحذف في ${date}. ألغِ الحذف ولن يضيع شيء.`,
    keep: "أبقِ على حسابي",
    pageDoneTitle: "حسابك في أمان",
    pageDoneBody: "أُلغي الحذف. يمكنك تسجيل الدخول كالمعتاد.",
    pageExpiredTitle: "تم حذف هذا الحساب",
    pageExpiredBody: "انتهت فترة السماح وأُزيلت البيانات. لا يمكن استعادتها. يمكنك إنشاء حساب جديد في أي وقت.",
    pageInvalidTitle: "هذا الرابط لا يعمل",
    pageInvalidBody: "قد يكون خاطئًا أو مستخدمًا من قبل أو من طلب أقدم. سجّل الدخول لتتحقق من حسابك.",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب جديد",
    goHome: "الذهاب إلى الصفحة الرئيسية",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type DataPrivacyLabels = Partial<typeof STRINGS.en>;

/* ------------------------------------------------------------------ DataExport */

export interface DataExportRequest {
  id: string;
  status: ExportStatus;
  requestedAt: string | number | Date;
  completedAt?: string | number | Date | null;
  /** When the download link stops working. */
  expiresAt?: string | number | Date | null;
  sizeBytes?: number;
  /** 0 to 1 while processing, when known. */
  progress?: number;
}

export type DataExportResult = { request: DataExportRequest; error?: undefined } | { error: string; request?: undefined };

export interface DataExportProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  /** The latest export, or `null` if none was requested. */
  request: DataExportRequest | null;
  /** Ask for a new export. Resolve `{ request }` or `{ error }`. */
  onRequest: () => Promise<DataExportResult>;
  /** Fetch the current state of an export. Called on a backing-off timer while it is queued or processing. */
  poll?: (id: string) => Promise<DataExportRequest>;
  /** Called with every new state, so the host can store it. */
  onChange?: (request: DataExportRequest) => void;
  /** Start the download, for example by opening a signed URL. */
  onDownload?: (request: DataExportRequest) => void | Promise<void>;
  /** What the file contains, as short lines. */
  includes?: readonly string[];
  /** First delay between polls in ms. Default 3000. Grows by half each time up to 30 seconds. */
  pollInterval?: number;
  labels?: DataPrivacyLabels;
}

const STATUS_TONE: Record<ExportStatus, "info" | "success" | "danger" | "neutral"> = { queued: "info", processing: "info", ready: "success", failed: "danger", expired: "neutral" };

/**
 * Request a copy of your data and follow it until it is ready. While the export is queued or processing the
 * screen asks `poll` on a timer that backs off, and shows progress when it is known; after three failed checks it
 * stops and offers to check again. Ready exports show the size, the expiry and a Download button.
 */
export function DataExport({ request, onRequest, poll, onChange, onDownload, includes, pollInterval = 3000, labels, className, ...props }: DataExportProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [current, setCurrent] = useState<DataExportRequest | null>(request);
  const [busy, setBusy] = useState<"request" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const [nudge, setNudge] = useState(0);
  useEffect(() => setCurrent(request), [request]);

  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const pollRef = useRef(poll);
  pollRef.current = poll;

  const active = current && isExportActive(current.status) ? current.id : null;
  useEffect(() => {
    if (!active || !pollRef.current) return;
    let stop = false;
    let attempt = 0;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;
    setStalled(false);
    const tick = () => {
      timer = setTimeout(async () => {
        try {
          const next = await pollRef.current!(active);
          if (stop) return;
          failures = 0;
          setCurrent(next);
          changeRef.current?.(next);
          if (isExportActive(next.status)) {
            attempt += 1;
            tick();
          }
        } catch {
          if (stop) return;
          failures += 1;
          if (failures >= 3) setStalled(true);
          else {
            attempt += 1;
            tick();
          }
        }
      }, pollDelay(attempt, pollInterval));
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [active, pollInterval, nudge]);

  const ask = async () => {
    setBusy("request");
    setError(null);
    try {
      const r = await onRequest();
      if (r.error !== undefined) setError(r.error);
      else {
        setCurrent(r.request);
        onChange?.(r.request);
      }
    } catch {
      setError(t.requestFailed);
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    if (!current) return;
    setBusy("download");
    setError(null);
    try {
      await onDownload?.(current);
    } catch {
      setError(t.downloadFailed);
    } finally {
      setBusy(null);
    }
  };

  const status = current?.status;
  return (
    <SettingsSection
      data-slot="data-export"
      data-status={status ?? "none"}
      title={t.exportTitle}
      description={t.exportBody}
      className={className}
      actions={
        !current || status === "failed" || status === "expired" ? (
          <Button variant="primary" loading={busy === "request"} onClick={() => void ask()}>
            <FileArchive />
            {current ? t.requestAgain : t.request}
          </Button>
        ) : undefined
      }
      {...props}
    >
      <div className="flex flex-col gap-4">
        {includes?.length ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-label text-foreground">{t.includes}</span>
            <ul className="list-disc ps-5 text-body-sm text-muted-foreground">
              {includes.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <Alert tone="danger" role="alert" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        {current ? (
          <div className="flex flex-col gap-3 rounded-card border border-border p-4" data-slot="data-export-status">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2" role="status" aria-live="polite">
                <Badge variant={STATUS_TONE[current.status]}>
                  {current.status === "ready" ? <CircleCheck aria-hidden /> : current.status === "failed" ? <CircleAlert aria-hidden /> : current.status === "expired" ? <Clock aria-hidden /> : <RefreshCw aria-hidden className="motion-safe:animate-spin" />}
                  {t.status[current.status]}
                </Badge>
              </div>
              {current.status === "ready" && onDownload ? (
                <Button variant="primary" loading={busy === "download"} onClick={() => void download()}>
                  <Download />
                  {t.download}
                  {current.sizeBytes ? (
                    <span className="opacity-80">
                      {" "}
                      (<bdi dir="ltr">{formatFileSize(current.sizeBytes, locale)}</bdi>)
                    </span>
                  ) : null}
                </Button>
              ) : null}
            </div>

            {isExportActive(current.status) ? (
              <>
                <Progress value={current.progress !== undefined ? Math.round(current.progress * 100) : null} aria-label={t.progressLabel} size="sm" />
                <p className="text-caption text-muted-foreground">{t.emailNote}</p>
              </>
            ) : null}
            {current.status === "failed" ? <p className="text-body-sm text-nq-danger-text">{t.failedBody}</p> : null}
            {current.status === "expired" ? <p className="text-body-sm text-muted-foreground">{t.expiredBody}</p> : null}
            {stalled ? (
              <Alert
                tone="warning"
                action={
                  <Button size="sm" variant="secondary" onClick={() => setNudge((n) => n + 1)}>
                    {t.retryCheck}
                  </Button>
                }
              >
                {t.checkFailed}
              </Alert>
            ) : null}

            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1 text-body-sm">
              <dt className="text-muted-foreground">{t.requestedAt}</dt>
              <dd>
                <DateTime value={current.requestedAt} format={{ dateStyle: "medium", timeStyle: "short" }} />
              </dd>
              {current.completedAt && current.status === "ready" ? (
                <>
                  <dt className="text-muted-foreground">{t.readyAt}</dt>
                  <dd>
                    <DateTime value={current.completedAt} format={{ dateStyle: "medium", timeStyle: "short" }} />
                  </dd>
                </>
              ) : null}
              {current.expiresAt && current.status === "ready" ? (
                <>
                  <dt className="text-muted-foreground">{t.expiresAt}</dt>
                  <dd>
                    <DateTime value={current.expiresAt} format={{ dateStyle: "medium" }} />
                  </dd>
                </>
              ) : null}
            </dl>
          </div>
        ) : null}
      </div>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ AccountDeletion */

export interface AccountDeletionProps extends Omit<ComponentProps<"div">, "children"> {
  /** When the account will be deleted, or `null` if nothing is scheduled. */
  scheduledFor?: string | number | Date | null;
  /** Days between asking and deleting. Default 30. */
  graceDays?: number;
  /** The text to type to confirm, usually the email. */
  confirmText: string;
  /** Schedule the deletion. Resolve `{ scheduledFor }` to show the real date; throw to keep the dialog open. */
  onSchedule: () => Promise<void | { scheduledFor?: string | number | Date }>;
  /** Cancel a scheduled deletion. Resolve `{ error }` (or throw) to show a failure. */
  onCancel: () => Promise<void | { error?: string }>;
  /** Clock for the countdown. Default the current time. */
  now?: Date;
  labels?: DataPrivacyLabels;
}

/**
 * Delete the account with a grace period. Asking needs the confirm text typed; the account is then only
 * scheduled. While scheduled the screen shows the date, the days left and a Cancel deletion button; after the
 * date it says the account is being deleted.
 */
export function AccountDeletion({ scheduledFor, graceDays = 30, confirmText, onSchedule, onCancel, now, labels, className, ...props }: AccountDeletionProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [date, setDate] = useState<AccountDeletionProps["scheduledFor"]>(scheduledFor ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  useEffect(() => setDate(scheduledFor ?? null), [scheduledFor]);

  const clock = now ?? new Date();
  const phase = deletionPhase(date, clock);
  const days = formatNumber(graceDays, locale);

  if (phase === "none") {
    return (
      <div data-slot="account-deletion" data-phase="none" className={cn("flex flex-col gap-4", className)} {...props}>
        {notice ? (
          <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.text}
          </Alert>
        ) : null}
        <DangerZone
          title={t.deleteTitle}
          heading={t.deleteHeading}
          description={t.deleteBody(days)}
          confirmText={confirmText}
          onDelete={async () => {
            const r = await onSchedule();
            setDate((r && r.scheduledFor) || deletionDate(clock, graceDays));
            setNotice(null);
          }}
          labels={{
            button: t.deleteButton,
            confirmTitle: t.deleteConfirmTitle,
            confirmDescription: t.deleteConfirmBody(days),
            confirmPrompt: t.deletePrompt,
            confirmAction: t.deleteAction,
            cancel: t.cancel,
            failed: t.deleteFailed,
          }}
        />
      </div>
    );
  }

  const left = date ? daysRemaining(date, clock) : 0;
  const cancel = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await onCancel();
      if (r && typeof r === "object" && r.error) setNotice({ tone: "danger", text: r.error });
      else {
        setDate(null);
        setNotice({ tone: "success", text: t.cancelledOk });
      }
    } catch {
      setNotice({ tone: "danger", text: t.cancelFailed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsSection data-slot="account-deletion" data-phase={phase} tone="danger" title={phase === "due" ? t.dueTitle : t.scheduledTitle} className={className} {...props}>
      <div className="flex flex-col gap-4">
        {phase === "pending" && date ? (
          <>
            <Alert tone="warning" icon={TriangleAlert}>
              <span>
                {t.scheduledOn} <DateTime value={date} format={{ dateStyle: "long" }} /> ·{" "}
                <strong>{left <= 1 ? t.lessThanDay : t.daysLeft(formatNumber(left, locale))}</strong>
              </span>
            </Alert>
            <Progress value={Math.round(graceElapsed(date, graceDays, clock) * 100)} tone="warning" size="sm" label={t.graceProgress} />
            <p className="text-body-sm text-muted-foreground">{t.scheduledBody}</p>
            <div>
              <Button variant="primary" loading={busy} onClick={() => void cancel()}>
                <ShieldCheck />
                {t.cancelDeletion}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-body-sm text-muted-foreground">{t.dueBody}</p>
        )}
        {notice ? (
          <Alert tone={notice.tone} role={notice.tone === "danger" ? "alert" : "status"} onDismiss={() => setNotice(null)}>
            {notice.text}
          </Alert>
        ) : null}
      </div>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ CancelDeletionPage */

export type CancelDeletionState = "ready" | "cancelled" | "expired" | "invalid";

export interface CancelDeletionPageProps extends Omit<AuthLayoutProps, "title" | "description" | "children"> {
  /** Resolve the link on the server: `ready` while the grace period runs. */
  state: CancelDeletionState;
  account?: { name: string; email: string; avatar?: string };
  scheduledFor?: string | number | Date;
  onCancelDeletion: () => Promise<void | { error?: string }>;
  onSignIn?: () => void;
  onSignUp?: () => void;
  onGoHome?: () => void;
  bare?: boolean;
  labels?: DataPrivacyLabels;
}

/**
 * The public page behind the link in the "your account is scheduled for deletion" email. It works without signing
 * in: one button keeps the account. Also shows the outcomes: kept, already deleted, and a link that does not work.
 */
export function CancelDeletionPage({ state, account, scheduledFor, onCancelDeletion, onSignIn, onSignUp, onGoHome, bare = false, labels, ...layout }: CancelDeletionPageProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown: CancelDeletionState = done ? "cancelled" : state;

  const keep = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await onCancelDeletion();
      if (r && typeof r === "object" && r.error) setError(r.error);
      else setDone(true);
    } catch {
      setError(t.cancelFailed);
    } finally {
      setBusy(false);
    }
  };

  const dateText = scheduledFor ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(scheduledFor)) : "";
  const glyph = (icon: ReactNode, tone: string) => (
    <div className={cn("mx-auto flex size-12 items-center justify-center rounded-full [&_svg]:size-6", tone)} aria-hidden>
      {icon}
    </div>
  );

  let title: string;
  let description: string;
  let body: ReactNode;
  if (shown === "ready") {
    title = t.pageReadyTitle;
    description = t.pageReadyBody(dateText);
    body = (
      <>
        {account ? (
          <div className="flex items-center gap-3 rounded-card border border-border p-3">
            <Avatar name={account.name} src={account.avatar} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-label text-foreground">{account.name}</span>
              <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
                {account.email}
              </bdi>
            </div>
          </div>
        ) : null}
        <Button variant="primary" loading={busy} onClick={() => void keep()}>
          <ShieldCheck />
          {t.keep}
        </Button>
      </>
    );
  } else if (shown === "cancelled") {
    title = t.pageDoneTitle;
    description = t.pageDoneBody;
    body = (
      <>
        {glyph(<CircleCheck />, "bg-nq-success-soft text-nq-success-text")}
        {onSignIn ? (
          <Button variant="primary" onClick={onSignIn}>
            {t.signIn}
          </Button>
        ) : null}
      </>
    );
  } else if (shown === "expired") {
    title = t.pageExpiredTitle;
    description = t.pageExpiredBody;
    body = (
      <>
        {glyph(<Clock />, "bg-secondary text-muted-foreground")}
        {onSignUp ? (
          <Button variant="primary" onClick={onSignUp}>
            {t.signUp}
          </Button>
        ) : null}
        {onGoHome ? (
          <Button variant="ghost" onClick={onGoHome}>
            {t.goHome}
          </Button>
        ) : null}
      </>
    );
  } else {
    title = t.pageInvalidTitle;
    description = t.pageInvalidBody;
    body = (
      <>
        {glyph(<CircleAlert />, "bg-nq-warning-soft text-nq-warning-text")}
        {onSignIn ? (
          <Button variant="primary" onClick={onSignIn}>
            {t.signIn}
          </Button>
        ) : null}
      </>
    );
  }

  const content = (
    <div data-slot="cancel-deletion-page" data-state={shown} className="flex flex-col gap-4">
      {body}
      {error ? (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      ) : null}
    </div>
  );

  if (bare) {
    return (
      <section className="flex flex-col gap-4">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-h2 text-foreground">{title}</h1>
          <p className="text-body-sm text-muted-foreground">{description}</p>
        </header>
        {content}
      </section>
    );
  }
  return (
    <AuthLayout {...layout} title={title} description={description}>
      {content}
    </AuthLayout>
  );
}

/* ------------------------------------------------------------------ DataPrivacy */

export interface DataPrivacyProps extends Omit<ComponentProps<"div">, "children"> {
  dataExport: DataExportProps;
  deletion: AccountDeletionProps;
}

/** The privacy page of account settings: export your data, then delete your account with a grace period. */
export function DataPrivacy({ dataExport, deletion, className, ...props }: DataPrivacyProps) {
  return (
    <div data-slot="data-privacy" className={cn("flex flex-col gap-6", className)} {...props}>
      <DataExport {...dataExport} />
      <AccountDeletion {...deletion} />
    </div>
  );
}
