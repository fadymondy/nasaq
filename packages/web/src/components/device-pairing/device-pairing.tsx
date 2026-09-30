"use client";

import { Ban, Check, ExternalLink, Laptop, Smartphone, TimerOff } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { type AuthSubmitResult, formatCountdown, useAuthForm, useAuthLocale } from "../auth-layout/auth-utils";
import { Button, buttonVariants } from "../button";
import { Card } from "../card";
import { CopyButton, CopyField } from "../copy-button";
import { formatDate } from "../numeric";
import { OtpInput } from "../otp-input";
import { ProductMark } from "../product-mark";
import { QrCode } from "../qr-code";
import { Spinner } from "../spinner";
import { type DeviceCodeStatus, effectiveCodeStatus, formatUserCode, isUserCodeComplete, normalizeUserCode, codeSecondsLeft } from "./device-code";

const STRINGS = {
  en: {
    entryTitle: "Connect a device",
    entryDescription: "Enter the code shown on the device you are signing in to.",
    entryGroup: "Device code",
    box: "Character {index} of {length}",
    entrySubmit: "Continue",
    incomplete: "Enter all {length} characters.",
    failed: "Something went wrong. Try again.",
    approveTitle: "Approve this device?",
    approveDescription: "{client} wants to sign in to your account. Check that the code below matches the one on the device.",
    signedInAs: "Signing in as {name}",
    code: "Code",
    device: "Device",
    platform: "Platform",
    browser: "Browser",
    ip: "IP address",
    location: "Location",
    requested: "Requested",
    scopes: "It will be able to",
    warning: "Only approve if you started this yourself. If you do not recognise it, deny it and change your password.",
    approve: "Approve",
    deny: "Deny",
    expiresIn: "Expires in {time}",
    approvedTitle: "Device approved",
    approvedDescription: "You can go back to the device. It will sign in in a few seconds.",
    deniedTitle: "Request denied",
    deniedDescription: "The device was not given access. You can close this page.",
    expiredTitle: "This code expired",
    expiredDescription: "Codes only last a few minutes. Start again on the device to get a new one.",
    another: "Enter another code",
    displayTitle: "Sign in on your phone or computer",
    displayDescription: "Go to the address below and enter this code, or scan the QR code.",
    address: "Address",
    yourCode: "Your code",
    scan: "QR code to open the sign-in page",
    waiting: "Waiting for approval",
    refresh: "Get a new code",
    approvedDevice: "Approved. Signing you in",
    deniedDevice: "The request was denied.",
    handoffTitle: "Open {app}",
    handoffOpening: "Opening {app}. If your browser asks, allow it to open the app.",
    handoffOpened: "{app} should be open now. You can close this tab.",
    handoffFailed: "We could not open {app}. Make sure it is installed, then try again.",
    handoffOpen: "Open {app}",
    handoffAgain: "Try again",
    handoffBrowser: "Continue in the browser instead",
    handoffCode: "Or type this code in the app",
    handoffCancel: "Cancel sign-in",
  },
  ar: {
    entryTitle: "ربط جهاز",
    entryDescription: "أدخل الرمز الظاهر على الجهاز الذي تسجّل الدخول إليه.",
    entryGroup: "رمز الجهاز",
    box: "الحرف {index} من {length}",
    entrySubmit: "متابعة",
    incomplete: "أدخل الأحرف الـ {length} كاملة.",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    approveTitle: "الموافقة على هذا الجهاز؟",
    approveDescription: "يريد {client} تسجيل الدخول إلى حسابك. تأكد من أن الرمز أدناه يطابق الرمز على الجهاز.",
    signedInAs: "تسجيل الدخول باسم {name}",
    code: "الرمز",
    device: "الجهاز",
    platform: "المنصة",
    browser: "المتصفح",
    ip: "عنوان IP",
    location: "الموقع",
    requested: "وقت الطلب",
    scopes: "سيتمكن من",
    warning: "وافق فقط إذا كنت أنت من بدأ هذا الطلب. إذا لم تتعرف عليه فارفضه وغيّر كلمة مرورك.",
    approve: "موافقة",
    deny: "رفض",
    expiresIn: "ينتهي خلال {time}",
    approvedTitle: "تمت الموافقة على الجهاز",
    approvedDescription: "يمكنك العودة إلى الجهاز. سيسجّل الدخول خلال ثوانٍ.",
    deniedTitle: "تم رفض الطلب",
    deniedDescription: "لم يُمنح الجهاز أي وصول. يمكنك إغلاق هذه الصفحة.",
    expiredTitle: "انتهت صلاحية هذا الرمز",
    expiredDescription: "الرموز تدوم بضع دقائق فقط. ابدأ من جديد على الجهاز للحصول على رمز جديد.",
    another: "أدخل رمزًا آخر",
    displayTitle: "سجّل الدخول من هاتفك أو حاسوبك",
    displayDescription: "افتح العنوان أدناه وأدخل هذا الرمز، أو امسح رمز QR.",
    address: "العنوان",
    yourCode: "رمزك",
    scan: "رمز QR لفتح صفحة تسجيل الدخول",
    waiting: "بانتظار الموافقة",
    refresh: "احصل على رمز جديد",
    approvedDevice: "تمت الموافقة. جارٍ تسجيل دخولك",
    deniedDevice: "تم رفض الطلب.",
    handoffTitle: "افتح {app}",
    handoffOpening: "جارٍ فتح {app}. إذا سأل المتصفح فاسمح له بفتح التطبيق.",
    handoffOpened: "يجب أن يكون {app} مفتوحًا الآن. يمكنك إغلاق هذا التبويب.",
    handoffFailed: "تعذّر فتح {app}. تأكد من أنه مثبّت ثم حاول مرة أخرى.",
    handoffOpen: "افتح {app}",
    handoffAgain: "حاول مرة أخرى",
    handoffBrowser: "المتابعة في المتصفح بدلًا من ذلك",
    handoffCode: "أو اكتب هذا الرمز في التطبيق",
    handoffCancel: "إلغاء تسجيل الدخول",
  },
};

export type DevicePairingLabels = (typeof STRINGS)["en"];

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

function useLabels(labels?: Partial<DevicePairingLabels>): DevicePairingLabels {
  return { ...STRINGS[useAuthLocale()], ...labels };
}

/** A clock for countdowns: ticks each second while `expiresAt` is set and still ahead. */
function useNow(expiresAt?: Date | number | string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (expiresAt === undefined) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return now;
}

/* ------------------------------------------------------------------ entry */

export interface DeviceCodeEntryProps extends Omit<ComponentProps<"form">, "onSubmit" | "children"> {
  /** Called with the normalised code (`WDJBMJHT`). Resolve `{ error }` for an unknown or used code. */
  onSubmit: (code: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Characters in the code. Default 8. */
  length?: number;
  /** A code from the link (`?user_code=`), pre-filled. */
  defaultCode?: string;
  labels?: Partial<DevicePairingLabels>;
}

/** The page where someone types the code from their TV, CLI or app. Submits itself on the last character. */
export function DeviceCodeEntry({ onSubmit, length = 8, defaultCode = "", labels, className, ...props }: DeviceCodeEntryProps) {
  const t = useLabels(labels);
  const [code, setCode] = useState(normalizeUserCode(defaultCode).slice(0, length));
  const form = useAuthForm<string, "code">({
    fallbackError: t.failed,
    validate: (v) => ({ code: isUserCodeComplete(v, length) ? undefined : fill(t.incomplete, { length }) }),
    onSubmit: async (value) => {
      const result = await onSubmit(value);
      if (result?.error || result?.fieldErrors) setCode("");
      return result;
    },
  });
  const message = form.error ?? form.fieldErrors.code;
  return (
    <form
      ref={form.formRef}
      noValidate
      data-slot="device-code-entry"
      aria-busy={form.pending || undefined}
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit(normalizeUserCode(code));
      }}
    >
      <OtpInput
        name="code"
        type="alphanumeric"
        length={length}
        autoFocus
        value={code}
        invalid={Boolean(message)}
        aria-label={t.entryGroup}
        getBoxLabel={(i, n) => fill(t.box, { index: i + 1, length: n })}
        onValueChange={(v) => {
          setCode(normalizeUserCode(v));
          form.clear("code");
          if (form.error) form.setError(undefined);
        }}
        onComplete={(v) => void form.submit(normalizeUserCode(v))}
        className="self-center uppercase"
      />
      <p role="alert" className={cn("text-center text-caption text-nq-danger-text", !message && "sr-only")}>
        {message}
      </p>
      <Button type="submit" variant="primary" size="lg" loading={form.pending}>
        {t.entrySubmit}
      </Button>
    </form>
  );
}

/* --------------------------------------------------------------- approval */

export interface DeviceRequest {
  /** The code shown on the device. */
  code: string;
  /** Who is asking: an app or client name. */
  client: string;
  /** "Fady's MacBook Pro", "Living room TV". */
  deviceName?: string;
  /** "macOS 15", "Android 15", "CLI". */
  platform?: string;
  browser?: string;
  ip?: string;
  /** "Riyadh, Saudi Arabia". Approximate, from the IP. */
  location?: string;
  requestedAt?: Date | number | string;
  /** What approving lets it do, one line each. */
  scopes?: string[];
}

export interface DeviceApprovalProps extends Omit<ComponentProps<"div">, "children"> {
  request: DeviceRequest;
  /** `pending` asks for a decision. The others are the outcome. A pending request past `expiresAt` shows as expired. Default `pending`. */
  status?: DeviceCodeStatus;
  /** When the code stops working. Shows a countdown. */
  expiresAt?: Date | number | string;
  /** The signed-in account, so the person knows whose access they are granting. */
  account?: { name: string; email?: string };
  onApprove: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  onDeny: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** On the expired screen: go back to code entry. */
  onEnterAnother?: () => void;
  labels?: Partial<DevicePairingLabels>;
}

function OutcomeIcon({ status }: { status: Exclude<DeviceCodeStatus, "pending"> }) {
  const Icon = status === "approved" ? Check : status === "denied" ? Ban : TimerOff;
  const tone = status === "approved" ? "bg-nq-success-soft text-nq-success-text" : status === "denied" ? "bg-nq-danger-soft text-nq-danger-text" : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex size-12 items-center justify-center rounded-full", tone)}>
      <Icon aria-hidden="true" className="size-6" />
    </span>
  );
}

/**
 * The page a signed-in person lands on to approve a device: the big code to compare, what is asking
 * (device, platform, IP, place, time, scopes), a warning, and Approve or Deny. It shows the outcome
 * afterwards, and turns to "expired" by itself when the code runs out.
 */
export function DeviceApproval({ request, status = "pending", expiresAt, account, onApprove, onDeny, onEnterAnother, labels, className, ...props }: DeviceApprovalProps) {
  const t = useLabels(labels);
  const locale = useOptionalNasaq()?.locale ?? "en";
  const now = useNow(expiresAt);
  const shown = effectiveCodeStatus(status, expiresAt, now);
  const [pending, setPending] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | undefined>();
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);

  const decide = async (kind: "approve" | "deny") => {
    if (pending) return;
    setPending(kind);
    setError(undefined);
    try {
      const result = await (kind === "approve" ? onApprove() : onDeny());
      if (result?.error && mounted.current) setError(result.error);
    } catch {
      if (mounted.current) setError(t.failed);
    } finally {
      if (mounted.current) setPending(null);
    }
  };

  if (shown !== "pending") {
    const title = shown === "approved" ? t.approvedTitle : shown === "denied" ? t.deniedTitle : t.expiredTitle;
    const body = shown === "approved" ? t.approvedDescription : shown === "denied" ? t.deniedDescription : t.expiredDescription;
    return (
      <Card data-slot="device-approval" data-status={shown} role="status" className={cn("mx-auto w-full max-w-md items-center gap-4 p-8 text-center", className)} {...(props as ComponentProps<"div">)}>
        <OutcomeIcon status={shown} />
        <h1 className="text-h2 text-foreground">{title}</h1>
        <p className="text-body-sm text-muted-foreground">{body}</p>
        {shown === "expired" && onEnterAnother ? (
          <Button variant="primary" onClick={onEnterAnother}>
            {t.another}
          </Button>
        ) : null}
      </Card>
    );
  }

  const left = expiresAt !== undefined ? codeSecondsLeft(expiresAt, now) : undefined;
  const rows: Array<[string, ReactNode]> = [
    [t.device, request.deviceName],
    [t.platform, request.platform],
    [t.browser, request.browser],
    [t.ip, request.ip ? <bdi dir="ltr" className="font-mono">{request.ip}</bdi> : undefined],
    [t.location, request.location],
    [t.requested, request.requestedAt !== undefined ? formatDate(request.requestedAt, locale, { dateStyle: "medium", timeStyle: "short" }) : undefined],
  ];
  return (
    <Card data-slot="device-approval" data-status="pending" aria-busy={pending !== null || undefined} className={cn("mx-auto w-full max-w-md gap-5 p-6 sm:p-8", className)} {...(props as ComponentProps<"div">)}>
      <header className="flex flex-col gap-1.5">
        <h1 className="text-h2 text-foreground">{t.approveTitle}</h1>
        <p className="text-body-sm text-muted-foreground">{fill(t.approveDescription, { client: request.client })}</p>
        {account ? <p className="text-caption text-muted-foreground">{fill(t.signedInAs, { name: account.email ? `${account.name} (${account.email})` : account.name })}</p> : null}
      </header>
      <div className="flex flex-col items-center gap-1 rounded-card border border-border bg-muted/50 py-4">
        <span className="text-caption text-muted-foreground">{t.code}</span>
        <span data-slot="device-code" dir="ltr" className="font-mono text-h1 tracking-[0.12em] text-foreground">
          {formatUserCode(request.code)}
        </span>
        {left !== undefined ? (
          <span dir="ltr" className="text-caption text-muted-foreground tabular-nums">
            {fill(t.expiresIn, { time: formatCountdown(left) })}
          </span>
        ) : null}
      </div>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
        {rows.map(([label, value]) =>
          value ? (
            <div key={label} className="col-span-2 grid grid-cols-subgrid">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="m-0 text-start text-foreground">{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
      {request.scopes?.length ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-label text-foreground">{t.scopes}</p>
          <ul className="m-0 flex list-disc flex-col gap-0.5 ps-5 text-body-sm text-muted-foreground">
            {request.scopes.map((scope) => (
              <li key={scope}>{scope}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <Alert tone="warning">{t.warning}</Alert>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" size="lg" loading={pending === "deny"} disabled={pending === "approve"} onClick={() => void decide("deny")}>
          {t.deny}
        </Button>
        <Button variant="primary" size="lg" loading={pending === "approve"} disabled={pending === "deny"} onClick={() => void decide("approve")}>
          {t.approve}
        </Button>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- display */

export interface DeviceCodeDisplayProps extends Omit<ComponentProps<"div">, "children"> {
  /** The user code, `WDJBMJHT`. Shown grouped and copyable. */
  code: string;
  /** The address to open, e.g. `https://nasaq.app/device`. */
  verificationUri: string;
  /** The address with the code filled in. When set, it is the QR code's content. */
  verificationUriComplete?: string;
  /** Poll your token endpoint and pass the state. Default `pending`. */
  status?: DeviceCodeStatus;
  expiresAt?: Date | number | string;
  /** Adds "Get a new code" when it expired. */
  onRefresh?: () => void;
  /** Host mark shown above. Default: none. Pass a `ProductMark` or the brand's own component. */
  mark?: ReactNode;
  labels?: Partial<DevicePairingLabels>;
}

/**
 * The OAuth device flow, seen from the device asking for access: a big copyable code, the address to
 * visit, a QR code to skip the typing, and a live state (waiting, approved, denied, expired).
 */
export function DeviceCodeDisplay({ code, verificationUri, verificationUriComplete, status = "pending", expiresAt, onRefresh, mark, labels, className, ...props }: DeviceCodeDisplayProps) {
  const t = useLabels(labels);
  const now = useNow(expiresAt);
  const shown = effectiveCodeStatus(status, expiresAt, now);
  const left = expiresAt !== undefined ? codeSecondsLeft(expiresAt, now) : undefined;
  const grouped = formatUserCode(code);
  return (
    <Card data-slot="device-code-display" data-status={shown} className={cn("mx-auto w-full max-w-lg gap-5 p-6 text-center sm:p-8", className)} {...(props as ComponentProps<"div">)}>
      {mark ? <div className="flex justify-center">{mark}</div> : null}
      <header className="flex flex-col gap-1.5">
        <h1 className="text-h2 text-foreground">{t.displayTitle}</h1>
        <p className="text-body-sm text-muted-foreground">{t.displayDescription}</p>
      </header>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
        <div className={cn("flex flex-col items-center gap-1", shown !== "pending" && "opacity-50")} data-slot="device-code-qr">
          <div className="rounded-card border border-border bg-white p-1">
            <QrCode value={verificationUriComplete ?? verificationUri} size={148} margin={1} label={t.scan} />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-stretch gap-3 text-start">
          <div className="flex flex-col gap-1">
            <span className="text-caption text-muted-foreground">{t.address}</span>
            <CopyField value={verificationUri} label={t.address} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-caption text-muted-foreground">{t.yourCode}</span>
            <div className={cn("flex items-center justify-between gap-2 rounded-control border border-border bg-muted/50 py-2 ps-4 pe-2", shown !== "pending" && "opacity-60")}>
              <span data-slot="device-code" dir="ltr" className="font-mono text-h2 tracking-[0.12em] text-foreground">
                {grouped}
              </span>
              <CopyButton value={grouped} variant="secondary" />
            </div>
          </div>
        </div>
      </div>
      <div aria-live="polite" role="status" data-slot="device-code-status" className="flex flex-col items-center gap-2">
        {shown === "pending" ? (
          <p className="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
            <Spinner />
            {t.waiting}
            {left !== undefined ? (
              <span dir="ltr" className="tabular-nums">
                · {fill(t.expiresIn, { time: formatCountdown(left) })}
              </span>
            ) : null}
          </p>
        ) : null}
        {shown === "approved" ? (
          <p className="inline-flex items-center gap-2 text-body-sm text-nq-success-text">
            <Check aria-hidden="true" className="size-4" />
            {t.approvedDevice}
          </p>
        ) : null}
        {shown === "denied" ? (
          <p className="inline-flex items-center gap-2 text-body-sm text-nq-danger-text">
            <Ban aria-hidden="true" className="size-4" />
            {t.deniedDevice}
          </p>
        ) : null}
        {shown === "expired" ? (
          <>
            <p className="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
              <TimerOff aria-hidden="true" className="size-4" />
              {t.expiredTitle}
            </p>
            {onRefresh ? (
              <Button variant="primary" onClick={onRefresh}>
                {t.refresh}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- handoff */

export type HandoffState = "opening" | "opened" | "failed";

export interface DeviceHandoffProps extends Omit<ComponentProps<"div">, "children"> {
  /** The app's name, e.g. "Mahaam Desktop". */
  appName: string;
  /** The deep link that opens the app: `mahaam://auth/callback?token=…`. */
  href: string;
  /** `opening` while the browser is handing over; `opened` after; `failed` when the app did not answer. Default `opening`. */
  state?: HandoffState;
  /** Called when the person presses Open or Try again. Navigate to `href` yourself, or leave it to the link. */
  onOpen?: () => void;
  /** Sign in on the web instead. */
  browserHref?: string;
  /** A fallback code to type into the app when links cannot open it. */
  fallbackCode?: string;
  onCancel?: () => void;
  /** The app's official mark. Default: the provider brand's `ProductMark`. */
  mark?: ReactNode;
  labels?: Partial<DevicePairingLabels>;
}

/**
 * The page a browser shows after sign-in to hand the session to a native app: an "Open the app" link
 * to the deep link, a state line, a browser fallback and a typed-code fallback. It never navigates
 * on its own, so the host decides when to fire the deep link.
 */
export function DeviceHandoff({ appName, href, state = "opening", onOpen, browserHref, fallbackCode, onCancel, mark, labels, className, ...props }: DeviceHandoffProps) {
  const t = useLabels(labels);
  const message = state === "opening" ? t.handoffOpening : state === "opened" ? t.handoffOpened : t.handoffFailed;
  return (
    <Card data-slot="device-handoff" data-state={state} className={cn("mx-auto w-full max-w-md items-center gap-5 p-8 text-center", className)} {...(props as ComponentProps<"div">)}>
      <div className="flex items-center gap-3 text-muted-foreground" aria-hidden="true">
        <Laptop className="size-5" />
        <span className="h-px w-8 bg-border" />
        <Smartphone className="size-5" />
      </div>
      <div data-slot="device-handoff-mark">{mark ?? <ProductMark size={44} title="" />}</div>
      <h1 className="text-h2 text-foreground">{fill(t.handoffTitle, { app: appName })}</h1>
      <div role={state === "failed" ? "alert" : "status"} className="flex items-center gap-2 text-body-sm text-muted-foreground">
        {state === "opening" ? <Spinner /> : null}
        <p>{fill(message, { app: appName })}</p>
      </div>
      <a href={href} onClick={onOpen} className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full sm:w-auto")}>
        <ExternalLink aria-hidden="true" className="rtl:-scale-x-100" />
        {fill(state === "failed" || state === "opened" ? t.handoffAgain : t.handoffOpen, { app: appName })}
      </a>
      {browserHref ? (
        <a href={browserHref} className="text-body-sm text-foreground underline underline-offset-4">
          {t.handoffBrowser}
        </a>
      ) : null}
      {fallbackCode ? (
        <div className="flex w-full flex-col items-center gap-1.5 border-t border-border pt-4">
          <span className="text-caption text-muted-foreground">{t.handoffCode}</span>
          <span className="inline-flex items-center gap-1">
            <span dir="ltr" className="font-mono text-h3 tracking-[0.12em] text-foreground">
              {formatUserCode(fallbackCode)}
            </span>
            <CopyButton value={formatUserCode(fallbackCode)} />
          </span>
        </div>
      ) : null}
      {onCancel ? (
        <Button variant="link" size="sm" onClick={onCancel}>
          {t.handoffCancel}
        </Button>
      ) : null}
    </Card>
  );
}
