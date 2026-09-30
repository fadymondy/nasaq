"use client";

import { ArrowLeftRight, ArrowRightFromLine, ArrowRightToLine, ListTree, PackageOpen, Plus, SlidersHorizontal } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { ContextMenuActions } from "../context-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Input } from "../field";
import { LineItemActionsMenu, LineItemDecimalField } from "../line-item-editor/line-item-fields";
import { Num } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  type StockLevel,
  type StockMovement,
  type StockMovementType,
  type StockProduct,
  type StockWarehouse,
  stockCanIssue,
  stockMatrix,
  stockOnHand,
  stockCellKey,
  stockSignedQuantity,
  stockStatement,
  stockTransfer,
} from "./stock-math";

export {
  stockCanIssue,
  stockCellKey,
  stockLevel,
  stockMatrix,
  stockOnHand,
  stockSignedQuantity,
  stockStatement,
  stockSum,
  stockTransfer,
  type StockLevel,
  type StockMatrix,
  type StockMatrixRow,
  type StockMovement,
  type StockMovementType,
  type StockProduct,
  type StockStatementRow,
  type StockWarehouse,
} from "./stock-math";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    onHand: "On hand",
    product: "Product",
    warehouse: "Warehouse",
    allWarehouses: "All warehouses",
    total: "Total",
    status: "Status",
    inStock: "In stock",
    low: "Low",
    out: "Out",
    reorderAt: "Reorder at",
    receive: "Receive",
    issue: "Issue",
    adjust: "Adjust",
    transfer: "Transfer",
    record: "Record movement",
    recordText: "Stock changes only through movements. Pick what happened and how many.",
    movementType: "Movement type",
    from: "From",
    to: "To",
    date: "Date",
    quantity: "Quantity",
    direction: "Direction",
    increase: "Increase",
    decrease: "Decrease",
    reference: "Reference",
    referencePlaceholder: "PO-2041, SO-5520, count sheet",
    note: "Note",
    available: "Available here",
    save: "Save movement",
    cancel: "Cancel",
    errQuantity: "Enter a quantity above zero.",
    errProduct: "Pick a product.",
    errWarehouse: "Pick a warehouse.",
    errSame: "Pick two different warehouses.",
    errStock: "Not enough stock: only {n} available here.",
    errSave: "Could not save the movement.",
    movements: "Movements",
    movement: "Movement",
    change: "Change",
    balance: "Balance",
    reference2: "Reference",
    noMovements: "No movements yet",
    noMovementsText: "Record a receive, issue or adjustment and it shows here.",
    noProducts: "No products to track",
    noProductsText: "Add products and warehouses to see stock.",
    viewMovements: "View movements",
    rowActions: "Product actions",
    filterProduct: "Product",
    filterWarehouse: "Warehouse",
    asOf: "Balance after each movement",
    reorderNote: "Flagged low at or under the reorder point.",
  },
  ar: {
    onHand: "المتوفر",
    product: "المنتج",
    warehouse: "المستودع",
    allWarehouses: "كل المستودعات",
    total: "الإجمالي",
    status: "الحالة",
    inStock: "متوفر",
    low: "منخفض",
    out: "نافد",
    reorderAt: "حد إعادة الطلب",
    receive: "استلام",
    issue: "صرف",
    adjust: "تسوية",
    transfer: "تحويل",
    record: "تسجيل حركة",
    recordText: "لا يتغير المخزون إلا بحركة. اختر ما حدث وكم الكمية.",
    movementType: "نوع الحركة",
    from: "من",
    to: "إلى",
    date: "التاريخ",
    quantity: "الكمية",
    direction: "الاتجاه",
    increase: "زيادة",
    decrease: "نقصان",
    reference: "المرجع",
    referencePlaceholder: "أمر شراء، أمر بيع، ورقة جرد",
    note: "ملاحظة",
    available: "المتاح هنا",
    save: "حفظ الحركة",
    cancel: "إلغاء",
    errQuantity: "أدخل كمية أكبر من صفر.",
    errProduct: "اختر منتجًا.",
    errWarehouse: "اختر مستودعًا.",
    errSame: "اختر مستودعين مختلفين.",
    errStock: "المخزون لا يكفي: المتاح هنا {n} فقط.",
    errSave: "تعذر حفظ الحركة.",
    movements: "الحركات",
    movement: "الحركة",
    change: "التغيير",
    balance: "الرصيد",
    reference2: "المرجع",
    noMovements: "لا توجد حركات بعد",
    noMovementsText: "سجّل استلامًا أو صرفًا أو تسوية وستظهر هنا.",
    noProducts: "لا توجد منتجات للتتبع",
    noProductsText: "أضف منتجات ومستودعات لعرض المخزون.",
    viewMovements: "عرض الحركات",
    rowActions: "إجراءات المنتج",
    filterProduct: "المنتج",
    filterWarehouse: "المستودع",
    asOf: "الرصيد بعد كل حركة",
    reorderNote: "يُعلَّم منخفضًا عند حد إعادة الطلب أو أقل.",
  },
} as const;

type Strings = { [K in keyof (typeof STRINGS)["en"]]: string };
export type StockLedgerLabels = Partial<Strings>;

/** Merged strings for the active locale plus `labels`. */
export function useStockLedgerStrings(labels?: StockLedgerLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as Strings, ar, locale };
}

const LEVEL_VARIANT: Record<StockLevel, "success" | "warning" | "danger"> = { ok: "success", low: "warning", out: "danger" };
const TYPE_VARIANT: Record<StockMovementType, "success" | "danger" | "info"> = { receive: "success", issue: "danger", adjust: "info" };
const TYPE_ICON = { receive: ArrowRightToLine, issue: ArrowRightFromLine, adjust: SlidersHorizontal, transfer: ArrowLeftRight } as const;

const th = "px-3 py-2 text-start text-caption font-medium text-muted-foreground";
const thNum = "px-3 py-2 text-end text-caption font-medium text-muted-foreground";
const td = "px-3 py-2.5 text-body-sm text-foreground";
const tdNum = "px-3 py-2.5 text-end text-body-sm text-foreground tabular-nums";

/** A quantity: up to three decimals, tabular, left to right. Zero shows as a dash when `blank`. */
function Qty({ value, blank = false, sign = false, className }: { value: number; blank?: boolean; sign?: boolean; className?: string }) {
  if (blank && value === 0) return <span aria-hidden className={cn("text-muted-foreground", className)}>–</span>;
  return <Num value={value} format={{ maximumFractionDigits: 3, signDisplay: sign ? "exceptZero" : "auto" }} className={className} />;
}

function useDate(locale: string) {
  return (iso: string) => new Intl.DateTimeFormat(new Intl.Locale(locale, { numberingSystem: "latn" }).toString(), { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

/* ------------------------------------------------------------------ on-hand matrix */

export interface StockOnHandProps extends Omit<ComponentProps<"div">, "children"> {
  products: readonly StockProduct[];
  warehouses: readonly StockWarehouse[];
  movements: readonly StockMovement[];
  /** ISO date. Movements after it are left out. */
  asOf?: string;
  selectedProductId?: string | null;
  onSelectProduct?: (product: StockProduct) => void;
  /** Adds receive, issue and adjust to each row's menu. */
  onRecordFor?: (type: "receive" | "issue" | "adjust", product: StockProduct) => void;
  labels?: StockLedgerLabels;
}

/** Products by warehouses, with a total and a low-stock flag per product. */
export function StockOnHand({ products, warehouses, movements, asOf, selectedProductId, onSelectProduct, onRecordFor, labels, className, ...props }: StockOnHandProps) {
  const { t } = useStockLedgerStrings(labels);
  const matrix = useMemo(() => stockMatrix(products, warehouses, movements, { asOf }), [products, warehouses, movements, asOf]);
  if (products.length === 0) return <EmptyState icon={PackageOpen} title={t.noProducts} description={t.noProductsText} className={className} />;
  return (
    <div data-slot="stock-on-hand" className={cn("relative w-full overflow-x-auto rounded-card border border-border bg-card", className)} {...props}>
      <table className="w-full min-w-[34rem] border-collapse">
        <caption className="sr-only">{t.onHand}</caption>
        <thead className="border-b border-border">
          <tr>
            <th scope="col" className={cn(th, "sticky start-0 z-10 bg-card")}>{t.product}</th>
            {warehouses.map((w) => (
              <th key={w.id} scope="col" dir="ltr" className={thNum} title={w.name}>
                {w.code ?? w.name}
              </th>
            ))}
            <th scope="col" dir="ltr" className={thNum}>{t.total}</th>
            <th scope="col" className={th}>{t.status}</th>
            <th scope="col" className="w-10"><span className="sr-only">{t.rowActions}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {matrix.rows.map(({ product, cells, total, level }) => {
            const actions = [
              ...(onSelectProduct ? [{ id: "view", label: t.viewMovements, icon: ListTree, onSelect: () => onSelectProduct(product), group: "open" }] : []),
              ...(onRecordFor
                ? (["receive", "issue", "adjust"] as const).map((type) => ({ id: type, label: t[type], icon: TYPE_ICON[type], onSelect: () => onRecordFor(type, product), group: "record" }))
                : []),
            ];
            return (
              <ContextMenuActions
                key={product.id}
                actions={actions}
                render={<tr data-slot="stock-row" data-level={level} data-selected={selectedProductId === product.id ? "" : undefined} className="data-[selected]:bg-nq-hover" />}
              >
                <td className={cn(td, "sticky start-0 z-10 bg-card")}>
                  <div className="flex min-w-0 flex-col">
                    {onSelectProduct ? (
                      <button type="button" className="truncate text-start font-medium hover:underline" onClick={() => onSelectProduct(product)}>
                        {product.name}
                      </button>
                    ) : (
                      <span className="truncate font-medium">{product.name}</span>
                    )}
                    <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                      <bdi dir="ltr" className="tabular-nums">{product.sku}</bdi>
                      {product.unit ? <span>{product.unit}</span> : null}
                    </span>
                  </div>
                </td>
                {warehouses.map((w) => (
                  <td key={w.id} dir="ltr" className={cn(tdNum, (cells[w.id] ?? 0) < 0 && "text-danger")}>
                    <Qty value={cells[w.id] ?? 0} blank />
                  </td>
                ))}
                <td dir="ltr" className={cn(tdNum, "font-medium")}>
                  <Qty value={total} />
                </td>
                <td className={td}>
                  <Badge variant={LEVEL_VARIANT[level]} title={product.reorderPoint !== undefined ? `${t.reorderAt} ${product.reorderPoint}` : undefined}>
                    {level === "ok" ? t.inStock : level === "low" ? t.low : t.out}
                  </Badge>
                </td>
                <td className="px-1">
                  <LineItemActionsMenu actions={actions} label={`${t.rowActions}, ${product.name}`} />
                </td>
              </ContextMenuActions>
            );
          })}
        </tbody>
        <tfoot className="border-t border-border bg-muted/40">
          <tr>
            <th scope="row" className={cn(th, "sticky start-0 z-10 bg-muted/40 font-semibold text-foreground")}>{t.total}</th>
            {warehouses.map((w) => (
              <td key={w.id} dir="ltr" className={cn(tdNum, "font-medium")}>
                <Qty value={matrix.warehouseTotals[w.id] ?? 0} />
              </td>
            ))}
            <td dir="ltr" className={cn(tdNum, "font-semibold")}>
              <Qty value={matrix.total} />
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ movements list */

export interface StockMovementListProps extends Omit<ComponentProps<"div">, "children"> {
  products: readonly StockProduct[];
  warehouses: readonly StockWarehouse[];
  movements: readonly StockMovement[];
  /** The product to follow. The running balance is for this product. */
  productId: string;
  /** One warehouse, or all of them when empty. */
  warehouseId?: string;
  labels?: StockLedgerLabels;
}

/** The movements of one product in time order, each with the balance it leaves. */
export function StockMovementList({ products, warehouses, movements, productId, warehouseId, labels, className, ...props }: StockMovementListProps) {
  const { t, locale } = useStockLedgerStrings(labels);
  const date = useDate(locale);
  const rows = useMemo(() => stockStatement(movements, { productId, warehouseId: warehouseId || undefined }), [movements, productId, warehouseId]);
  const wh = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);
  const product = products.find((p) => p.id === productId);
  if (rows.length === 0) return <EmptyState icon={ListTree} title={t.noMovements} description={t.noMovementsText} className={className} />;
  return (
    <div data-slot="stock-movements" className={cn("relative w-full overflow-x-auto rounded-card border border-border bg-card", className)} {...props}>
      <table className="w-full min-w-[36rem] border-collapse">
        <caption className="sr-only">{`${t.movements}${product ? `, ${product.name}` : ""}. ${t.asOf}.`}</caption>
        <thead className="border-b border-border">
          <tr>
            <th scope="col" className={th}>{t.date}</th>
            <th scope="col" className={th}>{t.movement}</th>
            <th scope="col" className={th}>{t.warehouse}</th>
            <th scope="col" className={th}>{t.reference2}</th>
            <th scope="col" dir="ltr" className={thNum}>{t.change}</th>
            <th scope="col" dir="ltr" className={thNum}>{t.balance}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(({ movement: m, change, balance }) => (
            <tr key={m.id} data-slot="stock-movement">
              <td className={cn(td, "whitespace-nowrap")}>{date(m.date)}</td>
              <td className={td}>
                <Badge variant={TYPE_VARIANT[m.type]}>{t[m.type]}</Badge>
                {m.note ? <div className="mt-0.5 text-caption text-muted-foreground">{m.note}</div> : null}
              </td>
              <td className={td}>{wh.get(m.warehouseId)?.name ?? m.warehouseId}</td>
              <td className={td}>{m.reference ? <bdi dir="ltr" className="tabular-nums">{m.reference}</bdi> : <span aria-hidden className="text-muted-foreground">–</span>}</td>
              <td dir="ltr" className={cn(tdNum, change < 0 ? "text-danger" : "text-success")}>
                <Qty value={change} sign />
              </td>
              <td dir="ltr" className={cn(tdNum, "font-medium", balance < 0 && "text-danger")}>
                <Qty value={balance} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ record dialog */

type RecordKind = StockMovementType | "transfer";

interface RecordPreset {
  type: RecordKind;
  productId?: string;
  warehouseId?: string;
}

let counter = 0;
const newId = () => `mv-${Date.now().toString(36)}-${(counter++).toString(36)}`;
const today = () => new Date().toISOString().slice(0, 10);

function RecordDialog({
  open,
  onOpenChange,
  preset,
  products,
  warehouses,
  movements,
  t,
  onRecord,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: RecordPreset;
  products: readonly StockProduct[];
  warehouses: readonly StockWarehouse[];
  movements: readonly StockMovement[];
  t: Strings;
  onRecord: (movements: StockMovement[]) => void | Promise<void>;
}) {
  const [kind, setKind] = useState<RecordKind>(preset.type);
  const [productId, setProductId] = useState(preset.productId ?? "");
  const [warehouseId, setWarehouseId] = useState(preset.warehouseId ?? warehouses[0]?.id ?? "");
  const [toId, setToId] = useState("");
  const [qty, setQty] = useState<number | null>(null); // thousandths
  const [dir, setDir] = useState<"increase" | "decrease">("increase");
  const [day, setDay] = useState(today());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(preset.type);
    setProductId(preset.productId ?? "");
    setWarehouseId(preset.warehouseId ?? warehouses[0]?.id ?? "");
    setToId("");
    setQty(null);
    setDir("increase");
    setDay(today());
    setReference("");
    setNote("");
    setTouched(false);
    setFailed(false);
  }, [open, preset, warehouses]);

  const quantity = (qty ?? 0) / 1000;
  const outgoing = kind === "issue" || kind === "transfer" || (kind === "adjust" && dir === "decrease");
  const available = productId && warehouseId ? (stockOnHand(movements).get(stockCellKey(productId, warehouseId)) ?? 0) : 0;
  const product = products.find((p) => p.id === productId);

  let error: string | null = null;
  if (!productId) error = t.errProduct;
  else if (!warehouseId || (kind === "transfer" && !toId)) error = t.errWarehouse;
  else if (kind === "transfer" && toId === warehouseId) error = t.errSame;
  else if (quantity <= 0) error = t.errQuantity;
  else if (outgoing && !stockCanIssue(movements, productId, warehouseId, quantity)) error = t.errStock.replace("{n}", String(available));

  const submit = async () => {
    setTouched(true);
    if (error) return;
    const date = `${day}T${new Date().toTimeString().slice(0, 8)}`;
    const base = { date, productId, reference: reference.trim() || undefined, note: note.trim() || undefined };
    const out: StockMovement[] =
      kind === "transfer"
        ? stockTransfer({ id: newId(), ...base, fromWarehouseId: warehouseId, toWarehouseId: toId, quantity })
        : [{ ...base, id: newId(), warehouseId, type: kind, quantity: stockSignedQuantity(kind, kind === "adjust" && dir === "decrease" ? -quantity : quantity) }];
    setBusy(true);
    setFailed(false);
    try {
      await onRecord(out);
      onOpenChange(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const selectItems = (list: readonly { id: string; name: string }[]) => list.map((x) => ({ value: x.id, label: x.name }));
  const whItems = selectItems(warehouses);

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.record}</DialogTitle>
            <DialogDescription>{t.recordText}</DialogDescription>
          </DialogHeader>
          <ToggleGroup aria-label={t.movementType} value={[kind]} onValueChange={(v) => v[0] && setKind(v[0] as RecordKind)} className="grid w-full grid-cols-4">
            {(["receive", "issue", "adjust", "transfer"] as const).map((k) => {
              const Icon = TYPE_ICON[k];
              return (
                <Toggle key={k} value={k} className="flex-col gap-1 py-2 @container">
                  <Icon aria-hidden />
                  <span className="text-caption">{t[k]}</span>
                </Toggle>
              );
            })}
          </ToggleGroup>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-label text-foreground sm:col-span-2">
              {t.product}
              <Select items={selectItems(products)} value={productId || null} onValueChange={(v) => setProductId(v ? String(v) : "")}>
                <SelectTrigger aria-label={t.product} aria-invalid={(touched && !productId) || undefined}>
                  <SelectValue placeholder={t.product} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 text-label text-foreground">
              {kind === "transfer" ? t.from : t.warehouse}
              <Select items={whItems} value={warehouseId || null} onValueChange={(v) => setWarehouseId(v ? String(v) : "")}>
                <SelectTrigger aria-label={kind === "transfer" ? t.from : t.warehouse}>
                  <SelectValue placeholder={t.warehouse} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {kind === "transfer" ? (
              <label className="flex flex-col gap-1.5 text-label text-foreground">
                {t.to}
                <Select items={whItems} value={toId || null} onValueChange={(v) => setToId(v ? String(v) : "")}>
                  <SelectTrigger aria-label={t.to} aria-invalid={(touched && (!toId || toId === warehouseId)) || undefined}>
                    <SelectValue placeholder={t.warehouse} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter((w) => w.id !== warehouseId)
                      .map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </label>
            ) : null}
            {kind === "adjust" ? (
              <div className="flex flex-col gap-1.5 text-label text-foreground">
                <span id="stock-dir">{t.direction}</span>
                <ToggleGroup aria-labelledby="stock-dir" value={[dir]} onValueChange={(v) => v[0] && setDir(v[0] as "increase" | "decrease")} className="grid w-full grid-cols-2">
                  <Toggle value="increase">{t.increase}</Toggle>
                  <Toggle value="decrease">{t.decrease}</Toggle>
                </ToggleGroup>
              </div>
            ) : null}
            <label className="flex flex-col gap-1.5 text-label text-foreground">
              {t.quantity}
              <LineItemDecimalField
                aria-label={t.quantity}
                value={qty}
                scale={3}
                min={0}
                format={(v) => String(v / 1000)}
                suffix={product?.unit}
                invalid={touched && quantity <= 0}
                onValueChange={setQty}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-label text-foreground">
              {t.date}
              <Input type="date" ltr value={day} onChange={(e) => setDay(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-label text-foreground">
              {t.reference}
              <Input ltr value={reference} placeholder={t.referencePlaceholder} onChange={(e) => setReference(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-label text-foreground sm:col-span-2">
              {t.note}
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
          {productId && warehouseId ? (
            <p className="flex items-center justify-between gap-3 text-caption text-muted-foreground">
              <span>{t.available}</span>
              <Qty value={available} className="text-body-sm font-medium text-foreground" />
            </p>
          ) : null}
          <div aria-live="polite" className="min-h-5">
            {touched && error ? (
              <p role="alert" className="text-caption text-danger">
                {error}
              </p>
            ) : failed ? (
              <p role="alert" className="text-caption text-danger">
                {t.errSave}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" loading={busy}>
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ the ledger */

export interface StockLedgerProps extends Omit<ComponentProps<"section">, "children"> {
  products: readonly StockProduct[];
  warehouses: readonly StockWarehouse[];
  /** Every movement. On-hand is computed from these and nothing else. */
  movements: readonly StockMovement[];
  /**
   * Called with what the dialog produced: one movement, or two for a transfer (an issue and a receive sharing a
   * reference). Add them to your data. Throw to keep the dialog open with an error. Omit it for a read-only ledger.
   */
  onRecord?: (movements: StockMovement[]) => void | Promise<void>;
  /** ISO date. On-hand ignores later movements. */
  asOf?: string;
  labels?: StockLedgerLabels;
}

/**
 * On-hand per warehouse from receive, issue and adjust movements, a movement list with a running balance for the
 * product you pick, and a dialog to record a movement.
 */
export function StockLedger({ products, warehouses, movements, onRecord, asOf, labels, className, ...props }: StockLedgerProps) {
  const { t } = useStockLedgerStrings(labels);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [warehouseId, setWarehouseId] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; preset: RecordPreset }>({ open: false, preset: { type: "receive" } });
  const current = products.some((p) => p.id === productId) ? productId : (products[0]?.id ?? "");
  const openRecord = (preset: RecordPreset) => setDialog({ open: true, preset });

  return (
    <section data-slot="stock-ledger" className={cn("flex w-full min-w-0 flex-col gap-6", className)} {...props}>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-title-sm text-foreground">{t.onHand}</h2>
          {onRecord ? (
            <Button onClick={() => openRecord({ type: "receive", productId: current })}>
              <Plus aria-hidden />
              {t.record}
            </Button>
          ) : null}
        </div>
        <StockOnHand
          products={products}
          warehouses={warehouses}
          movements={movements}
          asOf={asOf}
          selectedProductId={current}
          labels={labels}
          onSelectProduct={(p) => setProductId(p.id)}
          onRecordFor={onRecord ? (type, p) => openRecord({ type, productId: p.id }) : undefined}
        />
        <p className="text-caption text-muted-foreground">{t.reorderNote}</p>
      </div>
      {products.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-title-sm text-foreground">{t.movements}</h2>
            <div className="flex flex-wrap gap-2">
              <Select items={products.map((p) => ({ value: p.id, label: p.name }))} value={current} onValueChange={(v) => v && setProductId(String(v))}>
                <SelectTrigger aria-label={t.filterProduct} className="min-w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select items={[{ value: "", label: t.allWarehouses }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]} value={warehouseId} onValueChange={(v) => setWarehouseId(v ? String(v) : "")}>
                <SelectTrigger aria-label={t.filterWarehouse} className="min-w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t.allWarehouses}</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <StockMovementList products={products} warehouses={warehouses} movements={movements} productId={current} warehouseId={warehouseId} labels={labels} />
        </div>
      ) : null}
      {onRecord ? (
        <RecordDialog
          open={dialog.open}
          onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
          preset={dialog.preset}
          products={products}
          warehouses={warehouses}
          movements={movements}
          t={t}
          onRecord={onRecord}
        />
      ) : null}
    </section>
  );
}
