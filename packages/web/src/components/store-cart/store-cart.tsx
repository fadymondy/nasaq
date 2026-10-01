"use client";

import { Bookmark, CircleAlert, Eye, Minus, Plus, ShoppingBag, ShoppingCart, Trash2, TriangleAlert, Truck, Undo2 } from "lucide-react";
import { type ComponentProps, type FormEvent, type KeyboardEvent, type ReactElement, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { type CommerceCartLine, type CommerceProduct, type CommerceShippingMethod, commerceClampQuantity, commerceFreeShippingProgress, commercePriceRange, commerceTotals } from "../../lib/commerce";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../carousel";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import { Field, FieldLabel, Input } from "../field";
import { type PromoApplied, type PromoLike, PromoCodeField } from "../loyalty-promo";
import { Num } from "../numeric";
import { ProductCard } from "../product-card";
import { Progress } from "../progress";
import { RadioCard, RadioGroup } from "../radio-group";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "../sheet";
import { EmptyState, ErrorState, Skeleton } from "../states";
import {
  type CartRemoval,
  type CartShippingOption,
  type StoreShippingZone,
  cartBlockers,
  cartActiveLines,
  cartCheapestShipping,
  cartItemFromProduct,
  cartSavedLines,
  cartShippingOptions,
  cartStockIssue,
  matchShippingZone,
} from "./cart-logic";
import { type StoreCartLabels, useStoreCartStrings } from "./cart-strings";
import { StoreImage } from "./store-image";
import { StoreAmount, StoreCartMoney } from "./store-money";
import type { StoreCartMessage } from "./use-store-cart";
import { useCurrency } from "../../provider/nasaq-provider";

const toLatin = (value: string) => value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

/* ------------------------------------------------------------------ live region */

export interface StoreCartAnnouncerProps extends Omit<ComponentProps<"div">, "children"> {
  /** From `useStoreCart().message`. Each new `id` is read out again, even when the words are the same. */
  message: StoreCartMessage;
}

/** The hidden aria-live region for cart changes: "Everyday cotton tee added to your cart, quantity 2". Mount it once. */
export function StoreCartAnnouncer({ message, className, ...props }: StoreCartAnnouncerProps) {
  return (
    <div data-slot="store-cart-announcer" role="status" aria-live="polite" aria-atomic="true" className={cn("sr-only", className)} {...props}>
      {message.text ? `${message.text}${message.id % 2 ? " " : ""}` : ""}
    </div>
  );
}

/* ------------------------------------------------------------------ cart button */

export interface StoreCartButtonProps extends Omit<ComponentProps<typeof Button>, "children" | "variant" | "size"> {
  count: number;
  labels?: StoreCartLabels;
}

/** The header cart button with its item count. The count is part of the accessible name. */
export function StoreCartButton({ count, labels, className, ...props }: StoreCartButtonProps) {
  const { t, n } = useStoreCartStrings(labels);
  return (
    <Button variant="ghost" size="icon" aria-label={t.cartCount(t.items(n(count), count))} className={cn("relative", className)} {...props}>
      <ShoppingCart aria-hidden />
      {count > 0 ? (
        <span data-slot="store-cart-count" aria-hidden className="absolute -end-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-medium leading-4 text-primary-foreground">
          {n(count)}
        </span>
      ) : null}
    </Button>
  );
}

/* ------------------------------------------------------------------ quantity stepper */

export interface StoreQuantityStepperProps extends Omit<ComponentProps<"div">, "onChange"> {
  value: number;
  /** Stock or per-order limit. Plus stops here and typing more is lowered to it. */
  max?: number;
  min?: number;
  onChange: (quantity: number) => void;
  /** The product name, so the buttons read "Increase quantity of Everyday cotton tee". */
  name: string;
  disabled?: boolean;
  labels?: StoreCartLabels;
}

/**
 * Minus, a number you can type in, plus. It is a spin button: Arrow Up and Down step, Home and End jump to the limits,
 * and typing more than `max` is lowered to it. At the limit a note says how many are available.
 */
export function StoreQuantityStepper({ value, max, min = 1, onChange, name, disabled, labels, className, ...props }: StoreQuantityStepperProps) {
  const { t, n } = useStoreCartStrings(labels);
  const hintId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const top = max !== undefined ? Math.max(max, min) : undefined;
  const atMax = top !== undefined && value >= top;
  const clamp = (q: number) => Math.max(min, commerceClampQuantity(q, top));
  const set = (q: number) => {
    const next = clamp(q);
    if (next !== value) onChange(next);
    else if (q !== next) onChange(next);
  };
  const commit = () => {
    if (draft === null) return;
    const parsed = Number.parseInt(toLatin(draft).replace(/[^\d]/g, ""), 10);
    setDraft(null);
    if (Number.isFinite(parsed)) set(parsed);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") return void commit();
    const step = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
    if (step) {
      event.preventDefault();
      setDraft(null);
      set(value + step);
    } else if (event.key === "Home") {
      event.preventDefault();
      set(min);
    } else if (event.key === "End" && top !== undefined) {
      event.preventDefault();
      set(top);
    }
  };
  return (
    <div data-slot="store-quantity-stepper" className={cn("flex flex-col gap-1", className)} {...props}>
      <div role="group" aria-label={t.quantityOf(name)} className="inline-flex w-fit items-center rounded-control border border-input bg-card">
        <Button variant="ghost" size="icon-sm" aria-label={t.decrease(name)} disabled={disabled || value <= min} onClick={() => set(value - 1)}>
          <Minus aria-hidden />
        </Button>
        <input
          role="spinbutton"
          type="text"
          inputMode="numeric"
          dir="ltr"
          aria-label={t.quantity}
          aria-valuemin={min}
          aria-valuenow={value}
          {...(top !== undefined ? { "aria-valuemax": top } : {})}
          aria-describedby={atMax ? hintId : undefined}
          disabled={disabled}
          value={draft ?? String(value)}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className="h-control-sm w-10 border-0 bg-transparent text-center text-body tabular-nums text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus pointer-coarse:text-[16px]"
        />
        <Button variant="ghost" size="icon-sm" aria-label={t.increase(name)} disabled={disabled || atMax} onClick={() => set(value + 1)}>
          <Plus aria-hidden />
        </Button>
      </div>
      {atMax && top !== undefined ? (
        <span id={hintId} className="text-caption text-muted-foreground">
          {t.maxReached(n(top))}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ line item */

export interface StoreCartLineItemProps extends Omit<ComponentProps<"li">, "children"> {
  line: CommerceCartLine;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** A saved-for-later line: no stepper, "Move to cart" instead of "Save for later". */
  saved?: boolean;
  /** The narrow layout for the mini cart: a smaller picture and an icon-only remove. */
  compact?: boolean;
  onQuantityChange?: (quantity: number) => void;
  onRemove?: () => void;
  onSaveForLater?: () => void;
  onMoveToCart?: () => void;
  onOpenProduct?: () => void;
  /** Show the variant's SKU under the name. */
  sku?: string;
  labels?: StoreCartLabels;
}

/**
 * One product in the cart: picture (with a placeholder), name, variant, stock warning, unit and line price, the
 * quantity stepper and the row actions. The same actions are on its context menu (context-click, long-press or Shift+F10).
 */
export function StoreCartLineItem({ line, currency: currencyProp, saved = false, compact = false, onQuantityChange, onRemove, onSaveForLater, onMoveToCart, onOpenProduct, sku, labels, className, ...props }: StoreCartLineItemProps) {
  const currency = useCurrency(currencyProp);
  const { t, n } = useStoreCartStrings(labels);
  const issue = cartStockIssue(line);
  const shownIssue = saved ? (issue?.kind === "out" ? issue : undefined) : issue;
  const out = issue?.kind === "out";
  const lineTotal = line.unitPrice * line.quantity;
  const compareTotal = line.compareAt && line.compareAt > line.unitPrice ? line.compareAt * line.quantity : undefined;

  const actions: ContextMenuAction[] = [
    ...(onOpenProduct ? [{ id: "view", label: t.viewProduct, icon: Eye, onSelect: onOpenProduct, group: "open" }] : []),
    ...(saved
      ? onMoveToCart
        ? [{ id: "move", label: t.moveToCart, icon: ShoppingBag, onSelect: onMoveToCart, disabled: out, group: "move" }]
        : []
      : onSaveForLater
        ? [{ id: "save", label: t.saveForLater, icon: Bookmark, onSelect: onSaveForLater, group: "move" }]
        : []),
    ...(onRemove ? [{ id: "remove", label: t.remove, icon: Trash2, onSelect: onRemove, danger: true, group: "remove" }] : []),
  ];

  const item = (
    <li data-slot="store-cart-line" data-saved={saved || undefined} data-stock={issue?.kind} className={cn("flex gap-3 py-4 sm:gap-4", className)} {...props}>
      <StoreImage src={line.image} alt={line.name} size={compact ? 64 : 88} className={cn(out && "opacity-60")} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-body font-medium text-foreground [overflow-wrap:anywhere]">{line.name}</p>
            {line.variantLabel ? <p className="text-caption text-muted-foreground">{line.variantLabel}</p> : null}
            {sku ? (
              <p className="text-caption text-muted-foreground">
                {t.sku} <bdi dir="ltr">{sku}</bdi>
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5 text-end">
            <StoreCartMoney amount={lineTotal} currency={currency} {...(compareTotal ? { compareAt: compareTotal } : {})} size="sm" />
            {line.quantity > 1 ? (
              <span className="text-caption text-muted-foreground">
                <StoreAmount amount={line.unitPrice} currency={currency} className="text-muted-foreground" /> {t.each}
              </span>
            ) : null}
          </div>
        </div>
        {shownIssue ? (
          <p data-slot="store-cart-stock" role="status" className={cn("flex items-center gap-1.5 text-caption", shownIssue.kind === "out" ? "text-nq-danger-text" : shownIssue.kind === "over" ? "text-nq-warning-text" : "text-muted-foreground")}>
            <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
            {shownIssue.kind === "out" ? t.outOfStock : shownIssue.kind === "over" ? t.overStock(n(shownIssue.available)) : t.lowStock(n(shownIssue.available))}
          </p>
        ) : null}
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          {saved ? null : onQuantityChange ? <StoreQuantityStepper value={line.quantity} {...(line.maxQuantity !== undefined ? { max: line.maxQuantity } : {})} onChange={onQuantityChange} name={line.name} {...(labels ? { labels } : {})} /> : (
            <span className="text-body-sm text-muted-foreground">
              {t.quantity} <Num value={line.quantity} />
            </span>
          )}
          <div className="ms-auto flex flex-wrap items-center gap-1">
            {saved && onMoveToCart ? (
              <Button variant="secondary" size="sm" disabled={out} onClick={onMoveToCart}>
                <ShoppingBag aria-hidden />
                {t.moveToCart}
              </Button>
            ) : null}
            {!saved && !compact && onSaveForLater ? (
              <Button variant="ghost" size="sm" onClick={onSaveForLater}>
                <Bookmark aria-hidden />
                {t.saveForLater}
              </Button>
            ) : null}
            {onRemove ? (
              compact ? (
                <Button variant="ghost" size="icon-sm" aria-label={t.removeLine(line.name)} onClick={onRemove}>
                  <Trash2 aria-hidden />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" aria-label={t.removeLine(line.name)} onClick={onRemove}>
                  <Trash2 aria-hidden />
                  {t.remove}
                </Button>
              )
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
  return <ContextMenuActions actions={actions} render={item} />;
}

/* ------------------------------------------------------------------ undo bar */

interface RemovedBarProps {
  removal: CartRemoval;
  onUndo: () => void;
  onDismiss?: () => void;
  labels?: StoreCartLabels;
  /** Milliseconds before the bar goes away by itself. Default 8000; 0 keeps it. */
  timeout?: number;
}

function RemovedBar({ removal, onUndo, onDismiss, labels, timeout = 8000 }: RemovedBarProps) {
  const { t } = useStoreCartStrings(labels);
  useEffect(() => {
    if (!onDismiss || !timeout) return;
    const id = window.setTimeout(onDismiss, timeout);
    return () => window.clearTimeout(id);
  }, [onDismiss, removal, timeout]);
  return (
    <div data-slot="store-cart-removed" className="flex items-center justify-between gap-3 rounded-control border border-border bg-secondary px-3 py-2 text-body-sm text-foreground">
      <span className="min-w-0 [overflow-wrap:anywhere]">{t.removedNotice(removal.line.name)}</span>
      <Button variant="link" size="sm" onClick={onUndo}>
        <Undo2 aria-hidden />
        {t.undo}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ free shipping */

export interface StoreFreeShippingBarProps extends Omit<ComponentProps<"div">, "children"> {
  /** Order value before shipping, minor units. */
  subtotal: number;
  /** Free shipping starts here, minor units. */
  threshold: number;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  labels?: StoreCartLabels;
}

/** "You are $500 away from free shipping" with a progress bar that turns green when it is unlocked. */
export function StoreFreeShippingBar({ subtotal, threshold, currency: currencyProp, labels, className, ...props }: StoreFreeShippingBarProps) {
  const currency = useCurrency(currencyProp);
  const { t, money } = useStoreCartStrings(labels);
  const { remaining, progress } = commerceFreeShippingProgress(subtotal, threshold);
  const unlocked = remaining === 0;
  return (
    <div data-slot="store-free-shipping" data-unlocked={unlocked || undefined} className={cn("flex flex-col gap-2", className)} {...props}>
      <p className="flex items-center gap-2 text-body-sm text-foreground">
        <Truck aria-hidden className={cn("size-4 shrink-0", unlocked ? "text-nq-success-text" : "text-muted-foreground")} />
        {unlocked ? t.freeUnlocked : t.awayFromFree(money(remaining, currency))}
      </p>
      <Progress aria-label={t.shippingProgress} value={Math.round(progress * 100)} tone={unlocked ? "success" : "default"} size="sm" />
    </div>
  );
}

/* ------------------------------------------------------------------ empty */

export interface StoreCartEmptyProps extends Omit<ComponentProps<"div">, "title"> {
  onContinueShopping?: () => void;
  labels?: StoreCartLabels;
}

export function StoreCartEmpty({ onContinueShopping, labels, ...props }: StoreCartEmptyProps) {
  const { t } = useStoreCartStrings(labels);
  return (
    <EmptyState
      data-slot="store-cart-empty"
      icon={ShoppingBag}
      title={t.emptyTitle}
      description={t.emptyDescription}
      actions={
        onContinueShopping ? (
          <Button variant="primary" onClick={onContinueShopping}>
            {t.emptyAction}
          </Button>
        ) : undefined
      }
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ mini cart */

export interface StoreMiniCartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All cart lines; saved-for-later ones are not shown. */
  lines: readonly CommerceCartLine[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Free shipping starts here, minor units. Leave out to hide the bar. */
  freeShippingThreshold?: number;
  onQuantityChange?: (lineId: string, quantity: number) => void;
  onRemove?: (lineId: string) => void;
  onCheckout?: () => void;
  onViewCart?: () => void;
  onContinueShopping?: () => void;
  /** From `useStoreCart`: the last removed line and its undo. */
  removed?: CartRemoval;
  onUndo?: () => void;
  onDismissRemoved?: () => void;
  /** The element that opens the drawer, usually a `StoreCartButton`. Rendered as the dialog trigger. */
  trigger?: ReactNode;
  labels?: StoreCartLabels;
}

/**
 * The cart drawer that slides in when something is added: lines with quantity and remove (with undo), the free-shipping
 * progress bar, the subtotal, and Checkout / View cart. It is a dialog: focus moves in, Escape closes, and focus returns
 * to the trigger. Checkout is off while a line is out of stock.
 */
export function StoreMiniCart({ open, onOpenChange, lines, currency: currencyProp, freeShippingThreshold, onQuantityChange, onRemove, onCheckout, onViewCart, onContinueShopping, removed, onUndo, onDismissRemoved, trigger, labels }: StoreMiniCartProps) {
  const currency = useCurrency(currencyProp);
  const { t, n } = useStoreCartStrings(labels);
  const active = cartActiveLines(lines);
  const totals = commerceTotals({ lines });
  const blocked = cartBlockers(lines).length > 0;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger render={trigger as ReactElement} /> : null}
      <SheetContent side="end" closeLabel={t.close} data-slot="store-mini-cart">
        <SheetHeader>
          <SheetTitle>
            {t.miniTitle}
            {active.length ? <span className="ms-2 text-body-sm font-normal text-muted-foreground">{t.items(n(totals.itemCount), totals.itemCount)}</span> : null}
          </SheetTitle>
          <SheetDescription>{t.miniDescription}</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-3">
          {removed && onUndo ? <RemovedBar removal={removed} onUndo={onUndo} {...(onDismissRemoved ? { onDismiss: onDismissRemoved } : {})} {...(labels ? { labels } : {})} /> : null}
          {active.length === 0 ? (
            <StoreCartEmpty {...(onContinueShopping ? { onContinueShopping: () => (onOpenChange(false), onContinueShopping()) } : {})} {...(labels ? { labels } : {})} className="border-0 px-0" />
          ) : (
            <>
              {freeShippingThreshold ? <StoreFreeShippingBar subtotal={totals.subtotal} threshold={freeShippingThreshold} currency={currency} {...(labels ? { labels } : {})} /> : null}
              <ul className="flex flex-col divide-y divide-border">
                {active.map((line) => (
                  <StoreCartLineItem
                    key={line.id}
                    line={line}
                    currency={currency}
                    compact
                    {...(onQuantityChange ? { onQuantityChange: (q: number) => onQuantityChange(line.id, q) } : {})}
                    {...(onRemove ? { onRemove: () => onRemove(line.id) } : {})}
                    {...(labels ? { labels } : {})}
                  />
                ))}
              </ul>
            </>
          )}
        </SheetBody>
        {active.length ? (
          <SheetFooter className="flex-col items-stretch gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-label text-foreground">{t.subtotal}</span>
              <StoreCartMoney amount={totals.subtotal} currency={currency} size="md" />
            </div>
            <p className="text-caption text-muted-foreground">{t.taxNote}</p>
            <Button variant="primary" size="lg" disabled={blocked} onClick={onCheckout}>
              {t.checkout}
            </Button>
            <Button variant="secondary" onClick={onViewCart}>
              {t.viewCart}
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ summary */

export interface StoreCartSummaryProps extends Omit<ComponentProps<"section">, "children"> {
  lines: readonly CommerceCartLine[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Promo discount, minor units. */
  discount?: number;
  /** The chosen shipping method; without one the row says it is worked out at checkout. */
  shipping?: CommerceShippingMethod;
  taxBps?: number;
  taxInclusive?: boolean;
  /** Renders the Checkout button. */
  onCheckout?: () => void;
  checkoutDisabled?: boolean;
  /** Extra content under the total, such as payment badges. */
  footer?: ReactNode;
  labels?: StoreCartLabels;
}

/** The order summary from `commerceTotals`: items, subtotal, promo discount, shipping, tax, total and "You are saving …". */
export function StoreCartSummary({ lines, currency: currencyProp, discount = 0, shipping, taxBps, taxInclusive, onCheckout, checkoutDisabled, footer, labels, className, ...props }: StoreCartSummaryProps) {
  const currency = useCurrency(currencyProp);
  const { t, n, money } = useStoreCartStrings(labels);
  const totals = commerceTotals({ lines, discount, ...(shipping ? { shipping } : {}), ...(taxBps ? { taxBps } : {}), ...(taxInclusive !== undefined ? { taxInclusive } : {}) });
  const titleId = useId();
  const Row = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
    <div className="flex items-baseline justify-between gap-3 text-body-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
  return (
    <section data-slot="store-cart-summary" aria-labelledby={titleId} className={cn("flex flex-col gap-4 rounded-card border border-border bg-card p-4", className)} {...props}>
      <h2 id={titleId} className="text-h3 font-semibold text-foreground">
        {t.summary}
      </h2>
      <dl className="flex flex-col gap-2">
        <Row label={t.itemsLine(n(totals.itemCount), totals.itemCount)}>
          <StoreAmount amount={totals.subtotal} currency={currency} />
        </Row>
        {totals.discount > 0 ? (
          <Row label={t.discount}>
            <span className="text-nq-success-text">
              <bdi dir="ltr">−</bdi>
              <StoreAmount amount={totals.discount} currency={currency} className="text-nq-success-text" />
            </span>
          </Row>
        ) : null}
        <Row label={t.shipping}>{shipping ? totals.shipping === 0 ? <span className="text-nq-success-text">{t.free}</span> : <StoreAmount amount={totals.shipping} currency={currency} /> : <span className="text-muted-foreground">{t.shippingLater}</span>}</Row>
        {totals.tax > 0 ? (
          <Row label={t.tax}>
            <StoreAmount amount={totals.tax} currency={currency} />
          </Row>
        ) : null}
      </dl>
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <span className="text-label text-foreground">{t.total}</span>
        <StoreCartMoney amount={totals.total} currency={currency} size="lg" />
      </div>
      {totals.savings > 0 ? (
        <Badge variant="success" className="w-fit">
          {t.saving(money(totals.savings, currency))}
        </Badge>
      ) : null}
      {onCheckout ? (
        <Button variant="primary" size="lg" disabled={checkoutDisabled || totals.itemCount === 0} onClick={onCheckout}>
          {t.checkout}
        </Button>
      ) : null}
      {footer}
    </section>
  );
}

/* ------------------------------------------------------------------ shipping estimator */

export interface StoreShippingSelection {
  city: string;
  zoneId: string;
  zoneLabel: string;
  method: CommerceShippingMethod;
}

export interface StoreShippingEstimatorProps extends Omit<ComponentProps<"section">, "children" | "onChange"> {
  zones: readonly StoreShippingZone[];
  /** Order value before shipping, minor units, for the free-shipping rule. */
  subtotal: number;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  value?: StoreShippingSelection | undefined;
  onChange?: (selection: StoreShippingSelection | undefined) => void;
  defaultCity?: string;
  labels?: StoreCartLabels;
}

function etaText(method: CommerceShippingMethod, t: ReturnType<typeof useStoreCartStrings>["t"], n: (v: number) => string) {
  if (!method.etaDays) return undefined;
  const [a, b] = method.etaDays;
  if (b <= 1 && a <= 1 && a !== b) return t.etaToday;
  return t.etaDays(n(a), n(b), a === b);
}

/**
 * Type a city, see the delivery options for it (matched in English or Arabic), and pick one. The picked method feeds
 * `StoreCartSummary`. Free-over thresholds show how much more to add.
 */
export function StoreShippingEstimator({ zones, subtotal, currency: currencyProp, value, onChange, defaultCity = "", labels, className, ...props }: StoreShippingEstimatorProps) {
  const currency = useCurrency(currencyProp);
  const { t, n, money } = useStoreCartStrings(labels);
  const [city, setCity] = useState(value?.city ?? defaultCity);
  const [searched, setSearched] = useState<string | null>(value?.city ?? null);
  const listId = useId();
  const titleId = useId();
  const zone = searched ? matchShippingZone(zones, searched) : undefined;
  const options: CartShippingOption[] = cartShippingOptions(zone, subtotal);

  const estimate = (event?: FormEvent) => {
    event?.preventDefault();
    const text = city.trim();
    if (!text) return;
    setSearched(text);
    const found = matchShippingZone(zones, text);
    const cheapest = cartCheapestShipping(cartShippingOptions(found, subtotal));
    if (found && cheapest) onChange?.({ city: text, zoneId: found.id, zoneLabel: found.label, method: cheapest.method });
    else onChange?.(undefined);
  };

  return (
    <section data-slot="store-shipping-estimator" aria-labelledby={titleId} className={cn("flex flex-col gap-3 rounded-card border border-border bg-card p-4", className)} {...props}>
      <h2 id={titleId} className="text-h3 font-semibold text-foreground">
        {t.estimateTitle}
      </h2>
      <form onSubmit={estimate} className="flex items-end gap-2">
        <Field className="min-w-0 flex-1">
          <FieldLabel>{t.city}</FieldLabel>
          <Input value={city} list={listId} placeholder={t.cityPlaceholder} autoComplete="address-level2" onChange={(event) => setCity(event.target.value)} />
        </Field>
        <datalist id={listId}>
          {zones.flatMap((z) => z.cities.map((c) => <option key={`${z.id}-${c}`} value={c} />))}
        </datalist>
        <Button type="submit" variant="secondary">
          {t.estimate}
        </Button>
      </form>
      <div aria-live="polite" className="flex flex-col gap-3">
        {searched && !zone ? (
          <p className="flex items-center gap-2 text-body-sm text-nq-warning-text">
            <CircleAlert aria-hidden className="size-4 shrink-0" />
            {t.noZone(searched)}
          </p>
        ) : null}
        {zone ? (
          <>
            <p className="text-caption text-muted-foreground">{t.zoneFound(zone.label)}</p>
            <RadioGroup
              aria-label={t.useShipping}
              value={value?.method.id ?? ""}
              onValueChange={(id) => {
                const picked = options.find((o) => o.method.id === id);
                if (picked && searched) onChange?.({ city: searched, zoneId: zone.id, zoneLabel: zone.label, method: picked.method });
              }}
            >
              {options.map((o) => (
                <RadioCard
                  key={o.method.id}
                  value={o.method.id}
                  title={o.method.label}
                  description={
                    <span className="flex flex-col gap-0.5">
                      {etaText(o.method, t, n) ? <span>{etaText(o.method, t, n)}</span> : null}
                      {!o.free && o.method.freeOver !== undefined ? <span>{o.remaining !== undefined && o.remaining > 0 ? t.addForFree(money(o.remaining, currency)) : t.freeOver(money(o.method.freeOver, currency))}</span> : null}
                    </span>
                  }
                  meta={o.free ? <span className="text-label text-nq-success-text">{t.free}</span> : <StoreAmount amount={o.cost} currency={currency} className="text-label" />}
                />
              ))}
            </RadioGroup>
          </>
        ) : null}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ cross sell */

export interface StoreCrossSellProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  products: readonly CommerceProduct[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Adds the product's first in-stock variant. Sold-out products have no Add button. */
  onAdd?: (product: CommerceProduct) => void;
  onOpenProduct?: (product: CommerceProduct) => void;
  title?: ReactNode;
  labels?: StoreCartLabels;
}

/** "You might also like": a carousel of product cards with a quick Add. Each card has a context menu with the same actions. */
export function StoreCrossSell({ products, currency: currencyProp, onAdd, onOpenProduct, title, labels, className, ...props }: StoreCrossSellProps) {
  const currency = useCurrency(currencyProp);
  const { t } = useStoreCartStrings(labels);
  const titleId = useId();
  if (products.length === 0) return null;
  return (
    <section data-slot="store-cross-sell" aria-labelledby={titleId} className={cn("flex flex-col gap-3", className)} {...props}>
      <h2 id={titleId} className="text-h3 font-semibold text-foreground">
        {title ?? t.crossSellTitle}
      </h2>
      <Carousel label={typeof title === "string" ? title : t.crossSellTitle} className="px-0" opts={{ dragFree: true }}>
        <CarouselContent className="-ms-4">
          {products.map((product) => {
            const buyable = !!cartItemFromProduct(product);
            const range = commercePriceRange(product);
            const actions: ContextMenuAction[] = [
              ...(onOpenProduct ? [{ id: "view", label: t.viewProduct, icon: Eye, onSelect: () => onOpenProduct(product) }] : []),
              ...(onAdd && buyable ? [{ id: "add", label: t.addNamed(product.name), icon: ShoppingBag, onSelect: () => onAdd(product) }] : []),
            ];
            const card = (
              <ProductCard
                layout="tile"
                artwork={<StoreImage fluid size={320} src={product.images[0]?.src} alt={product.images[0]?.alt ?? product.name} className="aspect-[4/3] rounded-card" />}
                name={product.name}
                {...(product.category ? { category: product.category } : {})}
                price={<StoreCartMoney amount={range.min} currency={currency} size="sm" />}
                action={
                  onAdd && buyable ? (
                    <Button variant="secondary" size="sm" aria-label={t.addNamed(product.name)} onClick={() => onAdd(product)}>
                      <Plus aria-hidden />
                      {t.add}
                    </Button>
                  ) : undefined
                }
                className="w-full"
              />
            );
            return (
              <CarouselItem key={product.id} className="basis-3/4 ps-4 sm:basis-1/2 lg:basis-1/3">
                <ContextMenuActions actions={actions} render={<div className="@container">{card}</div>} />
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious aria-label={t.crossSellPrev} />
        <CarouselNext aria-label={t.crossSellNext} />
      </Carousel>
    </section>
  );
}

/* ------------------------------------------------------------------ cart page */

export interface StoreCartPromo {
  applied?: PromoApplied | null;
  /** Local rules; the code is checked here, then `onApplied` is called. */
  promos?: readonly PromoLike[];
  /** Or check the code with your server. */
  onApply?: (code: string) => Promise<void | { error?: string }>;
  onApplied?: (applied: PromoApplied) => void;
  onRemove?: () => void;
  /** "YYYY-MM-DD" for the date rules. Default today. */
  today?: string;
  firstOrder?: boolean;
}

export interface StoreCartPageProps extends Omit<ComponentProps<"div">, "children"> {
  lines: readonly CommerceCartLine[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  onQuantityChange?: (lineId: string, quantity: number) => void;
  onRemove?: (lineId: string) => void;
  onSaveForLater?: (lineId: string) => void;
  onMoveToCart?: (lineId: string) => void;
  onOpenProduct?: (line: CommerceCartLine) => void;
  /** Brings over-stock quantities down to what is left. */
  onFixStock?: () => void;
  removed?: CartRemoval;
  onUndo?: () => void;
  onDismissRemoved?: () => void;
  /** Free shipping starts here, minor units. Leave out to hide the bar. */
  freeShippingThreshold?: number;
  /** Delivery zones for the estimator. Leave out to hide it. */
  zones?: readonly StoreShippingZone[];
  shippingSelection?: StoreShippingSelection | undefined;
  onShippingChange?: (selection: StoreShippingSelection | undefined) => void;
  /** Turns on the promo box (PromoCodeField). */
  promo?: StoreCartPromo;
  taxBps?: number;
  taxInclusive?: boolean;
  onCheckout?: () => void;
  onContinueShopping?: () => void;
  /** Slot under the lines: usually `<StoreCrossSell />`. */
  crossSell?: ReactNode;
  /** Slot in the summary column under the total: payment badges, a guarantee. */
  summaryFooter?: ReactNode;
  /** From `useStoreCart().message`, read out by the live region. */
  message?: StoreCartMessage;
  loading?: boolean;
  /** Something went wrong loading the cart. */
  error?: boolean;
  onRetry?: () => void;
  labels?: StoreCartLabels;
}

/**
 * The cart page: lines with a clamped quantity stepper, remove with undo, save for later and move back, stock warnings,
 * the free-shipping bar, a promo code, a shipping estimator, the summary with savings, a cross-sell slot, and empty,
 * loading and error states. Cart changes are announced through a polite live region.
 */
export function StoreCartPage({
  lines,
  currency: currencyProp,
  onQuantityChange,
  onRemove,
  onSaveForLater,
  onMoveToCart,
  onOpenProduct,
  onFixStock,
  removed,
  onUndo,
  onDismissRemoved,
  freeShippingThreshold,
  zones,
  shippingSelection,
  onShippingChange,
  promo,
  taxBps,
  taxInclusive,
  onCheckout,
  onContinueShopping,
  crossSell,
  summaryFooter,
  message,
  loading,
  error,
  onRetry,
  labels,
  className,
  ...props
}: StoreCartPageProps) {
  const currency = useCurrency(currencyProp);
  const { t, n } = useStoreCartStrings(labels);
  const [ownSelection, setOwnSelection] = useState<StoreShippingSelection | undefined>();
  const selection = onShippingChange ? shippingSelection : (shippingSelection ?? ownSelection);
  const changeSelection = (next: StoreShippingSelection | undefined) => (onShippingChange ? onShippingChange(next) : setOwnSelection(next));

  const active = cartActiveLines(lines);
  const saved = cartSavedLines(lines);
  const blockers = cartBlockers(lines);
  const discount = promo?.applied?.discount ?? 0;
  const totals = commerceTotals({ lines, discount, ...(selection ? { shipping: selection.method } : {}) });

  // Promo changes are announced too; the cart's own messages come from the hook.
  const [promoMessage, setPromoMessage] = useState<StoreCartMessage>({ id: 0, text: "" });
  const lastCode = useRef(promo?.applied?.code);
  const code = promo?.applied?.code;
  useEffect(() => {
    if (lastCode.current === code) return;
    setPromoMessage((m) => ({ id: m.id + 1, text: code ? t.live.promoApplied(code) : t.live.promoRemoved(lastCode.current ?? "") }));
    lastCode.current = code;
  }, [code, t]);

  const titleId = useId();
  const header = (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h1 id={titleId} className="text-h1 font-semibold tracking-tight text-foreground">
        {t.cart}
        {active.length ? <span className="ms-2 text-body font-normal text-muted-foreground">{t.items(n(totals.itemCount), totals.itemCount)}</span> : null}
      </h1>
      {onContinueShopping && active.length ? (
        <Button variant="link" onClick={onContinueShopping}>
          {t.continueShopping}
        </Button>
      ) : null}
    </div>
  );

  let body: ReactNode;
  if (error) {
    body = <ErrorState title={t.errorTitle} description={t.errorDescription} actions={onRetry ? <Button variant="primary" onClick={onRetry}>{t.retry}</Button> : undefined} />;
  } else if (loading) {
    body = (
      <div role="status" aria-busy="true" aria-label={t.loading} className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4 py-2">
            <Skeleton className="size-22 shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="mt-2 h-8 w-28" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (active.length === 0 && saved.length === 0) {
    body = <StoreCartEmpty {...(onContinueShopping ? { onContinueShopping } : {})} {...(labels ? { labels } : {})} />;
  } else {
    body = (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {blockers.length ? (
            <Alert
              tone="warning"
              title={t.attentionTitle}
              action={
                onFixStock && blockers.some((l) => l.maxQuantity !== undefined && l.maxQuantity > 0) ? (
                  <Button size="sm" variant="secondary" onClick={onFixStock}>
                    {t.fixStock}
                  </Button>
                ) : undefined
              }
            >
              {t.attentionBody}
            </Alert>
          ) : null}
          {freeShippingThreshold && active.length ? <StoreFreeShippingBar subtotal={totals.subtotal} threshold={freeShippingThreshold} currency={currency} {...(labels ? { labels } : {})} className="rounded-card border border-border bg-card p-4" /> : null}
          {removed && onUndo ? <RemovedBar removal={removed} onUndo={onUndo} {...(onDismissRemoved ? { onDismiss: onDismissRemoved } : {})} {...(labels ? { labels } : {})} /> : null}
          {active.length ? (
            <ul aria-label={t.cart} className="flex flex-col divide-y divide-border border-y border-border">
              {active.map((line) => (
                <StoreCartLineItem
                  key={line.id}
                  line={line}
                  currency={currency}
                  {...(onQuantityChange ? { onQuantityChange: (q: number) => onQuantityChange(line.id, q) } : {})}
                  {...(onRemove ? { onRemove: () => onRemove(line.id) } : {})}
                  {...(onSaveForLater ? { onSaveForLater: () => onSaveForLater(line.id) } : {})}
                  {...(onOpenProduct ? { onOpenProduct: () => onOpenProduct(line) } : {})}
                  {...(labels ? { labels } : {})}
                />
              ))}
            </ul>
          ) : (
            <StoreCartEmpty {...(onContinueShopping ? { onContinueShopping } : {})} {...(labels ? { labels } : {})} />
          )}
          {saved.length ? (
            <section aria-labelledby={`${titleId}-saved`} className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <h2 id={`${titleId}-saved`} className="text-h3 font-semibold text-foreground">
                  {t.savedTitle(n(saved.length))}
                </h2>
                <p className="text-caption text-muted-foreground">{t.savedHint}</p>
              </div>
              <ul className="flex flex-col divide-y divide-border border-y border-border">
                {saved.map((line) => (
                  <StoreCartLineItem
                    key={line.id}
                    line={line}
                    currency={currency}
                    saved
                    {...(onMoveToCart ? { onMoveToCart: () => onMoveToCart(line.id) } : {})}
                    {...(onRemove ? { onRemove: () => onRemove(line.id) } : {})}
                    {...(onOpenProduct ? { onOpenProduct: () => onOpenProduct(line) } : {})}
                    {...(labels ? { labels } : {})}
                  />
                ))}
              </ul>
            </section>
          ) : null}
          {crossSell}
        </div>
        {active.length ? (
          <aside aria-label={t.summary} className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
            <StoreCartSummary lines={lines} currency={currency} discount={discount} {...(selection ? { shipping: selection.method } : {})} {...(taxBps ? { taxBps } : {})} {...(taxInclusive !== undefined ? { taxInclusive } : {})} {...(onCheckout ? { onCheckout } : {})} checkoutDisabled={blockers.length > 0} footer={summaryFooter} {...(labels ? { labels } : {})} />
            {promo ? (
              <section aria-label={t.promoTitle} className="rounded-card border border-border bg-card p-4">
                <PromoCodeField
                  currency={currency}
                  applied={promo.applied ?? null}
                  {...(promo.promos ? { promos: promo.promos } : {})}
                  context={{ subtotal: totals.subtotal, today: promo.today ?? new Date().toISOString().slice(0, 10), ...(promo.firstOrder !== undefined ? { firstOrder: promo.firstOrder } : {}) }}
                  {...(promo.onApply ? { onApply: promo.onApply } : {})}
                  {...(promo.onApplied ? { onApplied: promo.onApplied } : {})}
                  {...(promo.onRemove ? { onRemove: promo.onRemove } : {})}
                />
              </section>
            ) : null}
            {zones?.length ? <StoreShippingEstimator zones={zones} subtotal={totals.subtotal - discount} currency={currency} value={selection} onChange={changeSelection} {...(labels ? { labels } : {})} /> : null}
          </aside>
        ) : null}
      </div>
    );
  }

  return (
    <div data-slot="store-cart-page" className={cn("mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6", className)} {...props}>
      {message ? <StoreCartAnnouncer message={message} /> : null}
      <StoreCartAnnouncer message={promoMessage} />
      {header}
      {body}
    </div>
  );
}
