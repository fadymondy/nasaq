"use client";

import { Archive, CircleX, Package, Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { type ComponentProps, useId, useMemo, useState } from "react";
import type { CommerceProduct } from "../../lib/commerce";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { CurrencyInput } from "../currency-input";
import { DataTable, DataTableBulkActions, type DataTableColumn, type DataTableRowAction, DataTableFacetFilter, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldLabel, Input } from "../field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";
import { Switch } from "../switch";
import { type BulkPriceMode, type BulkStockMode, bulkEditProducts, decimalToMinor, type ProductBulkEdit, stockSummary, variantCount } from "./product-admin-logic";
import { failMessage, Money, type ProductAdminResult, type StoreProductsAdminLabels, Thumb, useProductAdminStrings } from "./product-admin-shared";
import { useCurrency } from "../../provider/nasaq-provider";

type ProductStatus = NonNullable<CommerceProduct["status"]>;

const STATUS_TONE: Record<ProductStatus, StatusTone> = { active: "success", draft: "neutral", archived: "warning" };
const LEVEL_TONE = { in: "success", low: "warning", out: "danger", untracked: "neutral" } as const satisfies Record<string, StatusTone>;
const PRICE_MODES: BulkPriceMode[] = ["set", "increase-percent", "decrease-percent", "increase-amount", "decrease-amount"];
const STOCK_MODES: BulkStockMode[] = ["set", "add", "remove"];

const statusOf = (p: CommerceProduct): ProductStatus => p.status ?? "active";
const priceRange = (p: CommerceProduct): [number, number] | null => {
  const prices = p.variants.map((v) => v.price);
  return prices.length ? [Math.min(...prices), Math.max(...prices)] : null;
};

function PriceRange({ product, currency }: { product: CommerceProduct; currency: string }) {
  const r = priceRange(product);
  if (!r) return <span className="text-muted-foreground">—</span>;
  return r[0] === r[1] ? (
    <Money minor={r[0]} currency={currency} />
  ) : (
    <span className="whitespace-nowrap">
      <Money minor={r[0]} currency={currency} /> – <Money minor={r[1]} currency={currency} />
    </span>
  );
}

export interface ProductAdminListProps extends Omit<ComponentProps<"section">, "children"> {
  products: readonly CommerceProduct[];
  /** ISO 4217 code of the store. */
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Opens the editor: a row click, Enter on a row, or "Edit" in its menu. */
  onOpen?: (product: CommerceProduct) => void;
  onCreate?: () => void;
  /**
   * Applies a bulk edit to the selected products. Called with the ids and the edit (price rule, stock rule,
   * status). Resolve `{ error }` to keep the dialog open. Without it the Bulk edit button is not shown.
   */
  onBulkEdit?: (ids: string[], edit: ProductBulkEdit) => Promise<ProductAdminResult>;
  onStatusChange?: (product: CommerceProduct, status: ProductStatus) => Promise<ProductAdminResult>;
  onDelete?: (product: CommerceProduct) => Promise<ProductAdminResult>;
  /** Stock at or below this counts as low. Default 5. */
  lowStockAt?: number;
  loading?: boolean;
  /** The request failed. `true` shows the standard message; a string shows yours. */
  error?: boolean | string;
  onRetry?: () => void;
  labels?: StoreProductsAdminLabels;
}

/**
 * The product list of a store admin: thumbnail, status, stock level, price range and variant count, with search,
 * status and stock filters, sorting, and bulk edit of price, stock and status for the selected rows.
 * Row actions (edit, activate, archive, delete) open on context-click too. Money is integer minor units.
 */
export function ProductAdminList({ products, currency: currencyProp, onOpen, onCreate, onBulkEdit, onStatusChange, onDelete, lowStockAt = 5, loading = false, error, onRetry, labels, className, ...props }: ProductAdminListProps) {
  const currency = useCurrency(currencyProp);
  const { t, n } = useProductAdminStrings(labels);
  const titleId = useId();
  const [bulk, setBulk] = useState(false);
  const [deleting, setDeleting] = useState<CommerceProduct | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const guard = async (job: () => Promise<ProductAdminResult>) => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await job();
      if (r?.error) {
        setNotice(r.error);
        return false;
      }
      return true;
    } catch (e) {
      setNotice(failMessage(e, t.saveFailed));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const columns: DataTableColumn<CommerceProduct>[] = [
    {
      id: "product",
      header: t.productCol,
      label: t.productCol,
      cell: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <Thumb src={p.images[0]?.src} alt={p.images[0]?.alt ?? p.name} size={40} label={p.name} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-foreground">{p.name}</span>
            {p.brand ? <span className="truncate text-caption text-muted-foreground">{p.brand}</span> : null}
          </div>
        </div>
      ),
      sortValue: (p) => p.name,
      searchValue: (p) => [p.name, p.brand, p.category, ...(p.tags ?? []), ...p.variants.map((v) => v.sku)].filter(Boolean).join(" "),
    },
    { id: "status", header: t.statusCol, label: t.statusCol, cell: (p) => <Status tone={STATUS_TONE[statusOf(p)]}>{t.statuses[statusOf(p)]}</Status>, sortValue: (p) => statusOf(p), filterValue: (p) => statusOf(p) },
    {
      id: "stock",
      header: t.stockCol,
      label: t.stockCol,
      cell: (p) => {
        const s = stockSummary(p.variants, lowStockAt);
        return (
          <div className="flex flex-col items-start gap-0.5">
            <Status tone={LEVEL_TONE[s.level]}>{t.stockLevels[s.level]}</Status>
            {s.level !== "untracked" ? <span className="text-caption text-muted-foreground tabular-nums">{t.units(n(s.total))}</span> : null}
          </div>
        );
      },
      sortValue: (p) => {
        const s = stockSummary(p.variants, lowStockAt);
        return s.level === "untracked" ? Number.MAX_SAFE_INTEGER : s.total;
      },
      filterValue: (p) => stockSummary(p.variants, lowStockAt).level,
    },
    { id: "category", header: t.categoryCol, label: t.categoryCol, cell: (p) => (p.category ? <span className="text-body-sm">{p.category}</span> : <span className="text-muted-foreground">—</span>), sortValue: (p) => p.category ?? "", defaultHidden: true },
    { id: "variants", header: t.variantsCol, label: t.variantsCol, align: "end", cell: (p) => <span className="tabular-nums">{p.options.length ? n(variantCount(p.options) || p.variants.length) : n(p.variants.length)}</span>, sortValue: (p) => p.variants.length },
    { id: "price", header: t.priceCol, label: t.priceCol, align: "end", cell: (p) => <PriceRange product={p} currency={currency} />, sortValue: (p) => priceRange(p)?.[0] ?? 0 },
  ];
  const table = useDataTable({ data: products as CommerceProduct[], columns, getRowId: (p) => p.id, pageSize: 10, selectable: Boolean(onBulkEdit), defaultSort: { id: "product", direction: "asc" } });

  const actions = (p: CommerceProduct): DataTableRowAction[] => {
    const st = statusOf(p);
    return [
      ...(onOpen ? [{ id: "edit", label: t.edit, icon: Pencil, onSelect: () => onOpen(p) }] : []),
      ...(onStatusChange
        ? [
            ...(st !== "active" ? [{ id: "activate", label: t.setActive, icon: Power, group: "state", onSelect: () => void guard(() => onStatusChange(p, "active")) }] : []),
            ...(st === "active" ? [{ id: "draft", label: t.setDraft, icon: PowerOff, group: "state", onSelect: () => void guard(() => onStatusChange(p, "draft")) }] : []),
            ...(st !== "archived" ? [{ id: "archive", label: t.archive, icon: Archive, group: "state", onSelect: () => void guard(() => onStatusChange(p, "archived")) }] : []),
          ]
        : []),
      ...(onDelete ? [{ id: "delete", label: t.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => (setNotice(null), setDeleting(p)) }] : []),
    ];
  };

  const errorText = error === true ? t.loadFailed : typeof error === "string" ? error : undefined;

  return (
    <section data-slot="product-list" aria-labelledby={titleId} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-h3 text-foreground">
          {t.products}
        </h2>
        {onCreate ? (
          <Button size="sm" onClick={onCreate}>
            <Plus aria-hidden />
            {t.newProduct}
          </Button>
        ) : null}
      </div>
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder={t.searchProducts} />
        <DataTableFacetFilter table={table} column="status" title={t.statusCol} options={(["active", "draft", "archived"] as const).map((s) => ({ value: s, label: t.statuses[s] }))} />
        <DataTableFacetFilter table={table} column="stock" title={t.stockCol} options={(["in", "low", "out", "untracked"] as const).map((s) => ({ value: s, label: t.stockLevels[s] }))} />
      </DataTableToolbar>
      {onBulkEdit ? (
        <DataTableBulkActions table={table}>
          <Button size="sm" variant="secondary" onClick={() => (setNotice(null), setBulk(true))}>
            <Pencil aria-hidden />
            {t.bulkEdit}
          </Button>
        </DataTableBulkActions>
      ) : null}
      {notice && !bulk && !deleting ? (
        <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden className="size-4" />
          {notice}
        </p>
      ) : null}
      <DataTable
        table={table}
        label={t.productListLabel}
        rowLabel={(p) => p.name}
        loading={loading}
        error={errorText}
        onRetry={onRetry}
        onRowClick={onOpen}
        rowActions={actions}
        empty={<EmptyState icon={Package} title={t.noProducts} description={t.noProductsHint} className="border-0" actions={onCreate ? <Button size="sm" onClick={onCreate}><Plus aria-hidden />{t.newProduct}</Button> : undefined} />}
      />
      {bulk && onBulkEdit ? (
        <BulkEditDialog
          products={table.selectedRows}
          currency={currency}
          busy={busy}
          error={notice}
          onCancel={() => setBulk(false)}
          onApply={async (edit) => {
            const ok = await guard(() => onBulkEdit(table.selectedRows.map((p) => p.id), edit));
            if (ok) {
              setBulk(false);
              table.setSelection(new Set());
            }
          }}
          labels={labels}
        />
      ) : null}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && !busy && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deleteTitle}</DialogTitle>
            <DialogDescription>{t.deleteDescription(deleting?.name ?? "")}</DialogDescription>
          </DialogHeader>
          {notice ? (
            <p role="alert" className="text-body-sm text-nq-danger-text">
              {notice}
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

/* ------------------------------------------------------------------ bulk edit */

function BulkEditDialog({ products, currency, busy, error, onCancel, onApply, labels }: { products: CommerceProduct[]; currency: string; busy: boolean; error: string | null; onCancel: () => void; onApply: (edit: ProductBulkEdit) => void | Promise<void>; labels?: StoreProductsAdminLabels }) {
  const { t, n } = useProductAdminStrings(labels);
  const [priceMode, setPriceMode] = useState<"keep" | BulkPriceMode>("keep");
  const [percentText, setPercentText] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [alsoCompare, setAlsoCompare] = useState(false);
  const [stockMode, setStockMode] = useState<"keep" | BulkStockMode>("keep");
  const [stockText, setStockText] = useState("");
  const [status, setStatus] = useState<"keep" | ProductStatus>("keep");

  const percentMode = priceMode === "increase-percent" || priceMode === "decrease-percent";
  const priceValue = priceMode === "keep" ? null : percentMode ? decimalToMinor(percentText, 100) : amount;
  const stockValue = /^\d+$/.test(stockText.trim()) ? Number(stockText.trim()) : null;

  const edit: ProductBulkEdit = {
    ...(priceMode !== "keep" && priceValue !== null ? { price: { mode: priceMode, value: priceValue, ...(alsoCompare ? { compareAt: true } : {}) } } : {}),
    ...(stockMode !== "keep" && stockValue !== null ? { stock: { mode: stockMode, value: stockValue } } : {}),
    ...(status !== "keep" ? { status } : {}),
  };
  const hasChange = Boolean(edit.price || edit.stock || edit.status);
  const after = useMemo(() => (hasChange ? bulkEditProducts(products, products.map((p) => p.id), edit) : products), [products, hasChange, priceMode, priceValue, alsoCompare, stockMode, stockValue, status]); // eslint-disable-line react-hooks/exhaustive-deps
  const changed = products.map((p, i) => ({ before: p, after: after[i] as CommerceProduct })).filter(({ before, after: a }) => JSON.stringify([before.variants, before.status]) !== JSON.stringify([a.variants, a.status]));
  const shown = changed.slice(0, 6);

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (hasChange) void onApply(edit);
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.bulkTitle(n(products.length))}</DialogTitle>
            <DialogDescription>{t.bulkDescription}</DialogDescription>
          </DialogHeader>

          <fieldset className="grid gap-3 rounded-card border border-border p-3">
            <legend className="px-1 text-label text-foreground">{t.bulkPrice}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t.bulkPrice}</FieldLabel>
                <Select items={[{ value: "keep", label: t.keep }, ...PRICE_MODES.map((m) => ({ value: m, label: t.priceModes[m] }))]} value={priceMode} disabled={busy} onValueChange={(v) => v && setPriceMode(v as typeof priceMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">{t.keep}</SelectItem>
                    {PRICE_MODES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {t.priceModes[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {priceMode !== "keep" ? (
                <Field>
                  <FieldLabel>{percentMode ? t.percent : t.amount}</FieldLabel>
                  {percentMode ? <Input ltr inputMode="decimal" value={percentText} disabled={busy} onChange={(e) => setPercentText(e.target.value)} placeholder="10" /> : <CurrencyInput currency={currency} value={amount} disabled={busy} onValueChange={setAmount} aria-label={t.amount} />}
                </Field>
              ) : null}
            </div>
            {priceMode !== "keep" ? (
              <label className="flex items-center gap-2 text-body-sm">
                <Switch checked={alsoCompare} onCheckedChange={setAlsoCompare} disabled={busy} />
                {t.alsoCompareAt}
              </label>
            ) : null}
          </fieldset>

          <fieldset className="grid gap-3 rounded-card border border-border p-3">
            <legend className="px-1 text-label text-foreground">{t.bulkStock}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t.bulkStock}</FieldLabel>
                <Select items={[{ value: "keep", label: t.keep }, ...STOCK_MODES.map((m) => ({ value: m, label: t.stockModes[m] }))]} value={stockMode} disabled={busy} onValueChange={(v) => v && setStockMode(v as typeof stockMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">{t.keep}</SelectItem>
                    {STOCK_MODES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {t.stockModes[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {stockMode !== "keep" ? (
                <Field>
                  <FieldLabel>{t.quantity}</FieldLabel>
                  <Input ltr inputMode="numeric" value={stockText} disabled={busy} onChange={(e) => setStockText(e.target.value)} placeholder="0" />
                </Field>
              ) : null}
            </div>
          </fieldset>

          <Field>
            <FieldLabel>{t.bulkStatus}</FieldLabel>
            <Select items={[{ value: "keep", label: t.keep }, ...(["active", "draft", "archived"] as const).map((s) => ({ value: s, label: t.statuses[s] }))]} value={status} disabled={busy} onValueChange={(v) => v && setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">{t.keep}</SelectItem>
                {(["active", "draft", "archived"] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {t.statuses[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <section aria-label={t.preview} aria-live="polite" className="rounded-card border border-border bg-nq-surface-soft p-3">
            <h3 className="mb-2 text-label text-foreground">{t.preview}</h3>
            {changed.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">{t.previewEmpty}</p>
            ) : (
              <ul className="grid gap-1.5">
                {shown.map(({ before, after: a }) => {
                  const pb = priceRange(before);
                  const pa = priceRange(a);
                  const sb = stockSummary(before.variants);
                  const sa = stockSummary(a.variants);
                  return (
                    <li key={before.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-sm">
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{t.previewRow(before.name)}</span>
                      {pb && pa && (pb[0] !== pa[0] || pb[1] !== pa[1]) ? (
                        <span className="whitespace-nowrap text-muted-foreground">
                          <Money minor={pb[0]} currency={currency} /> → <span className="text-foreground"><Money minor={pa[0]} currency={currency} /></span>
                        </span>
                      ) : null}
                      {sb.total !== sa.total ? (
                        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                          {n(sb.total)} → <span className="text-foreground">{n(sa.total)}</span>
                        </span>
                      ) : null}
                      {statusOf(before) !== statusOf(a) ? (
                        <span className="whitespace-nowrap text-muted-foreground">
                          {t.statuses[statusOf(before)]} → <span className="text-foreground">{t.statuses[statusOf(a)]}</span>
                        </span>
                      ) : null}
                    </li>
                  );
                })}
                {changed.length > shown.length ? <li className="text-caption text-muted-foreground">+{n(changed.length - shown.length)}</li> : null}
              </ul>
            )}
          </section>

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
            <Button type="submit" variant="primary" loading={busy} disabled={!hasChange}>
              {t.applyToProducts(n(products.length))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
