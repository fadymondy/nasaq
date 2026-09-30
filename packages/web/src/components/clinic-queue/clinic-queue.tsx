"use client";

import { BellRing, CheckCheck, Megaphone, PhoneCall, PlayCircle, RotateCcw, SkipForward, UserX } from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { DataTable, type DataTableRowAction, useDataTable } from "../data-table";
import { Num } from "../numeric";
import { isCallOverdue, type QueueEntry, waitingOrder } from "../waiting-screen/queue-math";
import { QueueLiveIndicator, type QueueConnection } from "../waiting-screen";
import { useQueueNow } from "../waiting-screen/use-now";

export type ClinicQueueAction = "call-next" | "call" | "recall" | "skip" | "start" | "finish" | "no-show";

const STRINGS = {
  en: {
    title: "Patient queue",
    callNext: "Call next",
    nextIs: (t: string) => `Next in line: ${t}`,
    empty: "Nobody is waiting.",
    serving: "With you now",
    nothingServing: "No one has been called.",
    table: "Patients in the queue",
    ticket: "Ticket",
    patient: "Patient",
    status: "Status",
    priority: "Priority",
    waited: "Waiting",
    min: (n: number) => `${n} min`,
    st: { waiting: "Waiting", called: "Called", serving: "In visit", done: "Done", skipped: "Skipped", no_show: "No-show", left: "Left" } as Record<string, string>,
    pr: { normal: "Walk-in", appointment: "Appointment", urgent: "Urgent" } as Record<string, string>,
    actions: { "call-next": "Call next", call: "Call now", recall: "Call again", skip: "Skip", start: "Start visit", finish: "Finish visit", "no-show": "Mark no-show" } as Record<ClinicQueueAction, string>,
    putBack: "Put back in line",
    overdue: (t: string, m: number) => `${t} has not answered for ${m} min. Call again or skip.`,
    recalled: (n: number) => `Called ${n} ${n === 1 ? "time" : "times"}`,
    failed: "That did not work. Try again.",
    room: (r: string) => `Room ${r}`,
    rowLabel: (t: string) => t,
  },
  ar: {
    title: "طابور المرضى",
    callNext: "نداء التالي",
    nextIs: (t: string) => `التالي في الصف: ${t}`,
    empty: "لا أحد في الانتظار.",
    serving: "معك الآن",
    nothingServing: "لم يُنادَ على أحد.",
    table: "المرضى في الطابور",
    ticket: "التذكرة",
    patient: "المريض",
    status: "الحالة",
    priority: "الأولوية",
    waited: "الانتظار",
    min: (n: number) => `${n} دقيقة`,
    st: { waiting: "ينتظر", called: "تم النداء", serving: "في الزيارة", done: "انتهى", skipped: "تم التخطي", no_show: "لم يحضر", left: "غادر" } as Record<string, string>,
    pr: { normal: "بدون موعد", appointment: "بموعد", urgent: "عاجل" } as Record<string, string>,
    actions: { "call-next": "نداء التالي", call: "نداء الآن", recall: "نداء مجددًا", skip: "تخطي", start: "بدء الزيارة", finish: "إنهاء الزيارة", "no-show": "تسجيل عدم الحضور" } as Record<ClinicQueueAction, string>,
    putBack: "إعادة إلى الصف",
    overdue: (t: string, m: number) => `لم يردّ ${t} منذ ${m} دقيقة. نادِ مجددًا أو تخطَّ.`,
    recalled: (n: number) => (n === 1 ? "نودي مرة واحدة" : n === 2 ? "نودي مرتين" : `نودي ${n} مرات`),
    failed: "لم تنجح العملية. حاول مجددًا.",
    room: (r: string) => `الغرفة ${r}`,
    rowLabel: (t: string) => t,
  },
};

export type ClinicQueueLabels = (typeof STRINGS)["en"];

export interface ClinicQueueProps extends Omit<ComponentProps<"div">, "children"> {
  /** The queue. Show one doctor's list by passing only their entries, or pass everything. */
  entries: readonly QueueEntry[];
  /**
   * Do something to a ticket. `id` is missing for "call-next". Return `{ error }` (or throw) to show a message.
   * The queue rules (order, who may move where) live in `queue-math`: apply them in the handler.
   */
  onAction: (action: ClinicQueueAction, id?: string) => Promise<void | { error?: string }>;
  /** Minutes a called ticket may go unanswered before the panel warns. Default 5. */
  graceMinutes?: number;
  connection?: QueueConnection;
  /** When the queue last updated (epoch ms), for the live indicator. */
  updatedAt?: number;
  /** Overrides the clock (epoch ms) for stories and tests. */
  now?: number;
  labels?: Partial<ClinicQueueLabels>;
}

const ORDER: Record<string, number> = { serving: 0, called: 1, waiting: 2, skipped: 3 };

/**
 * A doctor's live patient queue: a big Call next button, the patients who are with the doctor or being called, and a table of everyone
 * else with the moves that make sense for each row (call now, call again, skip, start, finish, put back). The same moves
 * open from the row's menu, the context menu and the keyboard. Waiting patients come in the order `waitingOrder` gives.
 */
export function ClinicQueue({ entries, onAction, graceMinutes = 5, connection = "live", updatedAt, now: nowProp, labels, className, ...rest }: ClinicQueueProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as ClinicQueueLabels;
  const now = useQueueNow(1000, nowProp);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: ClinicQueueAction, id?: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await onAction(action, id);
      if (r && r.error) setError(r.error);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  const waiting = useMemo(() => waitingOrder(entries), [entries]);
  const active = entries.filter((e) => e.status === "called" || e.status === "serving");
  const rows = useMemo(() => {
    const order = new Map(waiting.map((e, i) => [e.id, i]));
    return entries
      .filter((e) => e.status in ORDER)
      .sort((a, b) => ORDER[a.status]! - ORDER[b.status]! || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0) || a.queuedAt - b.queuedAt);
  }, [entries, waiting]);
  const overdue = active.filter((e) => isCallOverdue(e, now, graceMinutes));

  const table = useDataTable<QueueEntry>({
    data: rows,
    getRowId: (e) => e.id,
    columns: [
      { id: "ticket", header: t.ticket, cell: (e) => <bdi dir="ltr" className="font-mono font-semibold tabular-nums">{e.ticket}</bdi> },
      { id: "patient", header: t.patient, cell: (e) => e.name ?? "-" },
      { id: "priority", header: t.priority, cell: (e) => (e.priority === "urgent" ? <Badge variant="danger">{t.pr.urgent}</Badge> : <span className="text-muted-foreground">{t.pr[e.priority ?? "normal"]}</span>) },
      { id: "status", header: t.status, cell: (e) => <Badge variant={e.status === "serving" ? "brand" : e.status === "called" ? "info" : e.status === "skipped" ? "warning" : "neutral"}>{t.st[e.status]}</Badge> },
      { id: "waited", header: t.waited, align: "end", cell: (e) => <span className="tabular-nums">{t.min(Math.max(0, Math.floor((now - e.queuedAt) / 60000)))}</span> },
    ],
  });

  const actionsFor = (e: QueueEntry): DataTableRowAction[] => {
    const a = (id: ClinicQueueAction, icon: DataTableRowAction["icon"], extra: Partial<DataTableRowAction> = {}): DataTableRowAction => ({ id, label: t.actions[id], icon, onSelect: () => void run(id, e.id), disabled: busy, ...extra });
    switch (e.status) {
      case "waiting":
        return [a("call", PhoneCall)];
      case "called":
        return [a("start", PlayCircle), a("recall", Megaphone), a("skip", SkipForward, { group: "more" }), a("no-show", UserX, { group: "more", danger: true })];
      case "serving":
        return [a("finish", CheckCheck)];
      case "skipped":
        return [a("recall", RotateCcw, { label: t.putBack }), a("no-show", UserX, { danger: true })];
      default:
        return [];
    }
  };

  const nextUp = waiting[0];

  return (
    <div data-slot="clinic-queue" className={cn("flex flex-col gap-4", className)} {...rest}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-h3">{t.title}</h2>
          <p className="text-body-sm text-muted-foreground">{nextUp ? t.nextIs(nextUp.ticket) : t.empty}</p>
        </div>
        <div className="flex items-center gap-3">
          <QueueLiveIndicator connection={connection} updatedAt={updatedAt} now={nowProp} />
          <Button size="lg" onClick={() => run("call-next")} disabled={busy || !nextUp}>
            <BellRing aria-hidden />
            {t.callNext}
            {nextUp ? (
              <bdi dir="ltr" className="rounded-control bg-primary-foreground/20 px-1.5 font-mono tabular-nums">
                {nextUp.ticket}
              </bdi>
            ) : null}
          </Button>
        </div>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {overdue.map((e) => (
        <Alert key={e.id} tone="warning">
          {t.overdue(e.ticket, Math.floor((now - (e.calledAt ?? now)) / 60000))}
        </Alert>
      ))}

      <section aria-label={t.serving} className="grid gap-3 sm:grid-cols-2">
        {active.length === 0 ? (
          <p className="text-body-sm text-muted-foreground sm:col-span-2">{t.nothingServing}</p>
        ) : (
          active.map((e) => (
            <Card key={e.id} data-slot="clinic-queue-active" data-status={e.status}>
              <CardHeader>
                <CardTitle as="h3" className="flex items-center gap-2">
                  <bdi dir="ltr" className="font-mono text-h3 tabular-nums">
                    {e.ticket}
                  </bdi>
                  <Badge variant={e.status === "serving" ? "brand" : "info"}>{t.st[e.status]}</Badge>
                </CardTitle>
                <CardDescription>
                  {e.name ?? ""}
                  {e.room ? ` · ${t.room(e.room)}` : ""}
                  {e.recalls ? ` · ${t.recalled(e.recalls + 1)}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {actionsFor(e).map((action) => (
                  <Button key={action.id} size="sm" variant={action.id === "start" || action.id === "finish" ? "primary" : "secondary"} disabled={busy} onClick={action.onSelect}>
                    {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <DataTable table={table} label={t.table} rowLabel={(e) => e.ticket} rowActions={actionsFor} empty={<span>{t.empty}</span>} />
      <p className="sr-only" aria-live="polite">
        {t.title}: <Num value={waiting.length} />
      </p>
    </div>
  );
}
