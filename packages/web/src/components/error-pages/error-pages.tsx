"use client";

import { ArrowLeft, Building2, CircleCheck, FileQuestion, Hourglass, type LucideIcon, RotateCw, ServerCrash, ShieldX, WifiOff, Wrench } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { CopyButton } from "../copy-button";
import { DateTime } from "../numeric";
import { ProductLogo } from "../product-mark";
import { type ErrorPageKind, statusCodeFor } from "./error-pages-kinds";

const STRINGS = {
  en: {
    home: "Go to home",
    back: "Go back",
    retry: "Try again",
    support: "Contact support",
    switchWorkspace: "Switch workspace",
    requestAccess: "Request access",
    notify: "Notify me",
    notified: "Done. We will tell you when it is ready.",
    reload: "Reload",
    errorId: "Error ID",
    copyId: "Copy error ID",
    notFoundTitle: "We could not find that page",
    notFoundBody: "The address may be mistyped, or the page may have moved or been removed.",
    serverTitle: "Something went wrong on our side",
    serverBody: "The error has been recorded. Try again in a moment, and contact support if it keeps happening.",
    offlineTitle: "You are offline",
    offlineBody: "Check your connection. Your changes are kept on this device and will sync when you are back.",
    onlineTitle: "You are back online",
    onlineBody: "The connection is back. Reload to pick up where you left off.",
    maintenanceTitle: "We are doing some maintenance",
    maintenanceBody: "The service is briefly unavailable while we make it better.",
    maintenanceEta: "Expected back",
    forbiddenTitle: "You do not have access to this page",
    forbiddenBody: "Your account does not have permission to see this. Ask an admin of the workspace for access.",
    workspaceTitle: "That workspace does not exist",
    workspaceBody: "The workspace address may be wrong, or you may have been removed from it.",
    workspaceNamed: "There is no workspace called {name}.",
    soonTitle: "Coming soon",
    soonBody: "We are still building this part. It will show up here when it is ready.",
    soonNamed: "{name} is coming soon",
  },
  ar: {
    home: "الذهاب إلى الرئيسية",
    back: "رجوع",
    retry: "حاول مرة أخرى",
    support: "تواصل مع الدعم",
    switchWorkspace: "تبديل مساحة العمل",
    requestAccess: "طلب صلاحية",
    notify: "نبّهني",
    notified: "تم. سنخبرك عندما يصبح جاهزاً.",
    reload: "إعادة التحميل",
    errorId: "معرّف الخطأ",
    copyId: "نسخ معرّف الخطأ",
    notFoundTitle: "لم نعثر على هذه الصفحة",
    notFoundBody: "قد يكون العنوان مكتوباً بشكل خاطئ، أو أن الصفحة نُقلت أو حُذفت.",
    serverTitle: "حدث خطأ من جهتنا",
    serverBody: "سُجّل الخطأ. حاول مجدداً بعد لحظات، وتواصل مع الدعم إذا استمر.",
    offlineTitle: "أنت غير متصل",
    offlineBody: "تحقق من اتصالك. تغييراتك محفوظة على هذا الجهاز وستُزامَن عند عودتك.",
    onlineTitle: "عاد الاتصال",
    onlineBody: "عاد الاتصال بالإنترنت. أعد التحميل لتكمل من حيث توقفت.",
    maintenanceTitle: "نجري بعض أعمال الصيانة",
    maintenanceBody: "الخدمة غير متاحة لفترة وجيزة أثناء تحسينها.",
    maintenanceEta: "العودة المتوقعة",
    forbiddenTitle: "ليست لديك صلاحية لهذه الصفحة",
    forbiddenBody: "حسابك لا يملك إذن رؤية هذا المحتوى. اطلب الصلاحية من مسؤول مساحة العمل.",
    workspaceTitle: "مساحة العمل هذه غير موجودة",
    workspaceBody: "قد يكون عنوان مساحة العمل خاطئاً، أو قد أُزيلت منها.",
    workspaceNamed: "لا توجد مساحة عمل باسم {name}.",
    soonTitle: "قريباً",
    soonBody: "ما زلنا نبني هذا الجزء. سيظهر هنا عندما يجهز.",
    soonNamed: "{name} قريباً",
  },
};

export type ErrorPageLabels = (typeof STRINGS)["en"];

const KIND_ICON: Record<ErrorPageKind, LucideIcon> = {
  "not-found": FileQuestion,
  "server-error": ServerCrash,
  offline: WifiOff,
  maintenance: Wrench,
  forbidden: ShieldX,
  "unknown-workspace": Building2,
  "coming-soon": Hourglass,
};

/** Online or not, kept in state from `navigator.onLine` and the `online` / `offline` events. Safe on the server. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

export interface ErrorPageProps extends Omit<ComponentProps<"main">, "title" | "children"> {
  kind: ErrorPageKind;
  /** Replaces the heading. */
  title?: ReactNode;
  /** Replaces the sentence under it. */
  description?: ReactNode;
  /** Replaces the big status code (404, 500, 403, 503). Pass `null` to hide it. */
  code?: string | null;
  /** Your brand logo. Defaults to the provider brand's mark and name. Pass `null` for none. */
  logo?: ReactNode;
  /** `server-error`: the id to quote to support, with a copy button. */
  errorId?: string;
  /** `unknown-workspace`: the address that was tried. */
  workspace?: string;
  /** `coming-soon`: the name of the module. */
  moduleName?: string;
  /** `maintenance`: when the service is expected back. */
  eta?: number | Date | string;
  /** `offline`: `true` once the connection is back, so the page offers a reload. Use `useOnlineStatus()`. */
  online?: boolean;
  onHome?: () => void;
  onBack?: () => void;
  onRetry?: () => void | Promise<unknown>;
  onContactSupport?: () => void;
  onSwitchWorkspace?: () => void;
  onRequestAccess?: () => void | Promise<unknown>;
  /** `coming-soon`: sign up for a heads-up. */
  onNotify?: () => void | Promise<unknown>;
  /** Replaces the default actions. */
  actions?: ReactNode;
  /** Fill the screen (`min-h-dvh`). Turn off to place it in a panel. Default true. */
  fullScreen?: boolean;
  labels?: Partial<ErrorPageLabels>;
}

/**
 * A full-page state for the places a product cannot show what was asked for: not found, server error, offline,
 * maintenance, no access, unknown workspace and a module that is not built yet. It shows what happened, what
 * to do next, and never a stack trace. It is presentational: you pass the handlers, it never navigates.
 */
export function ErrorPage({
  kind,
  title,
  description,
  code,
  logo,
  errorId,
  workspace,
  moduleName,
  eta,
  online = false,
  onHome,
  onBack,
  onRetry,
  onContactSupport,
  onSwitchWorkspace,
  onRequestAccess,
  onNotify,
  actions,
  fullScreen = true,
  labels,
  className,
  ...props
}: ErrorPageProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [busy, setBusy] = useState<"retry" | "access" | "notify" | null>(null);
  const [notified, setNotified] = useState(false);
  const Icon = KIND_ICON[kind];
  const shownCode = code === undefined ? statusCodeFor(kind) : code;

  const copy = {
    "not-found": [t.notFoundTitle, t.notFoundBody],
    "server-error": [t.serverTitle, t.serverBody],
    offline: online ? [t.onlineTitle, t.onlineBody] : [t.offlineTitle, t.offlineBody],
    maintenance: [t.maintenanceTitle, t.maintenanceBody],
    forbidden: [t.forbiddenTitle, t.forbiddenBody],
    "unknown-workspace": [t.workspaceTitle, workspace ? t.workspaceNamed.replace("{name}", workspace) : t.workspaceBody],
    "coming-soon": [moduleName ? t.soonNamed.replace("{name}", moduleName) : t.soonTitle, t.soonBody],
  }[kind];

  const run = async (which: "retry" | "access" | "notify", fn?: () => void | Promise<unknown>) => {
    if (!fn) return;
    setBusy(which);
    try {
      await fn();
      if (which === "notify") setNotified(true);
    } finally {
      setBusy(null);
    }
  };

  const back = onBack ? (
    <Button variant="secondary" onClick={onBack}>
      <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
      {t.back}
    </Button>
  ) : null;
  const home = onHome ? (
    <Button variant="primary" onClick={onHome}>
      {t.home}
    </Button>
  ) : null;
  const retry = (label: string) =>
    onRetry ? (
      <Button variant="primary" loading={busy === "retry"} onClick={() => run("retry", onRetry)}>
        <RotateCw aria-hidden />
        {label}
      </Button>
    ) : null;
  const support = onContactSupport ? (
    <Button variant="ghost" onClick={onContactSupport}>
      {t.support}
    </Button>
  ) : null;

  const defaults: Record<ErrorPageKind, ReactNode> = {
    "not-found": (
      <>
        {home}
        {back}
      </>
    ),
    "server-error": (
      <>
        {retry(t.retry)}
        {home ? <Button variant="secondary" onClick={onHome}>{t.home}</Button> : null}
        {support}
      </>
    ),
    offline: (
      <>
        {retry(online ? t.reload : t.retry)}
      </>
    ),
    maintenance: (
      <>
        {retry(t.retry)}
        {support}
      </>
    ),
    forbidden: (
      <>
        {onRequestAccess ? (
          <Button variant="primary" loading={busy === "access"} onClick={() => run("access", onRequestAccess)}>
            {t.requestAccess}
          </Button>
        ) : null}
        {home ? <Button variant="secondary" onClick={onHome}>{t.home}</Button> : null}
      </>
    ),
    "unknown-workspace": (
      <>
        {onSwitchWorkspace ? (
          <Button variant="primary" onClick={onSwitchWorkspace}>
            {t.switchWorkspace}
          </Button>
        ) : null}
        {home ? <Button variant="secondary" onClick={onHome}>{t.home}</Button> : null}
        {support}
      </>
    ),
    "coming-soon": (
      <>
        {onNotify && !notified ? (
          <Button variant="primary" loading={busy === "notify"} onClick={() => run("notify", onNotify)}>
            {t.notify}
          </Button>
        ) : null}
        {home ? <Button variant={onNotify && !notified ? "secondary" : "primary"} onClick={onHome}>{t.home}</Button> : null}
      </>
    ),
  };

  const tone = kind === "server-error" ? "text-nq-danger-text" : kind === "maintenance" || kind === "offline" ? (kind === "offline" && online ? "text-nq-success-text" : "text-nq-warning-text") : "text-muted-foreground";
  const BadgeIcon = kind === "offline" && online ? CircleCheck : Icon;

  return (
    <main
      data-slot="error-page"
      data-kind={kind}
      className={cn("flex flex-col items-center justify-center gap-8 bg-background p-6 text-center text-foreground", fullScreen && "min-h-dvh", className)}
      {...props}
    >
      {logo === undefined ? <ProductLogo size={24} /> : logo}
      <div className="flex max-w-md flex-col items-center gap-4">
        <span aria-hidden className={cn("inline-flex size-12 items-center justify-center rounded-card border border-border bg-card [&_svg]:size-6", tone)}>
          <BadgeIcon />
        </span>
        {shownCode ? (
          <p dir="ltr" data-slot="error-page-code" className="text-display font-mono text-muted-foreground/60">
            {shownCode}
          </p>
        ) : null}
        <div className="flex flex-col gap-2" role={kind === "server-error" ? "alert" : undefined}>
          <h1 className="text-h2 text-foreground">{title ?? copy[0]}</h1>
          <p className="text-body text-muted-foreground">{description ?? copy[1]}</p>
        </div>
        {kind === "maintenance" && eta !== undefined ? (
          <p className="text-body-sm text-muted-foreground">
            {t.maintenanceEta}: <DateTime value={eta} format={{ dateStyle: "medium", timeStyle: "short" }} className="text-foreground" />
          </p>
        ) : null}
        {kind === "server-error" && errorId ? (
          <p className="flex items-center gap-1 text-caption text-muted-foreground">
            {t.errorId}
            <bdi dir="ltr" className="font-mono text-foreground">
              {errorId}
            </bdi>
            <CopyButton value={errorId} label={t.copyId} variant="ghost" size="icon-sm" />
          </p>
        ) : null}
        {kind === "coming-soon" && notified ? (
          <p role="status" className="flex items-center gap-1.5 text-body-sm text-nq-success-text">
            <CircleCheck aria-hidden className="size-4" />
            {t.notified}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">{actions ?? defaults[kind]}</div>
    </main>
  );
}

type KindProps = Omit<ErrorPageProps, "kind">;

/** 404: the address does not exist. */
export function NotFoundPage(props: KindProps) {
  return <ErrorPage kind="not-found" {...props} />;
}
/** 500: our side failed. Pass `errorId` so people can quote it to support. */
export function ServerErrorPage(props: KindProps) {
  return <ErrorPage kind="server-error" {...props} />;
}
/** No connection. Pass `online` from `useOnlineStatus()` to turn it into a "back online, reload" prompt. */
export function OfflinePage(props: KindProps) {
  return <ErrorPage kind="offline" {...props} />;
}
/** 503: planned downtime, with an optional `eta`. */
export function MaintenancePage(props: KindProps) {
  return <ErrorPage kind="maintenance" {...props} />;
}
/** 403: signed in, but not allowed. */
export function ForbiddenPage(props: KindProps) {
  return <ErrorPage kind="forbidden" {...props} />;
}
/** The workspace address does not match a workspace the person can open. */
export function UnknownWorkspacePage(props: KindProps) {
  return <ErrorPage kind="unknown-workspace" {...props} />;
}
/** A module that is planned but not built. */
export function ComingSoonPage(props: KindProps) {
  return <ErrorPage kind="coming-soon" {...props} />;
}
