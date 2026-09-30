"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface ProductCardProps extends Omit<ComponentProps<"article">, "title"> {
  /** Usually `<ProductArtwork brand="…" />`. It is sized by the card. */
  artwork: ReactNode;
  name: ReactNode;
  /** Category or publisher line under the name. */
  category?: ReactNode;
  /** "New", "Free"… Shown on the artwork in the tile layout, beside the name in the row layout. */
  badge?: ReactNode;
  description?: ReactNode;
  /** Bottom-start slot, usually `<Rating />`. */
  meta?: ReactNode;
  /** Bottom-end slot, usually `<Price />`. */
  price?: ReactNode;
  /** Top-end slot, usually `<InstallButton />`. */
  action?: ReactNode;
  /**
   * "tile": artwork on top. "row": small square artwork beside the details, for phones and dense lists.
   * "auto" (default): row in a narrow container, tile from 36rem up. Needs an `@container` ancestor;
   * `ProductGrid` is one.
   */
  layout?: "auto" | "tile" | "row";
  /** Heading element for the name. Default "h3". */
  nameAs?: "h2" | "h3" | "h4";
}

const TILE = {
  root: "flex-col gap-3",
  art: "aspect-[16/10] w-full",
  artBadge: "inline-flex",
  nameBadge: "hidden",
};
const ROW = {
  root: "flex-row gap-4",
  art: "aspect-square w-20",
  artBadge: "hidden",
  nameBadge: "inline-flex",
};
const AUTO = {
  root: "flex-row gap-4 @xl:flex-col @xl:gap-3",
  art: "aspect-square w-20 @xl:aspect-[16/10] @xl:w-full",
  artBadge: "hidden @xl:inline-flex",
  nameBadge: "inline-flex @xl:hidden",
};

/**
 * A product in a store or catalogue: artwork, name, category, a two-line pitch, social proof, price and the
 * install action. It has no border or card surface of its own; the artwork carries the visual weight, so a
 * grid of them reads as a shelf rather than a settings list.
 */
export function ProductCard({ artwork, name, category, badge, description, meta, price, action, layout = "auto", nameAs: Name = "h3", className, ...props }: ProductCardProps) {
  const l = layout === "tile" ? TILE : layout === "row" ? ROW : AUTO;
  return (
    <article data-slot="product-card" data-layout={layout} className={cn("group/product flex min-w-0", l.root, className)} {...props}>
      <div data-slot="product-card-artwork" className={cn("relative shrink-0 [&>*]:size-full", l.art)}>
        {artwork}
        {badge && <span className={cn("absolute start-3 top-3 z-10", l.artBadge)}>{badge}</span>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <Name className="truncate text-body font-medium text-foreground">{name}</Name>
              {badge && <span className={cn("shrink-0", l.nameBadge)}>{badge}</span>}
            </div>
            {category && <p className="truncate text-caption text-muted-foreground">{category}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {description && <p className="line-clamp-2 text-pretty text-body-sm text-muted-foreground">{description}</p>}
        {(meta || price) && (
          <div className="mt-auto flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">{meta}</div>
            {price}
          </div>
        )}
      </div>
    </article>
  );
}

/** Responsive shelf for `ProductCard`s: 1 column, then 2, 3 and 4 as its own width grows. Establishes the container. */
export function ProductGrid({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="product-grid" className="@container">
      <div className={cn("grid grid-cols-1 gap-x-5 gap-y-8 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4", className)} {...props}>
        {children}
      </div>
    </div>
  );
}

export interface ProductListItemProps extends Omit<ComponentProps<"li">, "title"> {
  /** `<AppGlyph />` or a small `<ProductMark />`. */
  icon: ReactNode;
  name: ReactNode;
  /** One line; truncates. */
  description?: ReactNode;
  price?: ReactNode;
  action?: ReactNode;
}

/** A compact product row for long lists (modules, integrations, add-ons). Goes inside `ProductList`. */
export function ProductListItem({ icon, name, description, price, action, className, ...props }: ProductListItemProps) {
  return (
    <li
      data-slot="product-list-item"
      className={cn("flex min-w-0 items-center gap-3 rounded-control px-2 py-2.5 transition-colors duration-150 hover:bg-nq-hover", className)}
      {...props}
    >
      {icon}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-label text-foreground">{name}</span>
        {description && <span className="truncate text-caption text-muted-foreground">{description}</span>}
      </div>
      {price}
      {action}
    </li>
  );
}

/** A borderless list of `ProductListItem`s: 1 column, then 2 and 3 as its own width grows. */
export function ProductList({ className, children, ...props }: ComponentProps<"ul">) {
  return (
    <div data-slot="product-list" className="@container">
      <ul className={cn("grid grid-cols-1 gap-x-6 gap-y-1 @3xl:grid-cols-2 @6xl:grid-cols-3", className)} {...props}>
        {children}
      </ul>
    </div>
  );
}
