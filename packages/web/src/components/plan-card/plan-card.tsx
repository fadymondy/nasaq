"use client";

import { Check, Minus } from "lucide-react";
import { type ComponentProps, isValidElement, type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Tooltip } from "../tooltip";

/** One line of a plan's feature list. A bare node is an included feature. */
export interface PlanFeature {
  label: ReactNode;
  /** `false` lists it as not included (a muted dash), so people see what the next plan adds. Default true. */
  included?: boolean;
  /** A short explanation, shown in a tooltip on the label. */
  hint?: string;
}

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
  features?: (ReactNode | PlanFeature)[];
  /** A small heading over the features: "Includes", "Everything in Team, plus". */
  featuresTitle?: ReactNode;
  /** The plan's button. Only the highlighted plan's button should be primary. */
  action?: ReactNode;
  /** Fine print under the button: "No card required", "Cancel anytime". */
  footnote?: ReactNode;
  /** The recommended plan: brand-tinted surface and ring. Use on at most one plan. */
  highlighted?: boolean;
  /** The plan the account is on now: a neutral ring and a "Current plan" pill (unless `badge` is set). */
  current?: boolean;
  /** "Most popular", "Save 20%". Shown as a pill on the card's top edge. */
  badge?: ReactNode;
}

const STRINGS = {
  en: { current: "Current plan", notIncluded: "Not included" },
  ar: { current: "خطتك الحالية", notIncluded: "غير مشمول" },
};

function isFeature(value: unknown): value is PlanFeature {
  return typeof value === "object" && value !== null && !isValidElement(value) && "label" in value;
}

/**
 * One pricing plan. Plans are separated by space and a quiet surface, not borders; the recommended one is
 * tinted with the product's brand colour and lifted. Lay several out with `PlanGrid`, or let `PricingTable`
 * build them from data.
 */
export function PlanCard({
  name,
  description,
  price,
  priceNote,
  features,
  featuresTitle,
  action,
  footnote,
  highlighted,
  current,
  badge,
  className,
  ...props
}: PlanCardProps) {
  const id = useId();
  const t = STRINGS[useOptionalNasaq()?.locale.startsWith("ar") ? "ar" : "en"];
  const pill = badge ?? (current ? t.current : null);
  return (
    <article
      data-slot="plan-card"
      data-highlighted={highlighted || undefined}
      data-current={current || undefined}
      aria-labelledby={id}
      className={cn(
        "relative flex min-w-0 flex-col gap-5 rounded-card p-6",
        highlighted
          ? "bg-[color-mix(in_oklab,var(--nq-brand)_9%,var(--nq-surface))] shadow-lg ring-2 ring-nq-brand/50"
          : current
            ? "bg-nq-surface ring-1 ring-nq-line-strong"
            : "bg-nq-surface",
        className,
      )}
      {...props}
    >
      {pill ? (
        <span
          data-slot="plan-card-badge"
          className={cn(
            "absolute -top-3 start-6 inline-flex h-6 items-center rounded-full border px-2.5 text-caption font-medium whitespace-nowrap",
            highlighted ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
          )}
        >
          {pill}
        </span>
      ) : null}
      <div className="flex flex-col gap-1">
        <h3 id={id} className="text-h3 text-foreground">
          {name}
        </h3>
        {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex flex-col gap-1">
        {price}
        {priceNote && <p className="text-caption text-muted-foreground">{priceNote}</p>}
      </div>
      {action || footnote ? (
        <div className="flex flex-col gap-2">
          {action}
          {footnote && <p className="text-center text-caption text-muted-foreground">{footnote}</p>}
        </div>
      ) : null}
      {features && features.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-border pt-5">
          {featuresTitle && <p className="text-label text-foreground">{featuresTitle}</p>}
          <ul className="flex flex-col gap-2.5">
            {features.map((item, i) => {
              const feature = isFeature(item) ? item : { label: item };
              const included = feature.included !== false;
              const label = feature.hint ? (
                <Tooltip content={feature.hint}>
                  <span tabIndex={0} className="cursor-help underline decoration-nq-line decoration-dotted underline-offset-4">
                    {feature.label}
                  </span>
                </Tooltip>
              ) : (
                feature.label
              );
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: static copy
                <li key={i} data-included={included || undefined} className={cn("flex items-start gap-2 text-body-sm", included ? "text-foreground" : "text-muted-foreground")}>
                  {included ? (
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-nq-brand" />
                  ) : (
                    <Minus aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
                  )}
                  <span>
                    {label}
                    {included ? null : <span className="sr-only"> ({t.notIncluded})</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}

/** Lays `PlanCard`s side by side from 48rem of container width (up to 4), stacked below it. Leaves room for the badge pills. */
export function PlanGrid({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="plan-grid" className="@container">
      <div className={cn("grid grid-cols-1 gap-x-4 gap-y-7 pt-3 @3xl:auto-cols-fr @3xl:grid-flow-col", className)} {...props}>
        {children}
      </div>
    </div>
  );
}
