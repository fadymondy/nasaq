"use client";

import { ArrowRightLeft, Ban, Check, CircleCheck, CircleX, Clock, EyeOff, ShieldQuestion, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge, type BadgeProps } from "../badge";
import { Button } from "../button";
import { Card } from "../card";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "../context-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldError, FieldLabel, Textarea } from "../field";
import { DateTime, Num } from "../numeric";
import { EmptyState } from "../states";
import { Tabs, TabsIndicator, TabsList, TabsTab } from "../tabs";
import {
  type ApprovalItem,
  type ApprovalKind,
  type ApprovalStatus,
  canApprove,
  canDecide,
  approvalStatus,
  pendingCount,
  redactArgs,
  sortQueue,
  unmetCriteria,
} from "./approval-queue-logic";

export {
  type ApprovalArgValue,
  type ApprovalCriterion,
  type ApprovalDate,
  type ApprovalItem,
  type ApprovalKind,
  type ApprovalStatus,
  canApprove,
  canDecide,
  approvalStatus,
  isExpired,
  REDACTED_MASK,
  pendingCount,
  redactArgs,
  sortQueue,
  unmetCriteria,
} from "./approval-queue-logic";

const STRINGS = {
  en: {
    title: "Approvals",
    pending: "Pending",
    decided: "Decided",
    all: "All",
    filter: "Filter the queue",
    waiting: (n: number) => (n === 1 ? "1 waiting for you" : `${n} waiting for you`),
    nothingWaiting: "Nothing is waiting for you",
    emptyTitle: "The queue is empty",
    emptyBody: "Requests that need a decision show up here.",
    emptyPending: "You are all caught up",
    emptyPendingBody: "Nothing needs a decision right now.",
    kind: { action: "Action", review: "Review", moderation: "Moderation", request: "Request" } satisfies Record<ApprovalKind, string>,
    status: { pending: "Pending", approved: "Approved", rejected: "Rejected", expired: "Expired", converted: "Converted" } satisfies Record<ApprovalStatus, string>,
    by: "By",
    requested: "Requested",
    expires: "Expires",
    expired: "Expired",
    decidedBy: "Decided by",
    reason: "Reason",
    args: "Arguments",
    redacted: "Hidden",
    criteria: "Criteria",
    pass: "Pass",
    fail: "Fail",
    unmet: (n: number) => (n === 1 ? "1 criterion not met" : `${n} criteria not met`),
    approve: "Approve",
    approveFor: (t: string) => `Approve ${t}`,
    reject: "Reject",
    rejectFor: (t: string) => `Reject ${t}`,
    convert: "Convert",
    convertFor: (t: string) => `Convert ${t}`,
    blocked: "Fix the unmet criteria before approving.",
    rejectTitle: (t: string) => `Reject ${t}?`,
    rejectBody: "The person who asked will see your reason.",
    reasonLabel: "Reason",
    reasonPlaceholder: "Say why this is rejected",
    reasonRequired: "Give a reason.",
    cancel: "Cancel",
    failed: "Could not save the decision. Try again.",
    list: "Approval requests",
  },
  ar: {
    title: "الموافقات",
    pending: "قيد الانتظار",
    decided: "تم البت فيها",
    all: "الكل",
    filter: "تصفية الطابور",
    waiting: (n: number) => (n === 1 ? "طلب واحد ينتظرك" : n === 2 ? "طلبان ينتظرانك" : n <= 10 ? `${n} طلبات تنتظرك` : `${n} طلبًا ينتظرك`),
    nothingWaiting: "لا شيء ينتظرك",
    emptyTitle: "الطابور فارغ",
    emptyBody: "تظهر هنا الطلبات التي تحتاج إلى قرار.",
    emptyPending: "لا شيء متأخر",
    emptyPendingBody: "لا شيء يحتاج إلى قرار الآن.",
    kind: { action: "إجراء", review: "مراجعة", moderation: "إشراف", request: "طلب" } satisfies Record<ApprovalKind, string>,
    status: { pending: "قيد الانتظار", approved: "تمت الموافقة", rejected: "مرفوض", expired: "منتهي", converted: "تم التحويل" } satisfies Record<ApprovalStatus, string>,
    by: "بواسطة",
    requested: "طُلب",
    expires: "ينتهي",
    expired: "انتهى",
    decidedBy: "قرار",
    reason: "السبب",
    args: "المعاملات",
    redacted: "مخفي",
    criteria: "المعايير",
    pass: "ناجح",
    fail: "غير ناجح",
    unmet: (n: number) => (n === 1 ? "معيار واحد غير مستوفى" : n === 2 ? "معياران غير مستوفيين" : n <= 10 ? `${n} معايير غير مستوفاة` : `${n} معيارًا غير مستوفى`),
    approve: "موافقة",
    approveFor: (t: string) => `الموافقة على ${t}`,
    reject: "رفض",
    rejectFor: (t: string) => `رفض ${t}`,
    convert: "تحويل",
    convertFor: (t: string) => `تحويل ${t}`,
    blocked: "عالج المعايير غير المستوفاة قبل الموافقة.",
    rejectTitle: (t: string) => `رفض ${t}؟`,
    rejectBody: "سيرى صاحب الطلب السبب الذي تكتبه.",
    reasonLabel: "السبب",
    reasonPlaceholder: "اكتب سبب الرفض",
    reasonRequired: "اكتب سببًا.",
    cancel: "إلغاء",
    failed: "تعذّر حفظ القرار. حاول مرة أخرى.",
    list: "طلبات الموافقة",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type ApprovalQueueLabels = Partial<typeof STRINGS.en>;
type DecisionResult = void | { error?: string };
type Filter = "pending" | "decided" | "all";

export interface ApprovalQueueProps extends Omit<ComponentProps<"section">, "title"> {
  items: ApprovalItem[];
  /** Approve one item. Reject or return `{ error }` to show a failure and keep the item pending. */
  onApprove: (id: string) => Promise<DecisionResult>;
  /** Reject one item with the reason the reviewer typed (never empty). */
  onReject: (id: string, reason: string) => Promise<DecisionResult>;
  /** Turn an item into something else, such as a task or an order. Omit to hide the button. */
  onConvert?: (id: string) => Promise<DecisionResult>;
  /** Text of the convert button, for example "Convert to task". Default "Convert". */
  convertLabel?: string;
  /** Which tab opens first. Default `pending`. */
  defaultFilter?: Filter;
  /** Reference time for expiry, for tests and stories. Default: now. */
  now?: number;
  title?: string;
  labels?: ApprovalQueueLabels;
}

const kindVariant: Record<ApprovalKind, BadgeProps["variant"]> = { action: "warning", review: "info", moderation: "outline", request: "accent" };
const statusVariant: Record<ApprovalStatus, BadgeProps["variant"]> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  expired: "neutral",
  converted: "info",
};

/** Right-click, Shift+F10 or the Menu key on an item opens the same actions as its buttons. */
function RowMenu({ enabled, menu, children }: { enabled: boolean; menu: ReactNode; children: ReactNode }) {
  if (!enabled) return <>{children}</>;
  return (
    <ContextMenu>
      <ContextMenuTrigger render={<div />}>{children}</ContextMenuTrigger>
      <ContextMenuContent>{menu}</ContextMenuContent>
    </ContextMenu>
  );
}

function RejectDialog({
  item,
  t,
  onCancel,
  onSubmit,
}: {
  item: ApprovalItem | null;
  t: ReturnType<typeof strings>;
  onCancel: () => void;
  onSubmit: (id: string, reason: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const empty = reason.trim() === "";
  const reset = () => {
    setReason("");
    setTouched(false);
    setError(null);
  };
  const close = () => {
    if (busy) return;
    reset();
    onCancel();
  };
  const submit = async () => {
    setTouched(true);
    if (!item || empty) return;
    setBusy(true);
    setError(null);
    const err = await onSubmit(item.id, reason.trim());
    setBusy(false);
    if (err) setError(err);
    else reset();
  };
  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent data-slot="approval-reject">
        <DialogHeader>
          <DialogTitle>{item ? t.rejectTitle(item.title) : ""}</DialogTitle>
          <DialogDescription>{t.rejectBody}</DialogDescription>
        </DialogHeader>
        <Field invalid={touched && empty}>
          <FieldLabel>{t.reasonLabel}</FieldLabel>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.reasonPlaceholder} rows={3} />
          {touched && empty ? <FieldError match>{t.reasonRequired}</FieldError> : null}
        </Field>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={close} disabled={busy}>
            {t.cancel}
          </Button>
          <Button variant="danger" loading={busy} onClick={() => void submit()}>
            {t.reject}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A pending-first queue of things waiting for a person to decide: an automation asking to run an action, a
 * review with pass/fail criteria, a comment or testimonial to moderate, a customer request. Each item shows
 * who asked, when it expires, its arguments with secrets masked, and Approve / Reject / Convert. Rejecting
 * asks for a reason. It has no backend: your callbacks decide, then you pass the updated `items` back.
 */
export function ApprovalQueue({
  items,
  onApprove,
  onReject,
  onConvert,
  convertLabel,
  defaultFilter = "pending",
  now,
  title,
  labels,
  className,
  ...props
}: ApprovalQueueProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels } as ReturnType<typeof strings>;
  const [filter, setFilter] = useState<Filter>(defaultFilter);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<ApprovalItem | null>(null);
  const clock = now ?? Date.now();

  const sorted = useMemo(() => sortQueue(items, clock), [items, clock]);
  const waiting = pendingCount(items, clock);
  const visible = sorted.filter((i) => {
    const pending = approvalStatus(i, clock) === "pending";
    return filter === "all" || (filter === "pending" ? pending : !pending);
  });

  const run = async (id: string, fn: () => Promise<DecisionResult>): Promise<string | null> => {
    setBusyId(id);
    setErrors((e) => {
      const { [id]: _drop, ...rest } = e;
      return rest;
    });
    let message: string | null = null;
    try {
      const result = await fn();
      if (result && typeof result === "object" && result.error) message = result.error;
    } catch {
      message = t.failed;
    }
    setBusyId(null);
    if (message) setErrors((e) => ({ ...e, [id]: message as string }));
    return message;
  };

  const submitReject = async (id: string, reason: string) => {
    const err = await run(id, () => onReject(id, reason));
    if (!err) setRejecting(null);
    return err;
  };

  return (
    <section data-slot="approval-queue" aria-label={title ?? t.title} className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-muted-foreground" aria-live="polite">
          {waiting > 0 ? t.waiting(waiting) : t.nothingWaiting}
        </p>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList aria-label={t.filter}>
            <TabsTab value="pending">
              {t.pending}
              {waiting > 0 ? <Num value={waiting} className="text-caption text-muted-foreground" /> : null}
            </TabsTab>
            <TabsTab value="decided">{t.decided}</TabsTab>
            <TabsTab value="all">{t.all}</TabsTab>
            <TabsIndicator />
          </TabsList>
        </Tabs>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={filter === "pending" ? CircleCheck : ShieldQuestion}
          title={filter === "pending" ? t.emptyPending : t.emptyTitle}
          description={filter === "pending" ? t.emptyPendingBody : t.emptyBody}
        />
      ) : (
        <ul aria-label={t.list} className="flex flex-col gap-3">
          {visible.map((item) => {
            const status = approvalStatus(item, clock);
            const unmet = unmetCriteria(item);
            const args = redactArgs(item.args, item.redact);
            const busy = busyId === item.id;
            const decidable = canDecide(item, clock);
            const approvable = canApprove(item, clock);
            return (
              <li key={item.id}>
                <RowMenu
                  enabled={decidable}
                  menu={
                    <>
                      <ContextMenuItem disabled={!approvable || busy} onClick={() => void run(item.id, () => onApprove(item.id))}>
                        <Check aria-hidden />
                        {t.approve}
                      </ContextMenuItem>
                      <ContextMenuItem disabled={busy} onClick={() => setRejecting(item)}>
                        <Ban aria-hidden />
                        {t.reject}
                      </ContextMenuItem>
                      {onConvert ? (
                        <ContextMenuItem disabled={busy} onClick={() => void run(item.id, () => onConvert(item.id))}>
                          <ArrowRightLeft aria-hidden />
                          {convertLabel ?? t.convert}
                        </ContextMenuItem>
                      ) : null}
                    </>
                  }
                >
                <Card data-slot="approval-item" data-status={status} data-kind={item.kind} className="gap-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={kindVariant[item.kind]}>{t.kind[item.kind]}</Badge>
                        <Badge variant={statusVariant[status]}>{t.status[status]}</Badge>
                        {item.criteria && item.criteria.length > 0 ? (
                          <Badge variant={unmet.length === 0 ? "success" : "danger"}>
                            {unmet.length === 0 ? <Check aria-hidden /> : <X aria-hidden />}
                            {unmet.length === 0 ? t.pass : t.fail}
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="text-label text-foreground">{item.title}</h3>
                      {item.description ? <p className="text-body-sm text-muted-foreground">{item.description}</p> : null}
                    </div>
                    <dl className="flex flex-col gap-0.5 text-caption text-muted-foreground sm:items-end">
                      {item.requester ? (
                        <div className="flex gap-1">
                          <dt>{t.by}</dt>
                          <dd className="text-foreground">{item.requester}</dd>
                        </div>
                      ) : null}
                      <div className="flex gap-1">
                        <dt>{t.requested}</dt>
                        <dd>
                          <DateTime value={item.createdAt} relative />
                        </dd>
                      </div>
                      {item.expiresAt !== undefined && (status === "pending" || status === "expired") ? (
                        <div className={cn("flex items-center gap-1", status === "expired" && "text-nq-danger-text")}>
                          <Clock aria-hidden className="size-3" />
                          <dt>{status === "expired" ? t.expired : t.expires}</dt>
                          <dd>
                            <DateTime value={item.expiresAt} relative />
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>

                  {item.quote ? <blockquote className="border-s-2 border-border ps-3 text-body-sm text-foreground">{item.quote}</blockquote> : null}

                  {args.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-caption text-muted-foreground">{t.args}</p>
                      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 rounded-control border border-border bg-secondary/50 p-2.5">
                        {args.map((a) => (
                          <div key={a.key} className="contents">
                            <dt dir="ltr" className="text-start font-mono text-caption text-muted-foreground">
                              {a.key}
                            </dt>
                            <dd dir="ltr" className={cn("flex min-w-0 items-center gap-1 break-words text-start font-mono text-caption", a.redacted ? "text-muted-foreground" : "text-foreground")}>
                              {a.redacted ? <EyeOff aria-label={t.redacted} className="size-3 shrink-0" /> : null}
                              {a.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}

                  {item.criteria && item.criteria.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-caption text-muted-foreground">
                        {t.criteria}
                        {unmet.length > 0 ? ` · ${t.unmet(unmet.length)}` : ""}
                      </p>
                      <ul className="flex flex-col gap-1">
                        {item.criteria.map((c) => (
                          <li key={c.id} className="flex items-center gap-2 text-body-sm">
                            {c.met ? (
                              <CircleCheck aria-label={t.pass} className="size-4 shrink-0 text-nq-success-text" />
                            ) : (
                              <CircleX aria-label={t.fail} className="size-4 shrink-0 text-nq-danger-text" />
                            )}
                            <span className={cn(!c.met && "text-nq-danger-text")}>{c.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {status !== "pending" && (item.reason || item.decidedBy) ? (
                    <p className="flex flex-wrap gap-x-3 text-body-sm text-muted-foreground">
                      {item.decidedBy ? (
                        <span>
                          {t.decidedBy} <span className="text-foreground">{item.decidedBy}</span>
                          {item.decidedAt !== undefined ? (
                            <>
                              {" "}
                              <DateTime value={item.decidedAt} relative />
                            </>
                          ) : null}
                        </span>
                      ) : null}
                      {item.reason ? (
                        <span>
                          {t.reason}: <span className="text-foreground">{item.reason}</span>
                        </span>
                      ) : null}
                    </p>
                  ) : null}

                  {errors[item.id] ? <Alert tone="danger">{errors[item.id]}</Alert> : null}

                  {decidable ? (
                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!approvable}
                        loading={busy}
                        aria-label={t.approveFor(item.title)}
                        title={approvable ? undefined : t.blocked}
                        onClick={() => void run(item.id, () => onApprove(item.id))}
                      >
                        <Check aria-hidden />
                        {t.approve}
                      </Button>
                      <Button variant="secondary" size="sm" disabled={busy} aria-label={t.rejectFor(item.title)} onClick={() => setRejecting(item)}>
                        <Ban aria-hidden />
                        {t.reject}
                      </Button>
                      {onConvert ? (
                        <Button variant="ghost" size="sm" disabled={busy} aria-label={t.convertFor(item.title)} onClick={() => void run(item.id, () => onConvert(item.id))}>
                          <ArrowRightLeft aria-hidden />
                          {convertLabel ?? t.convert}
                        </Button>
                      ) : null}
                      {!approvable ? <span className="text-caption text-nq-danger-text">{t.blocked}</span> : null}
                    </div>
                  ) : null}
                </Card>
                </RowMenu>
              </li>
            );
          })}
        </ul>
      )}

      <RejectDialog item={rejecting} t={t} onCancel={() => setRejecting(null)} onSubmit={submitReject} />
    </section>
  );
}
