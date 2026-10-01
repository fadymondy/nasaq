"use client";

import { type BrandKey, BRANDS, markGeometry, type MarkSpec, resolveBrand } from "@nasaq/brands";
import { type ComponentProps, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";

/** Below this rendered size the accent cube stops reading and is drawn in the body colour. */
export const MARK_ACCENT_MIN_SIZE = 20;

function warnUnknownBrand(brand: string) {
  if ((globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV !== "production") {
    console.warn(`[nasaq] Unknown brand "${brand}"; falling back to the default mark.`);
  }
}

export interface ProductMarkProps extends Omit<ComponentProps<"svg">, "children"> {
  /** Brand key or legacy alias. Defaults to the provider's brand. */
  brand?: BrandKey | (string & {});
  /** Or pass a MarkSpec directly (for previews of unreleased marks). */
  mark?: MarkSpec;
  /** Rendered size in px (square). */
  size?: number;
  /** Force the on-dark body. Defaults to the resolved theme. */
  onDark?: boolean;
  /** Accessible name. Defaults to the brand name; pass "" when a visible name sits beside it. */
  title?: string;
  /**
   * A custom logo image (an admin-uploaded brand logo) shown instead of the mark. When it fails to load, the mark
   * is drawn instead. It is sized to `size` and never recoloured or mirrored.
   */
  src?: string;
  /** Alias of `src`. */
  logoUrl?: string;
}

/**
 * A brand's cube-lattice mark, drawn from its MarkSpec. Never recoloured, filtered, mirrored or
 * transformed: the dark variant is the spec's own bodyOnDark. SVG geometry is not affected by dir,
 * so RTL layouts never flip it.
 */
export function ProductMark({ brand, mark: markProp, size = 24, onDark, title, src, logoUrl, className, ...props }: ProductMarkProps) {
  const customSrc = src ?? logoUrl;
  const [failed, setFailed] = useState<string | null>(null);
  const nasaq = useOptionalNasaq();
  const resolved = brand ? resolveBrand(brand) : undefined;
  if (brand && !resolved && !markProp) warnUnknownBrand(brand);
  const mark = markProp ?? (brand ? resolved?.mark : nasaq?.brand.mark) ?? BRANDS.nasaq.mark;
  const dark = onDark ?? nasaq?.resolvedTheme === "dark";
  const body = dark ? (mark.bodyOnDark ?? mark.body) : mark.body;
  const showAccent = size >= MARK_ACCENT_MIN_SIZE;
  const { unit, rects } = markGeometry(mark);
  const label = title ?? mark.name;

  if (customSrc && failed !== customSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        data-slot="product-mark"
        data-custom=""
        src={customSrc}
        alt={label}
        width={size}
        height={size}
        draggable={false}
        onError={() => setFailed(customSrc)}
        className={cn("shrink-0 object-contain", className)}
        {...(props as ComponentProps<"img">)}
      />
    );
  }

  return (
    <svg
      data-slot="product-mark"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      shapeRendering="crispEdges"
      className={cn("shrink-0", className)}
      {...props}
    >
      {rects.map(({ x, y, accent }) => (
        <rect key={`${x},${y}`} x={x} y={y} width={unit} height={unit} fill={accent && showAccent ? mark.accent : body} />
      ))}
    </svg>
  );
}

export interface ProductLogoProps extends ComponentProps<"span"> {
  brand?: BrandKey | (string & {});
  size?: number;
  /** Show the Arabic name where the brand has one. Defaults to the provider locale. */
  arabic?: boolean;
}

/**
 * Mark + typeset name as a UI label (B10). This is never exported as a lockup image.
 * Latin: JetBrains Mono 500, +0.14em, uppercase, LTR. Arabic: the Arabic face, no tracking.
 * The name scales with `size` (0.6x Latin, 0.7x Arabic).
 */
export function ProductLogo({ brand, size = 20, arabic, className, ...props }: ProductLogoProps) {
  const nasaq = useOptionalNasaq();
  const resolved = brand ? resolveBrand(brand) : undefined;
  if (brand && !resolved) warnUnknownBrand(brand);
  const manifest = (brand ? resolved : nasaq?.brand) ?? BRANDS.nasaq;
  const useArabic = (arabic ?? nasaq?.locale.startsWith("ar") ?? false) && Boolean(manifest.wordmark.arabic);
  return (
    <span data-slot="product-logo" className={cn("inline-flex items-center gap-2", className)} {...props}>
      <ProductMark brand={manifest.key} size={size} title="" />
      {useArabic ? (
        <span lang="ar" className="font-arabic font-medium tracking-normal text-foreground" style={{ fontSize: size * 0.7 }}>
          {manifest.wordmark.arabic}
        </span>
      ) : (
        <span dir="ltr" className="font-mono font-medium tracking-[0.14em] uppercase text-foreground" style={{ fontSize: size * 0.6 }}>
          {manifest.wordmark.latin}
        </span>
      )}
    </span>
  );
}
