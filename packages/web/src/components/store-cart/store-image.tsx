"use client";

import { ImageOff } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";
import { cn } from "../../lib/cn";

export interface StoreImageProps extends Omit<ComponentProps<"span">, "children"> {
  src?: string;
  /** Describes the product. Pass "" only when the name is written right next to the image. */
  alt: string;
  /** Rendered size in pixels; it also reserves the space so nothing jumps while it loads. Default 80. */
  size?: number;
  /** Lazy by default. Use "eager" for the first image on a page. */
  loading?: "lazy" | "eager";
  /** Fill the parent instead of using a fixed box; `size` still sets the intrinsic width and height of the file. */
  fluid?: boolean;
}

/**
 * A product picture in a rounded, token-coloured frame. It reserves its size, loads lazily and shows a quiet icon when
 * there is no `src` or the file fails to load, so a broken image never leaves a hole or a broken-image glyph.
 */
export function StoreImage({ src, alt, size = 80, loading = "lazy", fluid = false, className, style, ...props }: StoreImageProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const showImage = !!src && !failed;
  return (
    <span
      data-slot="store-image"
      data-state={showImage ? "image" : "placeholder"}
      style={fluid ? style : { width: size, height: size, ...style }}
      className={cn(fluid && "size-full", "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary text-muted-foreground", className)}
      {...props}
    >
      {showImage ? (
        <img src={src} alt={alt} width={size} height={size} loading={loading} decoding="async" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <span role={alt ? "img" : undefined} aria-label={alt || undefined} className="inline-flex items-center justify-center">
          <ImageOff aria-hidden className="size-1/3 min-h-4 min-w-4" />
        </span>
      )}
    </span>
  );
}
