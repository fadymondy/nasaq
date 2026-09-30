"use client";

import { Check } from "lucide-react";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";

export interface PlanCardProps extends Omit<ComponentProps<"article">, "title"> {
  /** Plan name: "Team". */
  name: ReactNode;
  /** Who it's for, one line. */
  description?: ReactNode;
  /** Usually `<Price size="lg" />`. */
  price: ReactNode;
  /** A line under the price: "Billed yearly", "Up to 3 people". */
  priceNote?: ReactNode;
  /** What the plan includes. Start with "Everything in Solo, plus" when it builds on a smaller plan. */
  features?: ReactNode[];
  /** The plan's button. Only the highlighted plan's button should be primary. */
  action?: ReactNode;
  /** The recommended plan: brand-tinted surface. Use on at most one plan. */
  highlighted?: boolean;
  /** "Most popular". Shown beside the name. */
  badge?: ReactNode;
}

/**
 * One pricing plan. Plans are separated by space and a quiet surface, not borders; the recommended one is
 * tinted with the product's brand colour. Lay several out with `PlanGrid`.
 */
export function PlanCard({ name, description, price, priceNote, features, action, highlighted, badge, className, ...props }: PlanCardProps) {
  const id = useId();
  return (
    <article
      data-slot="plan-card"
      data-highlighted={highlighted || undefined}
      aria-labelledby={id}
      className={cn(
        "flex min-w-0 flex-col gap-5 rounded-card p-6",
        highlighted ? "bg-[color-mix(in_oklab,var(--nq-brand)_10%,var(--nq-surface))] ring-1 ring-nq-brand/40" : "bg-nq-surface",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h3 id={id} className="text-h3 text-foreground">
            {name}
          </h3>
          {badge}
        </div>
        {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-col gap-1">
        {price}
        {priceNote && <p className="text-caption text-muted-foreground">{priceNote}</p>}
      </div>
      {action && <div className="flex flex-col">{action}</div>}
      {features && features.length > 0 && (
        <ul className="flex flex-col gap-2">
          {features.map((feature, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static copy
            <li key={i} className="flex items-start gap-2 text-body-sm text-foreground">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-nq-brand" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** Lays `PlanCard`s side by side from 48rem of container width (up to 4), stacked below it. */
export function PlanGrid({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="plan-grid" className="@container">
      <div className={cn("grid grid-cols-1 gap-4 @3xl:auto-cols-fr @3xl:grid-flow-col", className)} {...props}>
        {children}
      </div>
    </div>
  );
}
