"use client";

import { BadgeCheck, Heart, LifeBuoy, RotateCcw, Share2, ShieldCheck, Truck, TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "../../lib/cn";
import { type CommerceProduct, type CommerceSelection, type CommerceVariant, commerceFindVariant, commerceInStock } from "../../lib/commerce";
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "../accordion";
import { Badge } from "../badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../breadcrumb";
import { Button } from "../button";
import { formatDateRange, useFormatNumber } from "../numeric";
import { Price } from "../price";
import { Rating } from "../rating";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import {
  clampPurchaseQuantity,
  deliveryWindow,
  displayPrice,
  galleryIndexForImage,
  imageForSelection,
  initialSelection,
  maxPurchasable,
  missingOptions,
  stockState,
} from "./pdp-logic";
import { type ProductDetailLabels, usePdpStrings } from "./pdp-strings";
import { ProductGallery } from "./product-gallery";
import { ProductQuantityStepper } from "./quantity-stepper";
import { ProductSizeGuide, type ProductSizeGuideData } from "./size-guide";
import { ProductVariantPicker } from "./variant-picker";
import { useCurrency } from "../../provider/nasaq-provider";

export interface ProductBreadcrumb {
  label: string;
  href?: string;
}

export interface ProductSpec {
  label: string;
  value: ReactNode;
}

export interface ProductDeliveryCity {
  id: string;
  label: string;
  /** Delivery days range to this city. */
  etaDays: [number, number];
  /** Delivery fee in minor units. 0 or omitted with `freeOver` reached = free. */
  fee?: number;
}

export interface ProductDeliveryConfig {
  cities: readonly ProductDeliveryCity[];
  defaultCityId?: string;
  /** 0 = Sunday … 6 = Saturday, not counted as delivery days (Egypt: 5 and 6). */
  skipWeekdays?: readonly number[];
  /** UTC hour after which an order counts from the next day. */
  cutoffHour?: number;
  /** "Now" for the estimate. Pass a fixed date in stories and tests. Default: the current time. */
  now?: Date | string | number;
}

export type ProductTrustIcon = "secure" | "returns" | "delivery" | "authentic" | "support";
export interface ProductTrustBadge {
  id: string;
  icon?: ProductTrustIcon;
  label: string;
  description?: string;
}

const TRUST_ICON = { secure: ShieldCheck, returns: RotateCcw, delivery: Truck, authentic: BadgeCheck, support: LifeBuoy } as const;

export type ProductActionResult = void | { error?: string };

export interface ProductDetailProps {
  product: CommerceProduct;
  /** ISO 4217 code of the store currency. */
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Digits after the decimal point of the currency's minor unit. Default 2. */
  currencyExponent?: number;
  /** Open on this variant (default: the first one in stock). */
  defaultVariantId?: string;
  /** Open with nothing picked, so the shopper must choose a size or colour first. */
  blankSelection?: boolean;
  /** Called after each selection change with the matching variant, if the selection is complete. */
  onVariantChange?: (variant: CommerceVariant | undefined, selection: CommerceSelection) => void;
  /** Add the chosen variant and quantity to the cart. Return `{ error }` or throw to show a failure. */
  onAddToCart: (variant: CommerceVariant, quantity: number) => ProductActionResult | Promise<ProductActionResult>;
  /** Skip the cart and go straight to checkout. Omit to hide "Buy now". */
  onBuyNow?: (variant: CommerceVariant, quantity: number) => ProductActionResult | Promise<ProductActionResult>;
  wishlisted?: boolean;
  defaultWishlisted?: boolean;
  /** Omit both wishlist props to hide the heart button. */
  onWishlistChange?: (wishlisted: boolean) => void | Promise<void>;
  /** Replace the default share (Web Share, else copy the link). */
  onShare?: () => void;
  shareUrl?: string;
  breadcrumbs?: readonly ProductBreadcrumb[];
  sizeGuide?: ProductSizeGuideData;
  /** The option axis the size guide belongs to. Default "size". */
  sizeGuideOptionId?: string;
  /** "hide" (default) removes impossible values from the picker; "disable" greys them out. */
  impossible?: "hide" | "disable";
  /** Stock at or below this reads as low stock. Default 5. */
  lowStockThreshold?: number;
  /** Most units one order may hold, on top of stock. */
  maxPerOrder?: number;
  delivery?: ProductDeliveryConfig;
  /** Long description. Default: `product.description`. */
  description?: ReactNode;
  specs?: readonly ProductSpec[];
  /** Shipping and returns copy. The tab is omitted without it. */
  shippingInfo?: ReactNode;
  /** "auto" (default): tabs from 768px, an accordion below. */
  sections?: "auto" | "tabs" | "accordion";
  /** `false` hides the row; default shows four generic badges. */
  trustBadges?: readonly ProductTrustBadge[] | false;
  /** Reviews and questions (ProductReviews, ProductQA). Rendered under the sections with id="reviews". */
  reviews?: ReactNode;
  /** Slot for related products, under everything else. */
  related?: ReactNode;
  relatedTitle?: string;
  /** Fixed add-to-cart bar on phones once the main button scrolls away. Default true. */
  stickyBar?: boolean;
  className?: string;
  labels?: ProductDetailLabels;
}

const query = "(min-width: 768px)";
function useWide(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}

/**
 * A complete product page: breadcrumbs, gallery, title, rating, price with compare-at and percent off, variant
 * picker, quantity, stock and delivery lines, add to cart and buy now, wishlist and share, trust badges, a
 * mobile sticky add bar, a size guide, description, specifications and shipping sections, and slots for
 * reviews and related products. It holds no cart: `onAddToCart(variant, qty)` is the only hook out.
 */
export function ProductDetail({
  product,
  currency: currencyProp,
  currencyExponent = 2,
  defaultVariantId,
  blankSelection,
  onVariantChange,
  onAddToCart,
  onBuyNow,
  wishlisted,
  defaultWishlisted = false,
  onWishlistChange,
  onShare,
  shareUrl,
  breadcrumbs,
  sizeGuide,
  sizeGuideOptionId = "size",
  impossible = "hide",
  lowStockThreshold = 5,
  maxPerOrder,
  delivery,
  description,
  specs,
  shippingInfo,
  sections = "auto",
  trustBadges,
  reviews,
  related,
  relatedTitle,
  stickyBar = true,
  className,
  labels,
}: ProductDetailProps) {
  const currency = useCurrency(currencyProp);
  const { t, locale } = usePdpStrings(labels);
  const fmt = useFormatNumber();
  const wide = useWide();
  const ctaRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const statusId = useId();

  const [selection, setSelection] = useState<CommerceSelection>(() => initialSelection(product, { variantId: defaultVariantId, blank: blankSelection }));
  const variant = commerceFindVariant(product, selection);
  const [galleryIndex, setGalleryIndex] = useState(() => Math.max(galleryIndexForImage(product.images, imageForSelection(product, selection, variant)), 0));
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState<"add" | "buy" | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error" | "info"; text: string } | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [cityId, setCityId] = useState(delivery?.defaultCityId ?? delivery?.cities[0]?.id);
  const [wishInner, setWishInner] = useState(defaultWishlisted);
  const [barVisible, setBarVisible] = useState(false);

  const wish = wishlisted ?? wishInner;
  const stock = stockState(variant, lowStockThreshold);
  const max = maxPurchasable(variant, maxPerOrder);
  const qty = clampPurchaseQuantity(quantity, variant, maxPerOrder);
  const price = displayPrice(product, variant);
  const soldOut = stock.kind === "out";
  const minor = 10 ** currencyExponent;
  const money = (amount: number) => fmt(amount / minor, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: amount % minor === 0 ? 0 : currencyExponent });

  useEffect(() => () => clearTimeout(timer.current), []);

  // Sticky bar: show once the main buttons leave the viewport (only phones render it).
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || !stickyBar || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setBarVisible(entry ? !entry.isIntersecting && entry.boundingClientRect.top < 0 : false), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [stickyBar]);

  const change = (next: CommerceSelection) => {
    setSelection(next);
    setInvalid([]);
    setStatus(null);
    const nextVariant = commerceFindVariant(product, next);
    const at = galleryIndexForImage(product.images, imageForSelection(product, next, nextVariant));
    if (at >= 0) setGalleryIndex(at);
    setQuantity((q) => clampPurchaseQuantity(q, nextVariant, maxPerOrder));
    onVariantChange?.(nextVariant, next);
  };

  const flash = (next: { kind: "ok" | "error" | "info"; text: string } | null) => {
    setStatus(next);
    clearTimeout(timer.current);
    if (next?.kind === "ok" || next?.kind === "info") timer.current = setTimeout(() => setStatus(null), 4000);
  };

  const run = async (kind: "add" | "buy") => {
    if (pending) return;
    if (!variant) {
      const missing = missingOptions(product, selection);
      setInvalid(missing.map((o) => o.id));
      flash({ kind: "error", text: t.pickFirst(missing.map((o) => o.name).join(" / ")) });
      pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!commerceInStock(variant, qty)) return;
    const handler = kind === "add" ? onAddToCart : onBuyNow;
    if (!handler) return;
    setPending(kind);
    flash(null);
    try {
      const result = await handler(variant, qty);
      if (result && typeof result === "object" && result.error) flash({ kind: "error", text: result.error });
      else if (kind === "add") flash({ kind: "ok", text: t.added });
    } catch {
      flash({ kind: "error", text: t.addFailed });
    } finally {
      setPending(null);
    }
  };

  const toggleWish = () => {
    const next = !wish;
    if (wishlisted === undefined) setWishInner(next);
    void onWishlistChange?.(next);
  };

  const share = async () => {
    if (onShare) return onShare();
    const url = shareUrl ?? (typeof location === "undefined" ? "" : location.href);
    try {
      if (typeof navigator !== "undefined" && "share" in navigator && typeof navigator.share === "function") await navigator.share({ title: product.name, url });
      else {
        await navigator.clipboard.writeText(url);
        flash({ kind: "info", text: t.linkCopied });
      }
    } catch {
      /* dismissed */
    }
  };

  const city = delivery?.cities.find((c) => c.id === cityId);
  const eta = useMemo(() => {
    if (!delivery || !city) return null;
    const { from, to } = deliveryWindow(delivery.now ?? Date.now(), city.etaDays, { skipWeekdays: delivery.skipWeekdays, cutoffHour: delivery.cutoffHour });
    return formatDateRange(from, to, locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  }, [delivery, city, locale]);

  const selectedSize = product.options.find((o) => o.id === sizeGuideOptionId)?.values.find((v) => v.id === selection[sizeGuideOptionId])?.label;
  const stockLine =
    stock.kind === "low" ? { text: t.lowStock(fmt(stock.left)), tone: "text-nq-warning-text", dot: "bg-nq-warning" } :
    stock.kind === "in-stock" || stock.kind === "untracked" ? { text: t.inStock, tone: "text-nq-success-text", dot: "bg-nq-success" } :
    stock.kind === "backorder" ? { text: t.backorder, tone: "text-nq-info-text", dot: "bg-nq-info" } :
    stock.kind === "out" ? { text: t.outOfStock, tone: "text-nq-danger-text", dot: "bg-nq-danger" } : null;

  const defaults: ProductTrustBadge[] = [
    { id: "secure", icon: "secure", label: t.trustSecure, description: t.trustSecureText },
    { id: "returns", icon: "returns", label: t.trustReturns, description: t.trustReturnsText },
    { id: "delivery", icon: "delivery", label: t.trustDelivery, description: t.trustDeliveryText },
    { id: "authentic", icon: "authentic", label: t.trustAuthentic, description: t.trustAuthenticText },
  ];
  const trust = trustBadges === false ? [] : (trustBadges ?? defaults);

  const longDescription = description ?? product.description;
  const specRows: ProductSpec[] = [
    ...(variant?.sku ? [{ label: t.sku, value: <bdi dir="ltr">{variant.sku}</bdi> }] : []),
    ...(product.brand ? [{ label: t.brand, value: product.brand }] : []),
    ...(product.category ? [{ label: t.category, value: product.category }] : []),
    ...(specs ?? []),
  ];
  const panels: { id: string; title: string; body: ReactNode }[] = [
    ...(longDescription ? [{ id: "description", title: t.description, body: typeof longDescription === "string" ? <p className="text-pretty text-body text-muted-foreground">{longDescription}</p> : longDescription }] : []),
    ...(specRows.length
      ? [{
          id: "specs",
          title: t.specs,
          body: (
            <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 text-body-sm">
              {specRows.map((row, i) => (
                <div key={i} className="col-span-2 grid grid-cols-subgrid border-b border-border py-2 last:border-b-0">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          ),
        }]
      : []),
    ...(shippingInfo ? [{ id: "shipping", title: t.shipping, body: typeof shippingInfo === "string" ? <p className="text-pretty text-body text-muted-foreground">{shippingInfo}</p> : shippingInfo }] : []),
  ];
  const asTabs = sections === "tabs" || (sections === "auto" && wide);

  const addLabel = pending === "add" ? t.adding : soldOut ? t.soldOut : t.addToCart;
  const showSticky = stickyBar && !wide && barVisible;

  return (
    <div data-slot="product-detail" className={cn("mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:px-6", showSticky && "pb-24", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <span key={`${crumb.label}-${i}`} className="contents">
                  <BreadcrumbItem>{last || !crumb.href ? <BreadcrumbPage>{crumb.label}</BreadcrumbPage> : <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>}</BreadcrumbItem>
                  {!last && <BreadcrumbSeparator />}
                </span>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <ProductGallery images={product.images} index={galleryIndex} onIndexChange={setGalleryIndex} name={product.name} labels={labels} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <header className="flex flex-col gap-2">
            {(product.badges?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.badges!.map((b) => (
                  <Badge key={b} variant="accent">
                    {b}
                  </Badge>
                ))}
              </div>
            )}
            {product.brand && <p className="text-label text-muted-foreground">{product.brand}</p>}
            <h1 className="text-balance text-h1 text-foreground">{product.name}</h1>
            {product.rating && (
              <button
                type="button"
                onClick={() => reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="w-fit rounded-[3px] outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
              >
                <Rating value={product.rating.average} count={product.rating.count} countLabel={t.reviews} />
              </button>
            )}
          </header>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {price.from && <span className="text-body-sm text-muted-foreground">{t.from}</span>}
            <Price amount={price.price / minor} currency={currency} size="lg" {...(price.compareAt ? { compareAt: price.compareAt / minor } : {})} />
            {price.percentOff > 0 && <Badge variant="danger">{t.percentOff(fmt(price.percentOff / 100, { style: "percent" }))}</Badge>}
          </div>

          {product.options.length > 0 && (
            <div ref={pickerRef} className="scroll-mt-24">
              <ProductVariantPicker
                product={product}
                selection={selection}
                onSelectionChange={change}
                impossible={impossible}
                invalid={invalid}
                labels={labels}
                optionAction={sizeGuide ? (option) => (option.id === sizeGuideOptionId ? <ProductSizeGuide guide={sizeGuide} selectedSize={selectedSize} labels={labels} /> : null) : undefined}
              />
            </div>
          )}

          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            <ProductQuantityStepper value={qty} onValueChange={setQuantity} max={max} disabled={soldOut} labels={labels} />
            <p aria-live="polite" className={cn("flex h-control items-center gap-2 text-label", stockLine?.tone)}>
              {stockLine && (
                <>
                  <span aria-hidden className={cn("size-2 rounded-full", stockLine.dot)} />
                  {stockLine.text}
                </>
              )}
            </p>
          </div>

          {delivery && city && eta && (
            <div data-slot="product-delivery" className="flex flex-col gap-2 rounded-card border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Truck aria-hidden className="size-4 text-muted-foreground" />
                <span className="text-label text-foreground">{t.deliverTo}</span>
                <Select value={cityId ?? null} onValueChange={(v) => setCityId(v ?? undefined)}>
                  <SelectTrigger aria-label={t.city} className="w-auto min-w-32">
                    <SelectValue>{city.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {delivery.cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-body-sm text-muted-foreground">
                {t.arrives(eta)}
                {" · "}
                {city.fee ? t.deliveryFee(money(city.fee)) : t.freeDelivery}
              </p>
            </div>
          )}

          <div ref={ctaRef} className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="primary" size="lg" loading={pending === "add"} disabled={soldOut} onClick={() => run("add")} aria-describedby={statusId} className="min-w-44 flex-1">
                {addLabel}
              </Button>
              {onBuyNow && (
                <Button type="button" variant="secondary" size="lg" loading={pending === "buy"} disabled={soldOut} onClick={() => run("buy")} className="min-w-32 flex-1">
                  {t.buyNow}
                </Button>
              )}
              {(onWishlistChange || wishlisted !== undefined) && (
                <Button type="button" variant="secondary" size="lg" aria-pressed={wish} aria-label={wish ? t.removeWishlist : t.addWishlist} title={wish ? t.removeWishlist : t.addWishlist} onClick={toggleWish} className="w-[calc(var(--nq-control)+8px)] px-0">
                  <Heart aria-hidden className={cn(wish && "fill-nq-danger text-nq-danger")} />
                </Button>
              )}
              <Button type="button" variant="secondary" size="lg" aria-label={t.share} title={t.share} onClick={share} className="w-[calc(var(--nq-control)+8px)] px-0">
                <Share2 aria-hidden />
              </Button>
            </div>
            <p id={statusId} role={status?.kind === "error" ? "alert" : "status"} aria-live="polite" className={cn("flex items-center gap-1.5 text-body-sm", status ? (status.kind === "error" ? "text-nq-danger-text" : status.kind === "ok" ? "text-nq-success-text" : "text-muted-foreground") : "sr-only")}>
              {status?.kind === "error" && <TriangleAlert aria-hidden className="size-4 shrink-0" />}
              {status?.text}
            </p>
          </div>

          {trust.length > 0 && (
            <ul data-slot="product-trust" className="grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-2">
              {trust.map((b) => {
                const Glyph = TRUST_ICON[b.icon ?? "secure"];
                return (
                  <li key={b.id} className="flex items-start gap-2.5">
                    <Glyph aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-label text-foreground">{b.label}</span>
                      {b.description && <span className="text-caption text-muted-foreground">{b.description}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {panels.length > 0 &&
        (asTabs ? (
          <Tabs defaultValue={panels[0]!.id} aria-label={t.sections}>
            <TabsList variant="underline">
              {panels.map((p) => (
                <TabsTab key={p.id} value={p.id}>
                  {p.title}
                </TabsTab>
              ))}
            </TabsList>
            {panels.map((p) => (
              <TabsPanel key={p.id} value={p.id} className="max-w-3xl">
                {p.body}
              </TabsPanel>
            ))}
          </Tabs>
        ) : (
          <Accordion defaultValue={[panels[0]!.id]} multiple aria-label={t.sections}>
            {panels.map((p) => (
              <AccordionItem key={p.id} value={p.id}>
                <AccordionTrigger>{p.title}</AccordionTrigger>
                <AccordionPanel>{p.body}</AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        ))}

      {reviews && (
        <section ref={reviewsRef} id="reviews" data-slot="product-detail-reviews" aria-label={t.reviews} className="scroll-mt-6 border-t border-border pt-8">
          {reviews}
        </section>
      )}

      {related && (
        <section data-slot="product-detail-related" aria-label={relatedTitle ?? t.related} className="flex flex-col gap-4 border-t border-border pt-8">
          <h2 className="text-h2 text-foreground">{relatedTitle ?? t.related}</h2>
          {related}
        </section>
      )}

      {showSticky && (
        <div data-slot="product-sticky-bar" role="region" aria-label={t.stickyBar} className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-background p-3 shadow-lg md:hidden">
          <div className="flex min-w-0 flex-1 flex-col">
            <Price amount={price.price / minor} currency={currency} size="md" {...(price.compareAt ? { compareAt: price.compareAt / minor } : {})} />
            {variant && product.options.length > 0 && <span className="truncate text-caption text-muted-foreground">{product.options.map((o) => o.values.find((v) => v.id === selection[o.id])?.label).filter(Boolean).join(" · ")}</span>}
          </div>
          <Button type="button" variant="primary" size="lg" loading={pending === "add"} disabled={soldOut} onClick={() => run("add")} className="shrink-0">
            {addLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
