"use client";

import { Check, Eye, GitCompareArrows, Heart, ImageOff, ShoppingBag } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import {
  type CommerceOption,
  type CommerceProduct,
  type CommerceSelection,
  type CommerceVariant,
  commerceFindVariant,
  commerceInStock,
  commerceValueAvailability,
} from "../../lib/commerce";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { ContextMenuActions, type ContextMenuAction } from "../context-menu";
import { Icon } from "../icon";
import { Price } from "../price";
import { Rating } from "../rating";
import { fillTemplate, type ListingLabels, useListingStrings } from "./listing-strings";
import { listingBestDiscount, listingCheapestVariant, listingHasPriceRange, listingProductInStock } from "./listing-model";
import { useCurrency } from "../../provider/nasaq-provider";

/* ------------------------------------------------------------------ helpers */

/** Minor-unit exponent of a currency (USD 2, JPY 0, KWD 3). */
export function storeCurrencyDigits(currency: string): number {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export interface StorePriceProps extends Omit<ComponentProps<typeof Price>, "amount" | "compareAt" | "currency"> {
  /** Integer minor units. */
  amount: number;
  compareAt?: number;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Show a "From" prefix. */
  from?: boolean;
  labels?: ListingLabels;
}

/** A price in integer minor units, formatted for the active locale with the struck-through original when on sale. */
export function StorePrice({ amount, compareAt, currency: currencyProp, from, labels, ...props }: StorePriceProps) {
  const currency = useCurrency(currencyProp);
  const { t } = useListingStrings(labels);
  const digits = useMemo(() => storeCurrencyDigits(currency), [currency]);
  const major = (n: number) => n / 10 ** digits;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      {from ? <span className="text-caption text-muted-foreground">{t.from}</span> : null}
      <Price amount={major(amount)} currency={currency} {...(compareAt !== undefined ? { compareAt: major(compareAt) } : {})} {...props} />
    </span>
  );
}

export interface StoreProductImageProps {
  src?: string | undefined;
  alt: string;
  width?: number | undefined;
  height?: number | undefined;
  className?: string | undefined;
  /** Load eagerly (above the fold). Default lazy. */
  eager?: boolean;
}

/** Fills its parent. Shows a neutral token-coloured placeholder when the image is missing or fails to load. */
export function StoreProductImage({ src, alt, width, height, className, eager = false }: StoreProductImageProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return (
      <div role="img" aria-label={alt} data-slot="store-image-placeholder" className={cn("flex size-full items-center justify-center bg-secondary text-muted-foreground", className)}>
        <ImageOff aria-hidden className="size-6 opacity-60" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      data-slot="store-image"
      className={cn("size-full object-cover", className)}
    />
  );
}

/* ------------------------------------------------------------------ option picker */

export interface StoreOptionPickerProps {
  product: CommerceProduct;
  option: CommerceOption;
  selection: CommerceSelection;
  onSelect: (optionId: string, valueId: string) => void;
  /** Previews a value on hover or focus (a swatch changing the card image); null when leaving. */
  onPreview?: (valueId: string | null) => void;
  size?: "sm" | "md";
  /** Show the option name and the selected value above the group. */
  showLabel?: boolean;
  /** Cap the visible swatches; the rest collapse into "+n". */
  max?: number;
  labels?: ListingLabels;
  className?: string;
}

/**
 * One option axis as a radio group: colour chips, image thumbnails or size buttons. Values with no variant are
 * disabled; values that exist but are out of stock stay selectable and are struck through.
 * Arrow keys move and select, following the reading direction.
 */
export function StoreOptionPicker({ product, option, selection, onSelect, onPreview, size = "md", showLabel = false, max, labels, className }: StoreOptionPickerProps) {
  const { t } = useListingStrings(labels);
  const availability = commerceValueAvailability(product, selection, option.id);
  const selected = selection[option.id];
  const ref = useRef<HTMLDivElement>(null);
  const swatch = option.display === "swatch" || option.display === "image";
  const shown = max && option.values.length > max ? option.values.slice(0, max) : option.values;
  const hidden = option.values.length - shown.length;
  const selectedLabel = option.values.find((v) => v.id === selected)?.label;
  const firstEnabled = shown.find((v) => availability[v.id] !== "none")?.id;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const radios = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])') ?? [])];
    if (!radios.length) return;
    event.preventDefault();
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const at = radios.findIndex((r) => r === document.activeElement);
    const forward = event.key === "ArrowDown" || event.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const next = event.key === "Home" ? 0 : event.key === "End" ? radios.length - 1 : (at + (forward ? 1 : -1) + radios.length) % radios.length;
    radios[next]?.focus();
    radios[next]?.click();
  };

  return (
    <div data-slot="store-option-picker" className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {showLabel ? (
        <p className="text-label text-foreground">
          {option.name}
          {selectedLabel ? <span className="ms-1.5 font-normal text-muted-foreground">{selectedLabel}</span> : null}
        </p>
      ) : null}
      <div ref={ref} role="radiogroup" aria-label={option.name} onKeyDown={onKeyDown} className="flex flex-wrap items-center gap-1.5" onMouseLeave={() => onPreview?.(null)}>
        {shown.map((value) => {
          const state = availability[value.id] ?? "none";
          const checked = selected === value.id;
          const disabled = state === "none";
          const label = state === "out" ? `${value.label}, ${t.optionSoldOut}` : disabled ? `${value.label}, ${t.optionUnavailable}` : value.label;
          return (
            <button
              key={value.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={swatch ? label : undefined}
              title={value.label}
              disabled={disabled}
              tabIndex={checked || (!selected && value.id === firstEnabled) ? 0 : -1}
              data-state={state}
              onClick={() => onSelect(option.id, value.id)}
              onMouseEnter={() => onPreview?.(value.id)}
              onFocus={() => onPreview?.(value.id)}
              onBlur={() => onPreview?.(null)}
              className={cn(
                "relative shrink-0 outline-none transition-[box-shadow,border-color] duration-150 ease-nq motion-reduce:transition-none",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-40",
                swatch
                  ? cn("rounded-full border border-nq-line-strong", size === "sm" ? "size-5" : "size-8", checked && "ring-2 ring-primary ring-offset-2 ring-offset-background")
                  : cn(
                      "rounded-control border px-2.5 text-label tabular-nums",
                      size === "sm" ? "h-7 min-w-7 text-caption" : "h-9 min-w-10",
                      checked ? "border-primary bg-nq-selected text-foreground" : "border-border bg-card text-foreground hover:bg-nq-hover",
                      state === "out" && "text-muted-foreground line-through",
                    ),
              )}
              style={swatch && value.color ? { backgroundColor: value.color } : undefined}
            >
              {swatch ? (
                <>
                  {option.display === "image" && value.image ? <StoreProductImage src={value.image} alt="" className="rounded-full" /> : null}
                  {state === "out" ? <span aria-hidden className="absolute inset-0 rounded-full bg-[linear-gradient(to_top_right,transparent_46%,var(--nq-fg)_46%,var(--nq-fg)_54%,transparent_54%)] opacity-70" /> : null}
                </>
              ) : (
                <bdi>{value.label}</bdi>
              )}
            </button>
          );
        })}
        {hidden > 0 ? <span className="text-caption text-muted-foreground">{fillTemplate(t.moreValues, { n: hidden })}</span> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ card */

export interface StoreProductCardProps extends Omit<ComponentProps<"article">, "children"> {
  product: CommerceProduct;
  /** ISO 4217 code; prices are integer minor units. */
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Product page URL (image and name link to it). */
  href?: string;
  /** "grid" stacks image over details; "list" puts the image beside them and shows the description. Default "grid". */
  layout?: "grid" | "list";
  /** Image ratio in the grid layout. Default "portrait" (4:5). */
  ratio?: "square" | "portrait";
  /** Controlled wishlist state. Without it the heart keeps its own state. */
  wishlisted?: boolean;
  /** Checked state of the compare box. The box only shows when `onToggleCompare` is given. */
  compared?: boolean;
  onToggleWishlist?: (product: CommerceProduct, next: boolean) => void;
  onToggleCompare?: (product: CommerceProduct, next: boolean) => void;
  onQuickView?: (product: CommerceProduct) => void;
  /** Adds the chosen variant. Awaited so the button can show progress. Without it, no add button shows. */
  onAddToCart?: (product: CommerceProduct, variant: CommerceVariant, quantity: number) => void | Promise<void>;
  /** Called when the image or name is activated (before the link navigates). */
  onNavigate?: (product: CommerceProduct) => void;
  /** Swatches shown before "+n". Default 5. */
  maxSwatches?: number;
  /** Context-click, Shift+F10 or the Menu key open the card's actions. Default true. */
  menu?: boolean;
  /** Load the image eagerly (first row of results). */
  priority?: boolean;
  labels?: ListingLabels;
}

/** Options whose first value is the only value are chosen for the shopper. */
function initialSelection(product: CommerceProduct): CommerceSelection {
  const out: CommerceSelection = {};
  for (const o of product.options) if (o.values.length === 1) out[o.id] = o.values[0]!.id;
  return out;
}

/**
 * The storefront product card: image with a second image on hover, badges, wishlist heart, colour swatches that
 * preview the variant image, a from-price, quick view and quick add (asks for any option still unchosen). It takes a
 * `CommerceProduct` and reports everything through callbacks, so listings, carousels and search reuse it as is.
 */
export function StoreProductCard({
  product,
  currency: currencyProp,
  href,
  layout = "grid",
  ratio = "portrait",
  wishlisted,
  compared = false,
  onToggleWishlist,
  onToggleCompare,
  onQuickView,
  onAddToCart,
  onNavigate,
  maxSwatches = 5,
  menu = true,
  priority = false,
  labels,
  className,
  ...props
}: StoreProductCardProps) {
  const currency = useCurrency(currencyProp);
  const { t } = useListingStrings(labels);
  const list = layout === "list";
  const [selection, setSelection] = useState<CommerceSelection>(() => initialSelection(product));
  const [preview, setPreview] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");
  const [localWish, setLocalWish] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    setSelection(initialSelection(product));
    setPicking(false);
  }, [product.id]);

  const isWish = wishlisted ?? localWish;
  const link = href ?? `#${product.slug ?? product.id}`;
  const variant = commerceFindVariant(product, selection);
  const colourOption = product.options.find((o) => o.display === "swatch" || o.display === "image");
  const otherOptions = product.options.filter((o) => o !== colourOption);
  const soldOut = !listingProductInStock(product);
  const cheapest = listingCheapestVariant(product);
  const shown = variant ?? cheapest;
  const percent = variant ? (variant.compareAt && variant.compareAt > variant.price ? Math.floor(((variant.compareAt - variant.price) * 100) / variant.compareAt) : 0) : listingBestDiscount(product);

  const variantImage = (valueId: string | null | undefined) => {
    if (!colourOption || !valueId) return undefined;
    return product.variants.find((v) => v.options[colourOption.id] === valueId && v.image)?.image;
  };
  const chosenColour = colourOption ? selection[colourOption.id] : undefined;
  const primary = variantImage(preview) ?? variantImage(chosenColour) ?? variant?.image;
  const primaryImage = primary ? { src: primary, alt: product.name } : (product.images[0] ?? { src: "", alt: product.name });
  const secondImage = product.images[1];
  const secondary = !primary && !preview ? secondImage : undefined;

  const missing = product.options.find((o) => !selection[o.id]);
  const canAdd = Boolean(onAddToCart) && !soldOut;

  const add = async (v: CommerceVariant) => {
    if (!onAddToCart || !commerceInStock(v)) return;
    setStatus("adding");
    try {
      await onAddToCart(product, v, 1);
      setStatus("added");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("idle");
    }
  };

  const quickAdd = () => {
    if (!canAdd) return;
    if (missing) {
      setPicking(true);
      return;
    }
    if (variant) void add(variant);
  };

  const pick = (optionId: string, valueId: string) => {
    const next = { ...selection, [optionId]: valueId };
    setSelection(next);
    if (!picking) return;
    if (product.options.every((o) => next[o.id])) {
      const v = commerceFindVariant(product, next);
      setPicking(false);
      if (v) void add(v);
    }
  };

  const navigate = () => {
    onNavigate?.(product);
    if (!onNavigate && href) window.location.assign(href);
  };

  const toggleWish = () => {
    setLocalWish(!isWish);
    onToggleWishlist?.(product, !isWish);
  };

  const name = product.name;
  const badges = (product.badges ?? []).slice(0, 2);

  const actions: ContextMenuAction[] = [
    ...(onQuickView ? [{ id: "quick-view", label: t.quickView, icon: Eye, onSelect: () => onQuickView(product), group: "view" }] : []),
    ...(canAdd ? [{ id: "add", label: missing ? t.chooseOption.replace("{option}", missing.name) : t.addToCart, icon: ShoppingBag, onSelect: () => (missing ? onQuickView?.(product) ?? quickAdd() : quickAdd()), group: "buy" }] : []),
    { id: "wishlist", label: (isWish ? t.wishlistRemove : t.wishlistAdd).replace("{name}", name), icon: Heart, onSelect: toggleWish, group: "buy" },
    ...(onToggleCompare ? [{ id: "compare", label: t.compareFor.replace("{name}", name), icon: GitCompareArrows, onSelect: () => onToggleCompare(product, !compared), group: "buy" }] : []),
  ];

  const addButton = canAdd ? (
    <Button
      variant="primary"
      size="sm"
      loading={status === "adding"}
      disabled={variant ? !commerceInStock(variant) : false}
      onClick={quickAdd}
      data-slot="store-product-card-add"
      className={cn(list ? "w-fit" : "w-full")}
    >
      {status === "added" ? <Icon icon={Check} /> : <Icon icon={ShoppingBag} />}
      {status === "added" ? t.added : missing && !list ? t.quickAdd : variant && !commerceInStock(variant) ? t.soldOut : t.addToCart}
    </Button>
  ) : null;

  const card = (
    <article
      data-slot="store-product-card"
      data-layout={layout}
      data-sold-out={soldOut || undefined}
      className={cn("group/card relative flex min-w-0", list ? "flex-row gap-4 sm:gap-6" : "flex-col gap-3", className)}
      {...props}
    >
      <div
        data-slot="store-product-card-media"
        onClick={navigate}
        className={cn(
          "relative shrink-0 cursor-pointer overflow-hidden rounded-card bg-secondary",
          list ? "aspect-square w-32 sm:w-52" : ratio === "square" ? "aspect-square w-full" : "aspect-[4/5] w-full",
        )}
      >
        <StoreProductImage src={primaryImage.src} alt={primaryImage.alt} eager={priority} className={cn(soldOut && "opacity-60")} />
        {secondary ? (
          <div aria-hidden className="absolute inset-0 opacity-0 transition-opacity duration-200 ease-nq group-hover/card:opacity-100 motion-reduce:transition-none pointer-coarse:hidden">
            <StoreProductImage src={secondary.src} alt="" />
          </div>
        ) : null}

        <div className="pointer-events-none absolute start-2 top-2 flex max-w-[70%] flex-col items-start gap-1">
          {soldOut ? <Badge variant="neutral">{t.soldOut}</Badge> : null}
          {percent > 0 && !soldOut ? (
            <Badge variant="danger">
              <bdi>{fillTemplate(t.percentOff, { n: percent })}</bdi>
            </Badge>
          ) : null}
          {badges.map((b) => (
            <Badge key={b} variant="accent">
              {b}
            </Badge>
          ))}
        </div>

        <div className="absolute end-2 top-2 flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon-sm"
            variant="secondary"
            aria-pressed={isWish}
            aria-label={(isWish ? t.wishlistRemove : t.wishlistAdd).replace("{name}", name)}
            onClick={toggleWish}
            className="rounded-full bg-card/90 shadow-xs backdrop-blur-sm"
          >
            <Icon icon={Heart} className={cn(isWish && "fill-current text-nq-danger")} />
          </Button>
          {onQuickView ? (
            <Button
              size="icon-sm"
              variant="secondary"
              aria-label={t.quickViewFor.replace("{name}", name)}
              onClick={() => onQuickView(product)}
              className="rounded-full bg-card/90 opacity-0 shadow-xs backdrop-blur-sm transition-opacity duration-150 focus-visible:opacity-100 group-focus-within/card:opacity-100 group-hover/card:opacity-100 pointer-coarse:opacity-100"
            >
              <Icon icon={Eye} />
            </Button>
          ) : null}
        </div>

        {!list && addButton ? (
          <div
            className={cn(
              "absolute inset-x-2 bottom-2 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-focus-within/card:opacity-100 group-hover/card:opacity-100 pointer-coarse:opacity-100",
              (picking || status !== "idle") && "opacity-100",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {picking && missing ? (
              <div className="flex flex-col gap-2 rounded-control border border-border bg-popover p-2 shadow-floating" role="group" aria-label={t.chooseOption.replace("{option}", missing.name)}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption font-medium text-foreground">{t.chooseOption.replace("{option}", missing.name)}</p>
                  <Button size="icon-sm" variant="ghost" aria-label={t.close} onClick={() => setPicking(false)} className="size-5">
                    <span aria-hidden>×</span>
                  </Button>
                </div>
                <StoreOptionPicker product={product} option={missing} selection={selection} onSelect={pick} size="sm" labels={labels ?? {}} />
              </div>
            ) : (
              addButton
            )}
          </div>
        ) : null}
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5", list && "justify-center")}>
        {product.brand ? <p className="truncate text-caption text-muted-foreground">{product.brand}</p> : null}
        <h3 className="text-body font-medium text-foreground">
          <a
            href={link}
            onClick={() => onNavigate?.(product)}
            className="line-clamp-2 rounded-sm outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
          >
            {name}
          </a>
        </h3>
        {product.rating ? <Rating value={product.rating.average} count={product.rating.count} countLabel={t.reviews} /> : null}
        {list && product.description ? <p className="line-clamp-2 max-w-prose text-body-sm text-muted-foreground">{product.description}</p> : null}
        {shown ? <StorePrice amount={shown.price} currency={currency} size="md" from={!variant && listingHasPriceRange(product)} {...(shown.compareAt !== undefined ? { compareAt: shown.compareAt } : {})} labels={labels ?? {}} /> : null}
        {colourOption && colourOption.values.length > 1 ? (
          <StoreOptionPicker
            product={product}
            option={colourOption}
            selection={selection}
            onSelect={pick}
            onPreview={setPreview}
            size="sm"
            max={maxSwatches}
            labels={labels ?? {}}
            className="mt-0.5"
          />
        ) : null}
        {list
          ? otherOptions
              .filter((o) => o.values.length > 1)
              .map((o) => <StoreOptionPicker key={o.id} product={product} option={o} selection={selection} onSelect={pick} size="sm" labels={labels ?? {}} />)
          : null}
        {list && addButton ? <div className="mt-1.5 flex flex-wrap items-center gap-2">{addButton}{onQuickView ? <Button size="sm" variant="secondary" onClick={() => onQuickView(product)}><Icon icon={Eye} />{t.quickView}</Button> : null}</div> : null}
        {onToggleCompare ? (
          <label className="mt-1 flex w-fit cursor-pointer items-center gap-2 text-caption text-muted-foreground">
            <Checkbox checked={compared} onCheckedChange={(v) => onToggleCompare(product, v === true)} aria-label={t.compareFor.replace("{name}", name)} />
            {t.compare}
          </label>
        ) : null}
        <span className="sr-only" role="status" aria-live="polite">
          {status === "added" ? fillTemplate(t.addedLive, { name }) : ""}
        </span>
      </div>
    </article>
  );

  return (
    <ContextMenuActions actions={actions} disabled={!menu} render={<div data-slot="store-product-card-menu" className="h-full min-w-0" />} focusTarget={(el) => el.querySelector<HTMLElement>("a[href]")}>
      {card}
    </ContextMenuActions>
  );
}
