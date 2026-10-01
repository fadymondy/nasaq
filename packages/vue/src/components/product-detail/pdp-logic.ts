/*
 * Pure product-page logic that sits beyond lib/commerce.ts: the initial variant selection, auto-picking a
 * lone value, keeping a selection possible, the image for a selection, stock wording, quantity limits,
 * delivery dates and gallery gestures. No React and no sibling runtime imports, so node tests can load it.
 * Money stays in integer minor units.
 */
import {
  type CommerceDeliveryWindow,
  type CommerceDisplayPrice,
  type CommerceProduct,
  type CommerceSelection,
  type CommerceStockState,
  type CommerceVariant,
  commerceAutoSelectSingle,
  commerceClampQuantity,
  commerceDeliveryWindow,
  commerceDisplayPrice,
  commerceInStock,
  commerceSelectOptionValue,
  commerceStockState,
} from "./commerce";

/**
 * The selection a product page opens with. A preferred variant wins when it exists; otherwise the first
 * in-stock variant, otherwise the first variant. Pass `blank: true` to open with nothing picked (only lone
 * values are auto-picked), for products where the shopper must choose, such as a size.
 */
export function initialSelection(product: CommerceProduct, opts: { variantId?: string; blank?: boolean } = {}): CommerceSelection {
  if (opts.blank) return autoSelectSingle(product, {});
  const preferred = opts.variantId ? product.variants.find((v) => v.id === opts.variantId) : undefined;
  const variant = preferred ?? product.variants.find((v) => commerceInStock(v)) ?? product.variants[0];
  if (!variant) return {};
  const selection: CommerceSelection = {};
  for (const option of product.options) selection[option.id] = variant.options[option.id];
  return selection;
}

/** Sets one value and keeps the selection possible. Promoted to the shared model as `commerceSelectOptionValue`. */
export const selectOptionValue = commerceSelectOptionValue;

/** Picks the only sensible value on every axis that has one reachable value. Promoted to the shared model as `commerceAutoSelectSingle`. */
export const autoSelectSingle = commerceAutoSelectSingle;

/** The option axes still waiting for a pick, in display order. */
export function missingOptions(product: CommerceProduct, selection: CommerceSelection) {
  return product.options.filter((o) => !selection[o.id]);
}

/** "Black · M": the selected value labels in axis order. Unpicked axes are skipped. */
export function selectionLabel(product: CommerceProduct, selection: CommerceSelection): string {
  return product.options
    .map((o) => o.values.find((v) => v.id === selection[o.id])?.label)
    .filter((label): label is string => Boolean(label))
    .join(" · ");
}

/**
 * The image the gallery should show for a selection: the variant's own image, else the picked value's
 * image on any axis that has one (usually colour), else undefined so the gallery keeps its current slide.
 */
export function imageForSelection(product: CommerceProduct, selection: CommerceSelection, variant?: CommerceVariant): string | undefined {
  if (variant?.image) return variant.image;
  for (const option of product.options) {
    const picked = option.values.find((v) => v.id === selection[option.id]);
    if (picked?.image) return picked.image;
  }
  return undefined;
}

/** Index of an image URL in the gallery, or -1 when the gallery has no such image. */
export function galleryIndexForImage(images: readonly { src: string }[], src: string | undefined): number {
  return src ? images.findIndex((i) => i.src === src) : -1;
}

/** Stock wording state. Promoted to the shared model as `commerceStockState`. */
export type StockState = CommerceStockState;
export const stockState = commerceStockState;

/** The most the stepper allows: stock (unless backorder or untracked), then the per-order cap. Undefined means no limit. */
export function maxPurchasable(variant: CommerceVariant | undefined, perOrderCap?: number): number | undefined {
  const stock = variant && variant.stock !== undefined && !variant.allowBackorder ? Math.max(variant.stock, 0) : undefined;
  if (stock === undefined) return perOrderCap;
  return perOrderCap === undefined ? stock : Math.min(stock, perOrderCap);
}

/** Clamp a typed quantity to 1..max, reading blank or junk as 1. */
export function clampPurchaseQuantity(quantity: number, variant: CommerceVariant | undefined, perOrderCap?: number): number {
  return commerceClampQuantity(quantity, maxPurchasable(variant, perOrderCap));
}

/** Price to show for the current selection. Promoted to the shared model as `commerceDisplayPrice`. */
export type DisplayPrice = CommerceDisplayPrice;
export const displayPrice = commerceDisplayPrice;

/** Delivery window from an order time and a range of days. Promoted to the shared model as `commerceDeliveryWindow`. */
export type DeliveryWindow = CommerceDeliveryWindow;
export const deliveryWindow = commerceDeliveryWindow;

export type SwipeResult = "next" | "prev" | null;

/**
 * Decides whether a touch or pointer drag is a gallery swipe. Vertical drags (scrolling) and short drags
 * are ignored. Dragging toward the start edge moves forward: left in LTR, right in RTL.
 */
export function resolveSwipe(dx: number, dy: number, opts: { threshold?: number; rtl?: boolean } = {}): SwipeResult {
  const threshold = opts.threshold ?? 40;
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.2) return null;
  const towardStart = opts.rtl ? dx > 0 : dx < 0;
  return towardStart ? "next" : "prev";
}

/** Move by `delta` slides, wrapping at the ends. Empty galleries stay at 0. */
export function stepIndex(index: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return (((index + delta) % length) + length) % length;
}

/** Zoom origin in percent from a pointer position inside a rect, clamped to 0..100. */
export function zoomOrigin(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): { x: number; y: number } {
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  return {
    x: rect.width ? clamp(((clientX - rect.left) / rect.width) * 100) : 50,
    y: rect.height ? clamp(((clientY - rect.top) / rect.height) * 100) : 50,
  };
}
