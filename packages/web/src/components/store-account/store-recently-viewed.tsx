"use client";

import { Clock, ImageOff, X } from "lucide-react";
import { cn } from "../../lib/cn";
import type { CommerceProduct } from "../../lib/commerce";
import { Button } from "../button";
import { EmptyState, Skeleton } from "../states";
import { StoreMoney } from "../store-orders-admin/money";
import { type StoreAccountLabels, useStoreAccountStrings } from "./account-strings";
import { useCurrency } from "../../provider/nasaq-provider";

export interface StoreRecentlyViewedProps {
  /** Product ids, most recent first (see `pushRecentlyViewed`). Ids that are no longer in the catalogue are skipped. */
  ids: readonly string[];
  products: readonly CommerceProduct[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  onOpenProduct?: (product: CommerceProduct) => void;
  onRemove?: (id: string) => void;
  onClear?: () => void;
  loading?: boolean;
  labels?: StoreAccountLabels;
  className?: string;
}

/** Products the shopper looked at, newest first, with a way to drop one or clear the list. */
export function StoreRecentlyViewed({ ids, products, currency: currencyProp, onOpenProduct, onRemove, onClear, loading, labels, className }: StoreRecentlyViewedProps) {
  const currency = useCurrency(currencyProp);
  const { t } = useStoreAccountStrings(labels);
  const shown = ids.map((id) => products.find((p) => p.id === id && p.status !== "archived")).filter((p): p is CommerceProduct => !!p);
  return (
    <section data-slot="store-recently-viewed" aria-label={t.recentTitle} className={cn("flex min-w-0 flex-col gap-3", className)}>
      {shown.length > 0 && onClear ? (
        <Button size="sm" variant="ghost" className="self-end" onClick={onClear}>
          {t.clearAll}
        </Button>
      ) : null}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy>
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState icon={Clock} title={t.recentEmpty} description={t.recentEmptyText} />
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((product) => {
            const prices = product.variants.map((v) => v.price);
            const min = Math.min(...prices);
            const image = product.images[0];
            return (
              <li key={product.id} className="group relative flex flex-col gap-2 rounded-card border border-border bg-card p-2">
                <button type="button" onClick={() => onOpenProduct?.(product)} aria-label={`${t.viewProduct}: ${product.name}`} className="flex flex-col gap-2 text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                  <span className="flex aspect-square items-center justify-center overflow-hidden rounded-control bg-secondary">
                    {image ? <img src={image.src} alt="" className="size-full object-cover" /> : <ImageOff aria-hidden className="size-6 text-muted-foreground" />}
                  </span>
                  <span className="line-clamp-2 text-body-sm font-medium">{product.name}</span>
                  <StoreMoney amount={min} currency={currency} className="text-body-sm text-muted-foreground" />
                </button>
                {onRemove ? (
                  <Button size="icon-sm" variant="secondary" aria-label={`${t.remove}: ${product.name}`} className="absolute end-3 top-3" onClick={() => onRemove(product.id)}>
                    <X aria-hidden />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
