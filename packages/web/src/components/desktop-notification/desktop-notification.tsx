"use client";

import { BellOff, BellRing, MoreHorizontal, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { DateTime } from "../numeric";

const STRINGS = {
  en: {
    close: "Close",
    options: "Options",
    now: "now",
    stack: "Notifications",
    askTitle: "Turn on desktop notifications?",
    askBody: "Get a quiet alert when something needs you, even when this window is in the background.",
    enable: "Turn on",
    later: "Not now",
    waitingTitle: "Waiting for your system",
    waitingBody: "Choose Allow in the system dialog to finish.",
    grantedTitle: "Desktop notifications are on",
    grantedBody: "You will see alerts here. You can turn them off in system settings.",
    test: "Send a test",
    deniedTitle: "Notifications are blocked",
    deniedBody: "This app is not allowed to show alerts. Allow it in your system settings, then come back.",
    openSettings: "Open settings",
    unsupportedTitle: "Not available here",
    unsupportedBody: "Your system does not support desktop notifications.",
  },
  ar: {
    close: "إغلاق",
    options: "خيارات",
    now: "الآن",
    stack: "الإشعارات",
    askTitle: "تفعيل إشعارات سطح المكتب؟",
    askBody: "احصل على تنبيه هادئ عندما يحتاجك أمر ما، حتى لو كانت هذه النافذة في الخلفية.",
    enable: "تفعيل",
    later: "ليس الآن",
    waitingTitle: "بانتظار نظامك",
    waitingBody: "اختر السماح في نافذة النظام لإتمام التفعيل.",
    grantedTitle: "إشعارات سطح المكتب مفعلة",
    grantedBody: "ستظهر التنبيهات هنا. يمكنك إيقافها من إعدادات النظام.",
    test: "أرسل إشعاراً تجريبياً",
    deniedTitle: "الإشعارات محظورة",
    deniedBody: "لا يُسمح لهذا التطبيق بإظهار التنبيهات. اسمح به من إعدادات النظام ثم عد.",
    openSettings: "فتح الإعدادات",
    unsupportedTitle: "غير متاح هنا",
    unsupportedBody: "نظامك لا يدعم إشعارات سطح المكتب.",
  },
};

export type DesktopNotificationLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<DesktopNotificationLabels>) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels }, ar };
}

export type DesktopPlatform = "macos" | "windows";

export interface DesktopNotificationAction {
  id: string;
  label: string;
}

export interface DesktopNotificationProps extends Omit<ComponentProps<"div">, "title" | "children" | "onClick"> {
  /** Which system's look to draw. Default `macos`. */
  platform?: DesktopPlatform;
  /** The app that sent it, shown small above the title. */
  appName: string;
  /** Replaces the default app tile (the first letter of the app name). Use your own app icon here. */
  appIcon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  /** A large picture on the trailing side (mac) or under the text (Windows). */
  image?: ReactNode;
  /** When it arrived. Omit to show "now". */
  time?: number | Date | string;
  /** Buttons on the card. */
  actions?: readonly DesktopNotificationAction[];
  onAction?: (id: string) => void;
  /** The card body was clicked. */
  onActivate?: () => void;
  /** The close button was pressed, or `dismissAfter` ran out. */
  onClose?: () => void;
  /** Milliseconds before it closes itself. Hovering or focusing it pauses the clock. 0 keeps it. Default 0. */
  dismissAfter?: number;
  labels?: Partial<DesktopNotificationLabels>;
}

/**
 * A notification card drawn in the style of the system's own, for apps that run inside Electron and want the same
 * card in a web preview, a settings screen or a tutorial. It does not talk to the operating system: to raise a real
 * one use `new Notification()` or your Electron main process, and use this to show what it will look like.
 */
export function DesktopNotification({
  platform = "macos",
  appName,
  appIcon,
  title,
  body,
  image,
  time,
  actions,
  onAction,
  onActivate,
  onClose,
  dismissAfter = 0,
  labels,
  className,
  ...props
}: DesktopNotificationProps) {
  const { t } = useLabels(labels);
  const mac = platform === "macos";
  const [paused, setPaused] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!dismissAfter || paused) return;
    const id = setTimeout(() => closeRef.current?.(), dismissAfter);
    return () => clearTimeout(id);
  }, [dismissAfter, paused]);

  const tile = appIcon ?? (
    <span aria-hidden className={cn("grid size-full place-items-center bg-primary text-label text-primary-foreground", mac ? "rounded-[22%]" : "rounded-control")}>
      {appName.slice(0, 1).toUpperCase()}
    </span>
  );

  return (
    <div
      role="alert"
      data-slot="desktop-notification"
      data-platform={platform}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "group/dn relative flex w-[22rem] max-w-full gap-2 border border-border text-foreground shadow-floating",
        "flex-col p-3", mac ? "rounded-[1.1rem] bg-popover/90 backdrop-blur-xl" : "rounded-card bg-card",
        className,
      )}
      {...props}
    >
      <div className={cn("flex min-w-0 flex-1 gap-3", !mac && "items-start")}>
        <span className={cn("shrink-0 self-start", mac ? "size-10" : "size-6")}>{tile}</span>
        <button
          type="button"
          onClick={onActivate}
          disabled={!onActivate}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus",
            onActivate ? "cursor-default" : "cursor-default disabled:opacity-100",
          )}
        >
          {mac ? (
            <>
              <span dir="auto" className="w-full truncate text-label">
                {title}
              </span>
              {body ? (
                <span dir="auto" className="line-clamp-3 w-full text-body-sm text-nq-fg-body">
                  {body}
                </span>
              ) : null}
            </>
          ) : (
            <>
              <span className="flex w-full items-center gap-2 text-caption text-muted-foreground">
                <span className="truncate">{appName}</span>
              </span>
              <span dir="auto" className="w-full truncate text-label">
                {title}
              </span>
              {body ? (
                <span dir="auto" className="line-clamp-3 w-full text-body-sm text-nq-fg-body">
                  {body}
                </span>
              ) : null}
            </>
          )}
        </button>
        {mac ? (
          <span className="flex shrink-0 flex-col items-end gap-1 text-caption text-muted-foreground">
            <span>{time === undefined ? t.now : <DateTime value={time} format={{ timeStyle: "short" }} />}</span>
            {image ? <span className="size-10 overflow-hidden rounded-control">{image}</span> : null}
          </span>
        ) : null}
        {!mac ? (
          <span className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
            <span className="me-1 text-caption">{time === undefined ? t.now : <DateTime value={time} format={{ timeStyle: "short" }} />}</span>
            <Button variant="ghost" size="icon-sm" aria-label={t.options} tabIndex={-1}>
              <MoreHorizontal aria-hidden className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={t.close} onClick={onClose}>
              <X aria-hidden className="size-4" />
            </Button>
          </span>
        ) : null}
      </div>
      {!mac && image ? <div className="overflow-hidden rounded-control">{image}</div> : null}
      {actions?.length ? (
        <div className={cn("flex gap-2", mac && "ps-[3.25rem]")} role="group" aria-label={appName}>
          {actions.map((a) => (
            <Button key={a.id} variant="secondary" size="sm" className={mac ? "" : "flex-1"} onClick={() => onAction?.(a.id)}>
              {a.label}
            </Button>
          ))}
        </div>
      ) : null}
      {mac ? (
        <>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={t.close}
            onClick={onClose}
            className="absolute -start-2 -top-2 size-5 rounded-full opacity-0 transition-opacity duration-150 ease-nq focus-visible:opacity-100 group-hover/dn:opacity-100"
          >
            <X aria-hidden className="size-3" />
          </Button>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ stack */

export interface DesktopNotificationEntry extends Omit<DesktopNotificationProps, "platform" | "onClose" | "onAction" | "onActivate"> {
  id: string;
}

export interface DesktopNotificationStackProps extends Omit<ComponentProps<"div">, "children"> {
  items: readonly DesktopNotificationEntry[];
  platform?: DesktopPlatform;
  onClose: (id: string) => void;
  onAction?: (id: string, action: string) => void;
  onActivate?: (id: string) => void;
  /** Most cards shown at once. Older ones wait. Default 3. */
  max?: number;
  /** `absolute` places the stack inside a `relative` parent, `fixed` on the screen. Default `absolute`. */
  placement?: "absolute" | "fixed";
  labels?: Partial<DesktopNotificationLabels>;
}

/**
 * Where the cards land: the top corner on macOS and the bottom corner on Windows, on the inline-end side (the
 * left in Arabic). Newest first on macOS, newest last on Windows, like the systems do.
 */
export function DesktopNotificationStack({
  items,
  platform = "macos",
  onClose,
  onAction,
  onActivate,
  max = 3,
  placement = "absolute",
  labels,
  className,
  ...props
}: DesktopNotificationStackProps) {
  const { t } = useLabels(labels);
  const mac = platform === "macos";
  const shown = items.slice(-max);
  const ordered = mac ? [...shown].reverse() : shown;
  return (
    <div
      role="region"
      aria-label={t.stack}
      data-slot="desktop-notification-stack"
      className={cn(
        "pointer-events-none z-50 flex w-[22rem] max-w-[calc(100%-1.5rem)] flex-col gap-2 p-3",
        placement,
        mac ? "end-0 top-0" : "bottom-0 end-0 justify-end",
        className,
      )}
      {...props}
    >
      {ordered.map(({ id, ...rest }) => (
        <StackEntry key={id} platform={platform}>
          <DesktopNotification
            {...rest}
            platform={platform}
            labels={labels}
            className="pointer-events-auto w-full"
            onClose={() => onClose(id)}
            onAction={(a) => onAction?.(id, a)}
            onActivate={onActivate ? () => onActivate(id) : undefined}
          />
        </StackEntry>
      ))}
    </div>
  );
}

function StackEntry({ platform, children }: { platform: DesktopPlatform; children: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={cn(
        "transition-[opacity,translate] duration-200 ease-nq motion-reduce:transition-none",
        shown ? "translate-x-0 translate-y-0 opacity-100" : platform === "macos" ? "opacity-0 ltr:translate-x-6 rtl:-translate-x-6" : "translate-y-4 opacity-0",
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ permission */

export type DesktopPermission = "default" | "granted" | "denied" | "unsupported";

/** The step of the permission flow to show. `asking` is the wait while the system dialog is open. */
export type DesktopPermissionStep = "ask" | "asking" | "granted" | "denied" | "unsupported";

/** Maps the permission and whether the system dialog is open to the step of the flow. Pure. */
export function permissionStep(permission: DesktopPermission, asking: boolean): DesktopPermissionStep {
  if (permission === "unsupported") return "unsupported";
  if (permission === "granted") return "granted";
  if (permission === "denied") return "denied";
  return asking ? "asking" : "ask";
}

/**
 * The browser or Electron notification permission, kept in state. `request` opens the system dialog. It is safe to
 * render on the server: the permission reads `default` until the client mounts.
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<DesktopPermission>("default");
  useEffect(() => {
    if (typeof Notification === "undefined") setPermission("unsupported");
    else setPermission(Notification.permission as DesktopPermission);
  }, []);
  const request = useCallback(async (): Promise<DesktopPermission> => {
    if (typeof Notification === "undefined") return "unsupported";
    const result = (await Notification.requestPermission()) as DesktopPermission;
    setPermission(result);
    return result;
  }, []);
  return { permission, request };
}

export interface NotificationPermissionPromptProps extends Omit<ComponentProps<"div">, "children"> {
  permission: DesktopPermission;
  /** Opens the system dialog. Resolves with the answer, and the prompt follows `permission`. */
  onRequest: () => void | Promise<unknown>;
  /** "Not now". Omit to hide the button. */
  onDismiss?: () => void;
  /** Sends a test notification once granted. */
  onTest?: () => void;
  /** Opens the operating system's settings when blocked. Omit to show only the words. */
  onOpenSettings?: () => void;
  labels?: Partial<DesktopNotificationLabels>;
}

/**
 * The soft ask that comes before the system's own dialog. It explains why first, so people do not reflexively press
 * Block (which can not be undone from inside the app), then waits, then confirms, or explains how to unblock.
 */
export function NotificationPermissionPrompt({ permission, onRequest, onDismiss, onTest, onOpenSettings, labels, className, ...props }: NotificationPermissionPromptProps) {
  const { t } = useLabels(labels);
  const titleId = useId();
  const [asking, setAsking] = useState(false);
  const step = permissionStep(permission, asking);
  const copy = {
    ask: [t.askTitle, t.askBody],
    asking: [t.waitingTitle, t.waitingBody],
    granted: [t.grantedTitle, t.grantedBody],
    denied: [t.deniedTitle, t.deniedBody],
    unsupported: [t.unsupportedTitle, t.unsupportedBody],
  }[step];
  const Icon = step === "denied" || step === "unsupported" ? BellOff : BellRing;
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      data-slot="desktop-notification-permission"
      data-step={step}
      className={cn("flex w-full max-w-md flex-col gap-3 rounded-card border border-border bg-card p-4", className)}
      {...props}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-full", step === "denied" ? "bg-nq-warning-soft" : "bg-secondary")}>
          <Icon className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-1" aria-live="polite">
          <h3 id={titleId} className="text-label">
            {copy[0]}
          </h3>
          <p className="text-body-sm text-muted-foreground">{copy[1]}</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {step === "ask" || step === "asking" ? (
          <>
            {onDismiss ? (
              <Button variant="ghost" onClick={onDismiss} disabled={step === "asking"}>
                {t.later}
              </Button>
            ) : null}
            <Button
              variant="primary"
              loading={step === "asking"}
              onClick={async () => {
                setAsking(true);
                try {
                  await onRequest();
                } finally {
                  setAsking(false);
                }
              }}
            >
              {t.enable}
            </Button>
          </>
        ) : null}
        {step === "granted" && onTest ? (
          <Button variant="secondary" onClick={onTest}>
            {t.test}
          </Button>
        ) : null}
        {step === "denied" && onOpenSettings ? (
          <Button variant="secondary" onClick={onOpenSettings}>
            {t.openSettings}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
