"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import {
  type CommerceProduct,
  type CommerceSelection,
  type CommerceVariant,
  commerceClampQuantity,
  commerceFindVariant,
  commerceInStock,
} from "../../lib/commerce";
import { Badge } from "../badge";
import { Button } from "../button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../dialog";
import { Icon } from "../icon";
import { useFormatNumber } from "../numeric";
import { Rating } from "../rating";
import { listingCheapestVariant, listingHasPriceRange } from "./listing-model";
import { fillTemplate, type ListingLabels, useListingStrings } from "./listing-strings";
import { StoreProductImage, StoreOptionPicker, StorePrice } from "./store-product-card";

export interface StoreQuickViewProps {
  /** The product to show. `null` keeps the dialog closed. */
  product: CommerceProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ISO 4217 code; prices are integer minor units. */
  currency: string;
  /** Full product page. Shows a "View full details" link when given. */
  href?: string;
  /** Adds the chosen variant and quantity. Awaited so the button can show progress. */
  onAddToCart?: (product: CommerceProduct, variant: CommerceVariant, quantity: number) => void | Promise<void>;
  /** Closes the dialog after a successful add. Default true. */
  closeOnAdd?: boolean;
  /** Stock at or under this shows "Only n left". Default 5. */
  lowStockAt?: number;
  labels?: ListingLabels;
}

function firstAvailable(product: CommerceProduct): CommerceSelection {
  const start = product.variants.find((v) => commerceInStock(v)) ?? product.variants[0];
  return start ? { ...start.options } : {};
}

/**
 * A dialog with the gallery, options, price, stock and quantity of one product, so a shopper can add it without
 * leaving the listing. Options start on the first in-stock variant, so the add button is usable at once.
 */
export function StoreQuickView({ product, open, onOpenChange, currency, href, onAddToCart, closeOnAdd = true, lowStockAt = 5, labels }: StoreQuickViewProps) {
  const { t } = useListingStrings(labels);
  const fmt = useFormatNumber();
  const [selection, setSelection] = useState<CommerceSelection>({});
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState("");
  const id = product?.id;

  useEffect(() => {
    if (!product) return;
    setSelection(firstAvailable(product));
    setQuantity(1);
    setImage(0);
    setLive("");
  }, [id]);

  if (!product) return null;
  const variant = commerceFindVariant(product, selection);
  const shown = variant ?? listingCheapestVariant(product);
  const inStock = commerceInStock(variant);
  const max = variant?.stock !== undefined && !variant.allowBackorder ? Math.max(variant.stock, 1) : 99;
  const qty = commerceClampQuantity(quantity, max);
  const missing = product.options.find((o) => !selection[o.id]);
  const gallery = product.images;
  const variantImage = variant?.image;
  const current = variantImage && image === 0 ? { src: variantImage, alt: product.name } : (gallery[image] ?? gallery[0]);

  const pick = (optionId: string, valueId: string) => {
    setSelection((s) => ({ ...s, [optionId]: valueId }));
    setImage(0);
    setQuantity(1);
  };

  const add = async () => {
    if (!variant || !inStock || !onAddToCart) return;
    setBusy(true);
    try {
      await onAddToCart(product, variant, qty);
      setLive(fillTemplate(t.addedLive, { name: product.name }));
      if (closeOnAdd) onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const stockLine = !variant
    ? missing
      ? fillTemplate(t.selectOption, { option: missing.name })
      : t.unavailableCombo
    : !inStock
      ? t.outOfStock
      : variant.stock !== undefined && !variant.allowBackorder && variant.stock <= lowStockAt
        ? fillTemplate(t.lowStock, { n: fmt(variant.stock) })
        : t.inStock;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-slot="store-quick-view" className="max-w-3xl p-0 sm:p-0" closeLabel={t.close}>
        <div className="grid gap-0 md:grid-cols-2">
          <div className="flex flex-col gap-2 p-4 md:p-6" role="group" aria-label={t.gallery}>
            <div className="aspect-square overflow-hidden rounded-card bg-secondary">
              <StoreProductImage src={current?.src} alt={current?.alt ?? product.name} eager />
            </div>
            {gallery.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto">
                {gallery.map((img, i) => (
                  <button
                    key={`${img.src}-${i}`}
                    type="button"
                    aria-label={fillTemplate(t.showImage, { n: fmt(i + 1) })}
                    aria-current={i === image}
                    onClick={() => setImage(i)}
                    className={cn(
                      "size-14 shrink-0 overflow-hidden rounded-control border bg-secondary outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                      i === image ? "border-primary" : "border-border",
                    )}
                  >
                    <StoreProductImage src={img.src} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-4 p-4 pt-0 md:p-6 md:ps-2">
            <div className="flex flex-col gap-1.5 pe-8">
              {product.brand ? <p className="text-caption text-muted-foreground">{product.brand}</p> : null}
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription className="sr-only">{t.quickViewTitle}</DialogDescription>
              {product.rating ? <Rating value={product.rating.average} count={product.rating.count} countLabel={t.reviews} /> : null}
            </div>
            {shown ? (
              <StorePrice amount={shown.price} currency={currency} size="lg" from={!variant && listingHasPriceRange(product)} {...(shown.compareAt !== undefined ? { compareAt: shown.compareAt } : {})} labels={labels ?? {}} />
            ) : null}
            {product.description ? <p className="text-body-sm text-muted-foreground">{product.description}</p> : null}

            {product.options.map((o) => (
              <StoreOptionPicker key={o.id} product={product} option={o} selection={selection} onSelect={pick} showLabel labels={labels ?? {}} />
            ))}

            <div className="flex flex-wrap items-center gap-3">
              <div role="group" aria-label={t.quantity} className="inline-flex h-control items-center rounded-control border border-border">
                <Button size="icon-sm" variant="ghost" aria-label={t.decrease} disabled={qty <= 1} onClick={() => setQuantity(qty - 1)} className="rounded-e-none">
                  <Icon icon={Minus} />
                </Button>
                <output aria-live="polite" className="min-w-8 text-center text-label tabular-nums">
                  <bdi>{fmt(qty)}</bdi>
                </output>
                <Button size="icon-sm" variant="ghost" aria-label={t.increase} disabled={qty >= max} onClick={() => setQuantity(qty + 1)} className="rounded-s-none">
                  <Icon icon={Plus} />
                </Button>
              </div>
              <Badge variant={!variant ? "neutral" : inStock ? "success" : "danger"}>{stockLine}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onAddToCart ? (
                <Button variant="primary" loading={busy} disabled={!variant || !inStock} onClick={add} className="min-w-40 flex-1 sm:flex-none">
                  {t.addToCart}
                </Button>
              ) : null}
              {href ? (
                <Button variant="secondary" render={<a href={href} />} nativeButton={false}>
                  {t.viewDetails}
                </Button>
              ) : null}
            </div>
            <p className="sr-only" role="status" aria-live="polite">
              {live}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
