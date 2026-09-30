"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface ScreenshotFrameProps extends Omit<ComponentProps<"figure">, "title"> {
  /** "window": a desktop app. "browser": a web page, with an address bar. "phone": a mobile screen. */
  variant?: "window" | "browser" | "phone";
  /** Window title ("window") or address ("browser"). Always shown left-to-right. */
  title?: ReactNode;
  /**
   * What the screenshot shows, for screen readers: "Mahaam board with three columns". When set, the frame is
   * announced as one image and its content is hidden from assistive tech and made inert.
   */
  label?: string;
  /** Visible caption under the frame. */
  caption?: ReactNode;
  /** The screenshot: an `<img>`, or live markup rendered as a mock. */
  children: ReactNode;
}

function Dots() {
  return (
    <span aria-hidden className="flex gap-1.5">
      <span className="size-2.5 rounded-full bg-nq-line-strong" />
      <span className="size-2.5 rounded-full bg-nq-line-strong" />
      <span className="size-2.5 rounded-full bg-nq-line-strong" />
    </span>
  );
}

/**
 * Frames a product screenshot as a window, browser tab or phone, so marketing pages can show the product
 * without faking a real OS chrome. Neutral greys only: the screenshot, not the frame, carries the brand.
 */
export function ScreenshotFrame({ variant = "window", title, label, caption, className, children, ...props }: ScreenshotFrameProps) {
  const phone = variant === "phone";
  const screen = (
    <div
      data-slot="screenshot-frame-screen"
      role={label ? "img" : undefined}
      aria-label={label}
      className={cn("relative overflow-hidden bg-background", phone ? "aspect-[9/19] rounded-[1.75rem]" : "rounded-b-[calc(var(--radius-card)-1px)]")}
    >
      <div aria-hidden={label ? true : undefined} inert={label ? true : undefined} className="size-full">
        {children}
      </div>
    </div>
  );
  return (
    <figure data-slot="screenshot-frame" data-variant={variant} className={cn("flex min-w-0 flex-col gap-3", phone && "items-center", className)} {...props}>
      {phone ? (
        <div className="w-full max-w-[18rem] rounded-[2.25rem] bg-nq-surface-raised p-2 shadow-lg ring-1 ring-border">{screen}</div>
      ) : (
        <div className="w-full overflow-hidden rounded-card bg-nq-surface-raised shadow-lg ring-1 ring-border">
          <div data-slot="screenshot-frame-bar" className="flex h-9 items-center gap-3 px-3">
            <Dots />
            {title &&
              (variant === "browser" ? (
                <span dir="ltr" className="mx-auto flex h-6 w-full max-w-xs items-center justify-center truncate rounded-control bg-secondary px-3 text-caption text-muted-foreground">
                  {title}
                </span>
              ) : (
                <span dir="ltr" className="mx-auto truncate text-caption text-muted-foreground">
                  {title}
                </span>
              ))}
            <span aria-hidden className="w-[42px]" />
          </div>
          {screen}
        </div>
      )}
      {caption && <figcaption className="text-center text-caption text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
