"use client";

import { type ComponentProps, type ReactElement, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import { DataTable, type DataTableRowAction, useDataTable } from "../data-table";
import { Field, FieldError, FieldLabel, Input, Textarea } from "../field";
import { InvoiceList, type InvoiceSummary } from "../invoice-list";
import { type FormatNumberOptions, formatDate, formatNumber } from "../numeric";
import { Progress } from "../progress";
import { StatCard, StatGrid } from "../stat-card";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { Timeline, TimelineItem } from "../timeline";
import {
  PORTAL_TASK_STATUSES,
  type PortalRequest,
  type PortalRequestStatus,
  type PortalTask,
  type PortalTaskStatus,
  type PortalWeek,
  portalBudget,
  portalPendingRequests,
  portalProgress,
  portalRing,
  portalTotalHours,
  portalVisibleInvoices,
  portalWeeksNewestFirst,
} from "./client-portal-logic";

const STRINGS = {
  en: {
    tabs: { overview: "Overview", board: "Board", requests: "Requests", time: "Time", invoices: "Invoices", activity: "Activity" },
    progress: "Progress",
    tasksDone: (done: number, total: number) => `${done} of ${total} tasks done`,
    percentDone: "done",
    hoursUsed: "Hours used",
    hoursBudget: "Budget",
    hoursLeft: "Hours left",
    openIssues: "Open issues",
    pendingRequests: "Waiting for a reply",
    weekly: "Hours per week",
    weeklyLabel: (n: number) => `Hours in the last ${n} weeks`,
    budgetUsed: (used: string, budget: string) => `${used} of ${budget} hours used`,
    overBudget: "Over budget",
    noBudget: "No hours budget set",
    weekOf: "Week of",
    hours: "Hours",
    boardNote: "A read-only view of the board.",
    columns: { todo: "To do", doing: "In progress", review: "In review", done: "Done" } as Record<PortalTaskStatus, string>,
    noCards: "Nothing here",
    unassigned: "Unassigned",
    requests: "Requests",
    newRequest: "Ask for something",
    requestTitle: "What do you need?",
    requestDetails: "Details",
    requestDetailsOptional: "(optional)",
    send: "Send request",
    titleRequired: "Tell us what you need.",
    sent: "Sent. We will reply here.",
    noRequests: "No requests yet",
    noRequestsBody: "Ask for a change or a new feature and it shows up here.",
    requestStatus: { pending: "Waiting", accepted: "Accepted", declined: "Declined", done: "Done" } as Record<PortalRequestStatus, string>,
    by: "By",
    timeTitle: "Time",
    total: "Total hours",
    weeksTable: "Hours by week",
    noTime: "No hours logged yet",
    invoices: "Invoices",
    noInvoices: "No invoices yet",
    noInvoicesBody: "Invoices appear here once they are sent to you.",
    activity: "Activity",
    noActivity: "Nothing has happened yet",
    due: "Due",
  },
  ar: {
    tabs: { overview: "نظرة عامة", board: "اللوحة", requests: "الطلبات", time: "الوقت", invoices: "الفواتير", activity: "النشاط" },
    progress: "التقدم",
    tasksDone: (done: number, total: number) => `أُنجزت ${formatNumber(done, "ar")} من ${formatNumber(total, "ar")} مهمة`,
    percentDone: "مكتمل",
    hoursUsed: "الساعات المستخدمة",
    hoursBudget: "الميزانية",
    hoursLeft: "الساعات المتبقية",
    openIssues: "مشكلات مفتوحة",
    pendingRequests: "بانتظار الرد",
    weekly: "الساعات في الأسبوع",
    weeklyLabel: (n: number) => `الساعات في آخر ${formatNumber(n, "ar")} أسابيع`,
    budgetUsed: (used: string, budget: string) => `استُخدمت ${used} من ${budget} ساعة`,
    overBudget: "تجاوزت الميزانية",
    noBudget: "لا توجد ميزانية ساعات",
    weekOf: "أسبوع",
    hours: "الساعات",
    boardNote: "عرض للقراءة فقط للوحة.",
    columns: { todo: "للتنفيذ", doing: "قيد التنفيذ", review: "قيد المراجعة", done: "منجز" } as Record<PortalTaskStatus, string>,
    noCards: "لا شيء هنا",
    unassigned: "بلا مسؤول",
    requests: "الطلبات",
    newRequest: "اطلب شيئًا",
    requestTitle: "ماذا تحتاج؟",
    requestDetails: "التفاصيل",
    requestDetailsOptional: "(اختياري)",
    send: "إرسال الطلب",
    titleRequired: "أخبرنا بما تحتاجه.",
    sent: "أُرسل. سنرد عليك هنا.",
    noRequests: "لا طلبات بعد",
    noRequestsBody: "اطلب تعديلًا أو ميزة جديدة وستظهر هنا.",
    requestStatus: { pending: "بانتظار الرد", accepted: "مقبول", declined: "مرفوض", done: "منجز" } as Record<PortalRequestStatus, string>,
    by: "بواسطة",
    timeTitle: "الوقت",
    total: "إجمالي الساعات",
    weeksTable: "الساعات حسب الأسبوع",
    noTime: "لم تُسجَّل ساعات بعد",
    invoices: "الفواتير",
    noInvoices: "لا فواتير بعد",
    noInvoicesBody: "تظهر الفواتير هنا بعد إرسالها إليك.",
    activity: "النشاط",
    noActivity: "لم يحدث شيء بعد",
    due: "الاستحقاق",
  },
};

export type ClientPortalLabels = Partial<typeof STRINGS.en>;

export type ClientPortalTab = keyof typeof STRINGS.en.tabs;

export interface PortalActivity {
  id: string;
  actor?: { name: string; avatar?: string };
  title: ReactNode;
  description?: ReactNode;
  /** ISO date-time. */
  at: string;
}

export interface PortalProject {
  name: string;
  /** The customer's company. */
  client?: string;
  summary?: string;
  /** ISO date. */
  due?: string;
}

const requestTone: Record<PortalRequestStatus, StatusTone> = { pending: "warning", accepted: "info", declined: "danger", done: "success" };

export interface ClientPortalProps extends Omit<ComponentProps<"div">, "children"> {
  project: PortalProject;
  /** The board, shown read only. Titles and status only: no internal notes. */
  tasks: readonly PortalTask[];
  /** Issues still open, as a number. The portal never lists internal issues. */
  openIssues?: number;
  requests: readonly PortalRequest[];
  /** Hours per week, from the time log. Individual entries are not shown. */
  weeks: readonly PortalWeek[];
  /** Hours the customer bought. 0 or missing means no budget. */
  budgetHours?: number;
  /** Every invoice; drafts are filtered out here, so a customer never sees an unsent invoice or its amount. */
  invoices: readonly InvoiceSummary[];
  /** ISO 4217 code for invoice amounts. */
  currency: string;
  activity: readonly PortalActivity[];
  /** Adds the "Ask for something" form. Reject to keep the text and show the message. */
  onRequest?: (input: { title: string; description: string }) => void | Promise<void>;
  onOpenInvoice?: (invoice: InvoiceSummary) => void;
  onPayInvoice?: (invoice: InvoiceSummary) => void;
  onDownloadInvoice?: (invoice: InvoiceSummary) => Promise<void>;
  /** Menus: context-click, long-press, Shift+F10 or the Menu key on a card, request, week or event. */
  taskActions?: (task: PortalTask) => ContextMenuAction[];
  requestActions?: (request: PortalRequest) => ContextMenuAction[];
  weekActions?: (week: PortalWeek) => DataTableRowAction[];
  activityActions?: (item: PortalActivity) => ContextMenuAction[];
  tab?: ClientPortalTab;
  defaultTab?: ClientPortalTab;
  onTabChange?: (tab: ClientPortalTab) => void;
  /** Weeks drawn in the overview chart. Default 8. */
  chartWeeks?: number;
  /** Replaces the header, for a logo or a sign-out button. */
  header?: ReactNode;
  locale?: string;
  labels?: ClientPortalLabels;
}

function Ring({ percent, value, label, caption }: { percent: number; value: string; label: string; caption: string }) {
  const r = 52;
  const { circumference, offset } = portalRing(percent, r);
  return (
    <div data-slot="portal-ring" className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" role="img" aria-label={label} className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="stroke-primary transition-[stroke-dashoffset] motion-reduce:transition-none" />
      </svg>
      <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-heading-lg font-semibold tabular-nums">{value}</span>
        <span className="text-caption text-muted-foreground">{caption}</span>
      </div>
    </div>
  );
}


/**
 * What a customer sees of their project: a progress ring and hours against the budget, a read-only board, their
 * requests (with a form to make one), hours per week, sent invoices and an activity feed. Aggregates only: no
 * internal issues, no single time entries, no drafts.
 */
export function ClientPortal({
  project,
  tasks,
  openIssues,
  requests,
  weeks,
  budgetHours = 0,
  invoices,
  currency,
  activity,
  onRequest,
  onOpenInvoice,
  onPayInvoice,
  onDownloadInvoice,
  taskActions,
  requestActions,
  weekActions,
  activityActions,
  tab,
  defaultTab = "overview",
  onTabChange,
  chartWeeks = 8,
  header,
  locale: localeProp,
  labels,
  className,
  ...props
}: ClientPortalProps) {
  const ambient = useOptionalNasaq()?.locale;
  const locale = localeProp ?? ambient ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } as typeof STRINGS.en;
  const num = (n: number, o?: FormatNumberOptions) => formatNumber(n, locale, o);
  const hrs = (n: number) => num(n, { maximumFractionDigits: 1 });
  const [inner, setInner] = useState<ClientPortalTab>(defaultTab);
  const current = tab ?? inner;

  const progress = portalProgress(tasks);
  const used = portalTotalHours(weeks);
  const budget = portalBudget(budgetHours, used);
  const pending = portalPendingRequests(requests);
  const visibleInvoices = portalVisibleInvoices(invoices);
  const recentWeeks = portalWeeksNewestFirst(weeks).slice(0, chartWeeks).reverse();
  const maxWeek = Math.max(1, ...recentWeeks.map((w) => w.hours));

  return (
    <div data-slot="client-portal" className={cn("flex w-full min-w-0 flex-col gap-5", className)} {...props}>
      {header ?? (
        <header className="flex flex-col gap-1">
          {project.client ? <p className="text-caption text-muted-foreground">{project.client}</p> : null}
          <h1 className="text-heading-lg font-semibold">{project.name}</h1>
          {project.summary ? <p className="max-w-prose text-body-sm text-muted-foreground">{project.summary}</p> : null}
          {project.due ? (
            <p className="text-caption text-muted-foreground">
              {t.due}: {formatDate(project.due, locale, { dateStyle: "medium" })}
            </p>
          ) : null}
        </header>
      )}

      <Tabs
        value={current}
        onValueChange={(v) => {
          const next = String(v) as ClientPortalTab;
          setInner(next);
          onTabChange?.(next);
        }}
      >
        <TabsList variant="underline" className="max-w-full overflow-x-auto">
          {(Object.keys(t.tabs) as ClientPortalTab[]).map((k) => (
            <TabsTab key={k} value={k}>
              {t.tabs[k]}
            </TabsTab>
          ))}
        </TabsList>

        <TabsPanel value="overview" className="flex flex-col gap-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Card>
              <CardHeader>
                <CardTitle as="h2">{t.progress}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-5">
                <Ring percent={progress.percent} value={num(progress.percent / 100, { style: "percent" })} label={`${num(progress.percent / 100, { style: "percent" })} ${t.percentDone}`} caption={t.percentDone} />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="text-body-sm">{t.tasksDone(progress.done, progress.total)}</p>
                  <ul className="flex flex-col gap-1 text-caption text-muted-foreground">
                    {PORTAL_TASK_STATUSES.map((s) => (
                      <li key={s} className="flex justify-between gap-3">
                        <span>{t.columns[s]}</span>
                        <span className="tabular-nums">{num(progress.byStatus[s])}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
            <div className="flex min-w-0 flex-col gap-4">
              <StatGrid>
                <StatCard label={t.hoursUsed} value={hrs(used)} />
                <StatCard label={budget.budget > 0 ? t.hoursLeft : t.hoursBudget} value={budget.budget > 0 ? hrs(budget.remaining) : t.noBudget} />
                <StatCard label={t.openIssues} value={openIssues ?? 0} />
                <StatCard label={t.pendingRequests} value={pending} />
              </StatGrid>
              {budget.budget > 0 ? (
                <Progress value={budget.percent} tone={budget.tone} aria-label={t.budgetUsed(hrs(used), hrs(budget.budget))} label={budget.over ? t.overBudget : t.budgetUsed(hrs(used), hrs(budget.budget))} />
              ) : null}
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle as="h2">{t.weekly}</CardTitle>
            </CardHeader>
            <CardContent>
              {recentWeeks.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">{t.noTime}</p>
              ) : (
                <div role="img" aria-label={t.weeklyLabel(recentWeeks.length)} className="flex h-40 items-end gap-2">
                  {recentWeeks.map((w) => (
                    <div key={w.week} aria-hidden className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-caption tabular-nums text-muted-foreground">{hrs(w.hours)}</span>
                      <div className="w-full max-w-10 rounded-t-control bg-primary" style={{ height: `${Math.max(4, (w.hours / maxWeek) * 100)}%` }} />
                      <span className="w-full truncate text-center text-caption text-muted-foreground">{formatDate(w.week, locale, { month: "short", day: "numeric" })}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsPanel>

        <TabsPanel value="board" className="flex flex-col gap-3 pt-4">
          <p className="text-caption text-muted-foreground">{t.boardNote}</p>
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {PORTAL_TASK_STATUSES.map((s) => {
              const cards = tasks.filter((x) => x.status === s);
              return (
                <section key={s} aria-label={t.columns[s]} className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-muted/40 p-2">
                  <h3 className="flex items-center justify-between px-1 text-label">
                    <span>{t.columns[s]}</span>
                    <span className="text-caption tabular-nums text-muted-foreground">{num(cards.length)}</span>
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {cards.length === 0 ? <li className="px-1 py-3 text-caption text-muted-foreground">{t.noCards}</li> : null}
                    {cards.map((c) => {
                      const acts = taskActions?.(c);
                      const el = (
                        <li key={c.id} data-slot="portal-task" tabIndex={acts && acts.length > 0 ? 0 : undefined} className="flex flex-col gap-2 rounded-control border border-border bg-card p-3 text-body-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <span>{c.title}</span>
                          <span className="flex items-center gap-2 text-caption text-muted-foreground">
                            {c.assignee ? <Avatar name={c.assignee} size="sm" /> : null}
                            <span className="truncate">{c.assignee ?? t.unassigned}</span>
                          </span>
                        </li>
                      );
                      return <ContextItem key={c.id} actions={acts} element={el} />;
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </TabsPanel>

        <TabsPanel value="requests" className="flex flex-col gap-4 pt-4">
          {onRequest ? <RequestForm t={t} onRequest={onRequest} /> : null}
          <h2 className="text-heading-sm font-semibold">{t.requests}</h2>
          {requests.length === 0 ? (
            <EmptyState title={t.noRequests} description={t.noRequestsBody} />
          ) : (
            <ul className="flex w-full flex-col gap-2">
              {[...requests]
                .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                .map((r) => {
                  const acts = requestActions?.(r);
                  const el = (
                    <li data-slot="portal-request" tabIndex={acts && acts.length > 0 ? 0 : undefined} className="flex flex-col gap-1 rounded-card border border-border bg-card p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{r.title}</span>
                        <Status tone={requestTone[r.status]}>{t.requestStatus[r.status]}</Status>
                      </div>
                      {r.description ? <p className="text-body-sm text-muted-foreground">{r.description}</p> : null}
                      {r.reply ? <p className="text-body-sm">{r.reply}</p> : null}
                      <p className="text-caption text-muted-foreground">
                        {r.by ? `${t.by} ${r.by} · ` : ""}
                        {formatDate(r.createdAt, locale, { dateStyle: "medium" })}
                      </p>
                    </li>
                  );
                  return <ContextItem key={r.id} actions={acts} element={el} />;
                })}
            </ul>
          )}
        </TabsPanel>

        <TabsPanel value="time" className="pt-4">
          <TimePanel t={t} weeks={weeks} budget={budget} weekActions={weekActions} locale={locale} used={used} />
        </TabsPanel>

        <TabsPanel value="invoices" className="pt-4">
          {visibleInvoices.length === 0 ? (
            <EmptyState title={t.noInvoices} description={t.noInvoicesBody} />
          ) : (
            <InvoiceList invoices={visibleInvoices} currency={currency} onOpen={onOpenInvoice} onPay={onPayInvoice} onDownload={onDownloadInvoice} />
          )}
        </TabsPanel>

        <TabsPanel value="activity" className="pt-4">
          {activity.length === 0 ? (
            <EmptyState title={t.noActivity} />
          ) : (
            <Timeline>
              {[...activity]
                .sort((a, b) => (a.at < b.at ? 1 : -1))
                .map((a) => {
                  const acts = activityActions?.(a);
                  const el = <TimelineItem key={a.id} actor={a.actor} title={a.title} description={a.description} time={a.at} tabIndex={acts && acts.length > 0 ? 0 : undefined} />;
                  return <ContextItem key={a.id} actions={acts} element={el} />;
                })}
            </Timeline>
          )}
        </TabsPanel>
      </Tabs>
    </div>
  );
}

/** The element as it is, or opened by a menu on context-click, long-press, Shift+F10 and the Menu key when it has actions. */
function ContextItem({ actions, element }: { actions: readonly ContextMenuAction[] | undefined; element: ReactElement }) {
  if (!actions || actions.length === 0) return element;
  return <ContextMenuActions actions={actions} render={element} />;
}

function TimePanel({ t, weeks, budget, weekActions, locale, used }: { t: typeof STRINGS.en; weeks: readonly PortalWeek[]; budget: ReturnType<typeof portalBudget>; weekActions?: (w: PortalWeek) => DataTableRowAction[]; locale: string; used: number }) {
  const hrs = (n: number) => formatNumber(n, locale, { maximumFractionDigits: 1 });
  const table = useDataTable<PortalWeek>({
    data: portalWeeksNewestFirst(weeks),
    getRowId: (w) => w.week,
    columns: [
      { id: "week", header: t.weekOf, sortValue: (w) => w.week, cell: (w) => formatDate(w.week, locale, { dateStyle: "medium" }) },
      { id: "hours", header: t.hours, align: "end", sortValue: (w) => w.hours, cell: (w) => <span className="tabular-nums">{hrs(w.hours)}</span> },
    ],
  });
  return (
    <div className="flex w-full flex-col gap-4">
      <StatGrid>
        <StatCard label={t.total} value={hrs(used)} />
        <StatCard label={t.hoursBudget} value={budget.budget > 0 ? hrs(budget.budget) : t.noBudget} />
        <StatCard label={t.hoursLeft} value={budget.budget > 0 ? hrs(budget.remaining) : "—"} />
      </StatGrid>
      {budget.budget > 0 ? <Progress value={budget.percent} tone={budget.tone} aria-label={t.budgetUsed(hrs(used), hrs(budget.budget))} /> : null}
      <DataTable table={table} label={t.weeksTable} rowLabel={(w) => `${t.weekOf} ${formatDate(w.week, locale, { dateStyle: "medium" })}`} rowActions={weekActions} empty={t.noTime} />
    </div>
  );
}

function RequestForm({ t, onRequest }: { t: typeof STRINGS.en; onRequest: NonNullable<ClientPortalProps["onRequest"]> }) {
  const uid = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <form
      data-slot="portal-request-form"
      noValidate
      className="flex w-full max-w-xl flex-col gap-3 rounded-card border border-border bg-card p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSent(false);
        if (title.trim() === "") {
          setError(t.titleRequired);
          return;
        }
        setError(null);
        setBusy(true);
        try {
          await onRequest({ title: title.trim(), description: description.trim() });
          setTitle("");
          setDescription("");
          setSent(true);
        } catch (err) {
          setError(err instanceof Error && err.message ? err.message : t.titleRequired);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-heading-sm font-semibold">{t.newRequest}</h2>
      <Field invalid={error !== null}>
        <FieldLabel htmlFor={`${uid}-title`}>{t.requestTitle}</FieldLabel>
        <Input id={`${uid}-title`} value={title} onChange={(e) => setTitle(e.target.value)} />
        {error ? <FieldError match>{error}</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel htmlFor={`${uid}-details`}>
          {t.requestDetails} {t.requestDetailsOptional}
        </FieldLabel>
        <Textarea id={`${uid}-details`} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={busy}>
          {t.send}
        </Button>
        {sent ? (
          <span role="status" className="text-body-sm text-muted-foreground">
            {t.sent}
          </span>
        ) : null}
      </div>
    </form>
  );
}
