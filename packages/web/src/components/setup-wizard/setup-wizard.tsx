"use client";

import { ArrowLeft, ArrowRight, CircleCheck, RefreshCw } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import { type AuthSubmitResult, formatCountdown, useAuthLocale } from "../auth-layout/auth-utils";
import { Button } from "../button";
import { Card } from "../card";
import { CopyField } from "../copy-button";
import { Num } from "../numeric";
import { Progress } from "../progress";
import { Spinner } from "../spinner";
import { Stepper, StepperItem } from "../stepper";
import { clampStep, missingSteps, setupProgress } from "./setup-model";

const STRINGS = {
  en: {
    stepOf: "Step {current} of {total}",
    back: "Back",
    next: "Continue",
    skip: "Skip for now",
    finish: "Finish setup",
    optional: "Optional",
    steps: "Setup steps",
    gate: "Finish these steps first",
    failed: "Something went wrong. Try again.",
    doneTitle: "You are all set",
    doneDescription: "Setup is complete.",
    waiting: "Waiting for your agent to connect",
    waitingHint: "Run the command on the machine you want to connect. This page updates by itself.",
    connected: "Agent connected",
    timeout: "No agent has connected yet",
    timeoutHint: "Check that the command finished without errors and that the machine can reach us, then try again.",
    failedEnroll: "The agent could not enroll",
    retry: "Check again",
    command: "Install command",
    elapsed: "Waiting {time}",
    host: "Host",
    version: "Version",
    system: "System",
  },
  ar: {
    stepOf: "الخطوة {current} من {total}",
    back: "رجوع",
    next: "متابعة",
    skip: "تخطَّ الآن",
    finish: "إنهاء الإعداد",
    optional: "اختيارية",
    steps: "خطوات الإعداد",
    gate: "أكمل هذه الخطوات أولًا",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    doneTitle: "كل شيء جاهز",
    doneDescription: "اكتمل الإعداد.",
    waiting: "بانتظار اتصال الوكيل",
    waitingHint: "شغّل الأمر على الجهاز الذي تريد ربطه. تتحدّث هذه الصفحة تلقائيًا.",
    connected: "تم اتصال الوكيل",
    timeout: "لم يتصل أي وكيل بعد",
    timeoutHint: "تأكد من انتهاء الأمر بلا أخطاء ومن أن الجهاز يصل إلينا، ثم حاول مرة أخرى.",
    failedEnroll: "تعذّر تسجيل الوكيل",
    retry: "تحقق مرة أخرى",
    command: "أمر التثبيت",
    elapsed: "بانتظار منذ {time}",
    host: "المضيف",
    version: "الإصدار",
    system: "النظام",
  },
};

export type SetupWizardLabels = (typeof STRINGS)["en"];

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

export interface SetupStep {
  id: string;
  title: string;
  description?: string;
  /** Shows "Optional" and a skip button. The finish gate ignores it. */
  optional?: boolean;
  /** Set false to hold the Continue button until this step's work is done (a form valid, an agent connected). Default true. */
  ready?: boolean;
  /** The step's body. */
  content: ReactNode;
}

export interface SetupWizardProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  steps: SetupStep[];
  /** Controlled current step (zero-based). */
  current?: number;
  defaultCurrent?: number;
  onCurrentChange?: (index: number, stepId: string) => void;
  /** Step ids the server already counts as done. Required steps missing from it block Finish. */
  completed?: string[];
  /** Runs when leaving a step forward. Resolve `{ error }` to stay put and show why. */
  onStepComplete?: (stepId: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** The server's verdict that setup may finish. `false` blocks Finish and shows `gateMessage`. Default true. */
  canFinish?: boolean;
  /** Why Finish is blocked, when the server has said so. */
  gateMessage?: string;
  /** Called by Finish. Resolve `{ error }` if the server refuses. */
  onFinish: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  title?: ReactNode;
  description?: ReactNode;
  /** The completion screen. */
  doneTitle?: ReactNode;
  doneDescription?: ReactNode;
  /** Button or link on the completion screen, such as "Open the dashboard". */
  doneAction?: ReactNode;
  labels?: Partial<SetupWizardLabels>;
}

/**
 * A first-run wizard: a step rail on wide screens, a progress bar on phones, Back, Continue and Skip,
 * and a finish gate the server controls (`canFinish`, `completed`). Steps are your own forms; the
 * wizard only owns order, gating, focus and the completion screen.
 */
export function SetupWizard({
  steps,
  current: currentProp,
  defaultCurrent = 0,
  onCurrentChange,
  completed,
  onStepComplete,
  canFinish = true,
  gateMessage,
  onFinish,
  title,
  description,
  doneTitle,
  doneDescription,
  doneAction,
  labels: labelsProp,
  className,
  ...props
}: SetupWizardProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const [inner, setInner] = useState(defaultCurrent);
  const current = clampStep(currentProp ?? inner, steps.length);
  const [pending, setPending] = useState<"next" | "finish" | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  const go = (index: number) => {
    const next = clampStep(index, steps.length);
    if (currentProp === undefined) setInner(next);
    setError(undefined);
    onCurrentChange?.(next, steps[next]!.id);
  };

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: false });
  }, [current, done]);

  const step = steps[current];
  if (!step) return null;
  const last = current === steps.length - 1;
  // The step on screen is being finished right now, so it is not held against the gate.
  const missing = missingSteps(steps, completed).filter((s) => s.id !== step.id);
  const gated = last && (!canFinish || missing.length > 0);

  const run = async (kind: "next" | "finish", action: () => Promise<AuthSubmitResult> | AuthSubmitResult, after: () => void) => {
    setPending(kind);
    setError(undefined);
    try {
      const result = await action();
      if (result?.error) setError(result.error);
      else after();
    } catch {
      setError(t.failed);
    } finally {
      setPending(null);
    }
  };

  const next = () => void run("next", () => onStepComplete?.(step.id), () => go(current + 1));
  const finishSequence = () =>
    void run(
      "finish",
      async () => {
        const stepResult = await onStepComplete?.(step.id);
        if (stepResult?.error) return stepResult;
        return onFinish();
      },
      () => setDone(true),
    );

  if (done) {
    return (
      <Card data-slot="setup-wizard" data-state="done" className={cn("mx-auto w-full max-w-xl items-center gap-4 p-8 text-center", className)} {...(props as ComponentProps<"div">)}>
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
          <CircleCheck aria-hidden="true" className="size-6" />
        </span>
        <h2 ref={headingRef} tabIndex={-1} className="text-h2 text-foreground outline-none">
          {doneTitle ?? t.doneTitle}
        </h2>
        <p className="text-body text-muted-foreground">{doneDescription ?? t.doneDescription}</p>
        {doneAction}
      </Card>
    );
  }

  return (
    <Card data-slot="setup-wizard" data-step={step.id} className={cn("mx-auto w-full max-w-4xl gap-0 p-0 md:grid md:grid-cols-[15rem_1fr]", className)} {...(props as ComponentProps<"div">)}>
      <aside className="hidden flex-col gap-5 border-e border-border bg-muted/50 p-6 md:flex">
        {title || description ? (
          <div className="flex flex-col gap-1">
            {title ? <p className="text-label text-foreground">{title}</p> : null}
            {description ? <p className="text-caption text-muted-foreground">{description}</p> : null}
          </div>
        ) : null}
        <nav aria-label={t.steps}>
          <Stepper current={current} orientation="vertical">
            {steps.map((s, i) => (
              <StepperItem key={s.id} title={s.title} description={s.optional ? t.optional : undefined} onClick={i < current && !pending ? () => go(i) : undefined} />
            ))}
          </Stepper>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-8">
        <div className="flex flex-col gap-2 md:hidden">
          {title ? <p className="text-label text-foreground">{title}</p> : null}
          <Progress value={setupProgress(current + 1, steps.length)} label={fill(t.stepOf, { current: current + 1, total: steps.length })} showValue={false} aria-label={t.steps} />
        </div>
        <header className="flex flex-col gap-1">
          <p className="hidden text-caption text-muted-foreground md:block">
            <StepCount label={t.stepOf} current={current + 1} total={steps.length} />
          </p>
          <h2 ref={headingRef} tabIndex={-1} className="text-h2 text-foreground outline-none">
            {step.title}
          </h2>
          {step.description ? <p className="text-body-sm text-muted-foreground">{step.description}</p> : null}
        </header>

        <div data-slot="setup-wizard-body" aria-busy={pending !== null || undefined} className="min-w-0">
          {step.content}
        </div>

        {gated ? (
          <Alert tone="warning" title={gateMessage ?? t.gate}>
            {missing.length ? (
              <ul className="m-0 flex list-disc flex-col gap-0.5 ps-4">
                {missing.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="text-start underline underline-offset-2" onClick={() => go(steps.findIndex((x) => x.id === s.id))}>
                      {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Alert>
        ) : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" disabled={current === 0 || pending !== null} onClick={() => go(current - 1)} className={cn(current === 0 && "invisible")}>
            <ArrowLeft aria-hidden="true" className="rtl:-scale-x-100" />
            {t.back}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {step.optional && !last ? (
              <Button variant="secondary" disabled={pending !== null} onClick={() => go(current + 1)}>
                {t.skip}
              </Button>
            ) : null}
            {last ? (
              <Button variant="primary" loading={pending === "finish"} disabled={gated || step.ready === false || pending === "next"} onClick={finishSequence}>
                <CircleCheck aria-hidden="true" />
                {t.finish}
              </Button>
            ) : (
              <Button variant="primary" loading={pending === "next"} disabled={step.ready === false} onClick={next}>
                {t.next}
                <ArrowRight aria-hidden="true" className="rtl:-scale-x-100" />
              </Button>
            )}
          </div>
        </footer>
      </div>
    </Card>
  );
}

function StepCount({ label, current, total }: { label: string; current: number; total: number }) {
  const [before, after] = label.split("{current}");
  const [middle, tail] = (after ?? "").split("{total}");
  return (
    <>
      {before}
      <Num value={current} />
      {middle}
      <Num value={total} />
      {tail}
    </>
  );
}

/* ------------------------------------------------------------------ agent enrol */

export type AgentEnrollStatus = "waiting" | "connected" | "timeout" | "failed";

export interface EnrolledAgent {
  name: string;
  host?: string;
  version?: string;
  system?: string;
}

export interface AgentEnrollWaitProps extends Omit<ComponentProps<"div">, "children"> {
  /** The install or enrol command the person runs on their machine. */
  command: string;
  /** Poll your server and pass the result. `waiting` shows the live spinner. */
  status: AgentEnrollStatus;
  /** Set once `connected`. */
  agent?: EnrolledAgent;
  /** Seconds spent waiting, to show a running timer. */
  elapsed?: number;
  /** Message from the agent or server when `failed`. */
  error?: string;
  /** Shown for `timeout` and `failed`. */
  onRetry?: () => void;
  /** Extra guidance under the command, such as supported systems. */
  hint?: ReactNode;
  labels?: Partial<SetupWizardLabels>;
}

/**
 * The guided-connect step: shows the command, then waits live for the agent to check in. Poll on the
 * host, feed `status` and `agent`; the status region is announced politely as it changes.
 */
export function AgentEnrollWait({ command, status, agent, elapsed, error, onRetry, hint, labels: labelsProp, className, ...props }: AgentEnrollWaitProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  return (
    <div data-slot="agent-enroll-wait" data-status={status} className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="flex flex-col gap-1.5">
        <span className="text-label text-foreground">{t.command}</span>
        <CopyField value={command} label={t.command} className="font-mono" />
        {hint ? <p className="text-caption text-muted-foreground">{hint}</p> : null}
      </div>
      <div aria-live="polite" data-slot="agent-enroll-status">
        {status === "waiting" ? (
          <div role="status" className="flex items-start gap-3 rounded-control border border-border bg-muted/50 p-4">
            <Spinner className="mt-0.5 size-5 text-muted-foreground" />
            <div className="flex flex-col gap-0.5">
              <p className="text-label text-foreground">{t.waiting}</p>
              <p className="text-body-sm text-muted-foreground">{t.waitingHint}</p>
              {elapsed !== undefined ? (
                <p dir="ltr" className="text-caption text-muted-foreground tabular-nums">
                  {fill(t.elapsed, { time: formatCountdown(elapsed) })}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        {status === "connected" ? (
          <Alert tone="success" title={t.connected}>
            {agent ? (
              <dl className="m-0 mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <dt className="text-muted-foreground">{agent.name}</dt>
                <dd className="m-0" />
                {agent.host ? (
                  <>
                    <dt className="text-muted-foreground">{t.host}</dt>
                    <dd dir="ltr" className="m-0 text-start font-mono">{agent.host}</dd>
                  </>
                ) : null}
                {agent.system ? (
                  <>
                    <dt className="text-muted-foreground">{t.system}</dt>
                    <dd dir="ltr" className="m-0 text-start">{agent.system}</dd>
                  </>
                ) : null}
                {agent.version ? (
                  <>
                    <dt className="text-muted-foreground">{t.version}</dt>
                    <dd dir="ltr" className="m-0 text-start font-mono">{agent.version}</dd>
                  </>
                ) : null}
              </dl>
            ) : null}
          </Alert>
        ) : null}
        {status === "timeout" || status === "failed" ? (
          <Alert
            tone={status === "failed" ? "danger" : "warning"}
            title={status === "failed" ? t.failedEnroll : t.timeout}
            action={
              onRetry ? (
                <Button size="sm" variant="secondary" onClick={onRetry}>
                  <RefreshCw aria-hidden="true" />
                  {t.retry}
                </Button>
              ) : undefined
            }
          >
            {status === "failed" && error ? error : t.timeoutHint}
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
