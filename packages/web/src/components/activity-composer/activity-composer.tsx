"use client";

import { CalendarClock, CircleCheck, ListTodo, NotebookPen, Phone, Trash2, Users, Zap } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { ActionsMenu } from "../comment-thread/actions-menu";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import { Field, FieldLabel, Input, Textarea } from "../field";
import { Num } from "../numeric";
import { EmptyState, Skeleton } from "../states";
import { Tabs, TabsIndicator, TabsList, TabsTab } from "../tabs";
import { Timeline, TimelineItem } from "../timeline";
import {
  type ActivityError,
  type ActivityInput,
  type LoggedActivityKind,
  type ActivityRecord,
  COMPOSABLE_KINDS,
  type ComposableKind,
  fromLocalInput,
  isOverdue,
  splitActivities,
  toLocalInput,
  validateActivity,
} from "./activity-logic";

export {
  type ActivityActor,
  type ActivityError,
  type ActivityInput,
  type LoggedActivityKind,
  type ActivityRecord,
  COMPOSABLE_KINDS,
  type ComposableKind,
  countByKind,
  fromLocalInput,
  isOpenTask,
  isOverdue,
  splitActivities,
  toLocalInput,
  validateActivity,
} from "./activity-logic";

const STRINGS = {
  en: {
    kinds: { note: "Note", call: "Call", meeting: "Meeting", task: "Task", event: "Event" } satisfies Record<LoggedActivityKind, string>,
    kindPicker: "Kind of activity",
    bodyLabel: { note: "Note", call: "What was discussed", meeting: "Minutes", task: "What needs doing" } satisfies Record<ComposableKind, string>,
    bodyHint: { note: "Write a note…", call: "Summarise the call…", meeting: "Decisions and next steps…", task: "Follow up on…" } satisfies Record<ComposableKind, string>,
    whenLabel: { note: "When", call: "When", meeting: "When", task: "Due" } satisfies Record<ComposableKind, string>,
    duration: "Duration (minutes)",
    submit: { note: "Log note", call: "Log call", meeting: "Log meeting", task: "Add task" } satisfies Record<ComposableKind, string>,
    errors: { empty: "Write something first.", badDate: "Pick a valid date and time.", badDuration: "Duration must be between 0 and 1440 minutes." } satisfies Record<ActivityError, string>,
    planned: "Planned",
    history: "History",
    empty: "No activity yet",
    emptyHint: "Log a note, a call, a meeting or a task to start the history.",
    overdue: "Overdue",
    due: "Due",
    minutes: (n: string) => `${n} min`,
    complete: (task: string) => `Mark done: ${task}`,
    reopen: (task: string) => `Reopen: ${task}`,
    delete: "Delete",
    actions: "Activity actions",
    completed: "Done",
    listLabel: "Activity history",
    plannedLabel: "Planned tasks",
    by: "by",
  },
  ar: {
    kinds: { note: "ملاحظة", call: "مكالمة", meeting: "اجتماع", task: "مهمة", event: "حدث" } satisfies Record<LoggedActivityKind, string>,
    kindPicker: "نوع النشاط",
    bodyLabel: { note: "الملاحظة", call: "ما جرى النقاش فيه", meeting: "محضر الاجتماع", task: "المطلوب إنجازه" } satisfies Record<ComposableKind, string>,
    bodyHint: { note: "اكتب ملاحظة…", call: "لخّص المكالمة…", meeting: "القرارات والخطوات التالية…", task: "متابعة…" } satisfies Record<ComposableKind, string>,
    whenLabel: { note: "الوقت", call: "الوقت", meeting: "الوقت", task: "الاستحقاق" } satisfies Record<ComposableKind, string>,
    duration: "المدة (بالدقائق)",
    submit: { note: "تسجيل ملاحظة", call: "تسجيل مكالمة", meeting: "تسجيل اجتماع", task: "إضافة مهمة" } satisfies Record<ComposableKind, string>,
    errors: { empty: "اكتب شيئًا أولًا.", badDate: "اختر تاريخًا ووقتًا صالحين.", badDuration: "يجب أن تكون المدة بين 0 و1440 دقيقة." } satisfies Record<ActivityError, string>,
    planned: "المخطط",
    history: "السجل",
    empty: "لا يوجد نشاط بعد",
    emptyHint: "سجّل ملاحظة أو مكالمة أو اجتماعًا أو مهمة لبدء السجل.",
    overdue: "متأخرة",
    due: "الاستحقاق",
    minutes: (n: string) => `${n} د`,
    complete: (task: string) => `إنهاء: ${task}`,
    reopen: (task: string) => `إعادة فتح: ${task}`,
    delete: "حذف",
    actions: "إجراءات النشاط",
    completed: "منجزة",
    listLabel: "سجل النشاط",
    plannedLabel: "المهام المخططة",
    by: "بواسطة",
  },
};

export type ActivityLabels = Partial<typeof STRINGS.en>;
type Result = void | { error?: string };

function useT(labels?: ActivityLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } };
}

export const ACTIVITY_ICONS = { note: NotebookPen, call: Phone, meeting: Users, task: ListTodo, event: Zap } as const;

/* ------------------------------------------------------------------ composer */

export interface ActivityComposerProps extends Omit<ComponentProps<"form">, "onSubmit"> {
  /** Save the activity. Return `{ error }` to keep the form and show the message. */
  onSubmit: (input: ActivityInput) => Promise<Result>;
  /** Kinds offered, in order. Default note, call, meeting, task. */
  kinds?: readonly ComposableKind[];
  defaultKind?: ComposableKind;
  labels?: ActivityLabels;
}

/** A small form to log a note, a call, a meeting or a task: the kind, a text, when (or due) and a duration for calls and meetings. */
export function ActivityComposer({ onSubmit, kinds = COMPOSABLE_KINDS, defaultKind, labels, className, ...props }: ActivityComposerProps) {
  const { t } = useT(labels);
  const [kind, setKind] = useState<ComposableKind>(defaultKind ?? kinds[0] ?? "note");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState(() => toLocalInput(new Date()));
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timed = kind === "call" || kind === "meeting";

  const submit = async () => {
    const minutes = timed && duration.trim() !== "" ? Number(duration) : undefined;
    const at = fromLocalInput(when);
    const problem = validateActivity({ kind, body, at, durationMinutes: minutes ?? null });
    if (problem) return setError(t.errors[problem]);
    setBusy(true);
    setError(null);
    const result = await onSubmit({ kind, body: body.trim(), at: at as Date, ...(minutes !== undefined ? { durationMinutes: minutes } : {}) });
    setBusy(false);
    if (result && "error" in result && result.error) return setError(result.error);
    setBody("");
    setDuration("");
    setWhen(toLocalInput(new Date()));
  };

  return (
    <form
      data-slot="activity-composer"
      noValidate
      className={cn("flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-3", className)}
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Tabs value={kind} onValueChange={(v) => setKind(v as ComposableKind)}>
        <TabsList aria-label={t.kindPicker}>
          {kinds.map((k) => {
            const Glyph = ACTIVITY_ICONS[k];
            return (
              <TabsTab key={k} value={k}>
                <Glyph aria-hidden />
                {t.kinds[k]}
              </TabsTab>
            );
          })}
          <TabsIndicator />
        </TabsList>
      </Tabs>
      <Field>
        <FieldLabel className="sr-only">{t.bodyLabel[kind]}</FieldLabel>
        <Textarea rows={3} value={body} placeholder={t.bodyHint[kind]} onChange={(e) => setBody(e.target.value)} disabled={busy} dir="auto" />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <Field className="min-w-44 flex-1">
          <FieldLabel>{t.whenLabel[kind]}</FieldLabel>
          <Input type="datetime-local" ltr value={when} onChange={(e) => setWhen(e.target.value)} disabled={busy} />
        </Field>
        {timed ? (
          <Field className="w-40">
            <FieldLabel>{t.duration}</FieldLabel>
            <Input type="number" ltr min={0} max={1440} inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} disabled={busy} />
          </Field>
        ) : null}
        <Button type="submit" variant="primary" loading={busy}>
          {t.submit[kind]}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-body-sm text-nq-danger-text">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/* ------------------------------------------------------------------ timeline */

export interface ActivityTimelineProps extends Omit<ComponentProps<"div">, "children"> {
  activities: readonly ActivityRecord[];
  /** Tick or untick a task. Omit for read-only tasks. */
  onToggleTask?: (id: string, done: boolean) => Promise<Result>;
  /** Delete an entry. Omit to hide Delete. */
  onDelete?: (id: string) => Promise<Result>;
  /** "Now" for overdue tasks. Default the current time. */
  now?: number;
  loading?: boolean;
  /** Replaces the empty state. */
  empty?: ReactNode;
  labels?: ActivityLabels;
}

/**
 * The history of a record: open tasks first under Planned (soonest due first, overdue flagged), then everything that
 * happened, newest first. Tasks tick off in place and move into the history. Entries have a context menu.
 */
export function ActivityTimeline({ activities, onToggleTask, onDelete, now, loading = false, empty, labels, className, ...props }: ActivityTimelineProps) {
  const { t, locale } = useT(labels);
  const { open, history } = splitActivities(activities);
  const [error, setError] = useState<string | null>(null);
  const clock = now ?? Date.now();
  const n = (v: number) => new Intl.NumberFormat(locale).format(v);

  const run = async (fn: () => Promise<Result>) => {
    setError(null);
    const r = await fn();
    if (r && "error" in r && r.error) setError(r.error);
  };

  const item = (a: ActivityRecord, planned: boolean) => {
    const Glyph = ACTIVITY_ICONS[a.kind];
    const overdue = isOverdue(a, clock);
    const actions: ContextMenuAction[] = [];
    if (a.kind === "task" && onToggleTask) {
      actions.push({
        id: "toggle",
        label: a.done ? t.reopen(a.body) : t.complete(a.body),
        icon: CircleCheck,
        onSelect: () => void run(() => onToggleTask(a.id, !a.done)),
      });
    }
    if (onDelete) actions.push({ id: "delete", label: t.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => void run(() => onDelete(a.id)) });
    const title =
      a.kind === "event" ? (
        <span className="font-normal text-muted-foreground">{a.body}</span>
      ) : (
        <span className="flex flex-wrap items-center gap-2">
          {t.kinds[a.kind]}
          {a.durationMinutes ? <Badge variant="outline">{t.minutes(n(a.durationMinutes))}</Badge> : null}
          {overdue ? <Badge variant="danger">{t.overdue}</Badge> : null}
          {a.kind === "task" && a.done ? <Badge variant="success">{t.completed}</Badge> : null}
        </span>
      );
    const li = (
      <TimelineItem
        key={a.id}
        icon={<Glyph aria-hidden />}
        title={title}
        time={a.at}
        description={
          a.kind === "event" ? (
            a.actor ? (
              <span>
                {t.by} {a.actor.name}
              </span>
            ) : undefined
          ) : (
            <span dir="auto" className={cn("block whitespace-pre-wrap text-foreground", a.kind === "task" && a.done && "text-muted-foreground line-through")}>
              {a.body}
            </span>
          )
        }
      >
        {a.actor && a.kind !== "event" ? (
          <span className="text-caption text-muted-foreground">
            {t.by} {a.actor.name}
          </span>
        ) : null}
        {a.kind === "task" && onToggleTask ? (
          <label className="flex items-center gap-2 text-body-sm text-foreground">
            <Checkbox checked={!!a.done} aria-label={a.done ? t.reopen(a.body) : t.complete(a.body)} onCheckedChange={(v) => void run(() => onToggleTask(a.id, v === true))} />
            {a.done ? t.completed : planned ? t.due : ""}
          </label>
        ) : null}
        {actions.length > 0 ? <ActionsMenu actions={actions} label={t.actions} /> : null}
      </TimelineItem>
    );
    return actions.length > 0 ? <ContextMenuActions key={a.id} actions={actions} render={li} /> : li;
  };

  if (loading) {
    return (
      <div data-slot="activity-timeline" aria-busy className={cn("flex flex-col gap-4", className)} {...props}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div data-slot="activity-timeline" className={cn("flex min-w-0 flex-col gap-5", className)} {...props}>
      {activities.length === 0 ? (
        (empty ?? <EmptyState icon={CalendarClock} title={t.empty} description={t.emptyHint} />)
      ) : (
        <>
          {open.length > 0 ? (
            <section aria-label={t.plannedLabel} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-label text-foreground">
                {t.planned}
                <Badge variant="outline">
                  <Num value={open.length} />
                </Badge>
              </h3>
              <Timeline>{open.map((a) => item(a, true))}</Timeline>
            </section>
          ) : null}
          {history.length > 0 ? (
            <section aria-label={t.listLabel} className="flex flex-col gap-2">
              <h3 className="text-label text-foreground">{t.history}</h3>
              <Timeline>{history.map((a) => item(a, false))}</Timeline>
            </section>
          ) : null}
        </>
      )}
      {error ? (
        <p role="alert" className="text-body-sm text-nq-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
