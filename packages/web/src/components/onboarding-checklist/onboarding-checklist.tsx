"use client";

import { ArrowRight, CircleCheck, PartyPopper, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useAuthLocale } from "../auth-layout/auth-utils";
import { Button } from "../button";
import { Card } from "../card";
import { checklistSummary } from "../onboarding-flow/onboarding-model";
import { Progress } from "../progress";

const STRINGS = {
  en: {
    title: "Get started",
    progress: "{done} of {total} done",
    dismiss: "Dismiss the checklist",
    allDone: "You are all set",
    allDoneHint: "Every step is done. Nice work.",
    done: "Done",
    next: "Next",
  },
  ar: {
    title: "ابدأ من هنا",
    progress: "أُنجز {done} من {total}",
    dismiss: "أخفِ القائمة",
    allDone: "كل شيء جاهز",
    allDoneHint: "أنجزت كل الخطوات. أحسنت.",
    done: "تم",
    next: "التالي",
  },
};

export type OnboardingChecklistLabels = (typeof STRINGS)["en"];

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

export interface OnboardingChecklistItem {
  id: string;
  title: string;
  description?: string;
  done?: boolean;
  /** The button on an open item: "Invite teammates". Omit for a plain item. */
  actionLabel?: string;
  onAction?: () => void | Promise<unknown>;
  icon?: ReactNode;
}

export interface OnboardingChecklistProps extends Omit<ComponentProps<"div">, "title"> {
  items: readonly OnboardingChecklistItem[];
  title?: ReactNode;
  /** Called by the close button. Omit to hide it. Once everything is done the card offers dismiss regardless. */
  onDismiss?: () => void | Promise<unknown>;
  /** Called when the last item is done, once. */
  onComplete?: () => void;
  labels?: Partial<OnboardingChecklistLabels>;
}

/**
 * The in-app "Get started" card: how far setup is (x of y), the open items each with one action, and a
 * dismiss. The first open item is highlighted as the next thing to do. It only reports clicks: you own which items are done.
 */
export function OnboardingChecklist({ items, title, onDismiss, onComplete, labels, className, ...props }: OnboardingChecklistProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labels };
  const summary = checklistSummary(items);
  const [pending, setPending] = useState<string | null>(null);
  const notified = useRef(false);
  useEffect(() => {
    if (summary.complete && !notified.current) {
      notified.current = true;
      onComplete?.();
    }
    if (!summary.complete) notified.current = false;
  }, [summary.complete, onComplete]);

  const run = async (item: OnboardingChecklistItem) => {
    setPending(item.id);
    try {
      await item.onAction?.();
    } finally {
      setPending(null);
    }
  };

  return (
    <Card role="region" aria-label={typeof title === "string" ? title : t.title} data-slot="onboarding-checklist" data-complete={summary.complete || undefined} className={cn("gap-3 p-4", className)} {...props}>
      <header className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="text-h3 text-foreground">{summary.complete ? t.allDone : (title ?? t.title)}</h3>
          <p className="text-caption text-muted-foreground" data-slot="onboarding-checklist-count">
            {fill(t.progress, { done: summary.done, total: summary.total })}
          </p>
        </div>
        {onDismiss ? (
          <Button variant="ghost" size="icon" aria-label={t.dismiss} onClick={() => void onDismiss()}>
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </header>
      <Progress value={summary.percent} tone={summary.complete ? "success" : "default"} size="sm" aria-label={fill(t.progress, { done: summary.done, total: summary.total })} />
      {summary.complete ? (
        <div className="flex items-center gap-2 rounded-control bg-nq-success-soft px-3 py-2 text-body text-nq-success-text">
          <PartyPopper aria-hidden="true" className="size-4" />
          {t.allDoneHint}
        </div>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {items.map((item, index) => {
            const isNext = index === summary.nextIndex;
            return (
              <li
                key={item.id}
                data-done={item.done || undefined}
                data-next={isNext || undefined}
                className={cn("flex items-center gap-3 rounded-control border px-3 py-2", isNext ? "border-primary bg-nq-selected" : "border-border bg-card")}
              >
                <span aria-hidden="true" className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full border", item.done ? "border-nq-success bg-nq-success text-primary-foreground" : "border-nq-line-strong text-muted-foreground")}>
                  {item.done ? <CircleCheck className="size-4" /> : (item.icon ?? null)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col text-start">
                  <span className={cn("truncate text-label", item.done ? "text-muted-foreground line-through" : "text-foreground")}>
                    {item.title}
                    <span className="sr-only">{item.done ? `, ${t.done}` : isNext ? `, ${t.next}` : ""}</span>
                  </span>
                  {item.description && !item.done ? <span className="truncate text-caption text-muted-foreground">{item.description}</span> : null}
                </span>
                {!item.done && item.actionLabel ? (
                  <Button variant={isNext ? "primary" : "secondary"} size="sm" loading={pending === item.id} disabled={pending !== null} onClick={() => void run(item)}>
                    {item.actionLabel}
                    <ArrowRight aria-hidden="true" className="rtl:-scale-x-100" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {summary.complete && onDismiss ? (
        <Button variant="secondary" size="sm" className="self-start" onClick={() => void onDismiss()}>
          {t.dismiss}
        </Button>
      ) : null}
    </Card>
  );
}
