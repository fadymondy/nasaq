"use client";

import { Check } from "lucide-react";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";

export interface FeatureStoryProps extends Omit<ComponentProps<"section">, "title"> {
  /** Short label above the title ("Feedback SDK"). */
  eyebrow?: ReactNode;
  /** Icon element shown on a brand tint beside the eyebrow. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Two to four concrete proof points, each one line. */
  points?: ReactNode[];
  /** The picture: a `ScreenshotFrame`, a code sample, a transcript. */
  media?: ReactNode;
  /** Put the media at the inline start instead of the end. Alternate it down a page. */
  reverse?: boolean;
  /** A link or secondary button under the points. */
  action?: ReactNode;
  /** Heading element for the title. Default "h2". */
  titleAs?: "h2" | "h3";
}

/**
 * One feature told as a story: what it is, why it matters, a few proof points and a picture. Copy and
 * media sit side by side from 48rem of container width and stack below it. Stack several with `reverse`
 * alternating to build a product page.
 */
export function FeatureStory({ eyebrow, icon, title, description, points, media, reverse, action, titleAs: Title = "h2", className, ...props }: FeatureStoryProps) {
  const id = useId();
  return (
    <div data-slot="feature-story" className="@container">
      <section
        aria-labelledby={id}
        className={cn("grid grid-cols-1 items-center gap-8 @3xl:grid-cols-2 @3xl:gap-12", className)}
        {...props}
      >
        <div className={cn("flex min-w-0 flex-col items-start gap-4", reverse && "@3xl:order-2")}>
          {(eyebrow || icon) && (
            <div className="flex items-center gap-2 text-label text-muted-foreground">
              {icon && (
                <span aria-hidden className="grid size-7 place-items-center rounded-control bg-[color-mix(in_oklab,var(--nq-brand)_14%,transparent)] text-nq-brand [&_svg]:size-4">
                  {icon}
                </span>
              )}
              {eyebrow}
            </div>
          )}
          <Title id={id} className="text-balance text-h1 text-foreground">
            {title}
          </Title>
          {description && <p className="text-pretty text-body text-muted-foreground">{description}</p>}
          {points && points.length > 0 && (
            <ul className="flex flex-col gap-2">
              {points.map((point, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static copy
                <li key={i} className="flex items-start gap-2 text-body-sm text-foreground">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-nq-brand" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
          {action && <div className="pt-1">{action}</div>}
        </div>
        {media && <div className="min-w-0">{media}</div>}
      </section>
    </div>
  );
}
