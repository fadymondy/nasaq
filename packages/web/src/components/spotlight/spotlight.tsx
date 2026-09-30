"use client";

import type { BrandKey } from "@nasaq/brands";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";
import { ProductArtwork } from "../product-artwork";
import { ProductMark } from "../product-mark";

export interface SpotlightProps extends Omit<ComponentProps<"section">, "title"> {
  /** The featured product. Its manifest tints the banner and its primary button. */
  brand: BrandKey | (string & {});
  /** "lg": the page hero, with room for `media`. "md": a compact tile beside or under it. */
  size?: "lg" | "md";
  /** Small line above the title ("Editor's pick"). A `Badge` reads well here. */
  eyebrow?: ReactNode;
  /** Replaces the product mark beside the title. */
  mark?: ReactNode;
  /** The product name. Rendered as the section's heading. */
  title: ReactNode;
  description?: ReactNode;
  /** Buttons. At most one primary on the page. */
  actions?: ReactNode;
  /** Price, trial, rating: one quiet line under the actions. */
  meta?: ReactNode;
  /** Product glimpse beside the copy (size "lg", from 48rem of banner width). Hidden on the narrowest screens. */
  media?: ReactNode;
  /** Heading element for the title. Default "h2". */
  titleAs?: "h1" | "h2" | "h3";
}

/**
 * A featured product banner: the product's artwork field with its mark, name, pitch and call to action.
 * The whole banner sits in the product's own brand scope, so a Mahaam spotlight shows Mahaam's colour even
 * inside the CircleXO store.
 */
export function Spotlight({ brand, size = "lg", eyebrow, mark, title, description, actions, meta, media, titleAs: Title = "h2", className, ...props }: SpotlightProps) {
  const id = useId();
  const lg = size === "lg";
  return (
    <section data-slot="spotlight" data-size={size} aria-labelledby={id} className={cn("flex", className)} {...props}>
      <ProductArtwork brand={brand} className={cn("@container w-full items-stretch justify-stretch", lg && "min-h-[22rem]")}>
        {lg ? (
          <div className="grid w-full gap-8 p-6 @md:p-8 @3xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex max-w-md flex-col items-start justify-center gap-4">
              {eyebrow}
              <div className="flex items-center gap-3">
                {mark ?? <ProductMark brand={brand} size={44} title="" />}
                <Title id={id} className="text-display leading-none text-foreground">
                  {title}
                </Title>
              </div>
              {description && <div className="text-pretty text-body text-foreground/90">{description}</div>}
              {actions && <div className="flex flex-wrap items-center gap-3 pt-1">{actions}</div>}
              {meta && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">{meta}</div>}
            </div>
            {media && <div className="hidden items-center justify-center @md:flex">{media}</div>}
          </div>
        ) : (
          <div className="flex w-full flex-col justify-between gap-6 p-5">
            <div className="flex items-start justify-between gap-3">
              {mark ?? <ProductMark brand={brand} size={40} title="" />}
              {eyebrow}
            </div>
            <div className="flex flex-col gap-1">
              <Title id={id} className="text-h3 text-foreground">
                {title}
              </Title>
              {description && <div className="line-clamp-2 text-body-sm text-muted-foreground">{description}</div>}
            </div>
            {(meta || actions) && (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">{meta}</div>
                {actions}
              </div>
            )}
          </div>
        )}
      </ProductArtwork>
    </section>
  );
}
