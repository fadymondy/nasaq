"use client";

import { RefreshCw } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button } from "../button";
import { ConfirmButton } from "../alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { QrCode } from "../qr-code";
import { Status } from "../status";

const STRINGS = {
  en: {
    title: "Connect WhatsApp",
    description: "Link a WhatsApp number by scanning a code from the phone.",
    stepsLabel: "How to link",
    step1: "Open WhatsApp on your phone.",
    step2: "Go to Settings, then Linked devices.",
    step3: "Tap Link a device and point the camera at this code.",
    start: "Show QR code",
    starting: "Preparing the code…",
    qrLabel: "WhatsApp link QR code",
    expiresIn: (s: number) => `Code expires in ${s}s`,
    expired: "This code expired",
    refresh: "New code",
    refreshing: "Refreshing…",
    autoRefresh: "A new code appears automatically when this one expires.",
    connected: "Connected",
    disconnected: "Not connected",
    connectedAs: (name: string) => `Linked to ${name}`,
    since: (when: string) => `Since ${when}`,
    disconnect: "Disconnect",
    disconnectTitle: "Disconnect WhatsApp?",
    disconnectBody: "Messages will stop until you scan a new code.",
    confirm: "Yes, disconnect",
    cancel: "Cancel",
    failed: "Could not get a code. Check the connection and try again.",
    retry: "Try again",
    connectingStatus: "Waiting for the scan",
  },
  ar: {
    title: "ربط واتساب",
    description: "اربط رقم واتساب بمسح رمز من الهاتف.",
    stepsLabel: "طريقة الربط",
    step1: "افتح واتساب على هاتفك.",
    step2: "اذهب إلى الإعدادات ثم الأجهزة المرتبطة.",
    step3: "اضغط «ربط جهاز» ووجّه الكاميرا إلى هذا الرمز.",
    start: "إظهار رمز QR",
    starting: "جارٍ تجهيز الرمز…",
    qrLabel: "رمز QR لربط واتساب",
    expiresIn: (s: number) => `ينتهي الرمز خلال ${s} ثانية`,
    expired: "انتهت صلاحية هذا الرمز",
    refresh: "رمز جديد",
    refreshing: "جارٍ التحديث…",
    autoRefresh: "يظهر رمز جديد تلقائيًا عند انتهاء هذا الرمز.",
    connected: "متصل",
    disconnected: "غير متصل",
    connectedAs: (name: string) => `مرتبط بالرقم ${name}`,
    since: (when: string) => `منذ ${when}`,
    disconnect: "قطع الاتصال",
    disconnectTitle: "قطع اتصال واتساب؟",
    disconnectBody: "ستتوقف الرسائل إلى أن تمسح رمزًا جديدًا.",
    confirm: "نعم، اقطع الاتصال",
    cancel: "إلغاء",
    failed: "تعذر الحصول على رمز. تحقق من الاتصال وحاول مرة أخرى.",
    retry: "حاول مرة أخرى",
    connectingStatus: "بانتظار المسح",
  },
};

export type WhatsappQrConnectLabels = (typeof STRINGS)["en"];

export type WhatsappConnectStatus = "disconnected" | "qr" | "connected";

export interface WhatsappQrConnectProps extends Omit<ComponentProps<"div">, "children"> {
  status: WhatsappConnectStatus;
  /** The current pairing payload from your server. Changes every ~20 to 60 seconds. */
  qr?: string;
  /** When `qr` stops being valid (ms since epoch). The countdown runs to it, then `onRefresh` is called. */
  expiresAt?: number;
  /** The linked number, shown when connected. Rendered LTR. */
  account?: string;
  /** Display text for when it was linked, already formatted. */
  connectedSince?: string;
  /** Ask the server to begin pairing; it should then send a first `qr`. */
  onStart?: () => Promise<void>;
  /** Ask for a new code. Called by the button and automatically when the code expires. */
  onRefresh?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  /** Pairing failed to start or refresh. Shows a retry. */
  error?: boolean;
  /** Turn off the automatic refresh on expiry. Default true. */
  autoRefresh?: boolean;
  /** Current time in ms, for tests and stories. Default `Date.now()`. */
  now?: () => number;
  labels?: Partial<WhatsappQrConnectLabels>;
}

/**
 * Link a WhatsApp number by scanning a QR code. Presentational: your server owns the pairing session and
 * feeds the current `qr` and its `expiresAt`. It shows the steps, a live countdown, refreshes the code when
 * it expires, and switches to a connected card with a confirmed disconnect. The code is drawn plain black on
 * white with square modules, because phone cameras need the contrast; it is not restyled by the theme.
 */
export function WhatsappQrConnect({
  status,
  qr,
  expiresAt,
  account,
  connectedSince,
  onStart,
  onRefresh,
  onDisconnect,
  error = false,
  autoRefresh = true,
  now = Date.now,
  labels,
  className,
  ...props
}: WhatsappQrConnectProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [busy, setBusy] = useState<"start" | "refresh" | null>(null);
  const [left, setLeft] = useState<number | null>(null);

  const showQr = status === "qr" && !!qr;

  // Countdown, one tick a second. On zero, ask for a new code once per code.
  useEffect(() => {
    if (!showQr || expiresAt == null) {
      setLeft(null);
      return;
    }
    let fired = false;
    const tick = () => {
      const s = Math.max(0, Math.ceil((expiresAt - now()) / 1000));
      setLeft(s);
      if (s === 0 && !fired) {
        fired = true;
        if (autoRefresh && onRefresh) {
          setBusy("refresh");
          onRefresh().finally(() => setBusy(null));
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [showQr, expiresAt, qr, autoRefresh, onRefresh, now]);

  async function run(kind: "start" | "refresh", fn?: () => Promise<void>) {
    if (!fn || busy) return;
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  const tone = status === "connected" ? "success" : status === "qr" ? "info" : "neutral";
  const statusText = status === "connected" ? t.connected : status === "qr" ? t.connectingStatus : t.disconnected;
  const expired = left === 0;

  return (
    <Card data-slot="whatsapp-qr-connect" data-status={status} className={cn("w-full max-w-2xl", className)} {...props}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h2">{t.title}</CardTitle>
          <Status tone={tone}>{statusText}</Status>
        </div>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {status === "connected" ? (
          <div className="flex flex-wrap items-center justify-between gap-3" data-slot="whatsapp-connected">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-label text-foreground">
                {t.connectedAs("")}
                <bdi dir="ltr" className="tabular-nums">
                  {account}
                </bdi>
              </p>
              {connectedSince ? <p className="text-caption text-muted-foreground">{t.since(connectedSince)}</p> : null}
            </div>
            {onDisconnect ? (
              <ConfirmButton
                variant="danger"
                size="sm"
                title={t.disconnectTitle}
                description={t.disconnectBody}
                confirmLabel={t.confirm}
                cancelLabel={t.cancel}
                onConfirm={onDisconnect}
              >
                {t.disconnect}
              </ConfirmButton>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-2 self-center sm:self-start" data-slot="whatsapp-qr">
              {showQr && qr ? (
                <div className={cn("relative rounded-card border border-border bg-white p-2 transition-opacity", (expired || busy === "refresh") && "opacity-40")}>
                  <QrCode value={qr} size={192} margin={1} label={t.qrLabel} />
                </div>
              ) : (
                <div className="flex size-[208px] items-center justify-center rounded-card border border-dashed border-border bg-secondary p-4 text-center">
                  {busy === "start" ? (
                    <span className="text-body-sm text-muted-foreground" role="status">
                      {t.starting}
                    </span>
                  ) : (
                    <Button type="button" variant="primary" size="sm" disabled={!onStart} onClick={() => run("start", onStart)}>
                      {t.start}
                    </Button>
                  )}
                </div>
              )}
              {showQr ? (
                <div className="flex flex-col items-center gap-1.5">
                  {left != null ? (
                    <p className="text-caption tabular-nums text-muted-foreground" role="timer" aria-live="off" data-slot="whatsapp-countdown">
                      {expired ? t.expired : t.expiresIn(left)}
                    </p>
                  ) : null}
                  <Button type="button" variant="ghost" size="sm" loading={busy === "refresh"} disabled={!onRefresh} onClick={() => run("refresh", onRefresh)}>
                    <RefreshCw aria-hidden />
                    {busy === "refresh" ? t.refreshing : t.refresh}
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <ol aria-label={t.stepsLabel} className="flex flex-col gap-2.5">
                {[t.step1, t.step2, t.step3].map((s, i) => (
                  <li key={s} className="flex items-start gap-2.5 text-body-sm text-foreground">
                    <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-caption tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
              {showQr && autoRefresh ? <p className="text-caption text-muted-foreground">{t.autoRefresh}</p> : null}
              {error ? (
                <Alert tone="danger" action={onStart || onRefresh ? <Button type="button" size="sm" variant="secondary" onClick={() => run(showQr ? "refresh" : "start", showQr ? onRefresh : onStart)}>{t.retry}</Button> : undefined}>
                  {t.failed}
                </Alert>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
