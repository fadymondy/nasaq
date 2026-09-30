"use client";

import { Banknote, CheckCircle2, Clock, CreditCard, Lock, Minus, Pause, Plus, ScanBarcode, ShoppingBasket, Trash2, Wallet as WalletIcon, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { ContextMenuActions } from "../context-menu";
import { CurrencyInput } from "../currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Input } from "../field";
import { LineItemActionsMenu, LineItemMoney } from "../line-item-editor/line-item-fields";
import { computeLineItems, type LineItemTotals, type LineTaxMode } from "../line-item-editor/line-item-math";
import { EmptyState } from "../states";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  type PosDrawerSummary,
  type PosPaymentMethod,
  type PosTender,
  posCanAddTender,
  posDrawerSummary,
  posQuickTenders,
  posRoundMinor,
  posSaleParts,
  posSettle,
  posTenderLimit,
  posVariance,
} from "./pos-math";

export {
  posCanAddTender,
  posChange,
  posDrawerSummary,
  posQuickTenders,
  posRemaining,
  posRoundMinor,
  posSaleParts,
  posSettle,
  posTenderLimit,
  posVariance,
  type PosDrawerSale,
  type PosDrawerSummary,
  type PosPaymentMethod,
  type PosSettlement,
  type PosTender,
} from "./pos-math";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    search: "Search or scan",
    searchHint: "Type a name, or scan a barcode and press Enter",
    all: "All",
    noProducts: "No products match",
    noProductsText: "Clear the search or pick another category.",
    left: "left",
    outOfStock: "Out of stock",
    basket: "Basket",
    walkIn: "Walk-in customer",
    emptyBasket: "The basket is empty",
    emptyBasketText: "Tap a product to add it.",
    increase: "Add one",
    decrease: "Remove one",
    remove: "Remove line",
    lineActions: "Line actions",
    clear: "Clear basket",
    subtotal: "Subtotal",
    discount: "Discounts",
    tax: "Tax",
    total: "Total",
    charge: "Charge",
    items: "items",
    sessionOpen: "Register open",
    sessionSince: "since",
    drawer: "Cash drawer",
    closedTitle: "The register is closed",
    closedText: "Count the cash in the drawer and open a session to start selling.",
    openingFloat: "Opening float",
    openRegister: "Open register",
    closeRegister: "Close register",
    closeText: "Count the cash in the drawer. The difference from what the sales say should be there is recorded.",
    floatRow: "Opening float",
    cashSales: "Cash sales",
    cardSales: "Card sales",
    walletSales: "Wallet sales",
    salesCount: "Sales",
    expectedCash: "Expected in drawer",
    countedCash: "Counted cash",
    variance: "Difference",
    exact: "The drawer balances",
    short: "Short",
    over: "Over",
    payTitle: "Take payment",
    payText: "Walk-in sale",
    method: "Payment method",
    cash: "Cash",
    card: "Card",
    wallet: "Wallet",
    tendered: "Cash received",
    exactAmount: "Exact",
    change: "Change due",
    confirm: "Confirm payment",
    cancel: "Cancel",
    saleDone: "Sale complete",
    receiptNo: "Receipt",
    newSale: "New sale",
    paid: "Paid",
    cashier: "Cashier",
    failed: "The payment did not go through. Nothing was charged.",
    qty: "Quantity",
    hold: "Hold sale",
    parked: "Parked sales",
    holdTitle: "Hold this sale",
    holdText: "Park the basket to serve someone else. Resume it any time.",
    note: "Note (optional)",
    notePlaceholder: "A name or a table",
    park: "Park sale",
    noParked: "Nothing on hold",
    noParkedText: "Sales you hold appear here.",
    resume: "Resume",
    discard: "Discard",
    discardTitle: "Discard this parked sale?",
    discardText: "Its items are removed and cannot be brought back.",
    resumeTitle: "Replace the current basket?",
    resumeText: "The basket has items. Resuming replaces them with the parked sale.",
    close: "Close",
    payments: "Payments",
    amount: "Amount",
    addPayment: "Add payment",
    removePayment: "Remove payment",
    remaining: "Remaining",
    overpay: "Card and wallet cannot be more than the remaining amount.",
    paidInFull: "Paid in full",
  },
  ar: {
    search: "بحث أو مسح",
    searchHint: "اكتب اسمًا، أو امسح الباركود واضغط Enter",
    all: "الكل",
    noProducts: "لا توجد منتجات مطابقة",
    noProductsText: "امسح البحث أو اختر فئة أخرى.",
    left: "متبقي",
    outOfStock: "نفد المخزون",
    basket: "السلة",
    walkIn: "عميل عابر",
    emptyBasket: "السلة فارغة",
    emptyBasketText: "المس منتجًا لإضافته.",
    increase: "إضافة واحدة",
    decrease: "إزالة واحدة",
    remove: "حذف البند",
    lineActions: "إجراءات البند",
    clear: "تفريغ السلة",
    subtotal: "المجموع الفرعي",
    discount: "الخصومات",
    tax: "الضريبة",
    total: "الإجمالي",
    charge: "الدفع",
    items: "أصناف",
    sessionOpen: "الصندوق مفتوح",
    sessionSince: "منذ",
    drawer: "درج النقد",
    closedTitle: "الصندوق مغلق",
    closedText: "عُدّ النقد في الدرج وافتح جلسة لبدء البيع.",
    openingFloat: "رصيد الافتتاح",
    openRegister: "فتح الصندوق",
    closeRegister: "إغلاق الصندوق",
    closeText: "عُدّ النقد في الدرج. يُسجَّل الفرق عن المبلغ المتوقع من المبيعات.",
    floatRow: "رصيد الافتتاح",
    cashSales: "مبيعات نقدية",
    cardSales: "مبيعات بالبطاقة",
    walletSales: "مبيعات بالمحفظة",
    salesCount: "عدد المبيعات",
    expectedCash: "المتوقع في الدرج",
    countedCash: "النقد المعدود",
    variance: "الفرق",
    exact: "الدرج متطابق",
    short: "عجز",
    over: "زيادة",
    payTitle: "استلام الدفع",
    payText: "بيع لعميل عابر",
    method: "طريقة الدفع",
    cash: "نقدًا",
    card: "بطاقة",
    wallet: "محفظة",
    tendered: "النقد المستلم",
    exactAmount: "المبلغ بالضبط",
    change: "الباقي للعميل",
    confirm: "تأكيد الدفع",
    cancel: "إلغاء",
    saleDone: "تمت العملية",
    receiptNo: "الإيصال",
    newSale: "عملية جديدة",
    paid: "المدفوع",
    cashier: "الكاشير",
    failed: "لم تتم عملية الدفع. لم يُخصم أي مبلغ.",
    qty: "الكمية",
    hold: "تعليق العملية",
    parked: "المبيعات المعلّقة",
    holdTitle: "تعليق هذه العملية",
    holdText: "علّق السلة لخدمة عميل آخر، واستأنفها في أي وقت.",
    note: "ملاحظة (اختياري)",
    notePlaceholder: "اسم أو رقم طاولة",
    park: "تعليق",
    noParked: "لا توجد عمليات معلّقة",
    noParkedText: "تظهر هنا العمليات التي تعلّقها.",
    resume: "استئناف",
    discard: "حذف",
    discardTitle: "حذف هذه العملية المعلّقة؟",
    discardText: "تُحذف أصنافها ولا يمكن استرجاعها.",
    resumeTitle: "استبدال السلة الحالية؟",
    resumeText: "السلة تحتوي أصنافًا. الاستئناف يستبدلها بالعملية المعلّقة.",
    close: "إغلاق",
    payments: "الدفعات",
    amount: "المبلغ",
    addPayment: "إضافة دفعة",
    removePayment: "حذف الدفعة",
    remaining: "المتبقي",
    overpay: "لا يمكن أن تزيد البطاقة أو المحفظة عن المبلغ المتبقي.",
    paidInFull: "تم السداد بالكامل",
  },
} as const;

type Strings = { [K in keyof (typeof STRINGS)["en"]]: string };
export type PosRegisterLabels = Partial<Strings>;

/* ------------------------------------------------------------------ types */

export interface PosProduct {
  id: string;
  name: string;
  sku?: string;
  /** Matched exactly when the search box gets Enter (a scanner types the code then Enter). */
  barcode?: string;
  /** Minor units. */
  price: number;
  /** Basis points. Falls back to `defaultTaxBps`. */
  taxBps?: number;
  category?: string;
  /** Units on hand. The tile is disabled once the basket holds them all. Leave it out for unlimited. */
  stock?: number;
  /** A picture or a glyph for the tile. */
  artwork?: ReactNode;
}

export interface PosCategory {
  id: string;
  label: string;
}

export interface PosBasketLine {
  id: string;
  productId: string;
  name: string;
  /** A whole number of units. */
  quantity: number;
  /** Minor units. */
  unitPrice: number;
  taxBps?: number;
}

export interface PosSession {
  id: string;
  cashier: string;
  /** ISO date-time. */
  openedAt: string;
  /** Cash put in the drawer at the start, in minor units. */
  openingFloat: number;
}

export interface PosSale {
  id: string;
  number: string;
  /** ISO date-time. */
  at: string;
  cashier: string;
  lines: PosBasketLine[];
  totals: LineItemTotals;
  /** The one method used, or "split" when the sale was paid with more than one tender. */
  method: PosPaymentMethod | "split";
  /** Everything handed over: the cash given, or the total for card and wallet. Across all tenders for a split. */
  tendered: number;
  change: number;
  /** Every tender, in the order taken. Cash tenders hold what was handed over, before change. */
  tenders: PosTender[];
  /** Always null: the register sells to walk-in customers. */
  customerId: null;
}

/** A sale as passed back in through `defaultSales`. `tenders` may be missing on sales saved before split payments. */
export type PosSaleRecord = Omit<PosSale, "tenders"> & { tenders?: PosTender[] };

/** A basket put on hold. */
export interface PosParkedSale {
  id: string;
  /** ISO date-time it was parked. */
  at: string;
  cashier: string;
  note?: string;
  lines: PosBasketLine[];
  totals: LineItemTotals;
}

export interface PosCloseReport extends PosDrawerSummary {
  session: PosSession;
  counted: number;
  variance: number;
  closedAt: string;
}

export interface PosRegisterProps extends Omit<ComponentProps<"section">, "children" | "defaultValue"> {
  products: readonly PosProduct[];
  categories?: readonly PosCategory[];
  /** ISO 4217 code. Default "USD". */
  currency?: string;
  taxMode?: LineTaxMode;
  defaultTaxBps?: number;
  /** The open cash-drawer session. `null` shows the closed register. Leave undefined to let the register hold it. */
  session?: PosSession | null;
  defaultSession?: PosSession | null;
  /** Called with the new session when someone opens the register, and null when they close it. */
  onSessionChange?: (session: PosSession | null) => void;
  /** Who is at the till. Used when the register opens a session. */
  cashier?: string;
  /** Sales already made in the session, so the drawer count is right after a reload. */
  defaultSales?: readonly PosSaleRecord[];
  /** Sales on hold. Pass it to control the list; leave it undefined to let the register hold it. */
  parkedSales?: readonly PosParkedSale[];
  defaultParkedSales?: readonly PosParkedSale[];
  /** Called with the new list whenever a sale is parked, resumed or discarded. */
  onParkedSalesChange?: (sales: PosParkedSale[]) => void;
  /** Called after the basket is parked. */
  onPark?: (sale: PosParkedSale) => void;
  /** Called after a parked sale is put back in the basket. */
  onResume?: (sale: PosParkedSale) => void;
  /** Called with the finished sale, `tenders` filled in. Throw to show that the payment failed; nothing is recorded. */
  onCheckout?: (sale: PosSale) => void | Promise<void>;
  onCloseRegister?: (report: PosCloseReport) => void | Promise<void>;
  labels?: PosRegisterLabels;
}

export function usePosRegisterStrings(labels?: PosRegisterLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as Strings, ar, locale };
}

/* ------------------------------------------------------------------ pieces */

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

const METHOD_ICON = { cash: Banknote, card: CreditCard, wallet: WalletIcon } as const;

function Row({ label, children, strong }: { label: ReactNode; children: ReactNode; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", strong ? "text-label text-foreground" : "text-body-sm text-muted-foreground")}>
      <dt>{label}</dt>
      <dd className={cn("tabular-nums", strong && "text-h3")}>{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ component */

/**
 * A touch point-of-sale register: a product grid, a basket, a cash-drawer session and a checkout for walk-in customers.
 * Money is integer minor units end to end. It records nothing itself: `onCheckout` and `onCloseRegister` do.
 */
export function PosRegister({
  products,
  categories = [],
  currency = "USD",
  taxMode = "exclusive",
  defaultTaxBps = 0,
  session: sessionProp,
  defaultSession = null,
  onSessionChange,
  cashier = "",
  defaultSales = [],
  parkedSales: parkedProp,
  defaultParkedSales = [],
  onParkedSalesChange,
  onPark,
  onResume,
  onCheckout,
  onCloseRegister,
  labels,
  className,
  ...props
}: PosRegisterProps) {
  const { t, locale } = usePosRegisterStrings(labels);
  const [innerSession, setInnerSession] = useState<PosSession | null>(defaultSession);
  const session = sessionProp !== undefined ? sessionProp : innerSession;
  const [sales, setSales] = useState<PosSaleRecord[]>([...defaultSales]);
  const [innerParked, setInnerParked] = useState<PosParkedSale[]>([...defaultParkedSales]);
  const parked = parkedProp !== undefined ? parkedProp : innerParked;
  const [holding, setHolding] = useState(false);
  const [parkedOpen, setParkedOpen] = useState(false);
  const [basket, setBasket] = useState<PosBasketLine[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [floatMinor, setFloatMinor] = useState<number | null>(0);
  const [paying, setPaying] = useState(false);
  const [closing, setClosing] = useState(false);
  const [done, setDone] = useState<PosSale | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const setSession = (s: PosSession | null) => {
    setInnerSession(s);
    onSessionChange?.(s);
  };

  const totals = useMemo(
    () => computeLineItems(basket.map((l) => ({ id: l.id, quantity: l.quantity, unitPrice: l.unitPrice, taxBps: l.taxBps })), { taxMode, defaultTaxBps }),
    [basket, taxMode, defaultTaxBps],
  );
  const itemCount = basket.reduce((n, l) => n + l.quantity, 0);
  const inBasket = (productId: string) => basket.filter((l) => l.productId === productId).reduce((n, l) => n + l.quantity, 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (category === "all" || p.category === category) && (!q || p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode === q));
  }, [products, category, query]);

  const available = (p: PosProduct) => (p.stock === undefined ? Infinity : p.stock - inBasket(p.id));

  const add = (p: PosProduct) => {
    if (available(p) <= 0) return;
    setBasket((lines) => {
      const found = lines.find((l) => l.productId === p.id);
      if (found) return lines.map((l) => (l === found ? { ...l, quantity: l.quantity + 1 } : l));
      return [...lines, { id: uid("pos"), productId: p.id, name: p.name, quantity: 1, unitPrice: p.price, taxBps: p.taxBps }];
    });
  };
  const bump = (id: string, by: number) =>
    setBasket((lines) => lines.flatMap((l) => (l.id !== id ? [l] : l.quantity + by <= 0 ? [] : [{ ...l, quantity: l.quantity + by }])));
  const canBump = (l: PosBasketLine) => {
    const p = products.find((x) => x.id === l.productId);
    return !p || available(p) > 0;
  };

  const scan = (code: string) => {
    const c = code.trim().toLowerCase();
    if (!c) return;
    const hit = products.find((p) => p.barcode === code.trim() || p.sku?.toLowerCase() === c) ?? (visible.length === 1 ? visible[0] : undefined);
    if (hit) {
      add(hit);
      setQuery("");
    }
  };

  const setParked = (next: PosParkedSale[]) => {
    if (parkedProp === undefined) setInnerParked(next);
    onParkedSalesChange?.(next);
  };
  const park = (note: string) => {
    const sale: PosParkedSale = { id: uid("parked"), at: new Date().toISOString(), cashier: session?.cashier ?? cashier, ...(note ? { note } : {}), lines: basket, totals };
    setParked([...parked, sale]);
    setBasket([]);
    onPark?.(sale);
  };
  const resume = (sale: PosParkedSale) => {
    setParked(parked.filter((p) => p.id !== sale.id));
    setBasket(sale.lines);
    onResume?.(sale);
  };
  const discard = (sale: PosParkedSale) => setParked(parked.filter((p) => p.id !== sale.id));

  const drawer = useMemo(
    () =>
      posDrawerSummary(
        session?.openingFloat ?? 0,
        sales.map((s) => ({ method: s.method === "split" ? "cash" : s.method, total: s.totals.total, parts: s.tenders ? posSaleParts(s.totals.total, s.tenders) : undefined })),
      ),
    [session, sales],
  );

  const time = (iso: string) => new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(new Date(iso));

  /* -------------------------------------------------------------- closed */
  if (!session) {
    return (
      <section data-slot="pos-register" data-state="closed" className={cn("@container flex w-full flex-col gap-4", className)} {...props}>
        <EmptyState icon={Lock} title={t.closedTitle} description={t.closedText}>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-start text-label text-foreground">
              {t.openingFloat}
              <CurrencyInput value={floatMinor} currency={currency} min={0} onValueChange={setFloatMinor} aria-label={t.openingFloat} />
            </label>
            <Button
              variant="primary"
              size="lg"
              disabled={floatMinor === null}
              onClick={() => {
                setSales([]);
                setBasket([]);
                setSession({ id: uid("session"), cashier, openedAt: new Date().toISOString(), openingFloat: floatMinor ?? 0 });
              }}
            >
              {t.openRegister}
            </Button>
          </div>
        </EmptyState>
      </section>
    );
  }

  /* -------------------------------------------------------------- open */
  return (
    <section data-slot="pos-register" data-state="open" className={cn("@container flex w-full flex-col gap-4", className)} {...props}>
      <header className="flex flex-wrap items-center gap-2">
        <Badge variant="success">{t.sessionOpen}</Badge>
        <span className="text-body-sm text-muted-foreground">
          {session.cashier ? `${session.cashier} · ` : ""}
          {t.sessionSince} <bdi>{time(session.openedAt)}</bdi>
        </span>
        <Button variant="secondary" size="sm" className="ms-auto" onClick={() => setParkedOpen(true)}>
          <Clock aria-hidden />
          {t.parked}
          {parked.length ? (
            <Badge variant="neutral">
              <bdi>{parked.length}</bdi>
            </Badge>
          ) : null}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setClosing(true)}>
          <Banknote aria-hidden />
          {t.drawer}
        </Button>
      </header>

      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_22rem] @3xl:items-start">
        {/* products */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="relative">
            <ScanBarcode aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  scan(query);
                }
              }}
              placeholder={t.search}
              aria-label={t.search}
              title={t.searchHint}
              autoComplete="off"
              className="ps-9"
            />
          </div>
          {categories.length ? (
            <div role="group" aria-label={t.all} className="flex gap-2 overflow-x-auto pb-1">
              {[{ id: "all", label: t.all }, ...categories].map((c) => (
                <Button key={c.id} size="sm" variant={category === c.id ? "primary" : "secondary"} aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className="shrink-0">
                  {c.label}
                </Button>
              ))}
            </div>
          ) : null}
          {visible.length === 0 ? (
            <EmptyState title={t.noProducts} description={t.noProductsText} />
          ) : (
            <ul className="grid grid-cols-2 gap-2 @lg:grid-cols-3 @5xl:grid-cols-4">
              {visible.map((p) => {
                const left = available(p);
                const out = left <= 0;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={out}
                      onClick={() => add(p)}
                      className="flex min-h-24 w-full touch-manipulation flex-col items-start justify-between gap-2 rounded-floating border border-border bg-card p-3 text-start transition-colors hover:bg-nq-hover active:bg-nq-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex w-full items-start gap-2">
                        {p.artwork ? <span aria-hidden>{p.artwork}</span> : null}
                        <span className="line-clamp-2 text-label text-foreground">{p.name}</span>
                      </span>
                      <span className="flex w-full items-end justify-between gap-2">
                        <LineItemMoney minor={p.price} currency={currency} className="text-body-sm text-foreground" />
                        {out ? (
                          <Badge variant="danger">{t.outOfStock}</Badge>
                        ) : p.stock !== undefined && left <= 10 ? (
                          <Badge variant="warning">
                            <bdi>{left}</bdi> {t.left}
                          </Badge>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* basket */}
        <aside aria-label={t.basket} className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-3 @3xl:sticky @3xl:top-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-h3 text-foreground">
              <ShoppingBasket aria-hidden className="size-4" />
              {t.basket}
              {itemCount ? <Badge variant="neutral"><bdi>{itemCount}</bdi></Badge> : null}
            </h2>
            <span className="text-caption text-muted-foreground">{t.walkIn}</span>
          </div>
          {basket.length === 0 ? (
            <EmptyState title={t.emptyBasket} description={t.emptyBasketText} className="py-8" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {basket.map((l) => {
                const r = totals.lines.find((x) => x.id === l.id);
                const actions = [
                  { id: "inc", label: t.increase, icon: Plus, onSelect: () => bump(l.id, 1), disabled: !canBump(l), group: "qty" },
                  { id: "dec", label: t.decrease, icon: Minus, onSelect: () => bump(l.id, -1), group: "qty" },
                  { id: "remove", label: t.remove, icon: Trash2, danger: true, onSelect: () => bump(l.id, -l.quantity), group: "danger" },
                ];
                return (
                  <ContextMenuActions key={l.id} actions={actions} render={<li data-slot="pos-line" className="flex flex-col gap-2 py-2.5" />}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-label text-foreground">{l.name}</span>
                      <LineItemMoney minor={r?.total ?? 0} currency={currency} className="text-label text-foreground" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="secondary" size="icon" aria-label={`${t.decrease}, ${l.name}`} onClick={() => bump(l.id, -1)}>
                        <Minus aria-hidden />
                      </Button>
                      <output aria-label={`${t.qty}, ${l.name}`} className="min-w-10 text-center text-label tabular-nums">
                        {l.quantity}
                      </output>
                      <Button variant="secondary" size="icon" aria-label={`${t.increase}, ${l.name}`} disabled={!canBump(l)} onClick={() => bump(l.id, 1)}>
                        <Plus aria-hidden />
                      </Button>
                      <span className="ms-2 text-caption text-muted-foreground">
                        <LineItemMoney minor={l.unitPrice} currency={currency} />
                      </span>
                      <LineItemActionsMenu className="ms-auto" actions={actions} label={`${t.lineActions}, ${l.name}`} />
                    </div>
                  </ContextMenuActions>
                );
              })}
            </ul>
          )}
          <dl className="flex flex-col gap-1.5 border-t border-border pt-3">
            <Row label={t.subtotal}>
              <LineItemMoney minor={totals.subtotal} currency={currency} />
            </Row>
            {totals.discountTotal ? (
              <Row label={t.discount}>
                <LineItemMoney minor={-totals.discountTotal} currency={currency} />
              </Row>
            ) : null}
            <Row label={t.tax}>
              <LineItemMoney minor={totals.taxTotal} currency={currency} />
            </Row>
            <Row label={t.total} strong>
              <LineItemMoney minor={totals.total} currency={currency} />
            </Row>
          </dl>
          <div className="flex gap-2">
            <Button variant="primary" size="lg" className="flex-1" disabled={basket.length === 0} onClick={() => setPaying(true)}>
              {t.charge} <LineItemMoney minor={totals.total} currency={currency} />
            </Button>
            <Button variant="secondary" size="lg" disabled={basket.length === 0} onClick={() => setHolding(true)} aria-label={t.hold} title={t.hold}>
              <Pause aria-hidden />
            </Button>
            <Button variant="secondary" size="lg" disabled={basket.length === 0} onClick={() => setBasket([])} aria-label={t.clear} title={t.clear}>
              <Trash2 aria-hidden />
            </Button>
          </div>
        </aside>
      </div>

      {basket.length ? (
        <div className="sticky bottom-2 z-10 flex items-center gap-3 rounded-card border border-border bg-card p-2 shadow-md @3xl:hidden">
          <span className="ps-2 text-body-sm text-muted-foreground">
            <bdi>{itemCount}</bdi> {t.items}
          </span>
          <Button variant="secondary" size="lg" className="ms-auto" onClick={() => setHolding(true)} aria-label={t.hold} title={t.hold}>
            <Pause aria-hidden />
          </Button>
          <Button variant="primary" size="lg" onClick={() => setPaying(true)}>
            {t.charge} <LineItemMoney minor={totals.total} currency={currency} />
          </Button>
        </div>
      ) : null}

      <HoldDialog
        open={holding}
        onOpenChange={setHolding}
        t={t}
        onPark={(note) => {
          park(note);
          setHolding(false);
          searchRef.current?.focus();
        }}
      />

      <ParkedDialog
        open={parkedOpen}
        onOpenChange={setParkedOpen}
        parked={parked}
        basketHasItems={basket.length > 0}
        currency={currency}
        time={time}
        t={t}
        onResume={(sale) => {
          resume(sale);
          setParkedOpen(false);
        }}
        onDiscard={discard}
      />

      <PayDialog
        open={paying}
        onOpenChange={(o) => {
          setPaying(o);
          if (!o) setDone(null);
        }}
        done={done}
        currency={currency}
        totals={totals}
        t={t}
        onPay={async (tenders) => {
          const settled = posSettle(totals.total, tenders);
          const sale: PosSale = {
            id: uid("sale"),
            number: `POS-${String(1001 + sales.length)}`,
            at: new Date().toISOString(),
            cashier: session.cashier,
            lines: basket,
            totals,
            method: tenders.length === 1 && tenders[0] ? tenders[0].method : "split",
            tendered: settled.paid,
            change: settled.change,
            tenders,
            customerId: null,
          };
          await onCheckout?.(sale);
          setSales((s) => [...s, sale]);
          setBasket([]);
          setDone(sale);
        }}
        onNew={() => {
          setPaying(false);
          setDone(null);
          searchRef.current?.focus();
        }}
      />

      <CloseDialog
        open={closing}
        onOpenChange={setClosing}
        currency={currency}
        drawer={drawer}
        t={t}
        onClose={async (counted) => {
          await onCloseRegister?.({ ...drawer, session, counted, variance: posVariance(drawer.expectedCash, counted), closedAt: new Date().toISOString() });
          setClosing(false);
          setBasket([]);
          setSession(null);
        }}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ checkout */

function PayDialog({
  open,
  onOpenChange,
  done,
  currency,
  totals,
  t,
  onPay,
  onNew,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  done: PosSale | null;
  currency: string;
  totals: LineItemTotals;
  t: Strings;
  onPay: (tenders: PosTender[]) => Promise<void>;
  onNew: () => void;
}) {
  const [method, setMethod] = useState<PosPaymentMethod>("cash");
  const [amount, setAmount] = useState<number | null>(null);
  const [tenders, setTenders] = useState<PosTender[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const due = done ? done.totals.total : totals.total;

  useEffect(() => {
    if (open && !done) {
      setTenders([]);
      setAmount(null);
      setMethod("cash");
      setError(false);
    }
  }, [open, done]);

  const base = posSettle(due, tenders);
  /* On a first tender, card and wallet left empty mean "the whole sale", so a single card payment is one tap. After that, and for cash, empty means nothing yet. */
  const entered = amount === null ? (method === "cash" || tenders.length > 0 ? 0 : base.remaining) : posRoundMinor(amount);
  const limit = posTenderLimit(due, tenders, method);
  const over = amount !== null && entered > limit;
  const canAdd = posCanAddTender(due, tenders, method, entered);
  const all: PosTender[] = canAdd ? [...tenders, { id: uid("tender"), method, amount: entered }] : tenders;
  const s = posSettle(due, all);
  const complete = base.remaining <= 0;
  const cashOpen = method === "cash" && !complete;

  const addTender = () => {
    if (!canAdd) return;
    setTenders((list) => [...list, { id: uid("tender"), method, amount: entered }]);
    setAmount(null);
    setError(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        {done ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle2 aria-hidden className="size-10 text-nq-success-text" />
            <DialogHeader className="items-center text-center">
              <DialogTitle>{t.saleDone}</DialogTitle>
              <DialogDescription>
                {t.receiptNo} <bdi dir="ltr">{done.number}</bdi>
              </DialogDescription>
            </DialogHeader>
            <dl className="flex w-full flex-col gap-1.5 rounded-floating border border-border bg-card p-3">
              <Row label={t.total} strong>
                <LineItemMoney minor={done.totals.total} currency={currency} />
              </Row>
              <Row label={t.tax}>
                <LineItemMoney minor={done.totals.taxTotal} currency={currency} />
              </Row>
              {done.tenders.map((tender) => (
                <Row key={tender.id} label={t[tender.method]}>
                  <LineItemMoney minor={tender.amount} currency={currency} />
                </Row>
              ))}
              {done.tenders.length > 1 ? (
                <Row label={t.paid}>
                  <LineItemMoney minor={done.tendered} currency={currency} />
                </Row>
              ) : null}
              {done.change > 0 || done.method === "cash" ? (
                <Row label={t.change} strong>
                  <LineItemMoney minor={done.change} currency={currency} />
                </Row>
              ) : null}
            </dl>
            <Button variant="primary" size="lg" className="w-full" onClick={onNew} autoFocus>
              {t.newSale}
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || over) return;
              if (!s.settled) {
                addTender();
                return;
              }
              setBusy(true);
              setError(false);
              try {
                await onPay(all);
              } catch {
                setError(true);
              } finally {
                setBusy(false);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>{t.payTitle}</DialogTitle>
              <DialogDescription>{t.payText}</DialogDescription>
            </DialogHeader>
            <dl className="flex flex-col gap-1.5 rounded-floating bg-secondary p-3">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-label text-muted-foreground">{t.total}</dt>
                <dd>
                  <LineItemMoney minor={due} currency={currency} className="text-h2 text-foreground" />
                </dd>
              </div>
              {s.paid > 0 ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-body-sm text-muted-foreground">{t.paid}</dt>
                  <dd>
                    <LineItemMoney minor={s.paid} currency={currency} className="text-body-sm text-foreground" />
                  </dd>
                </div>
              ) : null}
              {s.paid > 0 ? (
                <div className="flex items-baseline justify-between gap-3" aria-live="polite">
                  <dt className="text-label text-muted-foreground">{t.remaining}</dt>
                  <dd>{s.remaining > 0 ? <LineItemMoney minor={s.remaining} currency={currency} className="text-h3 text-foreground" /> : <Badge variant="success">{t.paidInFull}</Badge>}</dd>
                </div>
              ) : null}
            </dl>
            {tenders.length ? (
              <ul aria-label={t.payments} className="flex flex-col divide-y divide-border rounded-floating border border-border">
                {tenders.map((tender) => {
                  const Icon = METHOD_ICON[tender.method];
                  return (
                    <li key={tender.id} className="flex items-center gap-2 px-3 py-1.5">
                      <Icon aria-hidden className="size-4 text-muted-foreground" />
                      <span className="text-label text-foreground">{t[tender.method]}</span>
                      <LineItemMoney minor={tender.amount} currency={currency} className="ms-auto text-label text-foreground" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        aria-label={`${t.removePayment}, ${t[tender.method]}`}
                        onClick={() => setTenders((list) => list.filter((x) => x.id !== tender.id))}
                      >
                        <X aria-hidden />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {complete ? null : (
              <>
                <ToggleGroup aria-label={t.method} value={[method]} onValueChange={(v) => v[0] && setMethod(v[0] as PosPaymentMethod)} className="grid w-full grid-cols-3">
                  {(["cash", "card", "wallet"] as const).map((m) => {
                    const Icon = METHOD_ICON[m];
                    return (
                      <Toggle key={m} value={m} aria-label={t[m]} className="h-12 gap-2">
                        <Icon aria-hidden />
                        {t[m]}
                      </Toggle>
                    );
                  })}
                </ToggleGroup>
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5 text-label text-foreground">
                    {method === "cash" ? t.tendered : t.amount}
                    <CurrencyInput
                      key={method}
                      value={amount}
                      currency={currency}
                      min={0}
                      invalid={over}
                      onValueChange={setAmount}
                      aria-label={method === "cash" ? t.tendered : t.amount}
                      autoFocus
                    />
                  </label>
                  {over ? (
                    <p role="alert" className="text-body-sm text-nq-danger-text">
                      {t.overpay}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {(method === "cash" ? posQuickTenders(base.remaining, currency) : [base.remaining]).map((quick) => (
                      <Button key={quick} type="button" variant="secondary" onClick={() => setAmount(quick)}>
                        {quick === base.remaining ? t.exactAmount : <LineItemMoney minor={quick} currency={currency} />}
                      </Button>
                    ))}
                    <Button type="button" variant="secondary" className="ms-auto" disabled={!canAdd || busy} onClick={addTender}>
                      <Plus aria-hidden />
                      {t.addPayment}
                    </Button>
                  </div>
                </div>
              </>
            )}
            {cashOpen || s.change > 0 ? (
              <div className="flex items-baseline justify-between gap-3" aria-live="polite">
                <span className="text-label text-muted-foreground">{t.change}</span>
                <LineItemMoney minor={s.change} currency={currency} className="text-h3 text-foreground" />
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="text-body-sm text-nq-danger-text">
                {t.failed}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
                {t.cancel}
              </Button>
              <Button type="submit" variant="primary" size="lg" disabled={!s.settled || over} loading={busy}>
                {t.confirm}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ hold and parked sales */

function HoldDialog({ open, onOpenChange, t, onPark }: { open: boolean; onOpenChange: (open: boolean) => void; t: Strings; onPark: (note: string) => void }) {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (open) setNote("");
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onPark(note.trim());
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.holdTitle}</DialogTitle>
            <DialogDescription>{t.holdText}</DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-1.5 text-label text-foreground">
            {t.note}
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePlaceholder} maxLength={80} autoComplete="off" autoFocus />
          </label>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary">
              <Pause aria-hidden />
              {t.park}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ParkedDialog({
  open,
  onOpenChange,
  parked,
  basketHasItems,
  currency,
  time,
  t,
  onResume,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parked: readonly PosParkedSale[];
  basketHasItems: boolean;
  currency: string;
  time: (iso: string) => string;
  t: Strings;
  onResume: (sale: PosParkedSale) => void;
  onDiscard: (sale: PosParkedSale) => void;
}) {
  const [confirm, setConfirm] = useState<{ kind: "resume" | "discard"; sale: PosParkedSale } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ask = (kind: "resume" | "discard", sale: PosParkedSale) => {
    setConfirm({ kind, sale });
    setConfirmOpen(true);
  };
  const newestFirst = [...parked].reverse();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t.parked}
            {parked.length ? (
              <Badge variant="neutral">
                <bdi>{parked.length}</bdi>
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>{t.noParkedText}</DialogDescription>
        </DialogHeader>
        {newestFirst.length === 0 ? (
          <EmptyState icon={Clock} title={t.noParked} description={t.noParkedText} className="py-8" />
        ) : (
          <ul aria-label={t.parked} className="flex max-h-[50dvh] flex-col divide-y divide-border overflow-y-auto rounded-floating border border-border">
            {newestFirst.map((sale) => (
              <li key={sale.id} data-slot="pos-parked" className="flex flex-col gap-2 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-label text-foreground">
                    <bdi>{time(sale.at)}</bdi>
                    {sale.note ? <span className="text-muted-foreground"> · {sale.note}</span> : null}
                  </span>
                  <LineItemMoney minor={sale.totals.total} currency={currency} className="text-label text-foreground" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body-sm text-muted-foreground">
                    <bdi>{sale.lines.reduce((n, l) => n + l.quantity, 0)}</bdi> {t.items}
                    {sale.cashier ? ` · ${sale.cashier}` : ""}
                  </span>
                  <span className="ms-auto flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => ask("discard", sale)} aria-label={`${t.discard}, ${time(sale.at)}`}>
                      <Trash2 aria-hidden />
                      {t.discard}
                    </Button>
                    <Button type="button" variant="primary" size="sm" onClick={() => (basketHasItems ? ask("resume", sale) : onResume(sale))} aria-label={`${t.resume}, ${time(sale.at)}`}>
                      {t.resume}
                    </Button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t.close}
          </Button>
        </DialogFooter>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm?.kind === "discard" ? t.discardTitle : t.resumeTitle}</AlertDialogTitle>
              <AlertDialogDescription>{confirm?.kind === "discard" ? t.discardText : t.resumeText}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                variant={confirm?.kind === "discard" ? "danger" : "primary"}
                onClick={() => {
                  if (!confirm) return;
                  if (confirm.kind === "discard") onDiscard(confirm.sale);
                  else onResume(confirm.sale);
                }}
              >
                {confirm?.kind === "discard" ? t.discard : t.resume}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ close the drawer */

function CloseDialog({
  open,
  onOpenChange,
  currency,
  drawer,
  t,
  onClose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  drawer: PosDrawerSummary;
  t: Strings;
  onClose: (counted: number) => Promise<void>;
}) {
  const [counted, setCounted] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setCounted(null);
  }, [open]);
  const variance = counted === null ? null : posVariance(drawer.expectedCash, counted);
  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (counted === null) return;
            setBusy(true);
            try {
              await onClose(counted);
            } finally {
              setBusy(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.drawer}</DialogTitle>
            <DialogDescription>{t.closeText}</DialogDescription>
          </DialogHeader>
          <dl className="flex flex-col gap-1.5 rounded-floating border border-border bg-card p-3">
            <Row label={t.floatRow}>
              <LineItemMoney minor={drawer.openingFloat} currency={currency} />
            </Row>
            <Row label={t.cashSales}>
              <LineItemMoney minor={drawer.cash} currency={currency} />
            </Row>
            <Row label={t.cardSales}>
              <LineItemMoney minor={drawer.card} currency={currency} />
            </Row>
            <Row label={t.walletSales}>
              <LineItemMoney minor={drawer.wallet} currency={currency} />
            </Row>
            <Row label={t.salesCount}>
              <bdi>{drawer.sales}</bdi>
            </Row>
            <Row label={t.expectedCash} strong>
              <LineItemMoney minor={drawer.expectedCash} currency={currency} />
            </Row>
          </dl>
          <label className="flex flex-col gap-1.5 text-label text-foreground">
            {t.countedCash}
            <CurrencyInput value={counted} currency={currency} min={0} onValueChange={setCounted} aria-label={t.countedCash} />
          </label>
          {variance !== null ? (
            <div className="flex items-center justify-between gap-3" aria-live="polite">
              <span className="text-label text-muted-foreground">{t.variance}</span>
              <span className="flex items-center gap-2">
                <Badge variant={variance === 0 ? "success" : variance < 0 ? "danger" : "warning"}>{variance === 0 ? t.exact : variance < 0 ? t.short : t.over}</Badge>
                {variance !== 0 ? <LineItemMoney minor={variance} currency={currency} sign="always" className="text-label" /> : null}
              </span>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="danger" disabled={counted === null} loading={busy}>
              {t.closeRegister}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
