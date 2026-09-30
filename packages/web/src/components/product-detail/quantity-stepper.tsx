"use client";

import { Minus, Plus } from "lucide-react";
import { type ComponentProps, useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { commerceClampQuantity } from "../../lib/commerce";
import { useFormatNumber } from "../numeric";
import { type ProductDetailLabels, usePdpStrings } from "./pdp-strings";

export interface ProductQuantityStepperProps extends Omit<ComponentProps<"div">, "onChange" | "defaultValue"> {
  value: number;
  onValueChange: (value: number) => void;
  /** Highest allowed (stock or per-order cap). Undefined = unlimited. */
  max?: number;
  disabled?: boolean;
  labels?: ProductDetailLabels;
}

/**
 * A quantity stepper clamped to 1..max. Type a number and it is clamped when you leave the field or press
 * Enter; ArrowUp/ArrowDown step. Reaching the limit says so in a live region.
 */
export function ProductQuantityStepper({ value, onValueChange, max, disabled, labels, className, ...props }: ProductQuantityStepperProps) {
  const { t } = usePdpStrings(labels);
  const fmt = useFormatNumber();
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const limit = max !== undefined ? Math.max(max, 1) : undefined;
  const clamped = commerceClampQuantity(value, limit);
  useEffect(() => {
    if (clamped !== value) onValueChange(clamped);
  }, [clamped, value, onValueChange]);

  const commit = (raw: number) => {
    const next = commerceClampQuantity(raw, limit);
    setHint(limit !== undefined && Math.floor(raw) > limit);
    setDraft(null);
    onValueChange(next);
  };
  const atMax = limit !== undefined && clamped >= limit;
  const btn = "inline-flex size-control items-center justify-center text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4";

  return (
    <div data-slot="product-quantity" className={cn("flex flex-col gap-1", className)} {...props}>
      <div role="group" aria-label={t.quantity} className="inline-flex w-fit items-center overflow-hidden rounded-control border border-border bg-card">
        <button type="button" aria-label={t.decrease} disabled={disabled || clamped <= 1} onClick={() => commit(clamped - 1)} className={btn}>
          <Minus aria-hidden />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          role="spinbutton"
          aria-label={t.quantity}
          aria-valuemin={1}
          aria-valuemax={limit}
          aria-valuenow={clamped}
          disabled={disabled}
          dir="ltr"
          value={draft ?? fmt(clamped, { useGrouping: false })}
          onChange={(event) => setDraft(event.target.value.replace(/[^\d٠-٩]/g, ""))}
          onFocus={(event) => event.target.select()}
          onBlur={() => draft !== null && commit(Number(toLatin(draft)))}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit(draft === null ? clamped : Number(toLatin(draft)));
            else if (event.key === "ArrowUp") {
              event.preventDefault();
              commit(clamped + 1);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              commit(clamped - 1);
            }
          }}
          className="h-control w-12 border-x border-border bg-transparent text-center text-body tabular-nums text-foreground outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-50 pointer-coarse:text-[16px]"
        />
        <button type="button" aria-label={t.increase} disabled={disabled || atMax} onClick={() => commit(clamped + 1)} className={btn}>
          <Plus aria-hidden />
        </button>
      </div>
      <p aria-live="polite" className={cn("text-caption text-nq-warning-text", !hint && "sr-only")}>
        {hint && limit !== undefined ? t.maxReached(fmt(limit)) : ""}
      </p>
    </div>
  );
}

/** Arabic-Indic digits typed on an Arabic keyboard to Latin, so Number() reads them. */
function toLatin(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}
