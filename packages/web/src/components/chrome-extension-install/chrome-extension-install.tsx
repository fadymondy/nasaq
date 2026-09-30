"use client";

import { Check, ExternalLink, RefreshCw } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button, buttonVariants } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Status } from "../status";

const STRINGS = {
  en: {
    title: "Install the browser extension",
    description: "Three steps: add it, pin it, sign in.",
    steps: "Installation steps",
    detected: (version?: string) => (version ? `Extension detected, version ${version}` : "Extension detected"),
    notDetected: "Extension not detected yet",
    check: "Check again",
    checking: "Checking…",
    unsupported: "Chrome extensions work in Chrome and other Chromium browsers such as Edge, Brave and Arc. Open this page in one of them.",
    done: "Done",
    stepAdd: "Add it from the Chrome Web Store",
    stepAddBody: "Open the store page and choose Add to Chrome, then confirm in the pop-up.",
    addButton: "Open the Chrome Web Store",
    stepPin: "Pin it to the toolbar",
    stepPinBody: "Click the puzzle-piece Extensions button next to the address bar, then the pin beside the extension. It stays one click away.",
    pinnedButton: "I pinned it",
    unpin: "Undo",
    stepSignIn: "Sign in from the extension",
    stepSignInBody: "Click the extension, then Sign in. It uses your account, so nothing is typed twice.",
    signInButton: "Sign in",
    signedIn: "Signed in",
    signInFailed: "Could not sign in. Try again.",
    blocked: "Do the step above first.",
    ready: "You are all set",
    readyBody: "The extension is installed, pinned and signed in.",
    stepLabel: (n: number, total: number, state: string) => `Step ${n} of ${total}, ${state}`,
    stateDone: "done",
    stateCurrent: "current",
    stateTodo: "to do",
  },
  ar: {
    title: "ثبّت إضافة المتصفح",
    description: "ثلاث خطوات: أضفها، ثبّتها، سجّل الدخول.",
    steps: "خطوات التثبيت",
    detected: (version?: string) => (version ? `تم اكتشاف الإضافة، الإصدار ${version}` : "تم اكتشاف الإضافة"),
    notDetected: "لم تُكتشف الإضافة بعد",
    check: "تحقق مرة أخرى",
    checking: "جارٍ التحقق…",
    unsupported: "إضافات Chrome تعمل في Chrome والمتصفحات المبنية على Chromium مثل Edge وBrave وArc. افتح هذه الصفحة في أحدها.",
    done: "تمت",
    stepAdd: "أضفها من متجر Chrome الإلكتروني",
    stepAddBody: "افتح صفحة المتجر واختر «إضافة إلى Chrome»، ثم أكّد في النافذة المنبثقة.",
    addButton: "افتح متجر Chrome الإلكتروني",
    stepPin: "ثبّتها في شريط الأدوات",
    stepPinBody: "اضغط زر الإضافات على شكل قطعة أحجية بجوار شريط العنوان، ثم الدبوس بجوار الإضافة. تبقى على بعد نقرة واحدة.",
    pinnedButton: "ثبّتُّها",
    unpin: "تراجع",
    stepSignIn: "سجّل الدخول من الإضافة",
    stepSignInBody: "اضغط على الإضافة ثم «تسجيل الدخول». تستخدم حسابك فلا تكتب شيئًا مرتين.",
    signInButton: "تسجيل الدخول",
    signedIn: "تم تسجيل الدخول",
    signInFailed: "تعذر تسجيل الدخول. حاول مرة أخرى.",
    blocked: "أنجز الخطوة السابقة أولًا.",
    ready: "كل شيء جاهز",
    readyBody: "الإضافة مثبّتة وموضوعة في شريط الأدوات ومسجَّل الدخول فيها.",
    stepLabel: (n: number, total: number, state: string) => `الخطوة ${n} من ${total}، ${state}`,
    stateDone: "مكتملة",
    stateCurrent: "الحالية",
    stateTodo: "لم تبدأ",
  },
};

export type ChromeExtensionInstallLabels = (typeof STRINGS)["en"];

export interface ChromeExtensionInstallProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  /** The extension's Chrome Web Store page. */
  storeUrl: string;
  /** Whether the page found the extension (your page asks it, or checks for a marker it injects). */
  installed: boolean;
  /** Version reported by the extension, shown when detected. */
  version?: string;
  /** Whether the extension is signed in. */
  signedIn?: boolean;
  /** Extensions cannot know if they are pinned: the user confirms. Controlled. */
  pinned?: boolean;
  defaultPinned?: boolean;
  onPinnedChange?: (pinned: boolean) => void;
  /** Look for the extension again. Resolve when the check finishes; the host then updates `installed`. */
  onCheck?: () => Promise<void>;
  /** Start sign-in: ask the extension to open its sign-in, or send a token to it. Resolve `{ error }` to show it. */
  onSignIn?: () => Promise<void | { error?: string }>;
  /** False in Firefox, Safari and other browsers that cannot install it: shows a notice. Default true. */
  supported?: boolean;
  /** Replaces the default store button content, for example a localised badge image you are licensed to use. */
  storeButton?: ReactNode;
  labels?: Partial<ChromeExtensionInstallLabels>;
}

type StepState = "done" | "current" | "todo";

/**
 * The install flow for a Chrome extension: add it from the Web Store, pin it, sign in. It shows whether the
 * extension was detected, marks finished steps, and keeps the next step in front. Pinning cannot be
 * detected, so the person confirms it. Presentational: you tell it what was detected. The store button is
 * text, not the Chrome or Web Store artwork, which Google licenses only for its own badges.
 */
export function ChromeExtensionInstall({
  storeUrl,
  installed,
  version,
  signedIn = false,
  pinned: pinnedProp,
  defaultPinned = false,
  onPinnedChange,
  onCheck,
  onSignIn,
  supported = true,
  storeButton,
  labels,
  className,
  ...props
}: ChromeExtensionInstallProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [pinState, setPinState] = useState(defaultPinned);
  const pinned = pinnedProp ?? pinState;
  const [checking, setChecking] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flags = [installed, installed && pinned, installed && signedIn];
  const current = flags.findIndex((d) => !d);
  const state = (i: number): StepState => (flags[i] ? "done" : i === current ? "current" : "todo");
  const stateText = { done: t.stateDone, current: t.stateCurrent, todo: t.stateTodo };

  function setPinned(next: boolean) {
    setPinState(next);
    onPinnedChange?.(next);
  }

  async function check() {
    if (!onCheck || checking) return;
    setChecking(true);
    try {
      await onCheck();
    } finally {
      setChecking(false);
    }
  }

  async function signIn() {
    if (!onSignIn || signing) return;
    setSigning(true);
    setError(null);
    try {
      const result = await onSignIn();
      if (result?.error) setError(result.error);
    } catch {
      setError(t.signInFailed);
    } finally {
      setSigning(false);
    }
  }

  const steps: { title: string; body: string; action: ReactNode }[] = [
    {
      title: t.stepAdd,
      body: t.stepAddBody,
      action: (
        <a href={storeUrl} target="_blank" rel="noreferrer" data-slot="extension-store-link" className={buttonVariants({ variant: "primary", size: "sm" })}>
          {storeButton ?? (
            <>
              {t.addButton}
              <ExternalLink aria-hidden />
            </>
          )}
        </a>
      ),
    },
    {
      title: t.stepPin,
      body: t.stepPinBody,
      action: pinned ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => setPinned(false)}>
          {t.unpin}
        </Button>
      ) : (
        <Button type="button" size="sm" variant="primary" disabled={!installed} onClick={() => setPinned(true)}>
          {t.pinnedButton}
        </Button>
      ),
    },
    {
      title: t.stepSignIn,
      body: t.stepSignInBody,
      action: signedIn ? null : (
        <Button type="button" size="sm" variant="primary" disabled={!installed || !onSignIn} loading={signing} onClick={signIn}>
          {t.signInButton}
        </Button>
      ),
    },
  ];

  const allDone = flags.every(Boolean);

  return (
    <Card data-slot="chrome-extension-install" data-state={allDone ? "ready" : installed ? "installed" : "missing"} className={cn("w-full max-w-2xl", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!supported ? <Alert tone="warning">{t.unsupported}</Alert> : null}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-secondary px-3 py-2" data-slot="extension-detected" role="status">
          <Status tone={installed ? "success" : "neutral"}>{installed ? t.detected(version) : t.notDetected}</Status>
          {onCheck && !installed ? (
            <Button type="button" size="sm" variant="ghost" loading={checking} onClick={check}>
              <RefreshCw aria-hidden />
              {checking ? t.checking : t.check}
            </Button>
          ) : null}
        </div>
        <ol aria-label={t.steps} className="flex flex-col gap-0">
          {steps.map((step, i) => {
            const s = state(i);
            return (
              <li
                key={step.title}
                data-slot="extension-step"
                data-state={s}
                aria-current={s === "current" ? "step" : undefined}
                className="relative flex gap-3 pb-5 last:pb-0"
              >
                {i < steps.length - 1 ? <span aria-hidden className="absolute inset-y-7 start-[13px] w-px bg-border" /> : null}
                <span
                  aria-hidden
                  className={cn(
                    "z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-caption tabular-nums",
                    s === "done" && "border-nq-success/40 bg-nq-success-soft text-nq-success-text",
                    s === "current" && "border-primary bg-primary text-primary-foreground",
                    s === "todo" && "border-border bg-card text-muted-foreground",
                  )}
                >
                  {s === "done" ? <Check className="size-4" /> : i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <p className={cn("text-label", s === "todo" ? "text-muted-foreground" : "text-foreground")}>
                    <span className="sr-only">{t.stepLabel(i + 1, steps.length, stateText[s])}: </span>
                    {step.title}
                  </p>
                  {s !== "done" ? <p className="text-body-sm text-muted-foreground">{step.body}</p> : null}
                  {s === "done" && i === 2 ? <Status tone="success">{t.signedIn}</Status> : null}
                  {s === "current" || (i === 1 && installed) || (i === 2 && installed && !signedIn) ? (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">{step.action}</div>
                  ) : null}
                  {s === "todo" && !installed && i > 0 ? <p className="text-caption text-muted-foreground">{t.blocked}</p> : null}
                  {i === 2 && error ? (
                    <p role="alert" className="text-caption text-nq-danger-text">
                      {error}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        {allDone ? (
          <Alert tone="success" title={t.ready}>
            {t.readyBody}
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
