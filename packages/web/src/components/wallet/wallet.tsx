"use client";

import { ArrowDownLeft, ArrowUpRight, Eye, EyeOff, Landmark, Plus, Receipt, RotateCcw, Undo2, WalletCards } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Sparkline } from "../chart";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { DateTime, formatNumber, Num, useFormatDate } from "../numeric";
import { RadioCard, RadioGroup } from "../radio-group";
import { EmptyState, Skeleton } from "../states";
import { Status } from "../status";
import { Toggle, ToggleGroup } from "../toggle-group";
import { checkAmount, groupByDay, parseAmount } from "./wallet-math";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    balance: "Available balance",
    pending: "Pending",
    topUp: "Add funds",
    payout: "Withdraw",
    show: "Show balance",
    hide: "Hide balance",
    hidden: "Balance hidden",
    trend: "Balance over the last 30 days",
    transactions: "Transactions",
    all: "All",
    incoming: "Money in",
    outgoing: "Money out",
    filter: "Filter transactions",
    emptyTitle: "No transactions yet",
    emptyDescription: "Top-ups, payments and withdrawals will show here.",
    completed: "Completed",
    pendingStatus: "Pending",
    failed: "Failed",
    topup: "Top-up",
    payoutType: "Withdrawal",
    payment: "Payment",
    refund: "Refund",
    fee: "Fee",
    reference: "Reference",
    topUpTitle: "Add funds",
    topUpDescription: "Choose an amount and where the money comes from.",
    payoutTitle: "Withdraw to your bank",
    payoutDescription: (available: string) => `You can withdraw up to ${available}.`,
    amount: "Amount",
    quick: "Quick amounts",
    source: "Pay with",
    destination: "Withdraw to",
    max: "Withdraw all",
    confirmTopUp: (amount: string) => `Add ${amount}`,
    confirmPayout: (amount: string) => `Withdraw ${amount}`,
    add: "Add",
    withdraw: "Withdraw",
    cancel: "Cancel",
    invalid: "Enter an amount greater than zero.",
    min: (min: string) => `The minimum is ${min}.`,
    max2: (max: string) => `The maximum is ${max}.`,
    failedRequest: "That did not go through. Try again.",
    noAccounts: "Add a payment source first.",
    fees: (fee: string) => `A fee of ${fee} applies.`,
    today: "Today",
    yesterday: "Yesterday",
  },
  ar: {
    balance: "الرصيد المتاح",
    pending: "قيد المعالجة",
    topUp: "إضافة رصيد",
    payout: "سحب",
    show: "إظهار الرصيد",
    hide: "إخفاء الرصيد",
    hidden: "الرصيد مخفي",
    trend: "الرصيد خلال آخر 30 يومًا",
    transactions: "المعاملات",
    all: "الكل",
    incoming: "الوارد",
    outgoing: "الصادر",
    filter: "تصفية المعاملات",
    emptyTitle: "لا توجد معاملات بعد",
    emptyDescription: "ستظهر هنا عمليات الشحن والمدفوعات والسحب.",
    completed: "مكتملة",
    pendingStatus: "قيد المعالجة",
    failed: "فاشلة",
    topup: "شحن",
    payoutType: "سحب",
    payment: "دفعة",
    refund: "استرداد",
    fee: "رسوم",
    reference: "المرجع",
    topUpTitle: "إضافة رصيد",
    topUpDescription: "اختر المبلغ ومصدر الأموال.",
    payoutTitle: "السحب إلى حسابك البنكي",
    payoutDescription: (available: string) => `يمكنك سحب حتى ${available}.`,
    amount: "المبلغ",
    quick: "مبالغ سريعة",
    source: "الدفع عبر",
    destination: "السحب إلى",
    max: "سحب الكل",
    confirmTopUp: (amount: string) => `إضافة ${amount}`,
    confirmPayout: (amount: string) => `سحب ${amount}`,
    add: "إضافة",
    withdraw: "سحب",
    cancel: "إلغاء",
    invalid: "أدخل مبلغًا أكبر من الصفر.",
    min: (min: string) => `الحد الأدنى ${min}.`,
    max2: (max: string) => `الحد الأقصى ${max}.`,
    failedRequest: "لم تتم العملية. حاول مرة أخرى.",
    noAccounts: "أضف مصدر دفع أولًا.",
    fees: (fee: string) => `تُطبَّق رسوم قدرها ${fee}.`,
    today: "اليوم",
    yesterday: "أمس",
  },
};

type Strings = typeof STRINGS.en;
export type WalletLabels = Partial<Strings>;

function useStrings(labels?: WalletLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as Strings, ar, locale };
}

/* ------------------------------------------------------------------ types */

export type WalletTransactionType = "topup" | "payout" | "payment" | "refund" | "fee";
export type WalletTransactionStatus = "completed" | "pending" | "failed";

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  /** Signed: positive adds to the balance, negative takes from it. */
  amount: number;
  status: WalletTransactionStatus;
  date: Date | number | string;
  description: string;
  /** Gateway or bank reference. Shown left-to-right. */
  reference?: string;
}

/** Where top-ups come from, or where withdrawals go: "Visa ending 4242", "Al Rajhi IBAN ...9012". */
export interface WalletAccount {
  id: string;
  label: string;
  description?: string;
}

const TYPE_ICON = { topup: ArrowDownLeft, payout: ArrowUpRight, payment: Receipt, refund: Undo2, fee: RotateCcw } as const;
const STATUS_TONE = { completed: "success", pending: "warning", failed: "danger" } as const;

type Result = void | { error?: string };

/* ------------------------------------------------------------------ AmountDialog (shared by top-up and payout) */

interface AmountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  currency: string;
  accounts: readonly WalletAccount[];
  accountLabel: string;
  presets?: readonly number[];
  min?: number;
  max?: number;
  maxLabel?: string;
  confirm: (amount: string) => string;
  /** Button text before an amount is typed. */
  idle: string;
  extra?: ReactNode;
  onSubmit: (amount: number, accountId: string) => Promise<Result>;
  labels?: WalletLabels;
}

function AmountDialog({ open, onOpenChange, title, description, currency, accounts, accountLabel, presets, min, max, maxLabel, confirm, idle, extra, onSubmit, labels }: AmountDialogProps) {
  const { t, locale } = useStrings(labels);
  const [text, setText] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const money = (n: number) => formatNumber(n, locale, { style: "currency", currency });
  const amount = parseAmount(text);

  useEffect(() => {
    if (open) return;
    setText("");
    setProblem(null);
    setAccountId(accounts[0]?.id ?? "");
  }, [open, accounts]);

  const submit = async () => {
    if (busy) return;
    const found = checkAmount(amount, { min, max });
    if (found || amount === null) {
      setProblem(found === "min" ? t.min(money(min ?? 0)) : found === "max" ? t.max2(money(max ?? 0)) : t.invalid);
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const result = await onSubmit(amount, accountId);
      if (result?.error) setProblem(result.error);
      else onOpenChange(false);
    } catch (e) {
      setProblem(e instanceof Error && e.message ? e.message : t.failedRequest);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Field invalid={Boolean(problem)}>
            <FieldLabel>{accountLabel}</FieldLabel>
            {accounts.length ? (
              <RadioGroup aria-label={accountLabel} value={accountId} onValueChange={(v) => setAccountId(String(v))} disabled={busy}>
                {accounts.map((a) => (
                  <RadioCard key={a.id} value={a.id} title={a.label} description={a.description} />
                ))}
              </RadioGroup>
            ) : (
              <FieldDescription>{t.noAccounts}</FieldDescription>
            )}
          </Field>
          <Field invalid={Boolean(problem)}>
            <FieldLabel>{`${t.amount} (${currency})`}</FieldLabel>
            <Input
              ltr
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={text}
              disabled={busy}
              onChange={(e) => {
                setText(e.target.value);
                setProblem(null);
              }}
            />
            {problem ? <FieldError match>{problem}</FieldError> : null}
            {presets?.length ? (
              <div role="group" aria-label={t.quick} className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <Button key={p} size="sm" type="button" disabled={busy} onClick={() => setText(String(p))}>
                    <Num value={p} format={{ style: "currency", currency, maximumFractionDigits: 0 }} />
                  </Button>
                ))}
              </div>
            ) : null}
            {maxLabel && max ? (
              <Button size="sm" variant="link" type="button" disabled={busy} className="self-start" onClick={() => setText(String(max))}>
                {maxLabel}
              </Button>
            ) : null}
          </Field>
          {extra}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!accounts.length}>
              {amount ? confirm(money(amount)) : idle}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ TopUpDialog / PayoutDialog */

export interface TopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  /** Payment sources to fund from. */
  sources: readonly WalletAccount[];
  /** One-tap amounts. Default 50, 100, 250, 500. */
  presets?: readonly number[];
  min?: number;
  max?: number;
  /** A fee note shown under the amount, already formatted: "A fee of 1.5% applies". */
  feeNote?: ReactNode;
  /** Adds the money. Resolve `{ error }` or reject to keep the dialog open with the message. */
  onTopUp: (input: { amount: number; sourceId: string }) => Promise<Result>;
  labels?: WalletLabels;
}

/** A dialog to add funds: pick a source, type or tap an amount, confirm. Validates the amount, not the payment. */
export function TopUpDialog({ open, onOpenChange, currency, sources, presets = [50, 100, 250, 500], min = 10, max, feeNote, onTopUp, labels }: TopUpDialogProps) {
  const { t } = useStrings(labels);
  return (
    <AmountDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.topUpTitle}
      description={t.topUpDescription}
      currency={currency}
      accounts={sources}
      accountLabel={t.source}
      presets={presets}
      min={min}
      max={max}
      confirm={t.confirmTopUp}
      idle={t.add}
      extra={feeNote ? <p className="text-caption text-muted-foreground">{feeNote}</p> : null}
      onSubmit={(amount, sourceId) => onTopUp({ amount, sourceId })}
      labels={labels}
    />
  );
}

export interface PayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  /** What can be withdrawn right now. The amount cannot exceed it. */
  available: number;
  /** Bank accounts to send to. */
  destinations: readonly WalletAccount[];
  min?: number;
  /** Withdraws the money. Resolve `{ error }` or reject to keep the dialog open with the message. */
  onPayout: (input: { amount: number; destinationId: string }) => Promise<Result>;
  labels?: WalletLabels;
}

/** A dialog to withdraw: pick a bank account, type an amount up to the available balance, confirm. */
export function PayoutDialog({ open, onOpenChange, currency, available, destinations, min = 10, onPayout, labels }: PayoutDialogProps) {
  const { t, locale } = useStrings(labels);
  const availableText = formatNumber(available, locale, { style: "currency", currency });
  return (
    <AmountDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.payoutTitle}
      description={t.payoutDescription(availableText)}
      currency={currency}
      accounts={destinations}
      accountLabel={t.destination}
      min={min}
      max={available}
      maxLabel={t.max}
      confirm={t.confirmPayout}
      idle={t.withdraw}
      onSubmit={(amount, destinationId) => onPayout({ amount, destinationId })}
      labels={labels}
    />
  );
}

/* ------------------------------------------------------------------ WalletBalance */

export interface WalletBalanceProps extends Omit<ComponentProps<typeof Card>, "children"> {
  balance: number;
  /** Money on its way in or out that is not yet in the balance. */
  pending?: number;
  currency: string;
  /** Balance for the last days, oldest first, for the trend line. */
  trend?: readonly number[];
  onTopUp?: () => void;
  onPayout?: () => void;
  loading?: boolean;
  labels?: WalletLabels;
}

/** The balance card: a large figure that can be hidden, pending money, a trend line, and Add funds / Withdraw. */
export function WalletBalance({ balance, pending, currency, trend, onTopUp, onPayout, loading = false, labels, className, ...props }: WalletBalanceProps) {
  const { t } = useStrings(labels);
  const [hidden, setHidden] = useState(false);
  const money = { style: "currency", currency } as const;
  return (
    <Card data-slot="wallet-balance" aria-busy={loading || undefined} className={cn("gap-4 px-0", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2 text-muted-foreground">
          <WalletCards aria-hidden className="size-4" />
          {t.balance}
        </CardTitle>
        <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
          <Button size="icon-sm" variant="ghost" aria-pressed={hidden} aria-label={hidden ? t.show : t.hide} onClick={() => setHidden((h) => !h)}>
            {hidden ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          {loading ? (
            <Skeleton className="h-9 w-40" />
          ) : hidden ? (
            <p className="text-h1 tracking-tight text-foreground" aria-label={t.hidden}>
              <span aria-hidden>••••••</span>
            </p>
          ) : (
            <p className="text-h1 font-semibold tracking-tight text-foreground">
              <Num value={balance} format={money} />
            </p>
          )}
          {pending ? (
            <p className="text-body-sm text-muted-foreground">
              {t.pending}: {hidden ? <span aria-hidden>••••</span> : <Num value={pending} format={{ ...money, signDisplay: "exceptZero" }} />}
            </p>
          ) : null}
        </div>
        {trend && trend.length > 1 && !hidden ? <Sparkline data={trend} label={t.trend} className="h-10 w-32" /> : null}
      </CardContent>
      {onTopUp || onPayout ? (
        <CardContent className="flex flex-wrap gap-2">
          {onTopUp ? (
            <Button variant="primary" onClick={onTopUp}>
              <Plus aria-hidden />
              {t.topUp}
            </Button>
          ) : null}
          {onPayout ? (
            <Button onClick={onPayout} disabled={balance <= 0}>
              <Landmark aria-hidden />
              {t.payout}
            </Button>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ WalletTransactions */

export interface WalletTransactionsProps extends Omit<ComponentProps<"section">, "children"> {
  transactions: readonly WalletTransaction[];
  currency: string;
  loading?: boolean;
  labels?: WalletLabels;
}

type Direction = "all" | "in" | "out";

/** Transactions grouped by day with a money in / out filter. Signed amounts, a type icon and a status on every row. */
export function WalletTransactions({ transactions, currency, loading = false, labels, className, ...props }: WalletTransactionsProps) {
  const { t } = useStrings(labels);
  const fmt = useFormatDate();
  const titleId = useId();
  const [direction, setDirection] = useState<Direction>("all");
  const shown = transactions.filter((tx) => (direction === "in" ? tx.amount > 0 : direction === "out" ? tx.amount < 0 : true));
  const groups = groupByDay(shown);
  const typeLabel: Record<WalletTransactionType, string> = { topup: t.topup, payout: t.payoutType, payment: t.payment, refund: t.refund, fee: t.fee };
  const statusLabel: Record<WalletTransactionStatus, string> = { completed: t.completed, pending: t.pendingStatus, failed: t.failed };
  const now = new Date();
  const dayLabel = (date: Date) => {
    const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000);
    return diff === 0 ? t.today : diff === 1 ? t.yesterday : fmt.date(date, { dateStyle: "medium" });
  };

  return (
    <section data-slot="wallet-transactions" aria-labelledby={titleId} className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={titleId} className="text-h3 text-foreground">
          {t.transactions}
        </h2>
        <ToggleGroup aria-label={t.filter} value={[direction]} onValueChange={(v) => v[0] && setDirection(v[0] as Direction)}>
          <Toggle value="all">{t.all}</Toggle>
          <Toggle value="in">{t.incoming}</Toggle>
          <Toggle value="out">{t.outgoing}</Toggle>
        </ToggleGroup>
      </div>
      {loading ? (
        <div className="flex flex-col gap-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState icon={WalletCards} title={t.emptyTitle} description={t.emptyDescription} />
      ) : (
        groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-1">
            <h3 className="text-caption font-medium text-muted-foreground">{dayLabel(group.date)}</h3>
            <ul className="flex flex-col divide-y divide-border rounded-card bg-nq-surface">
              {group.items.map((tx) => {
                const Icon = TYPE_ICON[tx.type];
                return (
                  <li key={tx.id} data-status={tx.status} className="flex items-center gap-3 px-4 py-3">
                    <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground [&_svg]:size-4">
                      <Icon />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-body-sm text-foreground">{tx.description}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                        <span>{typeLabel[tx.type]}</span>
                        <DateTime value={tx.date} format={{ timeStyle: "short" }} />
                        {tx.reference ? (
                          <bdi dir="ltr" className="font-mono">
                            {tx.reference}
                          </bdi>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <Num
                        value={tx.amount}
                        format={{ style: "currency", currency, signDisplay: "exceptZero" }}
                        className={cn("text-label", tx.status === "failed" ? "text-muted-foreground line-through" : tx.amount > 0 ? "text-nq-success-text" : "text-foreground")}
                      />
                      {tx.status !== "completed" ? (
                        <Status tone={STATUS_TONE[tx.status]} className="text-caption">
                          {statusLabel[tx.status]}
                        </Status>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Wallet */

export interface WalletProps extends Omit<ComponentProps<"div">, "children"> {
  balance: number;
  pending?: number;
  currency: string;
  trend?: readonly number[];
  transactions: readonly WalletTransaction[];
  /** Sources for top-ups. Omit `onTopUp` to hide Add funds. */
  sources?: readonly WalletAccount[];
  /** Bank accounts for withdrawals. Omit `onPayout` to hide Withdraw. */
  destinations?: readonly WalletAccount[];
  onTopUp?: (input: { amount: number; sourceId: string }) => Promise<Result>;
  onPayout?: (input: { amount: number; destinationId: string }) => Promise<Result>;
  topUpMin?: number;
  topUpPresets?: readonly number[];
  payoutMin?: number;
  feeNote?: ReactNode;
  loading?: boolean;
  labels?: WalletLabels;
}

/** The wallet screen: `WalletBalance` on top, `WalletTransactions` below, and the top-up and withdrawal dialogs wired to it. */
export function Wallet({
  balance,
  pending,
  currency,
  trend,
  transactions,
  sources = [],
  destinations = [],
  onTopUp,
  onPayout,
  topUpMin,
  topUpPresets,
  payoutMin,
  feeNote,
  loading,
  labels,
  className,
  ...props
}: WalletProps) {
  const [dialog, setDialog] = useState<"topup" | "payout" | null>(null);
  return (
    <div data-slot="wallet" className={cn("flex flex-col gap-6", className)} {...props}>
      <WalletBalance
        balance={balance}
        pending={pending}
        currency={currency}
        trend={trend}
        loading={loading}
        labels={labels}
        onTopUp={onTopUp ? () => setDialog("topup") : undefined}
        onPayout={onPayout ? () => setDialog("payout") : undefined}
      />
      <WalletTransactions transactions={transactions} currency={currency} loading={loading} labels={labels} />
      {onTopUp ? (
        <TopUpDialog
          open={dialog === "topup"}
          onOpenChange={(open) => setDialog(open ? "topup" : null)}
          currency={currency}
          sources={sources}
          min={topUpMin}
          presets={topUpPresets}
          feeNote={feeNote}
          onTopUp={onTopUp}
          labels={labels}
        />
      ) : null}
      {onPayout ? (
        <PayoutDialog
          open={dialog === "payout"}
          onOpenChange={(open) => setDialog(open ? "payout" : null)}
          currency={currency}
          available={balance}
          destinations={destinations}
          min={payoutMin}
          onPayout={onPayout}
          labels={labels}
        />
      ) : null}
    </div>
  );
}
