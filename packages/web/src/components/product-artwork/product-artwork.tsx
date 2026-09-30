"use client";

import type { BrandKey } from "@nasaq/brands";
import type { LucideIcon } from "lucide-react";
import { type ComponentProps, type CSSProperties, isValidElement, type ReactElement } from "react";
import { cn } from "../../lib/cn";
import { ProductMark } from "../product-mark";

export interface ProductArtworkProps extends ComponentProps<"div"> {
  /** The product whose manifest tints the field. Also sets `data-brand`, so `--nq-brand` inside is that product's colour. */
  brand: BrandKey | (string & {});
  /** Size of the centred mark in px. Ignored when `children` is given. */
  markSize?: number;
  /** Replaces the centred mark: a badge plus the mark, a product glimpse, a whole banner layout. */
  children?: ComponentProps<"div">["children"];
}

const FIELD: CSSProperties = {
  // Light falls from the inline-start top corner (`--art-x` flips in RTL), with a softer bounce opposite.
  backgroundImage: [
    "radial-gradient(110% 130% at var(--art-x) 0%, color-mix(in oklab, var(--nq-brand) 34%, transparent), transparent 65%)",
    "radial-gradient(90% 110% at calc(100% - var(--art-x)) 100%, color-mix(in oklab, var(--nq-brand) 14%, transparent), transparent 70%)",
  ].join(","),
};

/**
 * Product artwork: the official mark on a field of the product's own brand colour. The field is a gradient
 * derived from the manifest, never a raster, so it follows light, dark and every brand without assets. The
 * mark is drawn by `ProductMark` and is never recoloured, cropped or stretched.
 */
export function ProductArtwork({ brand, markSize = 48, className, style, children, ...props }: ProductArtworkProps) {
  return (
    <div
      data-slot="product-artwork"
      data-brand={brand}
      className={cn(
        "relative isolate flex items-center justify-center overflow-hidden rounded-card bg-nq-surface-raised [--art-x:100%] rtl:[--art-x:0%]",
        className,
      )}
      style={{ ...FIELD, ...style }}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-[color-mix(in_oklab,var(--nq-brand)_16%,transparent)]"
      />
      {children ?? <ProductMark brand={brand} size={markSize} title="" />}
    </div>
  );
}

const glyphSizes = {
  sm: "size-7 rounded-control [&_svg]:size-3.5",
  md: "size-9 rounded-control [&_svg]:size-4",
  lg: "size-11 rounded-card [&_svg]:size-5",
} as const;

export interface AppGlyphProps extends Omit<ComponentProps<"span">, "children"> {
  /** A lucide icon component or element. */
  icon: LucideIcon | ReactElement;
  /** Tint with this product's brand instead of the surrounding one. */
  brand?: BrandKey | (string & {});
  size?: keyof typeof glyphSizes;
}

/**
 * The icon for an app or module that has no mark of its own (Inventory, Payments): a glyph on a brand tint.
 * It is not a logo. Never use it to stand in for a product that has an official mark: use `ProductMark`.
 */
export function AppGlyph({ icon, brand, size = "md", className, ...props }: AppGlyphProps) {
  const Glyph = icon as LucideIcon;
  return (
    <span
      data-slot="app-glyph"
      data-brand={brand}
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-[color-mix(in_oklab,var(--nq-brand)_14%,var(--nq-surface-raised))] text-nq-brand",
        glyphSizes[size],
        className,
      )}
      {...props}
    >
      {isValidElement(icon) ? icon : <Glyph />}
    </span>
  );
}
