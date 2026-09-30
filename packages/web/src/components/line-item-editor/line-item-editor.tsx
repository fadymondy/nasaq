"use client";

import { ArrowDown, ArrowUp, Copy, Minus, PackagePlus, Plus, Trash2 } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, comboboxFilter } from "../combobox";
import { ContextMenuActions } from "../context-menu";
import { CurrencyInput } from "../currency-input";
import { Input } from "../field";
import { EmptyState } from "../states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Toggle, ToggleGroup } from "../toggle-group";
import { LineItemActionsMenu, LineItemDecimalField, LineItemMoney } from "./line-item-fields";
import {
  bpsToPercentText,
  computeLineItems,
  type LineItemTotals,
  type LineOrderDiscount,
  type LineTaxMode,
  type LineTaxRounding,
  quantityMilli,
  quantityText,
} from "./line-item-math";

export { LineItemActionsMenu, LineItemDecimalField, LineItemMoney, type LineItemActionsMenuProps, type LineItemDecimalFieldProps, type LineItemMoneyProps } from "./line-item-fields";
export {
  allocateMinor,
  bpsToPercentText,
  computeLineItems,
  lineGross,
  mulDivRound,
  quantityMilli,
  quantityText,
  taxInside,
  taxOn,
  type LineItemMathInput,
  type LineItemMathOptions,
  type LineItemResult,
  type LineItemTotals,
  type LineOrderDiscount,
  type LineTaxGroup,
  type LineTaxMode,
  type LineTaxRounding,
} from "./line-item-math";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    item: "Item",
    itemPlaceholder: "Search products or type a name",
    quantity: "Qty",
    unitPrice: "Unit price",
    discount: "Disc.",
    tax: "Tax",
    total: "Total",
    addProduct: "Add product",
    addFree: "Add free line",
    remove: "Remove line",
    duplicate: "Duplicate line",
    moveUp: "Move up",
    moveDown: "Move down",
    lineActions: "Line actions",
    line: "Line",
    increase: "Increase quantity",
    decrease: "Decrease quantity",
    noMatch: "No matching product. The text becomes a free line.",
    open: "Open list",
    clear: "Clear",
    nameRequired: "Name the item or pick a product.",
    freeLine: "Free line",
    empty: "No lines yet",
    emptyText: "Pick a product to fill its name, price and tax, or add a free line.",
    lines: "Lines",
    subtotal: "Subtotal",
    discountRow: "Discounts",
    orderDiscount: "Order discount",
    percent: "Percent",
    amount: "Amount",
    taxRow: "Tax",
    taxIncluded: "Tax included",
    taxRate: "Tax rate",
    exempt: "No tax",
    totalDue: "Total",
    totals: "Totals",
    inStock: "in stock",
  },
  ar: {
    item: "الصنف",
    itemPlaceholder: "ابحث عن منتج أو اكتب اسمًا",
    quantity: "الكمية",
    unitPrice: "سعر الوحدة",
    discount: "الخصم",
    tax: "الضريبة",
    total: "الإجمالي",
    addProduct: "إضافة منتج",
    addFree: "إضافة بند حر",
    remove: "حذف البند",
    duplicate: "تكرار البند",
    moveUp: "نقل لأعلى",
    moveDown: "نقل لأسفل",
    lineActions: "إجراءات البند",
    line: "البند",
    increase: "زيادة الكمية",
    decrease: "تقليل الكمية",
    noMatch: "لا يوجد منتج مطابق. سيصبح النص بندًا حرًا.",
    open: "فتح القائمة",
    clear: "مسح",
    nameRequired: "اكتب اسم الصنف أو اختر منتجًا.",
    freeLine: "بند حر",
    empty: "لا توجد بنود بعد",
    emptyText: "اختر منتجًا ليملأ الاسم والسعر والضريبة، أو أضف بندًا حرًا.",
    lines: "البنود",
    subtotal: "المجموع الفرعي",
    discountRow: "الخصومات",
    orderDiscount: "خصم على الطلب",
    percent: "نسبة",
    amount: "مبلغ",
    taxRow: "الضريبة",
    taxIncluded: "شامل الضريبة",
    taxRate: "نسبة الضريبة",
    exempt: "بدون ضريبة",
    totalDue: "الإجمالي",
    totals: "الإجماليات",
    inStock: "في المخزون",
  },
} as const;

type Strings = { [K in keyof (typeof STRINGS)["en"]]: string };
export type LineItemEditorLabels = Partial<Strings>;

/** Merged strings for the active locale plus `labels`. */
export function useLineItemEditorStrings(labels?: LineItemEditorLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as Strings, ar, locale };
}

/* ------------------------------------------------------------------ types */

export interface LineItemEditorProduct {
  id: string;
  name: string;
  sku?: string;
  /** Price of one unit in minor units. */
  price: number;
  /** Tax rate in basis points (1500 is 15%). */
  taxBps?: number;
  /** Units in stock. Shown as a hint, never enforced. */
  stock?: number;
  /** "kg", "box"… Shown next to the quantity hint. */
  unit?: string;
}

export interface LineItemEditorLine {
  id: string;
  /** The product this line was filled from, or empty for a free line. */
  productId?: string | null;
  name: string;
  /** Up to three decimals. */
  quantity: number;
  /** Minor units. */
  unitPrice: number;
  /** Line discount in basis points, 0 to 10000. */
  discountBps?: number;
  /** Tax rate in basis points. Falls back to `defaultTaxBps`. */
  taxBps?: number;
}

export interface LineItemEditorProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "children"> {
  /** The lines. Controlled. */
  value?: LineItemEditorLine[];
  defaultValue?: LineItemEditorLine[];
  onValueChange?: (lines: LineItemEditorLine[]) => void;
  /** Products the picker offers. Picking one fills the name, price and tax rate. */
  products?: readonly LineItemEditorProduct[];
  /** ISO 4217 code. Sets the decimals of the price fields. Default "USD". */
  currency?: string;
  /** "exclusive": prices are before tax. "inclusive": prices already contain it. Default "exclusive". */
  taxMode?: LineTaxMode;
  /** Round tax per line, or once per rate on the whole basket. Default "line". */
  taxRounding?: LineTaxRounding;
  /** Rate for lines without their own, in basis points. Default 0. */
  defaultTaxBps?: number;
  /** The rates the tax select offers, in basis points. Default [0, 500, 1500]. */
  taxRates?: readonly number[];
  showTax?: boolean;
  showDiscount?: boolean;
  /** Let people add lines that are not a product. Default true. Off: typed text that matches nothing is dropped on blur. */
  allowFreeLines?: boolean;
  maxLines?: number;
  /** A discount on the whole basket. Shown (and editable) when `onOrderDiscountChange` is set. */
  orderDiscount?: LineOrderDiscount | null;
  onOrderDiscountChange?: (discount: LineOrderDiscount | null) => void;
  readOnly?: boolean;
  disabled?: boolean;
  /** Shown under the totals, with the computed totals. */
  footer?: (totals: LineItemTotals) => ReactNode;
  labels?: LineItemEditorLabels;
}

/* ------------------------------------------------------------------ helpers */

const GRID = "@2xl:grid-cols-[minmax(12rem,1fr)_8.5rem_9.5rem_6.5rem_6rem_8rem_2rem]";
const showTaxGrid = (tax: boolean, discount: boolean) =>
  tax && discount ? GRID : tax ? "@2xl:grid-cols-[minmax(12rem,1fr)_8.5rem_9.5rem_6rem_8rem_2rem]" : discount ? "@2xl:grid-cols-[minmax(12rem,1fr)_8.5rem_9.5rem_6.5rem_8rem_2rem]" : "@2xl:grid-cols-[minmax(12rem,1fr)_8.5rem_9.5rem_8rem_2rem]";

let counter = 0;
const newId = () => `line-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** The text inside a field's cell that names it on narrow screens, where the header row is hidden. */
function FieldCell({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span aria-hidden className="text-caption text-muted-foreground @2xl:hidden">
        {label}
      </span>
      {children}
    </div>
  );
}

interface PickerProps {
  line: LineItemEditorLine;
  products: readonly LineItemEditorProduct[];
  allowFree: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  label: string;
  t: Strings;
  onPick: (product: LineItemEditorProduct) => void;
  onName: (name: string) => void;
}

function ProductPicker({ line, products, allowFree, disabled, readOnly, autoFocus, label, t, onPick, onName }: PickerProps) {
  const [text, setText] = useState(line.name);
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setText(line.name), [line.name]);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  const selected = products.find((p) => p.id === line.productId) ?? null;
  const invalid = touched && !line.name.trim();

  if (readOnly) {
    return (
      <div className="min-w-0 py-1.5">
        <p className="truncate text-body text-foreground">{line.name}</p>
        {selected?.sku ? <p className="truncate text-caption text-muted-foreground"><bdi dir="ltr">{selected.sku}</bdi></p> : null}
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Combobox
        items={products as LineItemEditorProduct[]}
        value={selected}
        inputValue={text}
        disabled={disabled}
        itemToStringLabel={(p: LineItemEditorProduct) => p.name}
        isItemEqualToValue={(a: LineItemEditorProduct, b: LineItemEditorProduct) => a.id === b.id}
        filter={(p: LineItemEditorProduct, query: string) => comboboxFilter(p, query, (x) => `${x.name} ${x.sku ?? ""}`)}
        onInputValueChange={(value: string, details: { reason: string }) => {
          setText(value);
          if (details.reason === "item-press") return;
          if (allowFree) onName(value);
        }}
        onValueChange={(next: LineItemEditorProduct | null) => {
          if (next) onPick(next);
        }}
      >
        <ComboboxInput
          ref={ref}
          clearable={false}
          placeholder={t.itemPlaceholder}
          aria-label={label}
          aria-invalid={invalid || undefined}
          triggerLabel={t.open}
          clearLabel={t.clear}
          onBlur={() => {
            setTouched(true);
            if (!allowFree) setText(line.name);
          }}
        />
        <ComboboxContent>
          <ComboboxEmpty>{allowFree ? t.noMatch : t.noMatch.split(".")[0] + "."}</ComboboxEmpty>
          <ComboboxList>
            {(p: LineItemEditorProduct) => (
              <ComboboxItem key={p.id} value={p}>
                <span className="flex min-w-0 items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">
                    <bdi>{p.name}</bdi>
                    {p.sku ? (
                      <span className="ms-2 text-caption text-muted-foreground">
                        <bdi dir="ltr">{p.sku}</bdi>
                      </span>
                    ) : null}
                  </span>
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {invalid ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {t.nameRequired}
        </p>
      ) : selected ? (
        <p className="truncate text-caption text-muted-foreground">
          {selected.sku ? <bdi dir="ltr">{selected.sku}</bdi> : null}
          {selected.sku && selected.stock !== undefined ? " · " : null}
          {selected.stock !== undefined ? (
            <span>
              <bdi>{selected.stock}</bdi> {selected.unit ?? ""} {t.inStock}
            </span>
          ) : null}
        </p>
      ) : !line.name ? null : (
        <p className="truncate text-caption text-muted-foreground">{t.freeLine}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ component */

/**
 * The lines of an invoice, quote or order: pick a product to fill its name, price and tax, or type a free line;
 * quantity, unit price, discount and tax per line; and totals that are computed in integer minor units so the
 * parts always add up. Tax can be added to prices or contained in them, and rounded per line or once per rate.
 */
export function LineItemEditor({
  value: valueProp,
  defaultValue,
  onValueChange,
  products = [],
  currency = "USD",
  taxMode = "exclusive",
  taxRounding = "line",
  defaultTaxBps = 0,
  taxRates = [0, 500, 1500],
  showTax = true,
  showDiscount = true,
  allowFreeLines = true,
  maxLines,
  orderDiscount = null,
  onOrderDiscountChange,
  readOnly,
  disabled,
  footer,
  labels,
  className,
  ...rest
}: LineItemEditorProps) {
  const { t } = useLineItemEditorStrings(labels);
  const [inner, setInner] = useState<LineItemEditorLine[]>(defaultValue ?? []);
  const lines = valueProp ?? inner;
  const [focusId, setFocusId] = useState<string | null>(null);
  const uid = useId();
  const set = (next: LineItemEditorLine[]) => {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
  };
  const patch = (id: string, change: Partial<LineItemEditorLine>) => set(lines.map((l) => (l.id === id ? { ...l, ...change } : l)));

  const totals = useMemo(
    () => computeLineItems(lines.map((l) => ({ id: l.id, quantity: l.quantity, unitPrice: l.unitPrice, discountBps: l.discountBps, taxBps: l.taxBps })), { taxMode, taxRounding, defaultTaxBps, orderDiscount }),
    [lines, taxMode, taxRounding, defaultTaxBps, orderDiscount],
  );
  const byId = new Map(totals.lines.map((l) => [l.id, l]));
  const editable = !readOnly && !disabled;
  const canAdd = editable && (maxLines === undefined || lines.length < maxLines);

  const add = () => {
    const line: LineItemEditorLine = { id: newId(), name: "", quantity: 1, unitPrice: 0, productId: null };
    set([...lines, line]);
    setFocusId(line.id);
  };
  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= lines.length) return;
    const next = [...lines];
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    set(next);
  };
  const duplicate = (index: number) => {
    const source = lines[index];
    if (!source) return;
    const copy = { ...source, id: newId() };
    set([...lines.slice(0, index + 1), copy, ...lines.slice(index + 1)]);
  };
  const rates = (current?: number) => [...new Set([...taxRates, ...(current !== undefined ? [current] : [])])].sort((a, b) => a - b);
  const grid = showTaxGrid(showTax, showDiscount);
  const orderOn = onOrderDiscountChange !== undefined;

  return (
    <div data-slot="line-item-editor" data-tax-mode={taxMode} className={cn("@container flex min-w-0 flex-col gap-4", className)} {...rest}>
      {lines.length === 0 ? (
        <EmptyState title={t.empty} description={t.emptyText} />
      ) : (
        <div className="flex flex-col gap-2">
          <div aria-hidden className={cn("hidden gap-3 px-3 text-caption text-muted-foreground @2xl:grid", grid)}>
            <span>{t.item}</span>
            <span className="text-center">{t.quantity}</span>
            <span className="text-end">{t.unitPrice}</span>
            {showDiscount ? <span className="text-end">{t.discount}</span> : null}
            {showTax ? <span className="text-end">{t.tax}</span> : null}
            <span className="text-end">{t.total}</span>
            <span />
          </div>
          <ul aria-label={t.lines} className="flex flex-col gap-2">
            {lines.map((line, index) => {
              const result = byId.get(line.id);
              const name = line.name.trim() || `${t.line} ${index + 1}`;
              const actions = editable
                ? [
                    { id: "duplicate", label: t.duplicate, icon: Copy, onSelect: () => duplicate(index), disabled: !canAdd },
                    { id: "up", label: t.moveUp, icon: ArrowUp, onSelect: () => move(index, -1), disabled: index === 0, group: "order" },
                    { id: "down", label: t.moveDown, icon: ArrowDown, onSelect: () => move(index, 1), disabled: index === lines.length - 1, group: "order" },
                    { id: "remove", label: t.remove, icon: Trash2, danger: true, onSelect: () => set(lines.filter((l) => l.id !== line.id)), group: "danger" },
                  ]
                : [];
              const qtyInvalid = line.quantity <= 0;
              return (
                <ContextMenuActions
                  key={line.id}
                  actions={actions}
                  focusTarget={(el) => el.querySelector<HTMLElement>("input")}
                  render={
                    <li
                      data-slot="line-item"
                      data-free={line.productId ? undefined : ""}
                      aria-label={`${t.line} ${index + 1}: ${name}`}
                      className={cn("grid grid-cols-2 items-start gap-x-3 gap-y-3 rounded-floating border border-border bg-card p-3 @2xl:items-start @2xl:gap-y-0 @2xl:rounded-control", grid)}
                    />
                  }
                >
                  <div className="col-span-2 @2xl:col-span-1">
                    <ProductPicker
                      line={line}
                      products={products}
                      allowFree={allowFreeLines}
                      disabled={disabled}
                      readOnly={readOnly}
                      autoFocus={focusId === line.id}
                      label={`${t.item}, ${t.line} ${index + 1}`}
                      t={t}
                      onName={(next) => patch(line.id, { name: next })}
                      onPick={(p) => patch(line.id, { productId: p.id, name: p.name, unitPrice: p.price, taxBps: p.taxBps ?? line.taxBps })}
                    />
                  </div>
                  <FieldCell label={t.quantity}>
                    {readOnly ? (
                      <span className="py-1.5 text-center tabular-nums"><bdi>{quantityText(line.quantity)}</bdi></span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={`${t.decrease}, ${name}`} disabled={!editable || quantityMilli(line.quantity) <= 1000} onClick={() => patch(line.id, { quantity: Math.max(1, Math.floor(line.quantity - 1)) })} className="shrink-0 pointer-coarse:size-control">
                          <Minus aria-hidden />
                        </Button>
                        <LineItemDecimalField
                          value={quantityMilli(line.quantity)}
                          scale={3}
                          format={(v) => quantityText(v / 1000)}
                          min={1}
                          invalid={qtyInvalid}
                          disabled={disabled}
                          aria-label={`${t.quantity}, ${name}`}
                          onValueChange={(v) => patch(line.id, { quantity: (v ?? 0) / 1000 })}
                        />
                        <Button variant="ghost" size="icon-sm" aria-label={`${t.increase}, ${name}`} disabled={!editable} onClick={() => patch(line.id, { quantity: Math.floor(line.quantity) + 1 })} className="shrink-0 pointer-coarse:size-control">
                          <Plus aria-hidden />
                        </Button>
                      </div>
                    )}
                  </FieldCell>
                  <FieldCell label={t.unitPrice}>
                    {readOnly ? (
                      <span className="py-1.5 text-end"><LineItemMoney minor={line.unitPrice} currency={currency} /></span>
                    ) : (
                      <CurrencyInput
                        value={line.unitPrice}
                        currency={currency}
                        symbol="none"
                        min={0}
                        disabled={disabled}
                        aria-label={`${t.unitPrice}, ${name}`}
                        onValueChange={(v) => patch(line.id, { unitPrice: v ?? 0 })}
                      />
                    )}
                  </FieldCell>
                  {showDiscount ? (
                    <FieldCell label={t.discount}>
                      {readOnly ? (
                        <span className="py-1.5 text-end tabular-nums"><bdi>{bpsToPercentText(line.discountBps ?? 0)}%</bdi></span>
                      ) : (
                        <LineItemDecimalField
                          value={line.discountBps ?? 0}
                          scale={2}
                          format={bpsToPercentText}
                          max={10000}
                          suffix="%"
                          disabled={disabled}
                          aria-label={`${t.discount} %, ${name}`}
                          onValueChange={(v) => patch(line.id, { discountBps: v ?? 0 })}
                        />
                      )}
                    </FieldCell>
                  ) : null}
                  {showTax ? (
                    <FieldCell label={t.tax}>
                      {readOnly ? (
                        <span className="py-1.5 text-end tabular-nums"><bdi>{bpsToPercentText(result?.taxBps ?? 0)}%</bdi></span>
                      ) : (
                        <Select
                          items={rates(result?.taxBps).map((r) => ({ value: String(r), label: r === 0 ? t.exempt : `${bpsToPercentText(r)}%` }))}
                          value={String(result?.taxBps ?? defaultTaxBps)}
                          disabled={disabled}
                          onValueChange={(v) => typeof v === "string" && patch(line.id, { taxBps: Number(v) })}
                        >
                          <SelectTrigger aria-label={`${t.taxRate}, ${name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {rates(result?.taxBps).map((r) => (
                              <SelectItem key={r} value={String(r)}>
                                <bdi>{r === 0 ? t.exempt : `${bpsToPercentText(r)}%`}</bdi>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FieldCell>
                  ) : null}
                  <FieldCell label={t.total} className="@2xl:items-end @2xl:pt-2">
                    <span className="text-end font-medium text-foreground @2xl:w-full" data-slot="line-item-total">
                      <LineItemMoney minor={result?.total ?? 0} currency={currency} />
                    </span>
                  </FieldCell>
                  <div className="col-span-2 flex justify-end @2xl:col-span-1 @2xl:justify-center">
                    {editable ? <LineItemActionsMenu actions={actions} label={`${t.lineActions}, ${name}`} /> : null}
                  </div>
                </ContextMenuActions>
              );
            })}
          </ul>
        </div>
      )}

      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={!canAdd} onClick={add}>
            <PackagePlus aria-hidden />
            {t.addProduct}
          </Button>
          {allowFreeLines ? (
            <Button variant="ghost" size="sm" disabled={!canAdd} onClick={add}>
              <Plus aria-hidden />
              {t.addFree}
            </Button>
          ) : null}
        </div>
      ) : null}

      <section aria-label={t.totals} className="flex flex-col gap-3 self-end @2xl:w-80">
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-body-sm">
          <dt className="text-muted-foreground">{t.subtotal}</dt>
          <dd className="text-end"><LineItemMoney minor={totals.subtotal} currency={currency} /></dd>
          {totals.discountTotal > 0 ? (
            <>
              <dt className="text-muted-foreground">{t.discountRow}</dt>
              <dd className="text-end text-nq-success-text"><LineItemMoney minor={-totals.discountTotal} currency={currency} /></dd>
            </>
          ) : null}
          {orderOn ? (
            <>
              <dt className="flex items-center text-muted-foreground" id={`${uid}-od`}>{t.orderDiscount}</dt>
              <dd className="flex items-center justify-end gap-2">
                <ToggleGroup
                  aria-label={t.orderDiscount}
                  value={[orderDiscount?.type ?? "percent"]}
                  onValueChange={(v) => {
                    const type = v[0];
                    if (type === "percent") onOrderDiscountChange({ type: "percent", bps: 0 });
                    else if (type === "amount") onOrderDiscountChange({ type: "amount", minor: 0 });
                  }}
                >
                  <Toggle value="percent" aria-label={t.percent} disabled={!editable}>%</Toggle>
                  <Toggle value="amount" aria-label={t.amount} disabled={!editable}>{currency}</Toggle>
                </ToggleGroup>
                <div className="w-28">
                  {orderDiscount?.type === "amount" ? (
                    <CurrencyInput value={orderDiscount.minor} currency={currency} symbol="none" min={0} disabled={!editable} aria-label={t.orderDiscount} onValueChange={(v) => onOrderDiscountChange({ type: "amount", minor: v ?? 0 })} />
                  ) : (
                    <LineItemDecimalField
                      value={orderDiscount?.type === "percent" ? orderDiscount.bps : 0}
                      scale={2}
                      format={bpsToPercentText}
                      max={10000}
                      suffix="%"
                      disabled={!editable}
                      aria-label={t.orderDiscount}
                      onValueChange={(v) => onOrderDiscountChange({ type: "percent", bps: v ?? 0 })}
                    />
                  )}
                </div>
              </dd>
            </>
          ) : null}
          {showTax
            ? totals.taxGroups.map((g) => (
                <div key={g.bps} className="contents">
                  <dt className="text-muted-foreground">
                    {taxMode === "inclusive" ? t.taxIncluded : t.taxRow} <bdi className="tabular-nums">{bpsToPercentText(g.bps)}%</bdi>
                  </dt>
                  <dd className="text-end"><LineItemMoney minor={g.tax} currency={currency} /></dd>
                </div>
              ))
            : null}
        </dl>
        <div className="flex items-baseline justify-between gap-6 border-t border-border pt-3" aria-live="polite">
          <span className="text-body font-medium text-foreground">{t.totalDue}</span>
          <span className="text-h3 font-semibold text-foreground" data-slot="line-item-grand-total">
            <LineItemMoney minor={totals.total} currency={currency} />
          </span>
        </div>
        {footer?.(totals)}
      </section>
    </div>
  );
}
