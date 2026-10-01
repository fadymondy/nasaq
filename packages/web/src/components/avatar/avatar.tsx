"use client";

import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

export const avatarVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-secondary align-middle font-medium text-secondary-foreground",
  {
    variants: {
      size: {
        xs: "size-5 text-[9px]",
        sm: "size-6 text-[10px]",
        md: "size-8 text-caption",
        lg: "size-10 text-label",
      },
      /** People are round; workspaces and organisations are square (control radius). */
      shape: { circle: "rounded-full", square: "rounded-control" },
    },
    defaultVariants: { size: "md", shape: "circle" },
  },
);

type Segmenter = { segment(s: string): Iterable<{ segment: string }> };

/** First user-perceived character (grapheme), so emoji and surrogate pairs are never split. */
function firstGrapheme(word: string): string {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => Segmenter }).Segmenter;
  if (Seg) {
    for (const { segment } of new Seg(undefined, { granularity: "grapheme" }).segment(word)) return segment;
    return "";
  }
  return Array.from(word)[0] ?? "";
}

/** Up to two initials, taken from the first and last word. Works for Arabic names and surrogate pairs. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ? firstGrapheme(words[0]) : "";
  const last = words.length > 1 ? firstGrapheme(words[words.length - 1] as string) : "";
  return (first + last).toUpperCase();
}

export interface AvatarProps extends ComponentProps<typeof BaseAvatar.Root>, VariantProps<typeof avatarVariants> {
  /** Used for the alt text and the initials fallback. Optional when you compose `children` or pass `fallback`. */
  name?: string;
  src?: string;
  /** Shown instead of the initials while there is no image or it fails to load (an icon, a glyph). */
  fallback?: ReactNode;
  /** Compose the parts yourself with `AvatarImage` and `AvatarFallback`; this replaces the `src` image and the fallback. */
  children?: ReactNode;
}

/** The image part, for composing inside `Avatar`. It renders nothing until it has loaded, so `AvatarFallback` shows meanwhile. */
export function AvatarImage({ className, alt = "", ...props }: ComponentProps<typeof BaseAvatar.Image>) {
  return <BaseAvatar.Image data-slot="avatar-image" alt={alt} className={cn("size-full object-cover", className as string)} {...props} />;
}

/** The fallback part, for composing inside `Avatar`: shown while the image is missing or loading. */
export function AvatarFallback({ className, ...props }: ComponentProps<typeof BaseAvatar.Fallback>) {
  return <BaseAvatar.Fallback data-slot="avatar-fallback" className={cn("flex size-full items-center justify-center", className as string)} {...props} />;
}

export function Avatar({ name = "", src, fallback, size, shape, className, children, ...props }: AvatarProps) {
  return (
    <BaseAvatar.Root
      data-slot="avatar"
      className={(state) => cn(avatarVariants({ size, shape }), typeof className === "function" ? className(state) : className)}
      {...props}
    >
      {children ?? (
        <>
          {src ? <BaseAvatar.Image src={src} alt={name} className="size-full object-cover" /> : null}
          <BaseAvatar.Fallback
            delay={src ? 400 : 0}
            {...(src ? { "aria-hidden": true } : name ? { role: "img", "aria-label": name } : {})}
          >
            {fallback ?? initials(name)}
          </BaseAvatar.Fallback>
        </>
      )}
    </BaseAvatar.Root>
  );
}
