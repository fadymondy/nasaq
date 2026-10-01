"use client";

import { Check, CircleX, Clock, ExternalLink, Eye, ReceiptText, ShieldCheck, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { CopyButton } from "../copy-button";
import { minorToMajor } from "../currency-input/currency-input-logic";
import { DataTable, type DataTableColumn, DataTableFacetFilter, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { FileUpload, type UploadFile } from "../file-upload";
import { DateTime, formatNumber, Num } from "../numeric";
import { QrCode } from "../qr-code";
import { RadioCard, RadioGroup } from "../radio-group";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";
import {
  canSubmitReceipt,
  isFinalVerification,
  normalizeReference,
  type PaymentFee,
  paymentFee,
  paymentLimit,
  paymentTotal,
  type PaymentVerification,
  referenceProblem,
  verificationStep,
} from "./payment-logic";
import { useCurrency } from "../../provider/nasaq-provider";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    title: "Pay by transfer",
    description: (total: string) => `Send exactly ${total}, then add your receipt so we can verify it.`,
    method: "Payment method",
    kinds: { "instant-transfer": "Instant transfer", "mobile-wallet": "Mobile wallet", "bank-transfer": "Bank transfer", "cash-deposit": "Cash deposit" },
    fee: (fee: string) => `Fee ${fee}`,
    noFee: "No fee",
    steps: "How to pay",
    details: "Send it to",
    copy: "Copy",
    amount: "Amount",
    feeRow: "Method fee",
    total: "Total to send",
    scan: "Scan to pay",
    reference: "Transfer reference",
    referenceHint: "The reference number shown in your banking or wallet app after the transfer.",
    receipt: "Receipt",
    receiptHint: "A photo or PDF of the transfer. Up to 5 MB.",
    receiptDrop: "Drop the receipt here or browse",
    submit: "I have paid, send for verification",
    cancel: "Cancel",
    failed: "That did not go through. Try again.",
    problems: {
      empty: "Enter the transfer reference.",
      short: "That reference looks too short.",
      chars: "Use letters, digits and dashes only.",
      receipt: "Add the receipt.",
      min: (min: string) => `This method needs at least ${min}.`,
      max: (max: string) => `This method allows up to ${max}.`,
      method: "Choose a payment method.",
    },
    empty: "No payment methods",
    emptyDescription: "Add a method to start taking payments.",
    verification: "Verification",
    stages: { submitted: "Receipt sent", verifying: "Under review", verified: "Payment verified" },
    stageHelp: {
      submitted: "We have your receipt.",
      verifying: "Someone on the team is matching it with the bank.",
      verified: "Your payment is confirmed.",
    },
    statuses: { unpaid: "Awaiting payment", submitted: "Receipt sent", verifying: "Under review", verified: "Verified", rejected: "Rejected" },
    submittedAt: "Sent",
    rejectedTitle: "We could not verify this payment",
    rejectedHelp: "Send a new receipt and we will look again.",
    resubmit: "Send a new receipt",
    viaMethod: (name: string) => `Paid with ${name}`,
    queue: "Payments to verify",
    customer: "Customer",
    methodCol: "Method",
    amountCol: "Amount",
    referenceCol: "Reference",
    sent: "Sent",
    statusCol: "Status",
    search: "Search payments",
    verify: "Verify",
    reject: "Reject",
    viewReceipt: "View receipt",
    rejectTitle: "Reject this payment?",
    rejectDescription: (who: string) => `${who} will be asked to send a new receipt.`,
    reason: "Reason",
    reasonHint: "Say what did not match: amount, date or reference.",
    confirmReject: "Reject payment",
    emptyQueue: "Nothing to verify",
    emptyQueueDescription: "Submitted receipts will show here.",
    queueLabel: "Payments waiting for verification",
    close: "Close",
  },
  ar: {
    title: "الدفع بالتحويل",
    description: (total: string) => `حوّل ${total} بالضبط، ثم أرفق الإيصال لنتحقق منه.`,
    method: "طريقة الدفع",
    kinds: { "instant-transfer": "تحويل فوري", "mobile-wallet": "محفظة إلكترونية", "bank-transfer": "تحويل بنكي", "cash-deposit": "إيداع نقدي" },
    fee: (fee: string) => `الرسوم ${fee}`,
    noFee: "بدون رسوم",
    steps: "طريقة الدفع",
    details: "حوّل إلى",
    copy: "نسخ",
    amount: "المبلغ",
    feeRow: "رسوم الطريقة",
    total: "الإجمالي المطلوب",
    scan: "امسح للدفع",
    reference: "مرجع التحويل",
    referenceHint: "الرقم المرجعي الذي يظهر في تطبيق البنك أو المحفظة بعد التحويل.",
    receipt: "الإيصال",
    receiptHint: "صورة أو ملف PDF للتحويل. حتى 5 ميجابايت.",
    receiptDrop: "أفلت الإيصال هنا أو تصفّح",
    submit: "لقد دفعت، أرسل للتحقق",
    cancel: "إلغاء",
    failed: "لم تتم العملية. حاول مرة أخرى.",
    problems: {
      empty: "أدخل مرجع التحويل.",
      short: "المرجع يبدو قصيرًا جدًا.",
      chars: "استخدم الأحرف والأرقام والشرطات فقط.",
      receipt: "أرفق الإيصال.",
      min: (min: string) => `تتطلب هذه الطريقة ${min} على الأقل.`,
      max: (max: string) => `تسمح هذه الطريقة بحد أقصى ${max}.`,
      method: "اختر طريقة الدفع.",
    },
    empty: "لا توجد طرق دفع",
    emptyDescription: "أضف طريقة لبدء استقبال المدفوعات.",
    verification: "التحقق",
    stages: { submitted: "أُرسل الإيصال", verifying: "قيد المراجعة", verified: "تم التحقق من الدفع" },
    stageHelp: {
      submitted: "استلمنا إيصالك.",
      verifying: "أحد أعضاء الفريق يطابقه مع البنك.",
      verified: "تم تأكيد دفعتك.",
    },
    statuses: { unpaid: "بانتظار الدفع", submitted: "أُرسل الإيصال", verifying: "قيد المراجعة", verified: "تم التحقق", rejected: "مرفوضة" },
    submittedAt: "أُرسل",
    rejectedTitle: "تعذّر التحقق من هذه الدفعة",
    rejectedHelp: "أرسل إيصالًا جديدًا وسننظر فيه مرة أخرى.",
    resubmit: "إرسال إيصال جديد",
    viaMethod: (name: string) => `الدفع عبر ${name}`,
    queue: "مدفوعات بانتظار التحقق",
    customer: "العميل",
    methodCol: "الطريقة",
    amountCol: "المبلغ",
    referenceCol: "المرجع",
    sent: "أُرسلت",
    statusCol: "الحالة",
    search: "ابحث في المدفوعات",
    verify: "تحقق",
    reject: "رفض",
    viewReceipt: "عرض الإيصال",
    rejectTitle: "رفض هذه الدفعة؟",
    rejectDescription: (who: string) => `سيُطلب من ${who} إرسال إيصال جديد.`,
    reason: "السبب",
    reasonHint: "اذكر ما لم يتطابق: المبلغ أو التاريخ أو المرجع.",
    confirmReject: "رفض الدفعة",
    emptyQueue: "لا شيء للتحقق منه",
    emptyQueueDescription: "ستظهر الإيصالات المرسلة هنا.",
    queueLabel: "مدفوعات بانتظار التحقق",
    close: "إغلاق",
  },
};

type Strings = typeof STRINGS.en;
export type LocalPaymentsLabels = Partial<Omit<Strings, "kinds" | "problems" | "stages" | "stageHelp" | "statuses">> & {
  kinds?: Partial<Strings["kinds"]>;
  problems?: Partial<Strings["problems"]>;
  stages?: Partial<Strings["stages"]>;
  stageHelp?: Partial<Strings["stageHelp"]>;
  statuses?: Partial<Strings["statuses"]>;
};

function useStrings(labels?: LocalPaymentsLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const base = STRINGS[ar ? "ar" : "en"];
  const t = {
    ...base,
    ...labels,
    kinds: { ...base.kinds, ...labels?.kinds },
    problems: { ...base.problems, ...labels?.problems },
    stages: { ...base.stages, ...labels?.stages },
    stageHelp: { ...base.stageHelp, ...labels?.stageHelp },
    statuses: { ...base.statuses, ...labels?.statuses },
  } as Strings;
  return { t, ar, locale };
}

type Result = void | { error?: string };
const fail = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const Money = ({ minor, currency, className }: { minor: number; currency: string; className?: string }) => <Num className={className} value={minorToMajor(minor, currency)} format={{ style: "currency", currency }} />;

/* ------------------------------------------------------------------ types */

export type LocalPaymentKind = "instant-transfer" | "mobile-wallet" | "bank-transfer" | "cash-deposit";

export interface LocalPaymentDetail {
  label: string;
  value: string;
  /** Show a copy button. Default true. */
  copyable?: boolean;
}

export interface LocalPaymentMethod {
  id: string;
  /** The name people know it by, shown as text: "InstaPay", "Vodafone Cash". */
  name: string;
  kind: LocalPaymentKind;
  /**
   * The provider's official mark, when you have a licensed copy. Nasaq ships none, so without it the name is shown as
   * text. Never redraw or recolour a mark.
   */
  mark?: ReactNode;
  description?: string;
  /** Where to send the money: an IPA address, a wallet number, an IBAN. Values stay left to right. */
  details: readonly LocalPaymentDetail[];
  /** Numbered instructions, in order. */
  steps?: readonly string[];
  /** A QR payload for methods that can be scanned. */
  qr?: string;
  fee?: PaymentFee;
  /** Limits in minor units. Outside them the method cannot be used. */
  min?: number;
  max?: number;
}

export interface LocalPaymentSubmission {
  methodId: string;
  reference: string;
  receiptName?: string;
  status: PaymentVerification;
  submittedAt?: Date | number | string;
  /** Why a receipt was rejected. */
  rejectionReason?: string;
}

/* ------------------------------------------------------------------ PaymentVerificationStatus */

export interface PaymentVerificationStatusProps extends Omit<ComponentProps<"div">, "children"> {
  status: PaymentVerification;
  methodName?: string;
  reference?: string;
  submittedAt?: Date | number | string;
  rejectionReason?: string;
  /** Shows "Send a new receipt" on a rejected payment. */
  onResubmit?: () => void;
  labels?: LocalPaymentsLabels;
}

const STAGES = ["submitted", "verifying", "verified"] as const;

/** Where a manual payment stands: receipt sent, under review, verified. A rejection shows the reason and a way to send a new receipt. */
export function PaymentVerificationStatus({ status, methodName, reference, submittedAt, rejectionReason, onResubmit, labels, className, ...props }: PaymentVerificationStatusProps) {
  const { t } = useStrings(labels);
  const step = verificationStep(status);
  const rejected = status === "rejected";
  return (
    <div data-slot="payment-verification-status" data-status={status} className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-label text-foreground">
          <ShieldCheck aria-hidden className="size-4 text-muted-foreground" />
          {t.verification}
        </h3>
        <Status tone={STATUS_TONE[status]}>{t.statuses[status]}</Status>
      </div>
      <ol className="flex flex-col gap-3" aria-label={t.verification}>
        {STAGES.map((stage, i) => {
          const done = step > i || (status === "verified" && i === 2);
          const current = step === i && !done;
          const bad = rejected && i === 1;
          return (
            <li key={stage} data-state={bad ? "rejected" : done ? "done" : current ? "current" : "todo"} aria-current={current ? "step" : undefined} className="flex items-start gap-3">
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-caption [&_svg]:size-3.5",
                  bad ? "border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text" : done ? "border-nq-success/40 bg-nq-success-soft text-nq-success-text" : current ? "border-primary text-foreground" : "border-border text-muted-foreground",
                )}
              >
                {bad ? <X /> : done ? <Check /> : current ? <Clock /> : i + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className={cn("text-body-sm", done || current || bad ? "text-foreground" : "text-muted-foreground")}>{t.stages[stage]}</span>
                {(done || current) && !bad ? <span className="text-caption text-muted-foreground">{t.stageHelp[stage]}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
        {methodName ? <span>{t.viaMethod(methodName)}</span> : null}
        {reference ? (
          <bdi dir="ltr" className="font-mono">
            {reference}
          </bdi>
        ) : null}
        {submittedAt ? (
          <span>
            {t.submittedAt} <DateTime value={submittedAt} format={{ dateStyle: "medium", timeStyle: "short" }} />
          </span>
        ) : null}
      </p>
      {rejected ? (
        <div role="alert" className="flex flex-col gap-2 rounded-card border border-nq-danger/40 bg-nq-danger-soft p-3 text-body-sm">
          <p className="flex items-center gap-2 font-medium text-nq-danger-text">
            <CircleX aria-hidden className="size-4" />
            {t.rejectedTitle}
          </p>
          {rejectionReason ? <p className="text-foreground">{rejectionReason}</p> : null}
          <p className="text-muted-foreground">{t.rejectedHelp}</p>
          {onResubmit ? (
            <Button size="sm" className="self-start" onClick={onResubmit}>
              {t.resubmit}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const STATUS_TONE: Record<PaymentVerification, StatusTone> = { unpaid: "neutral", submitted: "info", verifying: "warning", verified: "success", rejected: "danger" };

/* ------------------------------------------------------------------ LocalPayments */

export interface LocalPaymentInput {
  methodId: string;
  /** Normalised: upper case, Latin digits. */
  reference: string;
  /** The receipt file, or null when the method does not need one. */
  receipt: File | null;
  /** The invoice amount, minor units. */
  amount: number;
  fee: number;
  /** `amount + fee`, what the customer sends. */
  total: number;
}

export interface LocalPaymentsProps extends Omit<ComponentProps<typeof Card>, "children" | "title" | "onSubmit"> {
  /** What is owed, in minor units. */
  amount: number;
  /** ISO 4217 code. */
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  methods: readonly LocalPaymentMethod[];
  /** The customer's submission, when there is one. Its status decides what the card shows. */
  submission?: LocalPaymentSubmission;
  defaultMethodId?: string;
  /** Sends the receipt for verification. Resolve `{ error }` or reject to show the message. */
  onSubmit: (input: LocalPaymentInput) => Promise<Result>;
  onCancel?: () => void;
  /** Ask for a receipt file. Default true. */
  receiptRequired?: boolean;
  /** Largest receipt, in bytes. Default 5 MB. */
  maxReceiptSize?: number;
  labels?: LocalPaymentsLabels;
}

/**
 * Manual payment methods: pick one (InstaPay, a mobile wallet, a bank), see where to send the money with copy buttons
 * and a QR, add the transfer reference and the receipt, and follow verification. Amounts are minor units and each
 * method's fee and limits are applied. Names are text unless you pass an official `mark`.
 */
export function LocalPayments({ amount, currency: currencyProp, methods, submission, defaultMethodId, onSubmit, onCancel, receiptRequired = true, maxReceiptSize = 5 * 1024 * 1024, labels, className, ...props }: LocalPaymentsProps) {
  const currency = useCurrency(currencyProp);
  const { t } = useStrings(labels);
  const [methodId, setMethodId] = useState(defaultMethodId ?? submission?.methodId ?? methods[0]?.id ?? "");
  const [reference, setReference] = useState(submission?.reference ?? "");
  const [files, setFiles] = useState<readonly UploadFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [editing, setEditing] = useState(false);
  const titleId = useId();

  const method = methods.find((m) => m.id === methodId);
  const fee = paymentFee(amount, method?.fee);
  const total = paymentTotal(amount, method?.fee);
  const limit = method ? paymentLimit(total, method) : null;
  const status = submission?.status ?? "unpaid";
  const form = canSubmitReceipt(status) || editing;
  const receipt = files[0]?.file ?? null;

  const refProblem = referenceProblem(reference);
  const problem = !method ? t.problems.method : limit === "min" ? t.problems.min(fmtMoney(method?.min ?? 0, currency)) : limit === "max" ? t.problems.max(fmtMoney(method?.max ?? 0, currency)) : refProblem ? t.problems[refProblem] : receiptRequired && !receipt ? t.problems.receipt : null;

  const submit = async () => {
    if (busy) return;
    setTouched(true);
    if (problem || !method) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit({ methodId: method.id, reference: normalizeReference(reference), receipt, amount, fee, total });
      if (result?.error) setError(result.error);
      else setEditing(false);
    } catch (e) {
      setError(fail(e, t.failed));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // A new verdict closes the "send a new receipt" form.
    if (submission && !canSubmitReceipt(submission.status)) setEditing(false);
  }, [submission]);

  if (methods.length === 0) return <EmptyState icon={ReceiptText} title={t.empty} description={t.emptyDescription} />;

  const submittedMethod = methods.find((m) => m.id === submission?.methodId);

  return (
    <Card data-slot="local-payments" data-status={status} aria-labelledby={titleId} className={cn("gap-4 px-0", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2" id={titleId}>
          {t.title}
        </CardTitle>
        <p className="col-span-full text-body-sm text-muted-foreground">{t.description(fmtMoney(total, currency))}</p>
      </CardHeader>

      {submission && !form ? (
        <CardContent>
          <PaymentVerificationStatus status={status} methodName={submittedMethod?.name} reference={submission.reference} submittedAt={submission.submittedAt} rejectionReason={submission.rejectionReason} labels={labels} />
        </CardContent>
      ) : null}

      {form ? (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {submission?.status === "rejected" ? (
            <CardContent>
              <PaymentVerificationStatus status="rejected" methodName={submittedMethod?.name} reference={submission.reference} submittedAt={submission.submittedAt} rejectionReason={submission.rejectionReason} labels={labels} />
            </CardContent>
          ) : null}
          <CardContent className="flex flex-col gap-2">
            <h3 className="text-label text-foreground" id={`${titleId}-method`}>
              {t.method}
            </h3>
            <RadioGroup aria-labelledby={`${titleId}-method`} value={methodId} disabled={busy} onValueChange={(v) => setMethodId(String(v))} className="grid gap-2 sm:grid-cols-2">
              {methods.map((m) => (
                <RadioCard
                  key={m.id}
                  value={m.id}
                  title={
                    <span className="flex flex-wrap items-center gap-x-2">
                      {m.mark ?? <span>{m.name}</span>}
                      {m.mark ? <span className="sr-only">{m.name}</span> : null}
                    </span>
                  }
                  description={m.description ?? t.kinds[m.kind]}
                  meta={m.fee ? <span className="text-caption text-muted-foreground">{t.fee(fmtFee(m.fee, amount, currency))}</span> : <span className="text-caption text-muted-foreground">{t.noFee}</span>}
                />
              ))}
            </RadioGroup>
          </CardContent>

          {method ? (
            <CardContent data-slot="local-payments-instructions" className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="flex min-w-0 flex-col gap-3">
                <Badge variant="outline" className="self-start">
                  {t.kinds[method.kind]}
                </Badge>
                {method.steps?.length ? (
                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-caption font-medium text-muted-foreground">{t.steps}</h4>
                    <ol className="flex list-decimal flex-col gap-1 ps-5 text-body-sm text-foreground marker:text-muted-foreground">
                      {method.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-caption font-medium text-muted-foreground">{t.details}</h4>
                  <dl className="flex flex-col divide-y divide-border rounded-card bg-nq-surface">
                    {method.details.map((d) => (
                      <div key={d.label} className="flex items-center justify-between gap-3 px-3 py-2">
                        <dt className="text-caption text-muted-foreground">{d.label}</dt>
                        <dd className="flex min-w-0 items-center gap-1 text-body-sm text-foreground">
                          <bdi dir="ltr" className="truncate font-mono">
                            {d.value}
                          </bdi>
                          {d.copyable === false ? null : <CopyButton value={d.value} size="icon-sm" variant="ghost" label={`${t.copy}: ${d.label}`} />}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-body-sm">
                  <dt className="text-muted-foreground">{t.amount}</dt>
                  <dd className="text-end">
                    <Money minor={amount} currency={currency} />
                  </dd>
                  {fee ? (
                    <>
                      <dt className="text-muted-foreground">{t.feeRow}</dt>
                      <dd className="text-end">
                        <Money minor={fee} currency={currency} />
                      </dd>
                    </>
                  ) : null}
                  <dt className="font-medium text-foreground">{t.total}</dt>
                  <dd className="text-end text-label font-semibold text-foreground">
                    <Money minor={total} currency={currency} />
                  </dd>
                </dl>
              </div>
              {method.qr ? (
                <div className="flex flex-col items-center gap-1.5">
                  <QrCode value={method.qr} size={132} label={`${t.scan}: ${method.name}`} />
                  <span className="text-caption text-muted-foreground">{t.scan}</span>
                </div>
              ) : null}
            </CardContent>
          ) : null}

          <CardContent className="grid gap-4">
            <Field invalid={touched && Boolean(refProblem)}>
              <FieldLabel>{t.reference}</FieldLabel>
              <Input ltr name="reference" autoComplete="off" value={reference} disabled={busy} onChange={(e) => (setReference(e.target.value), setError(null))} />
              {touched && refProblem ? <FieldError match>{t.problems[refProblem]}</FieldError> : <FieldDescription>{t.referenceHint}</FieldDescription>}
            </Field>
            {receiptRequired ? (
              <Field invalid={touched && !receipt}>
                <FieldLabel>{t.receipt}</FieldLabel>
                <FileUpload
                  accept="image/*,application/pdf"
                  maxSize={maxReceiptSize}
                  maxFiles={1}
                  multiple={false}
                  disabled={busy}
                  value={files}
                  onValueChange={(next) => setFiles(next)}
                  // The file stays on the device until you press submit, so it is "done" as soon as it is picked.
                  onFiles={(added, controls) => added.forEach((f) => controls.update(f.id, { status: "done", progress: 100 }))}
                >
                  {t.receiptDrop}
                </FileUpload>
                {touched && !receipt ? <FieldError match>{t.problems.receipt}</FieldError> : <FieldDescription>{t.receiptHint}</FieldDescription>}
              </Field>
            ) : null}
            {touched && (limit || !method) && problem ? (
              <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
                <CircleX aria-hidden className="size-4" />
                {problem}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
                <CircleX aria-hidden className="size-4" />
                {error}
              </p>
            ) : null}
          </CardContent>
          <CardContent className="flex flex-wrap justify-end gap-2">
            {onCancel || editing ? (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => (editing ? setEditing(false) : onCancel?.())}>
                {t.cancel}
              </Button>
            ) : null}
            <Button type="submit" variant="primary" loading={busy}>
              {t.submit}
            </Button>
          </CardContent>
        </form>
      ) : null}
    </Card>
  );
}

function fmtMoney(minor: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(minorToMajor(minor, currency));
}

function fmtFee(fee: PaymentFee, amount: number, currency: string) {
  const parts: string[] = [];
  if (fee.percentBps) parts.push(`${fee.percentBps / 100}%`);
  if (fee.fixed) parts.push(fmtMoney(fee.fixed, currency));
  return parts.join(" + ") || fmtMoney(paymentFee(amount, fee), currency);
}

/* ------------------------------------------------------------------ PaymentVerificationQueue */

export interface PaymentSubmission {
  id: string;
  customer: string;
  methodName: string;
  /** Minor units. */
  amount: number;
  currency: string;
  reference: string;
  receiptName?: string;
  /** Where the receipt can be opened. */
  receiptUrl?: string;
  submittedAt: Date | number | string;
  status: PaymentVerification;
}

export interface PaymentVerificationQueueProps extends Omit<ComponentProps<"section">, "children"> {
  submissions: readonly PaymentSubmission[];
  /** Confirms the money arrived. Resolve `{ error }` or reject to show the message. */
  onVerify: (submission: PaymentSubmission) => Promise<Result>;
  /** Rejects the receipt with the reviewer's reason, which the customer sees. */
  onReject: (submission: PaymentSubmission, reason: string) => Promise<Result>;
  loading?: boolean;
  labels?: LocalPaymentsLabels;
}

/** The reviewer's side: receipts waiting to be matched with the bank, with Verify, Reject (with a reason) and a receipt link. */
export function PaymentVerificationQueue({ submissions, onVerify, onReject, loading = false, labels, className, ...props }: PaymentVerificationQueueProps) {
  const { t, locale } = useStrings(labels);
  const titleId = useId();
  const [rejecting, setRejecting] = useState<PaymentSubmission | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = (s: PaymentSubmission) => s.status === "submitted" || s.status === "verifying";

  const run = async (id: string, job: () => Promise<Result>) => {
    setBusy(id);
    setError(null);
    try {
      const result = await job();
      if (result?.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (e) {
      setError(fail(e, t.failed));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const columns: DataTableColumn<PaymentSubmission>[] = [
    { id: "customer", header: t.customer, label: t.customer, cell: (s) => <span className="text-foreground">{s.customer}</span>, sortValue: (s) => s.customer, searchValue: (s) => `${s.customer} ${s.reference}` },
    { id: "method", header: t.methodCol, label: t.methodCol, cell: (s) => s.methodName, sortValue: (s) => s.methodName },
    {
      id: "reference",
      header: t.referenceCol,
      label: t.referenceCol,
      cell: (s) => (
        <bdi dir="ltr" className="font-mono text-caption">
          {s.reference}
        </bdi>
      ),
    },
    { id: "amount", header: t.amountCol, label: t.amountCol, align: "end", cell: (s) => <Money minor={s.amount} currency={s.currency} />, sortValue: (s) => s.amount },
    { id: "sent", header: t.sent, label: t.sent, cell: (s) => <DateTime value={s.submittedAt} format={{ dateStyle: "medium", timeStyle: "short" }} />, sortValue: (s) => new Date(s.submittedAt) },
    { id: "status", header: t.statusCol, label: t.statusCol, cell: (s) => <Status tone={STATUS_TONE[s.status]}>{t.statuses[s.status]}</Status>, sortValue: (s) => s.status, filterValue: (s) => s.status },
    {
      id: "actions",
      header: <span className="sr-only">{t.statusCol}</span>,
      label: t.statusCol,
      hideable: false,
      align: "end",
      cell: (s) =>
        open(s) ? (
          <span className="inline-flex gap-1">
            <Button size="icon-sm" variant="ghost" aria-label={`${t.verify}: ${s.customer}`} loading={busy === s.id} onClick={() => void run(s.id, () => onVerify(s))}>
              <Check aria-hidden />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label={`${t.reject}: ${s.customer}`} disabled={busy === s.id} onClick={() => (setReason(""), setRejecting(s))}>
              <X aria-hidden />
            </Button>
          </span>
        ) : null,
    },
  ];
  const table = useDataTable({ data: submissions as PaymentSubmission[], columns, getRowId: (s) => s.id, pageSize: 10, defaultSort: { id: "sent", direction: "asc" } });

  return (
    <section data-slot="payment-verification-queue" aria-labelledby={titleId} className={cn("flex flex-col gap-3", className)} {...props}>
      <h2 id={titleId} className="text-h3 text-foreground">
        {t.queue}
      </h2>
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder={t.search} />
        <DataTableFacetFilter table={table} column="status" title={t.statusCol} options={(["submitted", "verifying", "verified", "rejected"] as const).map((s) => ({ value: s, label: t.statuses[s] }))} />
      </DataTableToolbar>
      {error ? (
        <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden className="size-4" />
          {error}
        </p>
      ) : null}
      <DataTable
        table={table}
        label={t.queueLabel}
        rowLabel={(s) => `${s.customer} ${s.reference}`}
        loading={loading}
        rowActions={(s) => [
          ...(s.receiptUrl ? [{ id: "receipt", label: t.viewReceipt, icon: Eye, onSelect: () => window.open(s.receiptUrl, "_blank", "noopener,noreferrer") }] : []),
          ...(open(s)
            ? [
                { id: "verify", label: t.verify, icon: Check, group: "verdict", onSelect: () => void run(s.id, () => onVerify(s)) },
                { id: "reject", label: t.reject, icon: X, danger: true, group: "verdict", onSelect: () => (setReason(""), setRejecting(s)) },
              ]
            : []),
        ]}
        empty={<EmptyState icon={ReceiptText} title={t.emptyQueue} description={t.emptyQueueDescription} className="border-0" />}
      />
      <Dialog open={rejecting !== null} onOpenChange={(next) => !next && busy === null && setRejecting(null)}>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const target = rejecting;
              if (!target) return;
              void run(target.id, () => onReject(target, reason.trim())).then((ok) => ok && setRejecting(null));
            }}
          >
            <DialogHeader>
              <DialogTitle>{t.rejectTitle}</DialogTitle>
              <DialogDescription>{t.rejectDescription(rejecting?.customer ?? "")}</DialogDescription>
            </DialogHeader>
            {rejecting?.receiptUrl ? (
              <a href={rejecting.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-body-sm text-primary underline-offset-4 hover:underline">
                <ExternalLink aria-hidden className="size-3.5" />
                {t.viewReceipt}
                {rejecting.receiptName ? <bdi dir="ltr"> ({rejecting.receiptName})</bdi> : null}
              </a>
            ) : null}
            <Field>
              <FieldLabel>{t.reason}</FieldLabel>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
              <FieldDescription>{t.reasonHint}</FieldDescription>
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRejecting(null)}>
                {t.close}
              </Button>
              <Button type="submit" variant="danger" loading={busy !== null} disabled={!reason.trim()}>
                {t.confirmReject}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <span className="sr-only" aria-live="polite">
        {formatNumber(submissions.filter(open).length, locale)}
      </span>
    </section>
  );
}

export { isFinalVerification };
