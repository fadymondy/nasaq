"use client";

import { ArrowRight } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceProduct, CommerceVariant } from "../../lib/commerce";
import { Button } from "../button";
import { Carousel, CarouselContent, CarouselDots, CarouselItem, CarouselNext, CarouselPrevious } from "../carousel";
import { Icon } from "../icon";
import { useFormatNumber } from "../numeric";
import { StoreProductCard, StoreProductImage } from "../store-listing/store-product-card";
import { type MerchDeal, merchActiveDeals, merchCountdownParts, merchDealProgress, merchNextTick } from "./store-merch-model";
import { type MerchLabels, merchFill, useMerchStrings } from "./merch-strings";

/* ------------------------------------------------------------------ section heading */

function SectionHeading({ title, id, action }: { title: ReactNode; id: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 id={id} className="text-h2 text-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ category tiles */

export interface StoreCategoryTile {
  id: string;
  label: string;
  href?: string;
  image?: string;
  /** Number of products, shown under the name. */
  count?: number;
}

export interface StoreCategoryTilesProps {
  items: readonly StoreCategoryTile[];
  /** Section heading. Pass `null` to hide. Default "Shop by category". */
  title?: ReactNode;
  /** Called on activation, before the link navigates. */
  onSelect?: (item: StoreCategoryTile) => void;
  /** Tile shape. Default "square". */
  ratio?: "square" | "landscape";
  labels?: MerchLabels;
  className?: string;
}

/** A responsive grid of image tiles that lead into categories. */
export function StoreCategoryTiles({ items, title, onSelect, ratio = "square", labels, className }: StoreCategoryTilesProps) {
  const { t } = useMerchStrings(labels);
  const fmt = useFormatNumber();
  const heading = title === undefined ? t.categories : title;
  return (
    <section data-slot="store-category-tiles" aria-labelledby={heading ? "store-cats-h" : undefined} aria-label={heading ? undefined : t.categories} className={className}>
      {heading ? <SectionHeading id="store-cats-h" title={heading} /> : null}
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.href ?? `#${item.id}`}
              onClick={() => onSelect?.(item)}
              className="group flex flex-col gap-2 rounded-card no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
            >
              <span className={cn("relative overflow-hidden rounded-card bg-secondary", ratio === "square" ? "aspect-square" : "aspect-[4/3]")}>
                <StoreProductImage src={item.image} alt="" className="transition-transform duration-300 ease-nq group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
              </span>
              <span className="flex flex-col">
                <span className="text-label text-foreground group-hover:underline">{item.label}</span>
                {item.count !== undefined ? <span className="text-caption text-muted-foreground">{merchFill(t.itemsCount, { n: fmt(item.count) })}</span> : null}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ banners */

export interface StoreBanner {
  id: string;
  title: string;
  description?: string;
  /** Call to action text. Default "Shop now". */
  cta?: string;
  href?: string;
  image?: string;
  /** Alt text for the image. Default empty, because the title says it. */
  imageAlt?: string;
  /** Small label above the title. */
  eyebrow?: string;
  /** Colour of the text panel. Default "brand". */
  tone?: "brand" | "soft" | "dark";
}

const tones = {
  brand: "bg-primary text-primary-foreground",
  soft: "bg-secondary text-secondary-foreground",
  dark: "bg-foreground text-background",
} as const;

export interface StoreHeroBannerProps {
  /** One banner shows as is; several rotate in a carousel with arrows and dots. */
  items: readonly StoreBanner[];
  /** Milliseconds between slides; `false` for none. Stops under reduced motion. Default 6000. */
  autoplay?: number | false;
  onSelect?: (banner: StoreBanner) => void;
  labels?: MerchLabels;
  className?: string;
}

function HeroSlide({ banner, onSelect, eager, labels }: { banner: StoreBanner; onSelect: ((b: StoreBanner) => void) | undefined; eager: boolean; labels: MerchLabels }) {
  const { t } = useMerchStrings(labels);
  const tone = tones[banner.tone ?? "brand"];
  return (
    <div className={cn("relative grid min-h-64 overflow-hidden rounded-card md:min-h-96 md:grid-cols-2", tone)}>
      <div className="z-10 flex flex-col items-start justify-center gap-3 p-6 md:p-12">
        {banner.eyebrow ? <span className="text-label opacity-80">{banner.eyebrow}</span> : null}
        <h2 className="text-h1 text-balance">{banner.title}</h2>
        {banner.description ? <p className="max-w-md text-body opacity-90">{banner.description}</p> : null}
        <Button size="lg" variant="secondary" render={<a href={banner.href ?? "#"} onClick={() => onSelect?.(banner)} />} nativeButton={false}>
          {banner.cta ?? t.shopNow}
          <Icon icon={ArrowRight} directional />
        </Button>
      </div>
      <div className="relative order-first aspect-[16/9] md:absolute md:inset-y-0 md:end-0 md:order-none md:aspect-auto md:w-1/2">
        <StoreProductImage src={banner.image} alt={banner.imageAlt ?? ""} eager={eager} />
      </div>
    </div>
  );
}

/** The large banner at the top of the home page. Several banners turn it into a carousel. */
export function StoreHeroBanner({ items, autoplay = 6000, onSelect, labels, className }: StoreHeroBannerProps) {
  const { t, locale } = useMerchStrings(labels);
  if (!items.length) return null;
  if (items.length === 1) {
    return (
      <section data-slot="store-hero-banner" aria-label={t.promotions} className={className}>
        <HeroSlide banner={items[0]!} onSelect={onSelect} eager labels={labels ?? {}} />
      </section>
    );
  }
  return (
    <section data-slot="store-hero-banner" aria-label={t.promotions} className={className}>
      <Carousel label={t.promotions} locale={locale} loop autoplay={autoplay === false ? false : autoplay} className="group relative">
        <CarouselContent>
          {items.map((b, i) => (
            <CarouselItem key={b.id}>
              <HeroSlide banner={b} onSelect={onSelect} eager={i === 0} labels={labels ?? {}} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="start-3" />
        <CarouselNext className="end-3" />
        <CarouselDots />
      </Carousel>
    </section>
  );
}

export interface StorePromoBannersProps {
  items: readonly StoreBanner[];
  onSelect?: (banner: StoreBanner) => void;
  labels?: MerchLabels;
  className?: string;
}

/** Two or three side-by-side promo tiles: image behind, text over a token panel. */
export function StorePromoBanners({ items, onSelect, labels, className }: StorePromoBannersProps) {
  const { t } = useMerchStrings(labels);
  if (!items.length) return null;
  return (
    <section data-slot="store-promo-banners" aria-label={t.promotions} className={className}>
      <ul className={cn("m-0 grid list-none gap-4 p-0", items.length >= 3 ? "md:grid-cols-3" : items.length === 2 ? "md:grid-cols-2" : "")}>
        {items.map((b) => (
          <li key={b.id}>
            <a
              href={b.href ?? "#"}
              onClick={() => onSelect?.(b)}
              className={cn("group relative flex min-h-44 overflow-hidden rounded-card no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus", tones[b.tone ?? "soft"])}
            >
              <span className="z-10 flex w-3/5 flex-col items-start justify-center gap-1 p-5">
                {b.eyebrow ? <span className="text-caption opacity-80">{b.eyebrow}</span> : null}
                <span className="text-h3 text-balance">{b.title}</span>
                {b.description ? <span className="text-body-sm opacity-90">{b.description}</span> : null}
                <span className="mt-2 inline-flex items-center gap-1 text-label underline underline-offset-4">
                  {b.cta ?? t.shopNow}
                  <Icon icon={ArrowRight} directional />
                </span>
              </span>
              <span className="absolute inset-y-0 end-0 w-2/5">
                <StoreProductImage src={b.image} alt={b.imageAlt ?? ""} className="transition-transform duration-300 ease-nq group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ countdown + flash deals */

/** Re-renders on the second boundary until `endsAt`, then stops. */
function useCountdown(endsAt: number, now?: number) {
  const [tick, setTick] = useState(() => now ?? Date.now());
  useEffect(() => {
    if (now !== undefined) return setTick(now);
    let id: ReturnType<typeof setTimeout> | undefined;
    const loop = () => {
      const t = Date.now();
      setTick(t);
      const wait = merchNextTick(endsAt, t);
      if (wait > 0) id = setTimeout(loop, wait);
    };
    loop();
    return () => clearTimeout(id);
  }, [endsAt, now]);
  return merchCountdownParts(endsAt, tick);
}

export interface StoreCountdownProps {
  /** Epoch milliseconds when the offer ends. */
  endsAt: number;
  /** Fixed clock for stories and tests; without it the countdown ticks. */
  now?: number;
  /** Called once when time runs out. */
  onExpire?: () => void;
  labels?: MerchLabels;
  className?: string;
}

/**
 * A ticking deadline readout (days, hours, minutes, seconds). Screen readers get the time left once a minute, not every
 * second. When the time is up it shows a plain "ended" message.
 */
export function StoreCountdown({ endsAt, now, onExpire, labels, className }: StoreCountdownProps) {
  const { t } = useMerchStrings(labels);
  const fmt = useFormatNumber();
  const p = useCountdown(endsAt, now);
  useEffect(() => {
    if (p.done) onExpire?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.done]);
  const pad = (n: number) => fmt(n, { minimumIntegerDigits: 2, useGrouping: false });
  const units = [
    p.days > 0 ? { key: "d", v: fmt(p.days, { useGrouping: false }), long: t.days, short: t.dayShort } : null,
    { key: "h", v: pad(p.hours), long: t.hours, short: t.hourShort },
    { key: "m", v: pad(p.minutes), long: t.minutes, short: t.minuteShort },
    { key: "s", v: pad(p.seconds), long: t.seconds, short: t.secondShort },
  ].filter((u): u is { key: string; v: string; long: string; short: string } => u !== null);
  if (p.done) return <span className={cn("text-body-sm text-muted-foreground", className)}>{t.dealEnded}</span>;
  const spoken = units
    .filter((u) => u.key !== "s")
    .map((u) => `${u.v} ${u.long}`)
    .join(" ");
  // Whole-minute label so assistive tech is not spammed every second.
  return (
    <div data-slot="store-countdown" role="timer" aria-label={merchFill(t.timeLeft, { time: spoken })} className={cn("inline-flex items-center gap-1.5", className)} dir="ltr">
      {units.map((u) => (
        <span key={u.key} aria-hidden className="inline-flex min-w-11 flex-col items-center rounded-control bg-foreground px-1.5 py-1 text-background">
          <span className="text-label tabular-nums leading-none">{u.v}</span>
          <span className="text-[10px] leading-tight opacity-80">{u.short}</span>
        </span>
      ))}
    </div>
  );
}

export interface StoreFlashDeal extends MerchDeal {
  /** The product on offer (carries prices, images and options). */
  product: CommerceProduct;
}

export interface StoreFlashDealsProps {
  deals: readonly StoreFlashDeal[];
  currency: string;
  /** Clock override for stories and tests. */
  now?: number;
  /** Section heading. Default "Flash deals". */
  title?: ReactNode;
  /** Link to a page of all deals. */
  viewAllHref?: string;
  onAddToCart?: (product: CommerceProduct, variant: CommerceVariant, quantity: number) => void | Promise<void>;
  onQuickView?: (product: CommerceProduct) => void;
  onNavigate?: (product: CommerceProduct) => void;
  getHref?: (product: CommerceProduct) => string;
  onToggleWishlist?: (product: CommerceProduct, next: boolean) => void;
  wishlistIds?: readonly string[];
  /** Called once when every deal has ended. */
  onExpire?: () => void;
  labels?: MerchLabels;
  className?: string;
}

/**
 * A strip of time-limited offers. The soonest-ending live deal sets the countdown; each deal shows the shared product
 * card and how much of its stock is claimed. Ended and not-yet-started deals are not shown.
 */
export function StoreFlashDeals({ deals, currency, now, title, viewAllHref, onAddToCart, onQuickView, onNavigate, getHref, onToggleWishlist, wishlistIds, onExpire, labels, className }: StoreFlashDealsProps) {
  const { t, locale } = useMerchStrings(labels);
  const fmt = useFormatNumber();
  const [clock, setClock] = useState(() => now ?? Date.now());
  useEffect(() => {
    if (now !== undefined) return setClock(now);
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, [now]);
  const live = useMemo(() => merchActiveDeals(deals, clock), [deals, clock]);
  useEffect(() => {
    if (deals.length && !live.length) onExpire?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.length]);
  if (!live.length) return null;
  const soonest = live[0]!;
  return (
    <section data-slot="store-flash-deals" aria-labelledby="store-deals-h" className={cn("rounded-card border border-border bg-nq-surface-soft p-4 sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id="store-deals-h" className="text-h2 text-foreground">
            {title ?? t.flashDeals}
          </h2>
          <span className="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
            {t.endsIn}
            <StoreCountdown endsAt={soonest.endsAt} now={clock} labels={labels ?? {}} />
          </span>
        </div>
        {viewAllHref ? (
          <Button variant="link" render={<a href={viewAllHref} />} nativeButton={false}>
            {t.viewAllDeals}
            <Icon icon={ArrowRight} directional />
          </Button>
        ) : null}
      </div>
      <Carousel label={typeof title === "string" ? title : t.flashDeals} locale={locale} className="relative">
        <CarouselContent>
          {live.map((d) => {
            const pct = merchDealProgress(d.sold, d.total);
            return (
              <CarouselItem key={d.id} className="basis-3/4 sm:basis-1/2 lg:basis-1/4">
                <div className="flex h-full flex-col gap-2">
                  <StoreProductCard
                    product={d.product}
                    currency={currency}
                    {...(getHref ? { href: getHref(d.product) } : {})}
                    {...(onAddToCart ? { onAddToCart } : {})}
                    {...(onQuickView ? { onQuickView } : {})}
                    {...(onNavigate ? { onNavigate } : {})}
                    {...(onToggleWishlist ? { onToggleWishlist } : {})}
                    {...(wishlistIds ? { wishlisted: wishlistIds.includes(d.product.id) } : {})}
                    labels={{}}
                  />
                  {d.total ? (
                    <div className="flex flex-col gap-1">
                      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={merchFill(t.claimed, { percent: fmt(pct) })} className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-nq-danger-solid" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-caption text-muted-foreground">{pct >= 80 ? t.almostGone : merchFill(t.claimed, { percent: fmt(pct) })}</span>
                    </div>
                  ) : null}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  );
}

/* ------------------------------------------------------------------ product carousel */

export interface StoreProductCarouselProps {
  products: readonly CommerceProduct[];
  currency: string;
  /** Heading, e.g. "You may also like" or "Recently viewed". Default "You may also like". */
  title?: ReactNode;
  /** Plain-text name for the carousel region when the heading is not a string. */
  label?: string;
  /** Link beside the heading. */
  viewAllHref?: string;
  /** Slides visible at large widths (2 to 6). Default 4. */
  perView?: 2 | 3 | 4 | 5 | 6;
  getHref?: (product: CommerceProduct) => string;
  wishlistIds?: readonly string[];
  onToggleWishlist?: (product: CommerceProduct, next: boolean) => void;
  onAddToCart?: (product: CommerceProduct, variant: CommerceVariant, quantity: number) => void | Promise<void>;
  onQuickView?: (product: CommerceProduct) => void;
  onNavigate?: (product: CommerceProduct) => void;
  /** Show quick add and quick view buttons on the cards. Default follows the callbacks given. */
  labels?: MerchLabels;
  className?: string;
}

const basis = {
  2: "lg:basis-1/2",
  3: "lg:basis-1/3",
  4: "lg:basis-1/4",
  5: "lg:basis-1/5",
  6: "lg:basis-1/6",
} as const;

/**
 * A scroll-snapping row of storefront product cards: related products, recently viewed, new arrivals. It takes plain
 * `CommerceProduct` objects and reports through callbacks, so any page can drop it in. Swipes and arrow keys mirror in RTL.
 */
export function StoreProductCarousel({ products, currency, title, label, viewAllHref, perView = 4, getHref, wishlistIds, onToggleWishlist, onAddToCart, onQuickView, onNavigate, labels, className }: StoreProductCarouselProps) {
  const { t, locale } = useMerchStrings(labels);
  if (!products.length) return null;
  const heading = title ?? t.relatedProducts;
  const name = label ?? (typeof heading === "string" ? heading : t.relatedProducts);
  const hid = `store-car-${name.replace(/\W+/g, "-")}`;
  return (
    <section data-slot="store-product-carousel" aria-labelledby={hid} className={className}>
      <SectionHeading
        id={hid}
        title={heading}
        action={
          viewAllHref ? (
            <Button variant="link" render={<a href={viewAllHref} />} nativeButton={false}>
              {t.viewAll}
              <Icon icon={ArrowRight} directional />
            </Button>
          ) : undefined
        }
      />
      <Carousel label={merchFill(t.carouselOf, { title: name })} locale={locale} opts={{ slidesToScroll: "auto", containScroll: "trimSnaps" }} className="relative">
        <CarouselContent>
          {products.map((p, i) => (
            <CarouselItem key={p.id} className={cn("basis-[70%] snap-start sm:basis-1/3", basis[perView])}>
              <StoreProductCard
                product={p}
                currency={currency}
                priority={i < perView}
                {...(getHref ? { href: getHref(p) } : {})}
                {...(onAddToCart ? { onAddToCart } : {})}
                {...(onQuickView ? { onQuickView } : {})}
                {...(onNavigate ? { onNavigate } : {})}
                {...(onToggleWishlist ? { onToggleWishlist } : {})}
                {...(wishlistIds ? { wishlisted: wishlistIds.includes(p.id) } : {})}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  );
}

/* ------------------------------------------------------------------ brand strip */

export interface StoreBrand {
  id: string;
  /** Brand name. Shown as text unless `logo` is given. */
  name: string;
  href?: string;
  /** Official logo (image URL or node). Leave out to show the name as text. */
  logo?: string | ReactNode;
}

export interface StoreBrandStripProps {
  brands: readonly StoreBrand[];
  /** Heading. Pass `null` to hide it. Default "Our brands". */
  title?: ReactNode;
  onSelect?: (brand: StoreBrand) => void;
  labels?: MerchLabels;
  className?: string;
}

/** A calm row of brand names or official logos. Brands link to their shop page when `href` is set. */
export function StoreBrandStrip({ brands, title, onSelect, labels, className }: StoreBrandStripProps) {
  const { t } = useMerchStrings(labels);
  const heading = title === undefined ? t.brands : title;
  if (!brands.length) return null;
  return (
    <section data-slot="store-brand-strip" aria-label={heading ? undefined : t.brands} aria-labelledby={heading ? "store-brands-h" : undefined} className={className}>
      {heading ? (
        <h2 id="store-brands-h" className="mb-3 text-center text-label text-muted-foreground">
          {heading}
        </h2>
      ) : null}
      <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-8 gap-y-3 p-0">
        {brands.map((b) => {
          const content =
            typeof b.logo === "string" ? (
              <img src={b.logo} alt={b.name} loading="lazy" className="h-8 w-auto max-w-28 object-contain grayscale transition hover:grayscale-0 motion-reduce:transition-none" />
            ) : b.logo ? (
              b.logo
            ) : (
              <span className="text-h3 font-semibold tracking-tight">{b.name}</span>
            );
          return (
            <li key={b.id}>
              {b.href || onSelect ? (
                <a
                  href={b.href ?? "#"}
                  aria-label={merchFill(t.brandLink, { name: b.name })}
                  onClick={() => onSelect?.(b)}
                  className="inline-flex min-h-control items-center rounded-control px-2 text-muted-foreground no-underline outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
                >
                  {content}
                </a>
              ) : (
                <span className="inline-flex min-h-control items-center px-2 text-muted-foreground">{content}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
