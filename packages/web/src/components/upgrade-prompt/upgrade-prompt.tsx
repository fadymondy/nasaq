"use client";

import { Check, Clock, Lock, ShieldCheck, Sparkles, X } from "lucide-react";
import { type ComponentProps, type ReactElement, type ReactNode, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useCurrency, useOptionalNasaq } from "../../provider/nasaq-provider";
import { useSidebarCollapsed } from "../app-shell";
import { Badge } from "../badge";
import { Button } from "../button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../dialog";
import { type BillingPeriod, BillingPeriodSwitch, PlanPicker, type PricingPlan, planPrice, yearlySavings } from "../pricing-table";
import { Price } from "../price";
import { Meter } from "../progress";
import { Tooltip } from "../tooltip";

const STRINGS = {
  en: {
    pro: "Pro",
    upgrade: "Upgrade",
    upgradeNow: "Upgrade now",
    upgradeTo: (name: string) => `Upgrade to ${name}`,
    later: "Maybe later",
    dismiss: "Dismiss",
    cancelAnytime: "Cancel anytime. Your data stays yours.",
    endsIn: "Ends in",
    days: "d",
    locked: "Locked",
    unlock: "Unlock with an upgrade",
    seePlans: "See plans",
  },
  ar: {
    pro: "احترافي",
    upgrade: "ترقية",
    upgradeNow: "رقِّ الآن",
    upgradeTo: (name: string) => `الترقية إلى ${name}`,
    later: "ربما لاحقًا",
    dismiss: "إخفاء",
    cancelAnytime: "ألغِ في أي وقت. بياناتك تبقى لك.",
    endsIn: "ينتهي خلال",
    days: "ي",
    locked: "مقفل",
    unlock: "افتحها بالترقية",
    seePlans: "عرض الخطط",
  },
};

export type UpgradeLabels = Partial<typeof STRINGS.en>;

function useStrings(labels?: UpgradeLabels) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ar, t: { ...STRINGS[ar ? "ar" : "en"], ...labels } };
}

async function run(fn: () => void | Promise<unknown>, setPending: (v: boolean) => void) {
  const result = fn();
  if (result && typeof (result as Promise<unknown>).then === "function") {
    setPending(true);
    try {
      await result;
    } finally {
      setPending(false);
    }
  }
}

export interface PlanBadgeProps extends ComponentProps<typeof Badge> {
  /** The plan's name. Default "Pro". */
  children?: ReactNode;
}

/** Marks a feature, menu item or setting as part of a paid plan. */
export function PlanBadge({ children, className, ...props }: PlanBadgeProps) {
  const { t } = useStrings();
  return (
    <Badge data-slot="plan-badge" variant="brand" className={cn("gap-1", className)} {...props}>
      <Sparkles aria-hidden className="size-3" />
      {children ?? t.pro}
    </Badge>
  );
}

function useRemaining(endsAt?: Date | string | number) {
  const target = endsAt === undefined ? undefined : new Date(endsAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (target === undefined) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return target === undefined ? undefined : Math.max(0, target - now);
}

/** "2d 04:13:09", with Latin digits so it reads the same in Arabic. */
function OfferClock({ endsAt, label }: { endsAt: Date | string | number; label: string }) {
  const { t } = useStrings();
  const ms = useRemaining(endsAt) ?? 0;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return (
    <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
      <Clock aria-hidden className="size-3.5" />
      {label}
      <span dir="ltr" className="font-mono text-foreground tabular-nums" role="timer" aria-live="off">
        {d > 0 ? `${d}${t.days} ` : ""}
        {clock}
      </span>
    </span>
  );
}

export interface UpgradeOffer {
  /** "Launch offer: 30% off your first year". */
  label: ReactNode;
  /** When it ends. Shows a live countdown. */
  endsAt?: Date | string | number;
}

export interface UpgradeDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Opens the dialog: usually a `<Button />`. It becomes the dialog's trigger. */
  trigger?: ReactElement;
  /** A large icon in the hero. Default sparkles. */
  icon?: ReactNode;
  /** What they get, not what they pay: "Unlock unlimited projects". */
  title: ReactNode;
  description?: ReactNode;
  /** Three to five concrete wins. */
  benefits?: ReactNode[];
  /**
   * The plans on offer. One plan shows its price; several show a `PlanPicker`. Leave out to show no price
   * (the button then just says "Upgrade now").
   */
  plans?: PricingPlan[];
  /** The plan picked first. Default: the highlighted plan, else the first. */
  defaultPlanId?: string;
  currentPlanId?: string;
  currency?: string;
  defaultPeriod?: BillingPeriod;
  /** A time-limited offer, shown above the button. */
  offer?: UpgradeOffer;
  /** The reassurance under the button. Default "Cancel anytime. Your data stays yours."; `null` hides it. */
  note?: ReactNode | null;
  /** The button. Return a promise to keep it busy until checkout opens. */
  onUpgrade: (planId: string | undefined, period: BillingPeriod) => void | Promise<unknown>;
  /** Override the button label. */
  cta?: ReactNode;
  labels?: UpgradeLabels;
}

/**
 * The upgrade popup: open it when someone hits a limit or reaches for a paid feature. It leads with what they
 * get, shows the price and a way out ("Maybe later"), and goes straight to checkout.
 */
export function UpgradeDialog({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  icon,
  title,
  description,
  benefits,
  plans,
  defaultPlanId,
  currentPlanId,
  currency: currencyProp,
  defaultPeriod = "year",
  offer,
  note,
  onUpgrade,
  cta,
  labels,
}: UpgradeDialogProps) {
  const currency = useCurrency(currencyProp);
  const { t } = useStrings(labels);
  const choices = plans?.filter((p) => p.id !== currentPlanId) ?? [];
  const [planId, setPlanId] = useState<string | undefined>(defaultPlanId ?? (choices.find((p) => p.highlighted) ?? choices[0])?.id);
  const hasYearly = choices.some((p) => p.yearly !== undefined);
  const [period, setPeriod] = useState<BillingPeriod>(hasYearly ? defaultPeriod : "month");
  const [pending, setPending] = useState(false);
  const plan = choices.find((p) => p.id === planId);
  const price = plan ? planPrice(plan, period) : null;
  const name = plan && typeof plan.name === "string" ? plan.name : "";

  return (
    <Dialog open={open} defaultOpen={defaultOpen} onOpenChange={(o) => onOpenChange?.(o)}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent data-slot="upgrade-dialog" className="max-w-md gap-0 overflow-hidden p-0">
        <div className="flex flex-col items-center gap-3 bg-[color-mix(in_oklab,var(--nq-brand)_12%,var(--nq-surface))] px-6 pt-8 pb-6 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-md [&_svg]:size-6">{icon ?? <Sparkles aria-hidden />}</span>
          <DialogTitle className="text-h3 text-foreground">{title}</DialogTitle>
          {description ? <DialogDescription className="text-body-sm text-muted-foreground">{description}</DialogDescription> : null}
        </div>
        <div className="flex flex-col gap-5 p-6">
          {benefits && benefits.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {benefits.map((b, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static copy
                <li key={i} className="flex items-start gap-2.5 text-body-sm text-foreground">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-nq-success-soft text-nq-success-text">
                    <Check aria-hidden className="size-3" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          ) : null}

          {choices.length > 0 ? (
            <div className="flex flex-col gap-3">
              {hasYearly ? <BillingPeriodSwitch value={period} onValueChange={setPeriod} savings={yearlySavings(choices)} className="justify-center" /> : null}
              {choices.length > 1 ? (
                <PlanPicker plans={choices} value={planId} onValueChange={setPlanId} currency={currency} period={period} />
              ) : price && plan ? (
                <div className="flex items-baseline justify-center gap-2">
                  <Price amount={price.amount} compareAt={price.compareAt} currency={currency} period={plan.perSeat ? "seat-month" : "month"} size="lg" />
                </div>
              ) : null}
            </div>
          ) : null}

          {offer ? (
            <div className="flex flex-col items-center gap-1 rounded-control bg-nq-accent/10 px-3 py-2 text-center">
              <span className="text-label text-nq-accent-text">{offer.label}</span>
              {offer.endsAt !== undefined ? <OfferClock endsAt={offer.endsAt} label={t.endsIn} /> : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button variant="primary" size="lg" aria-busy={pending || undefined} disabled={pending} onClick={() => run(() => onUpgrade(planId, period), setPending)}>
              {cta ?? (name ? t.upgradeTo(name) : t.upgradeNow)}
            </Button>
            <DialogClose render={<Button variant="ghost" />}>{t.later}</DialogClose>
          </div>
          {note === null ? null : (
            <p className="flex items-center justify-center gap-1.5 text-center text-caption text-muted-foreground">
              <ShieldCheck aria-hidden className="size-3.5 shrink-0" />
              {note ?? t.cancelAnytime}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface UpgradeBannerProps extends Omit<ComponentProps<"div">, "title"> {
  /** "brand" for an offer or trial, "warning" when a limit is near or the trial is ending. */
  tone?: "brand" | "warning";
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** The button: usually "Upgrade" or "Choose a plan". */
  action?: ReactNode;
  /** Shows a dismiss button. Only for offers; never for a limit the person has actually hit. */
  onDismiss?: () => void;
  labels?: UpgradeLabels;
}

/** A strip across the top of a page: a trial ending, a limit near, an offer. One at a time. */
export function UpgradeBanner({ tone = "brand", icon, title, description, action, onDismiss, labels, className, ...props }: UpgradeBannerProps) {
  const { t } = useStrings(labels);
  return (
    <div
      data-slot="upgrade-banner"
      data-tone={tone}
      role="region"
      aria-label={typeof title === "string" ? title : undefined}
      className={cn(
        "@container flex items-center gap-3 rounded-card px-4 py-3",
        tone === "brand" ? "bg-[color-mix(in_oklab,var(--nq-brand)_10%,var(--nq-surface))] ring-1 ring-nq-brand/25" : "bg-nq-warning-soft ring-1 ring-nq-warning/30",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full [&_svg]:size-4",
          tone === "brand" ? "bg-primary text-primary-foreground" : "bg-nq-surface text-nq-warning-text ring-1 ring-nq-warning/40",
        )}
      >
        {icon ?? <Sparkles aria-hidden />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 @xl:flex-row @xl:items-center @xl:gap-4">
        <div className="min-w-0 flex-1">
          <p className={cn("text-label", tone === "brand" ? "text-foreground" : "text-nq-warning-text")}>{title}</p>
          {description ? <p className="text-body-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {onDismiss ? (
        <Button variant="ghost" size="icon" aria-label={t.dismiss} onClick={onDismiss} className="size-7 shrink-0 self-start">
          <X aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

export interface UpgradeCardProps extends Omit<ComponentProps<"div">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /** A usage bar, so the reason to upgrade is visible: `{ value: 8, max: 10, label: "8 of 10 projects" }`. */
  usage?: { value: number; max: number; label?: ReactNode };
  /** The button label. Default "Upgrade". */
  actionLabel?: ReactNode;
  onUpgrade: () => void;
  labels?: UpgradeLabels;
}

/**
 * The upgrade nudge for the sidebar footer. When the sidebar is collapsed it shrinks to a single icon button
 * with a tooltip.
 */
export function UpgradeCard({ title, description, usage, actionLabel, onUpgrade, labels, className, ...props }: UpgradeCardProps) {
  const { t } = useStrings(labels);
  const collapsed = useSidebarCollapsed();
  const label = actionLabel ?? t.upgrade;
  if (collapsed) {
    return (
      <Tooltip content={title} side="inline-end">
        <Button data-slot="upgrade-card" variant="ghost" size="icon" aria-label={typeof label === "string" ? label : t.upgrade} onClick={onUpgrade} className="text-nq-brand">
          <Sparkles aria-hidden />
        </Button>
      </Tooltip>
    );
  }
  return (
    <div
      data-slot="upgrade-card"
      className={cn("flex flex-col gap-3 rounded-card bg-[color-mix(in_oklab,var(--nq-brand)_10%,var(--nq-surface))] p-3 ring-1 ring-nq-brand/20", className)}
      {...props}
    >
      <div className="flex items-start gap-2">
        <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-nq-brand" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-label text-foreground">{title}</p>
          {description ? <p className="text-caption text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {usage ? <Meter value={usage.value} max={usage.max} label={usage.label} showValue={usage.label === undefined} size="sm" /> : null}
      <Button variant="primary" size="sm" onClick={onUpgrade}>
        {label}
      </Button>
    </div>
  );
}

export interface FeatureGateProps extends Omit<ComponentProps<"div">, "title"> {
  /** When true the feature is shown blurred behind an upgrade panel and cannot be used. */
  locked: boolean;
  /** "Custom reports are on Pro". */
  title: ReactNode;
  description?: ReactNode;
  /** The plan that unlocks it. Default "Pro". */
  plan?: ReactNode;
  /** The button label. Default "See plans". */
  actionLabel?: ReactNode;
  onUpgrade: () => void;
  labels?: UpgradeLabels;
}

/**
 * Wraps a paid feature. Unlocked, it renders the children as they are. Locked, it shows a blurred preview of
 * them (so people see what they would get) with an upgrade panel on top; the preview is inert and hidden from
 * assistive technology.
 */
export function FeatureGate({ locked, title, description, plan, actionLabel, onUpgrade, labels, className, children, ...props }: FeatureGateProps) {
  const { t } = useStrings(labels);
  if (!locked) return <>{children}</>;
  return (
    <div data-slot="feature-gate" data-locked="" className={cn("relative isolate overflow-hidden rounded-card", className)} {...props}>
      <div aria-hidden inert className="pointer-events-none select-none blur-[3px] saturate-50">
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center bg-background/55 p-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-card bg-card p-5 text-center shadow-lg ring-1 ring-border">
          <span className="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground">
            <Lock aria-hidden className="size-4" />
          </span>
          <PlanBadge>{plan}</PlanBadge>
          <p className="text-h4 text-foreground">{title}</p>
          {description ? <p className="text-body-sm text-muted-foreground">{description}</p> : null}
          <Button variant="primary" onClick={onUpgrade}>{actionLabel ?? t.seePlans}</Button>
        </div>
      </div>
    </div>
  );
}
