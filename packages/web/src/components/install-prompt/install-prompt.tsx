"use client";

import { CircleCheck, Download, Laptop, Share, Smartphone, SquarePlus, Tablet, Trash2 } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { type DesktopNotificationLabels, type DesktopPermission, NotificationPermissionPrompt } from "../desktop-notification";
import { DateTime } from "../numeric";
import { ProductMark } from "../product-mark";
import { Switch } from "../switch";
import { detectInstallPlatform, type InstallPlatform } from "./install-prompt-platform";

const STRINGS = {
  en: {
    title: "Install {app}",
    description: "Add it to your device for a faster start, a full-screen window and offline access.",
    benefitFast: "Opens in one tap, like any app",
    benefitOffline: "Keeps working when the connection drops",
    benefitAlerts: "Can send you alerts on this device",
    install: "Install",
    installing: "Installing",
    later: "Not now",
    done: "Done",
    installedTitle: "{app} is installed",
    installedBody: "Open it from your home screen or app list.",
    iosIntro: "Safari does not show an install button. Add it yourself in two steps.",
    iosStep1: "Tap the Share button in the toolbar",
    iosStep2: "Choose Add to Home Screen, then Add",
    unsupportedBody: "This browser can not install apps. Open the page in Chrome, Edge or Safari to install it.",
    pushTitle: "Notifications on this device",
    pushDescription: "Each device is turned on by itself, so your phone can buzz while your laptop stays quiet.",
    pushSwitch: "Send notifications to this device",
    pushOn: "This device will get notifications.",
    pushOff: "This device will not get notifications.",
    pushNeedsInstall: "On iPhone and iPad, install the app to your home screen first. Notifications only work from the installed app.",
    devices: "Your devices",
    thisDevice: "This device",
    lastSeen: "Last seen",
    remove: "Remove {name}",
    test: "Send a test",
    noDevices: "No other devices yet.",
  },
  ar: {
    title: "ثبّت {app}",
    description: "أضفه إلى جهازك لبداية أسرع ونافذة كاملة وعمل دون اتصال.",
    benefitFast: "يفتح بلمسة واحدة كأي تطبيق",
    benefitOffline: "يواصل العمل عند انقطاع الاتصال",
    benefitAlerts: "يمكنه إرسال تنبيهات إلى هذا الجهاز",
    install: "تثبيت",
    installing: "جارٍ التثبيت",
    later: "ليس الآن",
    done: "تم",
    installedTitle: "تم تثبيت {app}",
    installedBody: "افتحه من الشاشة الرئيسية أو قائمة التطبيقات.",
    iosIntro: "لا يعرض Safari زر تثبيت. أضفه بنفسك في خطوتين.",
    iosStep1: "اضغط زر المشاركة في شريط الأدوات",
    iosStep2: "اختر إضافة إلى الشاشة الرئيسية ثم إضافة",
    unsupportedBody: "هذا المتصفح لا يدعم تثبيت التطبيقات. افتح الصفحة في Chrome أو Edge أو Safari لتثبيته.",
    pushTitle: "الإشعارات على هذا الجهاز",
    pushDescription: "يُفعَّل كل جهاز على حدة، فيهتز هاتفك بينما يبقى حاسوبك هادئاً.",
    pushSwitch: "إرسال الإشعارات إلى هذا الجهاز",
    pushOn: "سيستلم هذا الجهاز الإشعارات.",
    pushOff: "لن يستلم هذا الجهاز الإشعارات.",
    pushNeedsInstall: "على iPhone وiPad ثبّت التطبيق على الشاشة الرئيسية أولاً. تعمل الإشعارات من التطبيق المثبّت فقط.",
    devices: "أجهزتك",
    thisDevice: "هذا الجهاز",
    lastSeen: "آخر ظهور",
    remove: "إزالة {name}",
    test: "أرسل إشعاراً تجريبياً",
    noDevices: "لا توجد أجهزة أخرى بعد.",
  },
};

export type InstallPromptLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<InstallPromptLabels>) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels }, ar };
}

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

/* ------------------------------------------------------------------ hook */

/** The event Chrome, Edge and Android fire when the app can be installed. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * The browser's install state. It listens for `beforeinstallprompt` (and keeps the event), detects an already
 * installed app and iOS Safari. `install()` opens the browser's own dialog. Safe on the server: the platform reads
 * `unsupported` until the client mounts.
 */
export function useInstallPrompt() {
  const [platform, setPlatform] = useState<InstallPlatform>("unsupported");
  const eventRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    setPlatform(detectInstallPlatform(navigator.userAgent, Boolean(standalone), false));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      eventRef.current = event as BeforeInstallPromptEvent;
      setPlatform("prompt");
    };
    const onInstalled = () => {
      eventRef.current = null;
      setPlatform("installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const event = eventRef.current;
    if (!event) return "unavailable";
    await event.prompt();
    const { outcome } = await event.userChoice;
    eventRef.current = null;
    if (outcome === "accepted") setPlatform("installed");
    return outcome;
  }, []);

  return { platform, install };
}

/* ------------------------------------------------------------------ install dialog */

export interface InstallPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which path to show. From `useInstallPrompt()`. */
  platform: InstallPlatform;
  /** The app's name, in the title. */
  appName: string;
  /** Your app icon. Defaults to the provider brand's mark. */
  appIcon?: ReactNode;
  /** Replaces the three default benefit lines. */
  benefits?: readonly string[];
  /** Opens the browser's install dialog. From `useInstallPrompt().install`. */
  onInstall?: () => void | Promise<unknown>;
  /** "Not now": remember it, for example with `nextAskAt`. Closes the dialog. */
  onDismiss?: () => void;
  labels?: Partial<InstallPromptLabels>;
}

/**
 * The dialog that asks someone to install the web app. It explains the benefit before the browser's own prompt, walks
 * iPhone and iPad through Share, then Add to Home Screen, and confirms when the app is installed. It is controlled: you
 * decide when to open it (after a useful moment, not on first load) and remember "Not now".
 */
export function InstallPrompt({ open, onOpenChange, platform, appName, appIcon, benefits, onInstall, onDismiss, labels }: InstallPromptProps) {
  const { t } = useLabels(labels);
  const [busy, setBusy] = useState(false);
  const lines = benefits ?? [t.benefitFast, t.benefitOffline, t.benefitAlerts];
  const notNow = () => {
    onDismiss?.();
    onOpenChange(false);
  };
  const install = async () => {
    setBusy(true);
    try {
      await onInstall?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-slot="install-prompt" data-platform={platform} className="max-w-md">
        {platform === "installed" ? (
          <>
            <DialogHeader className="items-center text-center">
              <span aria-hidden className="mb-1 inline-flex size-12 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
                <CircleCheck className="size-6" />
              </span>
              <DialogTitle>{fill(t.installedTitle, { app: appName })}</DialogTitle>
              <DialogDescription>{t.installedBody}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="primary" onClick={() => onOpenChange(false)}>
                {t.done}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <span className="mb-1 inline-flex size-12 items-center justify-center overflow-hidden rounded-card border border-border bg-card">{appIcon ?? <ProductMark size={28} title="" />}</span>
              <DialogTitle>{fill(t.title, { app: appName })}</DialogTitle>
              <DialogDescription>{platform === "unsupported" ? t.unsupportedBody : platform === "ios" ? t.iosIntro : t.description}</DialogDescription>
            </DialogHeader>
            {platform === "prompt" ? (
              <ul className="flex flex-col gap-2 text-body-sm text-nq-fg-body">
                {lines.map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <CircleCheck aria-hidden className="size-4 shrink-0 text-nq-success-text" />
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
            {platform === "ios" ? (
              <ol className="flex flex-col gap-2">
                {[
                  [Share, t.iosStep1],
                  [SquarePlus, t.iosStep2],
                ].map(([Icon, text], i) => {
                  const Glyph = Icon as typeof Share;
                  return (
                    <li key={i} className="flex items-center gap-3 rounded-control border border-border bg-card p-3 text-body-sm">
                      <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-control bg-secondary">
                        <Glyph className="size-4" />
                      </span>
                      <span>
                        <bdi className="me-1 text-muted-foreground tabular-nums">{i + 1}.</bdi>
                        {text as string}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : null}
            <DialogFooter>
              <Button variant="ghost" onClick={notNow}>
                {t.later}
              </Button>
              {platform === "prompt" ? (
                <Button variant="primary" loading={busy} onClick={install}>
                  <Download aria-hidden />
                  {t.install}
                </Button>
              ) : (
                <Button variant="primary" onClick={() => onOpenChange(false)}>
                  {t.done}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ push opt-in */

export interface PushDevice {
  id: string;
  name: string;
  kind?: "phone" | "tablet" | "computer";
  lastSeen?: number | Date | string;
  /** The device you are on now. */
  current?: boolean;
}

export interface PushOptInProps extends Omit<ComponentProps<"section">, "children"> {
  /** The browser's notification permission. From `useNotificationPermission()`. */
  permission: DesktopPermission;
  /** Opens the browser's permission dialog. From `useNotificationPermission().request`. */
  onRequestPermission: () => void | Promise<unknown>;
  /** Whether this device is subscribed to push. */
  subscribed: boolean;
  onSubscribedChange: (subscribed: boolean) => Promise<void | { error?: string }>;
  /** Devices already subscribed, this one included when it is. */
  devices?: readonly PushDevice[];
  onRemoveDevice?: (id: string) => Promise<void | { error?: string }>;
  onTest?: () => void;
  /** iPhone and iPad only deliver push to an installed app: show the note. */
  requiresInstall?: boolean;
  /** Opens the system settings when notifications are blocked. */
  onOpenSettings?: () => void;
  labels?: Partial<InstallPromptLabels>;
  permissionLabels?: Partial<DesktopNotificationLabels>;
}

const deviceIcon = { phone: Smartphone, tablet: Tablet, computer: Laptop } as const;

/**
 * The per-device push opt-in. Until the browser has allowed notifications it shows the soft ask from
 * `NotificationPermissionPrompt`. Once allowed it shows one switch for this device and the list of the person's
 * other subscribed devices, each removable, so a phone can be on while a laptop is off.
 */
export function PushOptIn({
  permission,
  onRequestPermission,
  subscribed,
  onSubscribedChange,
  devices = [],
  onRemoveDevice,
  onTest,
  requiresInstall = false,
  onOpenSettings,
  labels,
  permissionLabels,
  className,
  ...props
}: PushOptInProps) {
  const { t } = useLabels(labels);
  const titleId = useId();
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const granted = permission === "granted";

  const toggle = async (on: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const result = await onSubscribedChange(on);
      if (result && result.error) setError(result.error);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: string) => {
    if (!onRemoveDevice) return;
    setRemoving(id);
    try {
      await onRemoveDevice(id);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <section
      data-slot="push-opt-in"
      aria-labelledby={titleId}
      className={cn("flex w-full max-w-xl flex-col gap-4 rounded-card border border-border bg-card p-4", className)}
      {...props}
    >
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="text-h3">
          {t.pushTitle}
        </h2>
        <p className="text-body-sm text-muted-foreground">{t.pushDescription}</p>
      </header>
      {requiresInstall ? <Alert tone="info">{t.pushNeedsInstall}</Alert> : null}
      {!granted ? (
        <NotificationPermissionPrompt className="max-w-none" permission={permission} onRequest={onRequestPermission} onOpenSettings={onOpenSettings} labels={permissionLabels} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 rounded-control border border-border p-3">
            <div className="flex min-w-0 flex-col">
              <span id={`${titleId}-switch`} className="text-label">
                {t.pushSwitch}
              </span>
              <span className="text-caption text-muted-foreground" aria-live="polite">
                {subscribed ? t.pushOn : t.pushOff}
              </span>
            </div>
            <Switch checked={subscribed} disabled={saving} onCheckedChange={toggle} aria-labelledby={`${titleId}-switch`} />
          </div>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          {subscribed && onTest ? (
            <div>
              <Button variant="secondary" size="sm" onClick={onTest}>
                {t.test}
              </Button>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <h3 className="text-label">{t.devices}</h3>
            {devices.length ? (
              <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
                {devices.map((d) => {
                  const Icon = deviceIcon[d.kind ?? "computer"];
                  return (
                    <li key={d.id} className="flex items-center gap-3 p-3">
                      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-2 text-body-sm">
                          <span dir="auto" className="truncate">
                            {d.name}
                          </span>
                          {d.current ? <Badge variant="info">{t.thisDevice}</Badge> : null}
                        </span>
                        {d.lastSeen !== undefined ? (
                          <span className="text-caption text-muted-foreground">
                            {t.lastSeen} <DateTime value={d.lastSeen} relative />
                          </span>
                        ) : null}
                      </div>
                      {onRemoveDevice && !d.current ? (
                        <Button variant="ghost" size="icon-sm" aria-label={fill(t.remove, { name: d.name })} loading={removing === d.id} onClick={() => remove(d.id)}>
                          <Trash2 aria-hidden />
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-body-sm text-muted-foreground">{t.noDevices}</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
