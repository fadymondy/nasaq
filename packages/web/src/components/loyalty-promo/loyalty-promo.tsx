"use client";

import { Award, CircleX, Copy, Plus, Power, Tag, Ticket, Trash2, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { CurrencyInput } from "../currency-input";
import { minorToMajor } from "../currency-input/currency-input-logic";
import { DataTable, type DataTableColumn, type DataTableRowAction, DataTableFacetFilter, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { DatePicker } from "../date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { RewardCard } from "../gamification";
import { DateTime, formatNumber, Num } from "../numeric";
import { Progress } from "../progress";
import { QrCode } from "../qr-code";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState, Skeleton } from "../states";
import { Status, type StatusTone } from "../status";
import { Switch } from "../switch";
import { StatCard, StatGrid } from "../stat-card";
import {
  evaluatePromo,
  expiringPoints,
  isPromoCodeFormat,
  loyaltyTier,
  normalizePromoCode,
  type PointsLot,
  type PromoContext,
  type PromoLike,
  type PromoProblem,
  promoLive,
} from "./loyalty-logic";
import { useCurrency } from "../../provider/nasaq-provider";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    points: "points",
    pointsBalance: "Points balance",
    member: "Member",
    memberSince: (d: string) => `Member since ${d}`,
    tier: "Tier",
    toNext: (n: string, tier: string) => `${n} points to ${tier}`,
    topTier: "You are at the top tier",
    expiring: (n: string, d: string) => `${n} points expire on ${d}`,
    memberCode: "Member code",
    rewards: "Rewards",
    claim: "Redeem",
    noRewards: "No rewards yet",
    history: "Points activity",
    kinds: { earn: "Earned", redeem: "Redeemed", expire: "Expired", adjust: "Adjusted" },
    balanceAfter: (n: string) => `Balance ${n}`,
    noHistory: "No points activity",
    noHistoryHint: "Points show here after the first visit.",
    all: "All",
    promoCode: "Promo code",
    promoPlaceholder: "Enter a code",
    apply: "Apply",
    remove: "Remove code",
    applied: (code: string) => `${code} applied`,
    saves: (amount: string) => `You save ${amount}`,
    failed: "That did not go through. Try again.",
    problems: {
      format: "A code is 3 to 24 letters or digits.",
      empty: "Enter a code.",
      unknown: "We do not know that code.",
      inactive: "This code is switched off.",
      "not-started": "This code is not active yet.",
      expired: "This code has expired.",
      "min-subtotal": "Your order is below the minimum for this code.",
      exhausted: "This code has been used up.",
      "per-customer": "You have already used this code.",
      "first-order": "This code is for a first order only.",
    },
    promos: "Promo codes",
    newPromo: "New promo code",
    editPromo: "Edit promo code",
    code: "Code",
    codeHint: "Letters, digits, dashes. Shown to customers exactly as typed, in capitals.",
    type: "Type",
    percent: "Percent off",
    fixed: "Amount off",
    value: "Value",
    percentValue: "Percent",
    maxDiscount: "Largest discount",
    minSubtotal: "Smallest order",
    startsOn: "Starts",
    endsOn: "Ends",
    maxRedemptions: "Total uses",
    perCustomer: "Uses per customer",
    unlimited: "Unlimited",
    firstOrderOnly: "First order only",
    active: "Active",
    save: "Save code",
    cancel: "Cancel",
    discountCol: "Discount",
    validity: "Valid",
    usesCol: "Used",
    statusCol: "Status",
    search: "Search codes",
    statuses: { live: "Live", scheduled: "Scheduled", ended: "Ended", off: "Off", full: "Used up" },
    copyCode: "Copy code",
    edit: "Edit",
    deactivate: "Turn off",
    activate: "Turn on",
    delete: "Delete",
    deleteTitle: "Delete this code?",
    deleteDescription: (code: string) => `${code} stops working. Past orders keep their discount.`,
    noPromos: "No promo codes",
    noPromosHint: "Create a code to run an offer.",
    promoLabel: "Promo codes",
    visits: "Visits",
    date: "Date",
    place: "Place",
    spend: "Spend",
    earned: "Points",
    visitStatus: { completed: "Completed", "no-show": "No show", cancelled: "Cancelled" },
    visitCount: "Visits",
    totalSpend: "Total spend",
    average: "Average visit",
    lastVisit: "Last visit",
    noVisits: "No visits yet",
    noVisitsHint: "Visits show here after the first booking.",
    visitLabel: "Visit history",
    close: "Close",
    actions: "Actions",
  },
  ar: {
    points: "نقطة",
    pointsBalance: "رصيد النقاط",
    member: "العضو",
    memberSince: (d: string) => `عضو منذ ${d}`,
    tier: "المستوى",
    toNext: (n: string, tier: string) => `${n} نقطة للوصول إلى ${tier}`,
    topTier: "أنت في أعلى مستوى",
    expiring: (n: string, d: string) => `${n} نقطة تنتهي في ${d}`,
    memberCode: "رمز العضوية",
    rewards: "المكافآت",
    claim: "استبدال",
    noRewards: "لا توجد مكافآت بعد",
    history: "نشاط النقاط",
    kinds: { earn: "مكتسبة", redeem: "مستبدلة", expire: "منتهية", adjust: "تعديل" },
    balanceAfter: (n: string) => `الرصيد ${n}`,
    noHistory: "لا يوجد نشاط للنقاط",
    noHistoryHint: "تظهر النقاط هنا بعد أول زيارة.",
    all: "الكل",
    promoCode: "كود الخصم",
    promoPlaceholder: "أدخل الكود",
    apply: "تطبيق",
    remove: "إزالة الكود",
    applied: (code: string) => `تم تطبيق ${code}`,
    saves: (amount: string) => `توفّر ${amount}`,
    failed: "لم تتم العملية. حاول مرة أخرى.",
    problems: {
      format: "الكود من 3 إلى 24 حرفًا أو رقمًا.",
      empty: "أدخل الكود.",
      unknown: "لا نعرف هذا الكود.",
      inactive: "هذا الكود متوقف.",
      "not-started": "هذا الكود لم يبدأ بعد.",
      expired: "انتهت صلاحية هذا الكود.",
      "min-subtotal": "طلبك أقل من الحد الأدنى لهذا الكود.",
      exhausted: "استُهلك هذا الكود بالكامل.",
      "per-customer": "لقد استخدمت هذا الكود من قبل.",
      "first-order": "هذا الكود للطلب الأول فقط.",
    },
    promos: "أكواد الخصم",
    newPromo: "كود خصم جديد",
    editPromo: "تعديل كود الخصم",
    code: "الكود",
    codeHint: "حروف وأرقام وشرطات. يظهر للعملاء كما كُتب، بأحرف كبيرة.",
    type: "النوع",
    percent: "نسبة خصم",
    fixed: "مبلغ خصم",
    value: "القيمة",
    percentValue: "النسبة",
    maxDiscount: "أقصى خصم",
    minSubtotal: "أقل طلب",
    startsOn: "يبدأ",
    endsOn: "ينتهي",
    maxRedemptions: "إجمالي الاستخدامات",
    perCustomer: "الاستخدامات لكل عميل",
    unlimited: "غير محدود",
    firstOrderOnly: "الطلب الأول فقط",
    active: "مفعّل",
    save: "حفظ الكود",
    cancel: "إلغاء",
    discountCol: "الخصم",
    validity: "الصلاحية",
    usesCol: "الاستخدام",
    statusCol: "الحالة",
    search: "ابحث في الأكواد",
    statuses: { live: "ساري", scheduled: "مجدول", ended: "منتهٍ", off: "متوقف", full: "مستهلك" },
    copyCode: "نسخ الكود",
    edit: "تعديل",
    deactivate: "إيقاف",
    activate: "تشغيل",
    delete: "حذف",
    deleteTitle: "حذف هذا الكود؟",
    deleteDescription: (code: string) => `سيتوقف ${code} عن العمل. الطلبات السابقة تحتفظ بخصمها.`,
    noPromos: "لا توجد أكواد خصم",
    noPromosHint: "أنشئ كودًا لإطلاق عرض.",
    promoLabel: "أكواد الخصم",
    visits: "الزيارات",
    date: "التاريخ",
    place: "المكان",
    spend: "الإنفاق",
    earned: "النقاط",
    visitStatus: { completed: "مكتملة", "no-show": "لم يحضر", cancelled: "ملغاة" },
    visitCount: "الزيارات",
    totalSpend: "إجمالي الإنفاق",
    average: "متوسط الزيارة",
    lastVisit: "آخر زيارة",
    noVisits: "لا توجد زيارات بعد",
    noVisitsHint: "تظهر الزيارات هنا بعد أول حجز.",
    visitLabel: "سجل الزيارات",
    close: "إغلاق",
    actions: "الإجراءات",
  },
};

type Strings = typeof STRINGS.en;
export type LoyaltyPromoLabels = Partial<Omit<Strings, "kinds" | "problems" | "statuses" | "visitStatus">> & {
  kinds?: Partial<Strings["kinds"]>;
  problems?: Partial<Strings["problems"]>;
  statuses?: Partial<Strings["statuses"]>;
  visitStatus?: Partial<Strings["visitStatus"]>;
};

function useStrings(labels?: LoyaltyPromoLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t = {
    ...base,
    ...labels,
    kinds: { ...base.kinds, ...labels?.kinds },
    problems: { ...base.problems, ...labels?.problems },
    statuses: { ...base.statuses, ...labels?.statuses },
    visitStatus: { ...base.visitStatus, ...labels?.visitStatus },
  } as Strings;
  return { t, locale, n: (v: number) => formatNumber(v, locale) };
}

type Result = void | { error?: string };
const fail = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const Money = ({ minor, currency, className }: { minor: number; currency: string; className?: string }) => <Num className={className} value={minorToMajor(minor, currency)} format={{ style: "currency", currency }} />;
const dayOf = (key: string) => new Date(`${key}T12:00:00`);
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayKey = () => keyOf(new Date());

/* ------------------------------------------------------------------ LoyaltyCard */

export interface LoyaltyTier {
  id: string;
  name: string;
  /** Lifetime points needed to reach it. */
  minPoints: number;
  /** A perk line such as "Free delivery". */
  perk?: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  description?: string;
  /** Cost in points. */
  cost: number;
  art?: ReactNode;
}

export interface LoyaltyCardProps extends Omit<ComponentProps<typeof Card>, "children"> {
  /** The customer's name. */
  name: string;
  /** Spendable points. */
  balance: number;
  /** Points earned over all time, which decides the tier. Default `balance`. */
  lifetimePoints?: number;
  tiers?: readonly LoyaltyTier[];
  /** Points with expiry dates. The soonest lapse inside `expiryWarningDays` is called out. */
  lots?: readonly PointsLot[];
  /** Default 30. */
  expiryWarningDays?: number;
  /** Day key used for expiry maths. Default today. */
  asOf?: string;
  memberSince?: Date | number | string;
  /** Shown as a QR code the till can scan. */
  memberCode?: string;
  rewards?: readonly LoyaltyReward[];
  /** Redeems a reward. Resolve `{ error }` to show a message. */
  onRedeem?: (reward: LoyaltyReward) => Promise<Result>;
  loading?: boolean;
  labels?: LoyaltyPromoLabels;
}

/** A customer's loyalty status: points balance, tier with progress to the next, expiring points, a scannable member code and rewards to redeem. */
export function LoyaltyCard({ name, balance, lifetimePoints, tiers, lots, expiryWarningDays = 30, asOf, memberSince, memberCode, rewards, onRedeem, loading = false, labels, className, ...props }: LoyaltyCardProps) {
  const { t, n } = useStrings(labels);
  const state = tiers?.length ? loyaltyTier(lifetimePoints ?? balance, tiers) : null;
  const soon = lots ? expiringPoints(lots, asOf ?? todayKey(), expiryWarningDays) : null;
  const titleId = useId();

  if (loading) {
    return (
      <Card data-slot="loyalty-card" aria-busy className={cn("gap-4 p-4", className)} {...props}>
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-2 w-full" />
      </Card>
    );
  }

  return (
    <Card data-slot="loyalty-card" aria-labelledby={titleId} className={cn("gap-4 px-0", className)} {...props}>
      <CardHeader className="items-start">
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle as="h2" id={titleId}>
            {name}
          </CardTitle>
          {memberSince ? (
            <p className="text-caption text-muted-foreground">
              {t.memberSince("")}
              <DateTime value={memberSince} format={{ dateStyle: "medium" }} />
            </p>
          ) : null}
        </div>
        {state?.tier ? (
          <Badge variant="brand">
            <Award aria-hidden />
            {state.tier.name}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="flex flex-col">
            <span className="text-caption text-muted-foreground">{t.pointsBalance}</span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-display font-semibold tabular-nums text-foreground">{n(balance)}</span>
              <span className="text-body-sm text-muted-foreground">{t.points}</span>
            </span>
          </p>
          {state ? (
            <div className="flex flex-col gap-1.5">
              <Progress size="md" aria-label={t.tier} value={state.progress} showValue={false} />
              <p className="text-caption text-muted-foreground">{state.next ? t.toNext(n(state.toNext), state.next.name) : t.topTier}</p>
              {state.tier?.perk ? <p className="text-caption text-foreground">{state.tier.perk}</p> : null}
            </div>
          ) : null}
          {soon && soon.points > 0 && soon.on ? (
            <p role="status" className="rounded-card bg-nq-warning-soft px-3 py-2 text-body-sm text-nq-warning-text">
              {t.expiring(n(soon.points), "")}
              <DateTime value={dayOf(soon.on)} format={{ dateStyle: "medium" }} />
            </p>
          ) : null}
        </div>
        {memberCode ? (
          <div className="flex flex-col items-center gap-1.5">
            <QrCode value={memberCode} size={112} label={`${t.memberCode}: ${memberCode}`} />
            <bdi dir="ltr" className="font-mono text-caption text-muted-foreground">
              {memberCode}
            </bdi>
          </div>
        ) : null}
      </CardContent>
      {rewards ? (
        <CardContent className="flex flex-col gap-2">
          <h3 className="text-label text-foreground">{t.rewards}</h3>
          {rewards.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t.noRewards}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rewards.map((r) => (
                <RewardCard key={r.id} title={r.title} description={r.description} art={r.art} cost={r.cost} balance={balance} onClaim={onRedeem ? () => onRedeem(r).then((x) => (x ? x : undefined)) : undefined} />
              ))}
            </div>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ PointsHistory */

export type PointsEntryKind = "earn" | "redeem" | "expire" | "adjust";

export interface PointsEntry {
  id: string;
  kind: PointsEntryKind;
  /** Signed: positive adds, negative takes away. */
  points: number;
  date: Date | number | string;
  note: string;
  balanceAfter?: number;
}

export interface PointsHistoryProps extends Omit<ComponentProps<"section">, "children"> {
  entries: readonly PointsEntry[];
  loading?: boolean;
  labels?: LoyaltyPromoLabels;
}

const KIND_TONE: Record<PointsEntryKind, StatusTone> = { earn: "success", redeem: "info", expire: "warning", adjust: "neutral" };

/** The points ledger, newest first: what was earned, redeemed or lapsed, with the balance after each line. Direction is a sign and a label, not colour alone. */
export function PointsHistory({ entries, loading = false, labels, className, ...props }: PointsHistoryProps) {
  const { t, n } = useStrings(labels);
  const titleId = useId();
  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <section data-slot="points-history" aria-labelledby={titleId} className={cn("flex flex-col gap-2", className)} {...props}>
      <h2 id={titleId} className="text-h3 text-foreground">
        {t.history}
      </h2>
      {loading ? (
        <div aria-busy className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={Award} title={t.noHistory} description={t.noHistoryHint} />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-card border border-border">
          {sorted.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-body-sm text-foreground">{e.note}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                  <Status tone={KIND_TONE[e.kind]}>{t.kinds[e.kind]}</Status>
                  <DateTime value={e.date} format={{ dateStyle: "medium" }} />
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <span className="text-body-sm font-medium tabular-nums text-foreground">
                  <bdi dir="ltr">
                    {e.points > 0 ? "+" : e.points < 0 ? "−" : ""}
                    {n(Math.abs(e.points))}
                  </bdi>
                </span>
                {e.balanceAfter !== undefined ? <span className="text-caption text-muted-foreground">{t.balanceAfter(n(e.balanceAfter))}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ PromoCodeField */

export interface PromoApplied {
  code: string;
  /** Minor units taken off. */
  discount: number;
}

export interface PromoCodeFieldProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  /** The code currently applied. */
  applied?: PromoApplied | null;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /**
   * Checks a code with your server. Resolve `{ error }` (or reject) to show it under the field; on success update `applied`.
   * Skip it to let `promos` and `context` decide locally.
   */
  onApply?: (code: string) => Promise<Result>;
  onRemove?: () => void;
  /** Local rules: the known codes and the order to check them against. The code is also checked for format. */
  promos?: readonly PromoLike[];
  context?: PromoContext;
  /** Called with a valid local result. Needed with `promos`. */
  onApplied?: (applied: PromoApplied) => void;
  disabled?: boolean;
  labels?: LoyaltyPromoLabels;
}

/**
 * A promo-code box for checkout. Typing is upper-cased; Apply checks the format, then either your `onApply` (server) or the
 * `promos` you pass in (local rules). A success shows the code with the saving and a remove button; a failure says why.
 */
export function PromoCodeField({ applied, currency: currencyProp, onApply, onRemove, promos, context, onApplied, disabled, labels, className, ...props }: PromoCodeFieldProps) {
  const currency = useCurrency(currencyProp);
  const { t } = useStrings(labels);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    if (busy) return;
    const code = normalizePromoCode(value);
    if (!code) return setError(t.problems.empty);
    if (!isPromoCodeFormat(code)) return setError(t.problems.format);
    setBusy(true);
    setError(null);
    try {
      if (onApply) {
        const result = await onApply(code);
        if (result?.error) setError(result.error);
        else setValue("");
      } else {
        const promo = promos?.find((p) => normalizePromoCode(p.code) === code);
        if (!promo || !context) return setError(t.problems.unknown);
        const result = evaluatePromo(promo, context);
        if (!result.valid) return setError(t.problems[result.problem as PromoProblem]);
        onApplied?.({ code, discount: result.discount });
        setValue("");
      }
    } catch (e) {
      setError(fail(e, t.failed));
    } finally {
      setBusy(false);
    }
  };

  if (applied) {
    return (
      <div data-slot="promo-code-field" data-state="applied" className={cn("flex items-center justify-between gap-3 rounded-card border border-nq-success/40 bg-nq-success-soft px-3 py-2", className)} {...props}>
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5 text-body-sm font-medium text-nq-success-text">
            <Tag aria-hidden className="size-4" />
            <bdi dir="ltr" className="font-mono">
              {applied.code}
            </bdi>
          </span>
          <span className="text-caption text-muted-foreground">
            {t.saves("")}
            <Money minor={applied.discount} currency={currency} />
          </span>
        </div>
        {onRemove ? (
          <Button size="icon-sm" variant="ghost" aria-label={t.remove} onClick={onRemove}>
            <X aria-hidden />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <form
      data-slot="promo-code-field"
      noValidate
      className={cn("flex flex-col gap-1.5", className)}
      onSubmit={(e) => {
        e.preventDefault();
        void apply();
      }}
      {...(props as ComponentProps<"form">)}
    >
      <Field invalid={Boolean(error)}>
        <FieldLabel>{t.promoCode}</FieldLabel>
        <div className="flex gap-2">
          <Input ltr className="flex-1 uppercase" name="promo" autoComplete="off" placeholder={t.promoPlaceholder} value={value} disabled={disabled || busy} onChange={(e) => (setValue(e.target.value), setError(null))} />
          <Button type="submit" variant="secondary" loading={busy} disabled={disabled || !value.trim()}>
            {t.apply}
          </Button>
        </div>
        {error ? <FieldError match>{error}</FieldError> : null}
      </Field>
    </form>
  );
}

/* ------------------------------------------------------------------ PromoCodeManager */

export interface PromoCode extends PromoLike {
  id: string;
  /** Times used so far. */
  used: number;
}

export interface PromoCodeInput {
  code: string;
  type: "percent" | "fixed";
  /** Percent: basis points. Fixed: minor units. */
  value: number;
  maxDiscount?: number;
  minSubtotal?: number;
  startsOn?: string;
  endsOn?: string;
  maxRedemptions?: number;
  perCustomer?: number;
  firstOrderOnly: boolean;
  active: boolean;
}

export interface PromoCodeManagerProps extends Omit<ComponentProps<"section">, "children"> {
  promos: readonly PromoCode[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Day key for "live" and "ended". Default today. */
  today?: string;
  /** Creates (no `id`) or updates (with `id`) a code. Resolve `{ error }` to keep the dialog open. */
  onSave: (input: PromoCodeInput, id?: string) => Promise<Result>;
  onSetActive?: (promo: PromoCode, active: boolean) => Promise<Result>;
  onDelete?: (promo: PromoCode) => Promise<Result>;
  loading?: boolean;
  labels?: LoyaltyPromoLabels;
}

type PromoStanding = "live" | "scheduled" | "ended" | "off" | "full";
const STANDING_TONE: Record<PromoStanding, StatusTone> = { live: "success", scheduled: "info", ended: "neutral", off: "neutral", full: "warning" };

function promoStanding(p: PromoCode, today: string): PromoStanding {
  if (p.active === false) return "off";
  if (p.endsOn && today > p.endsOn) return "ended";
  if (p.startsOn && today < p.startsOn) return "scheduled";
  if (p.maxRedemptions !== undefined && p.used >= p.maxRedemptions) return "full";
  return promoLive(p, today, p.used) ? "live" : "ended";
}

/** Admin list of promo codes with a create and edit dialog. Row actions (edit, copy, turn on or off, delete) open on context-click too. */
export function PromoCodeManager({ promos, currency: currencyProp, today = todayKey(), onSave, onSetActive, onDelete, loading = false, labels, className, ...props }: PromoCodeManagerProps) {
  const currency = useCurrency(currencyProp);
  const { t, n } = useStrings(labels);
  const titleId = useId();
  const [editing, setEditing] = useState<PromoCode | "new" | null>(null);
  const [deleting, setDeleting] = useState<PromoCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guard = async (job: () => Promise<Result>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await job();
      if (r?.error) {
        setError(r.error);
        return false;
      }
      return true;
    } catch (e) {
      setError(fail(e, t.failed));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const discountText = (p: PromoCode) => (p.type === "percent" ? <bdi dir="ltr">{n(p.value / 100)}%</bdi> : <Money minor={p.value} currency={currency} />);

  const columns: DataTableColumn<PromoCode>[] = [
    {
      id: "code",
      header: t.code,
      label: t.code,
      cell: (p) => (
        <bdi dir="ltr" className="font-mono text-foreground">
          {p.code}
        </bdi>
      ),
      sortValue: (p) => p.code,
      searchValue: (p) => p.code,
    },
    { id: "discount", header: t.discountCol, label: t.discountCol, cell: discountText, sortValue: (p) => p.value },
    {
      id: "validity",
      header: t.validity,
      label: t.validity,
      cell: (p) =>
        p.startsOn || p.endsOn ? (
          <span className="text-caption">
            {p.startsOn ? <DateTime value={dayOf(p.startsOn)} format={{ dateStyle: "medium" }} /> : "…"} – {p.endsOn ? <DateTime value={dayOf(p.endsOn)} format={{ dateStyle: "medium" }} /> : "…"}
          </span>
        ) : (
          <span className="text-caption text-muted-foreground">{t.unlimited}</span>
        ),
      sortValue: (p) => p.endsOn ?? "9999",
    },
    {
      id: "used",
      header: t.usesCol,
      label: t.usesCol,
      align: "end",
      cell: (p) => (
        <span className="tabular-nums">
          {n(p.used)}
          {p.maxRedemptions !== undefined ? <span className="text-muted-foreground"> / {n(p.maxRedemptions)}</span> : null}
        </span>
      ),
      sortValue: (p) => p.used,
    },
    { id: "status", header: t.statusCol, label: t.statusCol, cell: (p) => <Status tone={STANDING_TONE[promoStanding(p, today)]}>{t.statuses[promoStanding(p, today)]}</Status>, sortValue: (p) => promoStanding(p, today), filterValue: (p) => promoStanding(p, today) },
  ];
  const table = useDataTable({ data: promos as PromoCode[], columns, getRowId: (p) => p.id, pageSize: 10, defaultSort: { id: "code", direction: "asc" } });

  const actions = (p: PromoCode): DataTableRowAction[] => [
    { id: "edit", label: t.edit, onSelect: () => (setError(null), setEditing(p)) },
    { id: "copy", label: t.copyCode, icon: Copy, onSelect: () => void navigator.clipboard?.writeText(p.code) },
    ...(onSetActive ? [{ id: "toggle", label: p.active === false ? t.activate : t.deactivate, icon: Power, group: "state", onSelect: () => void guard(() => onSetActive(p, p.active === false)) }] : []),
    ...(onDelete ? [{ id: "delete", label: t.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => (setError(null), setDeleting(p)) }] : []),
  ];

  return (
    <section data-slot="promo-code-manager" aria-labelledby={titleId} className={cn("flex flex-col gap-3", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-h3 text-foreground">
          {t.promos}
        </h2>
        <Button size="sm" onClick={() => (setError(null), setEditing("new"))}>
          <Plus aria-hidden />
          {t.newPromo}
        </Button>
      </div>
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder={t.search} />
        <DataTableFacetFilter table={table} column="status" title={t.statusCol} options={(["live", "scheduled", "ended", "off", "full"] as const).map((s) => ({ value: s, label: t.statuses[s] }))} />
      </DataTableToolbar>
      {error && !editing && !deleting ? (
        <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden className="size-4" />
          {error}
        </p>
      ) : null}
      <DataTable table={table} label={t.promoLabel} rowLabel={(p) => p.code} loading={loading} rowActions={actions} empty={<EmptyState icon={Ticket} title={t.noPromos} description={t.noPromosHint} className="border-0" />} />
      {editing ? (
        <PromoEditor
          key={editing === "new" ? "new" : editing.id}
          promo={editing === "new" ? null : editing}
          currency={currency}
          busy={busy}
          error={error}
          t={t}
          onCancel={() => setEditing(null)}
          onSubmit={async (input) => {
            const ok = await guard(() => onSave(input, editing === "new" ? undefined : editing.id));
            if (ok) setEditing(null);
          }}
        />
      ) : null}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && !busy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deleteTitle}</DialogTitle>
            <DialogDescription>{t.deleteDescription(deleting?.code ?? "")}</DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="text-body-sm text-nq-danger-text">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => deleting && onDelete && void guard(() => onDelete(deleting)).then((ok) => ok && setDeleting(null))}>
              {t.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PromoEditor({ promo, currency, busy, error, t, onCancel, onSubmit }: { promo: PromoCode | null; currency: string; busy: boolean; error: string | null; t: Strings; onCancel: () => void; onSubmit: (input: PromoCodeInput) => void | Promise<void> }) {
  const [code, setCode] = useState(promo?.code ?? "");
  const [type, setType] = useState<"percent" | "fixed">(promo?.type ?? "percent");
  const [percent, setPercent] = useState(promo && promo.type === "percent" ? String(promo.value / 100) : "");
  const [fixed, setFixed] = useState<number | null>(promo && promo.type === "fixed" ? promo.value : null);
  const [maxDiscount, setMaxDiscount] = useState<number | null>(promo?.maxDiscount ?? null);
  const [minSubtotal, setMinSubtotal] = useState<number | null>(promo?.minSubtotal ?? null);
  const [startsOn, setStartsOn] = useState<string | null>(promo?.startsOn ?? null);
  const [endsOn, setEndsOn] = useState<string | null>(promo?.endsOn ?? null);
  const [maxUses, setMaxUses] = useState(promo?.maxRedemptions !== undefined ? String(promo.maxRedemptions) : "");
  const [perCustomer, setPerCustomer] = useState(promo?.perCustomer !== undefined ? String(promo.perCustomer) : "");
  const [firstOrderOnly, setFirstOrderOnly] = useState(promo?.firstOrderOnly ?? false);
  const [active, setActive] = useState(promo?.active ?? true);
  const [touched, setTouched] = useState(false);

  const pct = Number(percent.replace(",", "."));
  const codeBad = !isPromoCodeFormat(code);
  const valueBad = type === "percent" ? !(pct > 0 && pct <= 100) : !(fixed && fixed > 0);
  const datesBad = Boolean(startsOn && endsOn && endsOn < startsOn);
  const wholeOrBlank = (v: string) => v.trim() === "" || (Number.isInteger(Number(v)) && Number(v) > 0);
  const limitsBad = !wholeOrBlank(maxUses) || !wholeOrBlank(perCustomer);
  const bad = codeBad || valueBad || datesBad || limitsBad;

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (bad) return;
            void onSubmit({
              code: normalizePromoCode(code),
              type,
              value: type === "percent" ? Math.round(pct * 100) : (fixed ?? 0),
              maxDiscount: type === "percent" && maxDiscount ? maxDiscount : undefined,
              minSubtotal: minSubtotal || undefined,
              startsOn: startsOn ?? undefined,
              endsOn: endsOn ?? undefined,
              maxRedemptions: maxUses.trim() ? Number(maxUses) : undefined,
              perCustomer: perCustomer.trim() ? Number(perCustomer) : undefined,
              firstOrderOnly,
              active,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{promo ? t.editPromo : t.newPromo}</DialogTitle>
            <DialogDescription>{t.codeHint}</DialogDescription>
          </DialogHeader>
          <Field invalid={touched && codeBad}>
            <FieldLabel>{t.code}</FieldLabel>
            <Input ltr className="uppercase" value={code} disabled={busy} onChange={(e) => setCode(e.target.value)} />
            {touched && codeBad ? <FieldError match>{t.problems.format}</FieldError> : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t.type}</FieldLabel>
              <Select items={[{ value: "percent", label: t.percent }, { value: "fixed", label: t.fixed }]} value={type} disabled={busy} onValueChange={(v) => v && setType(v as "percent" | "fixed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">{t.percent}</SelectItem>
                  <SelectItem value="fixed">{t.fixed}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field invalid={touched && valueBad}>
              <FieldLabel>{type === "percent" ? t.percentValue : t.value}</FieldLabel>
              {type === "percent" ? <Input ltr inputMode="decimal" value={percent} disabled={busy} onChange={(e) => setPercent(e.target.value)} /> : <CurrencyInput currency={currency} value={fixed} disabled={busy} onValueChange={setFixed} aria-label={t.value} />}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {type === "percent" ? (
              <Field>
                <FieldLabel>{t.maxDiscount}</FieldLabel>
                <CurrencyInput currency={currency} value={maxDiscount} disabled={busy} onValueChange={setMaxDiscount} aria-label={t.maxDiscount} />
              </Field>
            ) : null}
            <Field>
              <FieldLabel>{t.minSubtotal}</FieldLabel>
              <CurrencyInput currency={currency} value={minSubtotal} disabled={busy} onValueChange={setMinSubtotal} aria-label={t.minSubtotal} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t.startsOn}</FieldLabel>
              <DatePicker aria-label={t.startsOn} value={startsOn ? dayOf(startsOn) : null} disabled={busy} onValueChange={(d) => setStartsOn(d ? keyOf(d) : null)} />
            </Field>
            <Field invalid={touched && datesBad}>
              <FieldLabel>{t.endsOn}</FieldLabel>
              <DatePicker aria-label={t.endsOn} value={endsOn ? dayOf(endsOn) : null} disabled={busy} onValueChange={(d) => setEndsOn(d ? keyOf(d) : null)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={touched && !wholeOrBlank(maxUses)}>
              <FieldLabel>{t.maxRedemptions}</FieldLabel>
              <Input ltr inputMode="numeric" placeholder={t.unlimited} value={maxUses} disabled={busy} onChange={(e) => setMaxUses(e.target.value)} />
            </Field>
            <Field invalid={touched && !wholeOrBlank(perCustomer)}>
              <FieldLabel>{t.perCustomer}</FieldLabel>
              <Input ltr inputMode="numeric" placeholder={t.unlimited} value={perCustomer} disabled={busy} onChange={(e) => setPerCustomer(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 text-body-sm">
              <Switch checked={firstOrderOnly} onCheckedChange={setFirstOrderOnly} disabled={busy} />
              {t.firstOrderOnly}
            </label>
            <label className="flex items-center gap-2 text-body-sm">
              <Switch checked={active} onCheckedChange={setActive} disabled={busy} />
              {t.active}
            </label>
          </div>
          {error ? (
            <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
              <CircleX aria-hidden className="size-4" />
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ VisitHistory */

export type VisitStatus = "completed" | "no-show" | "cancelled";

export interface Visit {
  id: string;
  date: Date | number | string;
  place: string;
  /** Minor units. 0 for a cancelled or free visit. */
  spend: number;
  points: number;
  status: VisitStatus;
}

export interface VisitHistoryProps extends Omit<ComponentProps<"section">, "children"> {
  visits: readonly Visit[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Extra actions per visit, such as "Book again". They open on context-click too. */
  rowActions?: (visit: Visit) => DataTableRowAction[];
  loading?: boolean;
  labels?: LoyaltyPromoLabels;
}

const VISIT_TONE: Record<VisitStatus, StatusTone> = { completed: "success", "no-show": "danger", cancelled: "neutral" };

/** A customer's visits with totals up top: count, total spend, average visit and last visit. Sortable by date, spend and points. */
export function VisitHistory({ visits, currency: currencyProp, rowActions, loading = false, labels, className, ...props }: VisitHistoryProps) {
  const currency = useCurrency(currencyProp);
  const { t, n } = useStrings(labels);
  const titleId = useId();
  const done = visits.filter((v) => v.status === "completed");
  const total = done.reduce((s, v) => s + v.spend, 0);
  const average = done.length ? Math.floor((total * 2 + done.length) / (done.length * 2)) : 0;
  const last = done.reduce<Visit | null>((a, v) => (!a || new Date(v.date) > new Date(a.date) ? v : a), null);

  const columns: DataTableColumn<Visit>[] = [
    { id: "date", header: t.date, label: t.date, cell: (v) => <DateTime value={v.date} format={{ dateStyle: "medium", timeStyle: "short" }} />, sortValue: (v) => new Date(v.date) },
    { id: "place", header: t.place, label: t.place, cell: (v) => <span className="text-foreground">{v.place}</span>, sortValue: (v) => v.place, searchValue: (v) => v.place },
    { id: "spend", header: t.spend, label: t.spend, align: "end", cell: (v) => <Money minor={v.spend} currency={currency} />, sortValue: (v) => v.spend },
    { id: "points", header: t.earned, label: t.earned, align: "end", cell: (v) => <span className="tabular-nums">{v.points > 0 ? `+${n(v.points)}` : n(v.points)}</span>, sortValue: (v) => v.points },
    { id: "status", header: t.statusCol, label: t.statusCol, cell: (v) => <Status tone={VISIT_TONE[v.status]}>{t.visitStatus[v.status]}</Status>, sortValue: (v) => v.status, filterValue: (v) => v.status },
  ];
  const table = useDataTable({ data: visits as Visit[], columns, getRowId: (v) => v.id, pageSize: 8, defaultSort: { id: "date", direction: "desc" } });

  return (
    <section data-slot="visit-history" aria-labelledby={titleId} className={cn("flex flex-col gap-3", className)} {...props}>
      <h2 id={titleId} className="text-h3 text-foreground">
        {t.visits}
      </h2>
      <StatGrid>
        <StatCard label={t.visitCount} value={n(done.length)} />
        <StatCard label={t.totalSpend} value={<Money minor={total} currency={currency} />} />
        <StatCard label={t.average} value={<Money minor={average} currency={currency} />} />
        <StatCard label={t.lastVisit} value={last ? <DateTime value={last.date} format={{ dateStyle: "medium" }} /> : "—"} />
      </StatGrid>
      <DataTable table={table} label={t.visitLabel} rowLabel={(v) => v.place} loading={loading} rowActions={rowActions} empty={<EmptyState icon={Award} title={t.noVisits} description={t.noVisitsHint} className="border-0" />} />
    </section>
  );
}
