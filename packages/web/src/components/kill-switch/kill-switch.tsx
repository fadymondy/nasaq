"use client";

import { CirclePause, CirclePlay, Globe, OctagonX, ShieldAlert, Unplug } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, ConfirmButton } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../context-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldError, FieldLabel, Textarea } from "../field";
import { DateTime, Num } from "../numeric";
import { EmptyState } from "../states";

const STRINGS = {
  en: {
    title: "Emergency stop",
    description: "Stop every automation at once. Nothing runs again until someone resumes it.",
    running: "Automations are running",
    runningCount: (n: number) => (n === 1 ? "1 automation is active" : `${n} automations are active`),
    stopAll: "Stop all automations",
    stopTitle: "Stop every automation?",
    stopBody: "Running jobs are cancelled and schedules are held. Nothing starts until you resume.",
    reasonLabel: "Reason",
    reasonPlaceholder: "Say why you are stopping everything",
    reasonHint: "Everyone on the team sees this.",
    reasonRequired: "Give a reason.",
    stopConfirm: "Stop everything",
    cancel: "Cancel",
    paused: "All automations are paused",
    pausedBy: (who: string) => `Paused by ${who}`,
    reason: "Reason",
    resume: "Resume automations",
    resumeTitle: "Resume all automations?",
    resumeBody: "Schedules start again and held jobs run. Check the reason it was stopped first.",
    resumeConfirm: "Resume",
    failed: "Could not complete this. Try again.",
    browsersTitle: "Paired browsers",
    browsersBody: "Browsers that can run automations for you. Unpair any you do not recognise.",
    browsersEmpty: "No browsers are paired",
    browsersEmptyBody: "Pair a browser from its extension to run browser automations.",
    thisBrowser: "This browser",
    online: "Online",
    offline: "Offline",
    lastSeen: "Last seen",
    unpair: "Unpair",
    unpairFor: (n: string) => `Unpair ${n}`,
    unpairTitle: (n: string) => `Unpair ${n}?`,
    unpairBody: "Its automations stop running until you pair it again.",
    bannerTitle: "Automations are paused",
    bannerHint: "Nothing runs until they are resumed.",
    bannerResume: "Resume",
    bannerResuming: "Resuming…",
    since: "Since",
  },
  ar: {
    title: "الإيقاف الطارئ",
    description: "أوقف كل الأتمتة دفعة واحدة. لن يعمل شيء حتى يستأنفها أحد.",
    running: "الأتمتة تعمل",
    runningCount: (n: number) => (n === 1 ? "أتمتة واحدة نشطة" : n === 2 ? "أتمتتان نشطتان" : n <= 10 ? `${n} أتمتات نشطة` : `${n} أتمتة نشطة`),
    stopAll: "إيقاف كل الأتمتة",
    stopTitle: "إيقاف كل الأتمتة؟",
    stopBody: "تُلغى المهام الجارية وتُجمّد الجداول. لن يبدأ شيء حتى تستأنف.",
    reasonLabel: "السبب",
    reasonPlaceholder: "اكتب سبب إيقاف كل شيء",
    reasonHint: "يراه كل أعضاء الفريق.",
    reasonRequired: "اكتب سببًا.",
    stopConfirm: "أوقف كل شيء",
    cancel: "إلغاء",
    paused: "كل الأتمتة متوقفة مؤقتًا",
    pausedBy: (who: string) => `أوقفها ${who}`,
    reason: "السبب",
    resume: "استئناف الأتمتة",
    resumeTitle: "استئناف كل الأتمتة؟",
    resumeBody: "تعود الجداول للعمل وتُنفّذ المهام المجمّدة. راجع سبب الإيقاف أولًا.",
    resumeConfirm: "استئناف",
    failed: "تعذّر إتمام ذلك. حاول مرة أخرى.",
    browsersTitle: "المتصفحات المقترنة",
    browsersBody: "متصفحات تستطيع تشغيل الأتمتة نيابةً عنك. ألغِ اقتران أي متصفح لا تعرفه.",
    browsersEmpty: "لا توجد متصفحات مقترنة",
    browsersEmptyBody: "اقرن متصفحًا من إضافته لتشغيل أتمتة المتصفح.",
    thisBrowser: "هذا المتصفح",
    online: "متصل",
    offline: "غير متصل",
    lastSeen: "آخر ظهور",
    unpair: "إلغاء الاقتران",
    unpairFor: (n: string) => `إلغاء اقتران ${n}`,
    unpairTitle: (n: string) => `إلغاء اقتران ${n}؟`,
    unpairBody: "تتوقف أتمتته حتى تقرنه مرة أخرى.",
    bannerTitle: "الأتمتة متوقفة مؤقتًا",
    bannerHint: "لن يعمل شيء حتى تُستأنف.",
    bannerResume: "استئناف",
    bannerResuming: "جارٍ الاستئناف…",
    since: "منذ",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type KillSwitchLabels = Partial<typeof STRINGS.en>;
type Result = void | { error?: string };

/** Why and by whom everything was stopped. */
export interface PauseInfo {
  by: string;
  at: string | number | Date;
  reason: string;
}

export interface PairedBrowser {
  id: string;
  /** For example "Chrome on Windows". */
  name: string;
  /** Free text such as the profile or device. */
  device?: string;
  online: boolean;
  lastSeen?: string | number | Date;
  /** The browser you are using now. It cannot be unpaired from here. */
  current?: boolean;
}

/* --------------------------------------------------------------------------------- banner */

export interface PausedBannerProps extends Omit<ComponentProps<"div">, "children"> {
  paused: PauseInfo;
  /** Shows a Resume button. Omit for people who cannot resume. */
  onResume?: () => Promise<Result>;
  /** Pin to the top of the scroll container. Default true. */
  sticky?: boolean;
  hint?: ReactNode;
  labels?: KillSwitchLabels;
}

/**
 * The bar that tells everyone the emergency stop is on. Put it above every page while `paused` is set.
 * It is a `role="status"` region, so it is announced when it appears, and it stays pinned.
 */
export function PausedBanner({ paused, onResume, sticky = true, hint, labels, className, ...props }: PausedBannerProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels } as ReturnType<typeof strings>;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const resume = async () => {
    if (!onResume || busy) return;
    setBusy(true);
    setError(null);
    let message: string | null = null;
    try {
      const r = await onResume();
      if (r && typeof r === "object" && r.error) message = r.error;
    } catch {
      message = t.failed;
    }
    if (mounted.current) {
      setBusy(false);
      setError(message);
    }
  };

  return (
    <div
      role="status"
      data-slot="paused-banner"
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 bg-nq-danger-soft px-4 py-2 text-body-sm text-nq-danger-text",
        sticky && "sticky top-0 z-40",
        className,
      )}
      {...props}
    >
      <CirclePause aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="font-medium">{t.bannerTitle}.</span> <span className="opacity-80">{hint ?? t.bannerHint}</span>{" "}
        <span className="opacity-80">
          {t.pausedBy(paused.by)}, <DateTime value={paused.at} relative />. {paused.reason}
        </span>
        {error ? (
          <span role="alert" className="ms-2 font-medium">
            {error}
          </span>
        ) : null}
      </span>
      {onResume ? (
        <Button size="sm" variant="secondary" loading={busy} onClick={() => void resume()}>
          {busy ? t.bannerResuming : t.bannerResume}
        </Button>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------------- panel */

export interface KillSwitchProps extends Omit<ComponentProps<"section">, "title"> {
  /** `null` when automations run. The pause details when the emergency stop is on. */
  paused: PauseInfo | null;
  /** How many automations are active, shown while running. */
  activeCount?: number;
  /** Stop everything. `reason` is never empty. Reject or return `{ error }` to keep the dialog open. */
  onStopAll: (reason: string) => Promise<Result>;
  /** Resume everything, after the confirm. */
  onResume: () => Promise<Result>;
  /** Paired browsers. Omit to hide the list. */
  browsers?: PairedBrowser[];
  onUnpairBrowser?: (id: string) => Promise<Result>;
  labels?: KillSwitchLabels;
}

function PauseDialog({ open, onClose, onPause, t }: { open: boolean; onClose: () => void; onPause: KillSwitchProps["onStopAll"]; t: ReturnType<typeof strings> }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const empty = reason.trim() === "";
  const close = () => {
    if (busy) return;
    setReason("");
    setTouched(false);
    setError(null);
    onClose();
  };
  const submit = async () => {
    setTouched(true);
    if (empty) return;
    setBusy(true);
    setError(null);
    let message: string | null = null;
    try {
      const r = await onPause(reason.trim());
      if (r && typeof r === "object" && r.error) message = r.error;
    } catch {
      message = t.failed;
    }
    setBusy(false);
    if (message) setError(message);
    else {
      setReason("");
      setTouched(false);
      onClose();
    }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent data-slot="kill-switch-dialog">
        <DialogHeader>
          <DialogTitle>{t.stopTitle}</DialogTitle>
          <DialogDescription>{t.stopBody}</DialogDescription>
        </DialogHeader>
        <Field invalid={touched && empty}>
          <FieldLabel>{t.reasonLabel}</FieldLabel>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.reasonPlaceholder} rows={3} />
          {touched && empty ? <FieldError match>{t.reasonRequired}</FieldError> : <p className="text-caption text-muted-foreground">{t.reasonHint}</p>}
        </Field>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <DialogFooter>
          <Button variant="ghost" disabled={busy} onClick={close}>
            {t.cancel}
          </Button>
          <Button variant="danger" loading={busy} onClick={() => void submit()}>
            <OctagonX aria-hidden />
            {t.stopConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One switch to stop every automation, with a required reason, and a confirmed resume. While paused it shows
 * who stopped it, when and why. An optional list of paired browsers lets you unpair one you do not
 * recognise. Pair it with `PausedBanner` on every page. No backend: your callbacks do the work.
 */
export function KillSwitch({ paused, activeCount, onStopAll, onResume, browsers, onUnpairBrowser, labels, className, ...props }: KillSwitchProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels } as ReturnType<typeof strings>;
  const [dialog, setDialog] = useState(false);
  const [unpairing, setUnpairing] = useState<PairedBrowser | null>(null);
  const [unpairBusy, setUnpairBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPaused = paused !== null;
  const guard = async (fn: () => Promise<Result>) => {
    setError(null);
    let message: string | null = null;
    try {
      const r = await fn();
      if (r && typeof r === "object" && r.error) message = r.error;
    } catch {
      message = t.failed;
    }
    if (message) {
      setError(message);
      throw new Error(message);
    }
  };
  const unpair = async () => {
    if (!unpairing || !onUnpairBrowser) return;
    setUnpairBusy(true);
    try {
      await guard(() => onUnpairBrowser(unpairing.id));
      setUnpairing(null);
    } catch {
      // The message is already shown above the list; the dialog stays open to retry.
    }
    setUnpairBusy(false);
  };

  return (
    <section data-slot="kill-switch" data-paused={isPaused} aria-label={t.title} className={cn("flex flex-col gap-4", className)} {...props}>
      <Card className={cn(isPaused && "border-nq-danger/40")}>
        <CardHeader>
          <CardTitle as="h2" className="flex items-center gap-2">
            {isPaused ? <CirclePause aria-hidden className="size-4 text-nq-danger-text" /> : <ShieldAlert aria-hidden className="size-4 text-muted-foreground" />}
            {t.title}
          </CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}
          {isPaused ? (
            <>
              <Alert tone="danger" title={t.paused}>
                <span className="block">
                  {t.pausedBy(paused.by)}, <DateTime value={paused.at} relative />
                </span>
                <span className="block text-foreground">
                  {t.reason}: {paused.reason}
                </span>
              </Alert>
              <div>
                <ConfirmButton variant="primary" title={t.resumeTitle} description={t.resumeBody} confirmLabel={t.resumeConfirm} cancelLabel={t.cancel} onConfirm={() => guard(onResume)}>
                  <CirclePlay aria-hidden />
                  {t.resume}
                </ConfirmButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                <Badge variant="success">{t.running}</Badge>
                {activeCount !== undefined ? <span>{t.runningCount(activeCount)}</span> : null}
              </div>
              <div>
                <Button variant="danger" onClick={() => setDialog(true)}>
                  <OctagonX aria-hidden />
                  {t.stopAll}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {browsers ? (
        <Card>
          <CardHeader>
            <CardTitle as="h2">{t.browsersTitle}</CardTitle>
            <CardDescription>{t.browsersBody}</CardDescription>
          </CardHeader>
          <CardContent>
            {browsers.length === 0 ? (
              <EmptyState icon={Unplug} title={t.browsersEmpty} description={t.browsersEmptyBody} />
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
                {browsers.map((b) => {
                  const canUnpair = Boolean(onUnpairBrowser) && !b.current;
                  const content = (
                    <>
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
                      <Globe aria-hidden />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="flex flex-wrap items-center gap-2 text-label text-foreground">
                        {b.name}
                        {b.current ? <Badge variant="brand">{t.thisBrowser}</Badge> : null}
                      </span>
                      <span className="text-caption text-muted-foreground">
                        {b.device ? `${b.device} · ` : ""}
                        {b.online ? t.online : b.lastSeen !== undefined ? (
                          <>
                            {t.lastSeen} <DateTime value={b.lastSeen} relative />
                          </>
                        ) : (
                          t.offline
                        )}
                      </span>
                    </div>
                    <span aria-hidden className={cn("size-2 rounded-full", b.online ? "bg-nq-success" : "bg-nq-line-strong")} />
                    {canUnpair ? (
                      <Button size="sm" variant="secondary" aria-label={t.unpairFor(b.name)} onClick={() => setUnpairing(b)}>
                        {t.unpair}
                      </Button>
                    ) : null}
                    </>
                  );
                  if (!canUnpair) return <li key={b.id} className="flex flex-wrap items-center gap-3 p-3">{content}</li>;
                  return (
                    <ContextMenu key={b.id}>
                      <ContextMenuTrigger render={<li className="flex flex-wrap items-center gap-3 p-3" />}>{content}</ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem variant="danger" onClick={() => setUnpairing(b)}>
                          <Unplug aria-hidden />
                          {t.unpair}
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </ul>
            )}
            {browsers.length > 0 ? (
              <p className="mt-2 text-caption text-muted-foreground">
                <Num value={browsers.filter((b) => b.online).length} /> / <Num value={browsers.length} /> {t.online}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={unpairing !== null} onOpenChange={(o) => !o && !unpairBusy && setUnpairing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{unpairing ? t.unpairTitle(unpairing.name) : ""}</AlertDialogTitle>
            <AlertDialogDescription>{t.unpairBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unpairBusy}>{t.cancel}</AlertDialogCancel>
            <Button variant="danger" loading={unpairBusy} onClick={() => void unpair()}>
              {t.unpair}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PauseDialog open={dialog} onClose={() => setDialog(false)} onPause={onStopAll} t={t} />
    </section>
  );
}
