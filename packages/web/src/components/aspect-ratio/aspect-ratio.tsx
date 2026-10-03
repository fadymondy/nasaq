import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export interface AspectRatioProps extends ComponentProps<"div"> {
  /** Width over height: `16 / 9`, `4 / 3`, `1`. Default 16 / 9. */
  ratio?: number;
}

/**
 * Keeps its content at a fixed width-to-height ratio as the width changes: video embeds, maps, cover images,
 * thumbnails. Direct `img`, `video` and `iframe` children fill the box.
 */
export function AspectRatio({ ratio = 16 / 9, className, style, ...props }: AspectRatioProps) {
  return (
    <div
      data-slot="aspect-ratio"
      className={cn(
        "relative w-full overflow-hidden",
        "[&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:size-full [&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-cover [&>video]:absolute [&>video]:inset-0 [&>video]:size-full [&>video]:object-cover",
        className,
      )}
      style={{ aspectRatio: String(ratio), ...style }}
      {...props}
    />
  );
}
