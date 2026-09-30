"use client";

import { Bell, BellRing, Heart, ImageOff, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { cn } from "../../lib/cn";
import type { CommerceProduct } from "../../lib/commerce";
import { Badge } from "../badge";
import { Button } from "../button";
import { DateTime, Num } from "../numeric";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { StoreMoney } from "../store-orders-admin/money";
import { type WishlistEntry, type WishlistItem, backInStock, wishlistEntries } from "./account-logic";
import { type StoreAccountLabels, useStoreAccountStrings } from "./account-strings";

export interface StoreWishlistProps {
  items: readonly WishlistItem[];
  products: readonly CommerceProduct[];
  currency: string;
  onMoveToCart?: (entry: WishlistEntry) => void;
  onToggleNotify?: (item: WishlistItem) => void;
  onRemove?: (item: WishlistItem) => void;
  onOpenProduct?: (product: CommerceProduct) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  labels?: StoreAccountLabels;
  className?: string;
}

/** Saved products with live availability. Move an item to the cart, ask to be told when a sold-out item returns. */
export function StoreWishlist({ items, products, currency, onMoveToCart, onToggleNotify, onRemove, onOpenProduct, loading, error, onRetry, labels, className }: StoreWishlistProps) {
  const { t } = useStoreAccountStrings(labels);
  const entries = useMemo(() => wishlistEntries(items, products), [items, products]);
  const returned = useMemo(() => backInStock(items, products), [items, products]);

  if (error) {
    return (
      <ErrorState
        title={t.loadError}
        actions={
          onRetry ? (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              {t.retry}
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <section data-slot="store-wishlist" aria-label={t.wishlistTitle} className={cn("flex min-w-0 flex-col gap-4", className)}>
      {returned.length > 0 ? (
        <p role="status" className="m-0 flex items-center gap-2 rounded-card border border-border bg-secondary px-3 py-2 text-body-sm font-medium">
          <BellRing aria-hidden className="size-4" />
          {t.backInStock(returned.length)}
        </p>
      ) : null}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-busy>
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState icon={Heart} title={t.wishlistEmpty} description={t.wishlistEmptyText} />
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {entries.map((entry) => {
            const { item, product, variant } = entry;
            const image = variant?.image ?? product?.images[0]?.src;
            const availability = {
              "in-stock": <Badge variant="success">{t.inStock}</Badge>,
              low: <Badge variant="warning">{t.lowStock(entry.stock ?? 0)}</Badge>,
              out: <Badge variant="neutral">{t.outOfStock}</Badge>,
              unavailable: <Badge variant="danger">{t.unavailable}</Badge>,
            }[entry.availability];
            return (
              <li key={item.id} className="flex gap-3 rounded-card border border-border bg-card p-3">
                <button
                  type="button"
                  disabled={!product}
                  onClick={() => product && onOpenProduct?.(product)}
                  aria-label={product?.name}
                  className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
                >
                  {image ? <img src={image} alt="" className={cn("size-full object-cover", entry.availability === "out" && "opacity-60")} /> : <ImageOff aria-hidden className="size-6 text-muted-foreground" />}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="truncate font-medium">{product?.name ?? "-"}</span>
                  {variant ? (
                    <span className="flex flex-wrap items-baseline gap-x-2 text-body-sm">
                      <StoreMoney amount={variant.price} currency={currency} className="font-semibold" />
                      {entry.priceDrop > 0 && item.priceWhenSaved !== undefined ? (
                        <>
                          <Badge variant="success">{t.priceDropped}</Badge>
                          <span className="text-muted-foreground line-through">
                            <span className="sr-only">{t.was} </span>
                            <StoreMoney amount={item.priceWhenSaved} currency={currency} />
                          </span>
                        </>
                      ) : null}
                    </span>
                  ) : null}
                  <span className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                    {availability}
                    <span>
                      {t.savedOn} <DateTime value={item.addedAt} format={{ dateStyle: "medium" }} />
                    </span>
                  </span>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    {entry.canMoveToCart ? (
                      <Button size="sm" variant="primary" onClick={() => onMoveToCart?.(entry)}>
                        <ShoppingCart aria-hidden />
                        {t.moveToCart}
                      </Button>
                    ) : null}
                    {entry.canNotify ? (
                      <Button size="sm" variant="secondary" aria-pressed={!!item.notify} onClick={() => onToggleNotify?.(item)}>
                        {item.notify ? <BellRing aria-hidden /> : <Bell aria-hidden />}
                        {item.notify ? t.notifying : t.notifyMe}
                      </Button>
                    ) : null}
                    <Button size="icon-sm" variant="ghost" aria-label={`${t.remove}: ${product?.name ?? ""}`} onClick={() => onRemove?.(item)}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {entries.length > 0 ? (
        <p className="m-0 text-caption text-muted-foreground">
          <Num value={entries.length} /> {t.items}
        </p>
      ) : null}
    </section>
  );
}
