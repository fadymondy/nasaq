"use client";

import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceProduct } from "../../lib/commerce";
import { Badge } from "../badge";
import { Button } from "../button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../dialog";
import { Icon } from "../icon";
import { useFormatNumber } from "../numeric";
import { Rating } from "../rating";
import { Switch } from "../switch";
import { listingCompareDifferences, listingCompareRows } from "./listing-model";
import { fillTemplate, type ListingLabels, useListingStrings } from "./listing-strings";
import { StoreProductImage, StorePrice } from "./store-product-card";

export interface StoreCompareTrayProps {
  /** The products picked for comparison, in pick order. */
  products: readonly CommerceProduct[];
  /** Most products that can be compared. Default 4. */
  max?: number;
  onRemove: (product: CommerceProduct) => void;
  onClear: () => void;
  /** Opens the comparison. Enabled from two products. */
  onCompare: () => void;
  labels?: ListingLabels;
  className?: string;
}

/** A bar pinned to the bottom of the listing while products are picked: thumbnails, remove, clear and Compare. */
export function StoreCompareTray({ products, max = 4, onRemove, onClear, onCompare, labels, className }: StoreCompareTrayProps) {
  const { t } = useListingStrings(labels);
  const fmt = useFormatNumber();
  if (!products.length) return null;
  const slots = Array.from({ length: max }, (_, i) => products[i]);
  return (
    <section
      data-slot="store-compare-tray"
      aria-label={t.compareTray}
      className={cn("sticky bottom-3 z-30 mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 rounded-floating border border-border bg-popover p-3 shadow-floating", className)}
    >
      <ul className="flex min-w-0 basis-full items-center gap-2 sm:flex-1 sm:basis-0">
        {slots.map((p, i) => (
          <li key={p?.id ?? `slot-${i}`} className="relative">
            {p ? (
              <>
                <div className="size-12 overflow-hidden rounded-control border border-border bg-secondary sm:size-14">
                  <StoreProductImage src={p.images[0]?.src} alt={p.name} />
                </div>
                <button
                  type="button"
                  aria-label={fillTemplate(t.compareRemove, { name: p.name })}
                  onClick={() => onRemove(p)}
                  className="absolute -end-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </>
            ) : (
              <div title={t.compareEmptySlot} className="size-12 rounded-control border border-dashed border-border sm:size-14" />
            )}
          </li>
        ))}
      </ul>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-caption text-muted-foreground sm:flex-none sm:items-end" role="status" aria-live="polite">
        <span>{fillTemplate(t.compareCount, { n: fmt(products.length), max: fmt(max) })}</span>
        {products.length < 2 ? <span>{t.compareNeedTwo}</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t.clearAll}
        </Button>
        <Button variant="primary" size="sm" disabled={products.length < 2} onClick={onCompare}>
          {fillTemplate(t.compareNow, { n: fmt(products.length) })}
        </Button>
      </div>
    </section>
  );
}

export interface StoreCompareTableProps {
  products: readonly CommerceProduct[];
  currency: string;
  onRemove?: (product: CommerceProduct) => void;
  onAddToCart?: (product: CommerceProduct) => void;
  /** Start with only the differing rows. Default false. */
  differencesOnly?: boolean;
  labels?: ListingLabels;
  className?: string;
}

/** Products side by side: price, brand, category, rating, availability, each option and the description. Differing rows are marked. */
export function StoreCompareTable({ products, currency, onRemove, onAddToCart, differencesOnly = false, labels, className }: StoreCompareTableProps) {
  const { t } = useListingStrings(labels);
  const fmt = useFormatNumber();
  const [onlyDiff, setOnlyDiff] = useState(differencesOnly);
  const all = useMemo(() => listingCompareRows(products), [products]);
  const rows = onlyDiff ? listingCompareDifferences(all, products.length) : all;
  const rowLabel = (kind: string, label?: string) =>
    label ?? ({ price: t.priceRow, brand: t.brandRow, category: t.categoryRow, rating: t.ratingRow, availability: t.availabilityRow, description: t.descriptionRow } as Record<string, string>)[kind] ?? kind;

  return (
    <div data-slot="store-compare-table" className={cn("flex flex-col gap-3", className)}>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-body-sm">
        <Switch checked={onlyDiff} onCheckedChange={setOnlyDiff} />
        {t.onlyDifferences}
      </label>
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[36rem] table-fixed border-collapse text-start text-body-sm">
          <thead>
            <tr className="align-top">
              <th scope="col" className="w-32 bg-secondary p-3 text-start text-label text-muted-foreground sm:w-40">
                {t.attribute}
              </th>
              {products.map((p) => (
                <th key={p.id} scope="col" className="border-s border-border p-3 text-start font-normal">
                  <div className="flex flex-col gap-2">
                    <div className="aspect-square w-full max-w-32 overflow-hidden rounded-control bg-secondary">
                      <StoreProductImage src={p.images[0]?.src} alt={p.name} />
                    </div>
                    <p className="text-label text-foreground">{p.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {onAddToCart ? (
                        <Button size="sm" variant="primary" onClick={() => onAddToCart(p)}>
                          {t.addToCart}
                        </Button>
                      ) : null}
                      {onRemove ? (
                        <Button size="sm" variant="ghost" aria-label={fillTemplate(t.compareRemove, { name: p.name })} onClick={() => onRemove(p)}>
                          <Icon icon={X} />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border align-top" data-differs={row.differs || undefined}>
                <th scope="row" className={cn("bg-secondary p-3 text-start font-medium text-foreground", row.differs && "border-s-2 border-s-primary")}>
                  {rowLabel(row.kind, row.label)}
                  {row.differs ? <span className="sr-only"> ({t.compareTitle})</span> : null}
                </th>
                {row.cells.map((cell, i) => {
                  const p = products[i];
                  return (
                    <td key={p?.id ?? i} className={cn("border-s border-border p-3", row.differs && "bg-nq-selected/40")}>
                      {row.kind === "price" && typeof cell === "number" ? (
                        <StorePrice amount={cell} currency={currency} labels={labels ?? {}} />
                      ) : row.kind === "rating" && typeof cell === "number" && p?.rating ? (
                        <Rating value={cell} count={p.rating.count} countLabel={t.reviews} />
                      ) : row.kind === "availability" ? (
                        cell ? (
                          <Badge variant="success">
                            <Icon icon={Check} />
                            {t.inStock}
                          </Badge>
                        ) : (
                          <Badge variant="danger">{t.outOfStock}</Badge>
                        )
                      ) : cell === null || cell === "" ? (
                        <span className="text-muted-foreground">{t.none}</span>
                      ) : (
                        <span>{typeof cell === "number" ? fmt(cell) : String(cell)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={products.length + 1} className="p-6 text-center text-muted-foreground">
                  {t.noDifferences}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface StoreCompareDialogProps extends Omit<StoreCompareTableProps, "className"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The compare table in a wide dialog. */
export function StoreCompareDialog({ open, onOpenChange, ...table }: StoreCompareDialogProps) {
  const { t } = useListingStrings(table.labels);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-slot="store-compare-dialog" closeLabel={t.close} className="max-w-5xl">
        <div className="flex flex-col gap-1 pe-8">
          <DialogTitle>{t.compareTitle}</DialogTitle>
          <DialogDescription>{t.compareDescription}</DialogDescription>
        </div>
        <StoreCompareTable {...table} />
      </DialogContent>
    </Dialog>
  );
}
