"use client";

import { Mail, MailCheck, ShoppingCart, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Input, Textarea } from "../field";
import { DateTime, Num } from "../numeric";
import { EmptyState, Skeleton } from "../states";
import { StatCard, StatGrid } from "../stat-card";
import { useStoreAdminStrings, type StoreAdminLabels } from "./admin-strings";
import { StoreMoney } from "./money";
import {
  type AbandonedCart,
  type RecoveryRules,
  type RecoveryStatus,
  canSendRecovery,
  cartItemCount,
  cartValue,
  cartIdleMinutes,
  recoveryDiscount,
  recoveryStats,
  recoveryStatus,
} from "./abandoned-logic";
import { useCurrency } from "../../provider/nasaq-provider";

export interface RecoveryEmail {
  cartId: string;
  /** Percent off offered in the email, 0 for none. */
  discountPercent: number;
  /** Discount in minor units at the current cart value. */
  discountAmount: number;
  message: string;
}

const STATUS_VARIANT: Record<RecoveryStatus, "info" | "warning" | "success" | "neutral" | "danger"> = {
  new: "warning",
  emailed: "info",
  recovered: "success",
  lost: "neutral",
  "no-email": "neutral",
};

export interface StoreAbandonedCartsProps {
  carts: readonly AbandonedCart[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Reference time. Pass it so the list is stable and testable. Default: the current time. */
  now?: number | Date;
  rules?: RecoveryRules;
  /** Largest discount an email may offer, in percent. Default 20. */
  maxDiscountPercent?: number;
  onSendRecovery?: (email: RecoveryEmail) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  labels?: StoreAdminLabels;
  className?: string;
}

function Idle({ minutes }: { minutes: number }) {
  const { t } = useStoreAdminStrings();
  if (minutes < 60) return <span>{t.idleMinutes(minutes)}</span>;
  if (minutes < 60 * 48) return <span>{t.idleHours(Math.floor(minutes / 60))}</span>;
  return <span>{t.idleDays(Math.floor(minutes / 1440))}</span>;
}

/**
 * Carts that were left behind, with how long they have been idle, what they are worth and whether the shopper can be
 * emailed again. Sending is gated by `canSendRecovery`: idle long enough, not in cooldown, under the email limit.
 */
export function StoreAbandonedCarts({ carts, currency: currencyProp, now, rules, maxDiscountPercent = 20, onSendRecovery, loading, error, onRetry, labels, className }: StoreAbandonedCartsProps) {
  const currency = useCurrency(currencyProp);
  const { t, ar } = useStoreAdminStrings(labels);
  const clock = useMemo(() => now ?? Date.now(), [now]);
  const stats = recoveryStats(carts, clock, rules);
  const [target, setTarget] = useState<AbandonedCart | null>(null);
  const [percent, setPercent] = useState("0");
  const [message, setMessage] = useState("");

  const sorted = useMemo(() => [...carts].sort((a, b) => cartValue(b) - cartValue(a)), [carts]);
  const pct = Math.min(Math.max(Number.parseInt(percent, 10) || 0, 0), maxDiscountPercent);

  const open = (cart: AbandonedCart) => {
    setTarget(cart);
    setPercent("0");
    setMessage("");
  };
  const send = () => {
    if (!target) return;
    onSendRecovery?.({ cartId: target.id, discountPercent: pct, discountAmount: recoveryDiscount(cartValue(target), pct), message: message.trim() });
    setTarget(null);
  };

  const blockText = (cart: AbandonedCart) => {
    const gate = canSendRecovery(cart, clock, rules);
    if (gate.ok) return null;
    switch (gate.reason) {
      case "recovered":
        return t.blockRecovered;
      case "lost":
        return t.blockLost;
      case "no-email":
        return t.blockNoEmail;
      case "too-soon":
        return t.blockTooSoon(gate.waitMinutes ?? 0);
      case "cooldown":
        return t.blockCooldown(Math.ceil((gate.waitMinutes ?? 0) / 60));
      default:
        return t.blockLimit;
    }
  };

  if (error) {
    return (
      <div className={className}>
        <EmptyState
          title={t.loadErrorCarts}
          actions={
            onRetry ? (
              <Button size="sm" variant="secondary" onClick={onRetry}>
                {t.retry}
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <section data-slot="store-abandoned-carts" aria-label={t.abandoned} className={cn("flex min-w-0 flex-col gap-4", className)}>
      <StatGrid>
        <StatCard loading={loading} icon={<ShoppingCart />} label={t.statAbandoned} value={stats.carts} />
        <StatCard loading={loading} icon={<Wallet />} label={t.statAtRisk} value={<StoreMoney amount={stats.atRisk} currency={currency} />} />
        <StatCard loading={loading} icon={<MailCheck />} label={t.statRecovered} value={stats.recovered} />
        <StatCard loading={loading} icon={<Mail />} label={t.statRate} value={stats.rateBps / 10000} format={{ style: "percent", maximumFractionDigits: 0 }} />
      </StatGrid>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState title={t.noCarts} description={t.noCartsText} />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {sorted.map((cart) => {
            const status = recoveryStatus(cart, clock, rules);
            const gate = canSendRecovery(cart, clock, rules);
            const why = blockText(cart);
            return (
              <li key={cart.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-border bg-card p-3">
                <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
                  <span className="truncate font-medium">{cart.customer?.name ?? t.guest}</span>
                  {cart.customer?.email ? (
                    <bdi dir="ltr" className="truncate text-start text-body-sm text-muted-foreground">
                      {cart.customer.email}
                    </bdi>
                  ) : null}
                  <span className="truncate text-body-sm text-muted-foreground">{cart.lines.map((l) => l.name).join(ar ? "، " : ", ")}</span>
                </div>
                <div className="flex flex-col gap-0.5 text-body-sm">
                  <StoreMoney amount={cartValue(cart)} currency={currency} className="font-medium" />
                  <span className="text-muted-foreground">
                    <Num value={cartItemCount(cart)} /> {t.items}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 text-body-sm text-muted-foreground">
                  <span>{t.stage[cart.stage]}</span>
                  <Idle minutes={cartIdleMinutes(cart, clock)} />
                </div>
                <div className="flex flex-col items-start gap-1">
                  <Badge variant={STATUS_VARIANT[status]}>{t.recovery[status]}</Badge>
                  {cart.emailsSent > 0 ? (
                    <span className="text-caption text-muted-foreground">
                      {t.emailsSent(cart.emailsSent)}
                      {cart.lastEmailAt ? (
                        <>
                          {" · "}
                          <DateTime value={cart.lastEmailAt} format={{ dateStyle: "medium" }} />
                        </>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                <div className="ms-auto flex flex-col items-end gap-1">
                  <Button size="sm" variant="secondary" disabled={!gate.ok || !onSendRecovery} onClick={() => open(cart)}>
                    <Mail aria-hidden />
                    {t.sendRecovery}
                  </Button>
                  {why ? <span className="text-caption text-muted-foreground">{why}</span> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-md">
          {target ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <DialogHeader>
                <DialogTitle>{t.recoveryTitle}</DialogTitle>
                <DialogDescription>
                  {t.recoveryText} <bdi dir="ltr">{target.customer?.email}</bdi>
                </DialogDescription>
              </DialogHeader>
              <label className="flex flex-col gap-1 text-body-sm">
                <span className="font-medium">{t.discountPercent}</span>
                <Input type="number" inputMode="numeric" min={0} max={maxDiscountPercent} value={percent} onChange={(e) => setPercent(e.target.value)} />
                <span className="text-caption text-muted-foreground">
                  {t.discountHint(maxDiscountPercent)}
                  {pct > 0 ? (
                    <>
                      {" "}
                      <StoreMoney amount={recoveryDiscount(cartValue(target), pct)} currency={currency} />
                    </>
                  ) : null}
                </span>
              </label>
              <label className="flex flex-col gap-1 text-body-sm">
                <span className="font-medium">{t.recoveryMessage}</span>
                <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.recoveryPlaceholder} />
              </label>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setTarget(null)}>
                  {t.cancel}
                </Button>
                <Button type="submit" variant="primary">
                  <Mail aria-hidden />
                  {t.sendRecovery}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
