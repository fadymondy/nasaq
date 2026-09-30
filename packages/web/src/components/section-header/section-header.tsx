import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface SectionHeaderProps extends Omit<ComponentProps<"div">, "title"> {
  title: ReactNode;
  /** One line under the title. */
  description?: ReactNode;
  /** Inline-end slot: a "See all" link button, a toggle. */
  action?: ReactNode;
  /** Heading element. Default "h2". Pick the level that fits the page outline; the look stays the same. */
  as?: "h1" | "h2" | "h3";
  /** Id for the heading, so the section can point at it with `aria-labelledby`. */
  headingId?: string;
}

/**
 * The title row of a page section: heading, one line of context, an optional action at the inline end.
 * Sections are separated by whitespace and this header, not by wrapping each one in a bordered card.
 */
export function SectionHeader({ title, description, action, as: Heading = "h2", headingId, className, ...props }: SectionHeaderProps) {
  return (
    <div data-slot="section-header" className={cn("flex items-end justify-between gap-4", className)} {...props}>
      <div className="flex min-w-0 flex-col gap-1">
        <Heading id={headingId} className="text-h2 text-foreground">
          {title}
        </Heading>
        {description && <p className="text-pretty text-body-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
