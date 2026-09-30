"use client";

import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/**
 * A choice that is applied on submit, or a row in a selection. `indeterminate` shows a dash for "some selected".
 * For a setting that applies immediately, use Switch.
 */
export function Checkbox({ className, ...props }: ComponentProps<typeof BaseCheckbox.Root>) {
  return (
    <BaseCheckbox.Root
      data-slot="checkbox"
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-nq-line-strong bg-card text-primary-foreground outline-none",
        "transition-colors duration-150 ease-nq data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        // A 24px hit area around the 16px box, without changing layout.
        "after:absolute after:-inset-1",
        className as string,
      )}
      {...props}
    >
      <BaseCheckbox.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center [&_svg]:size-3 [&_svg]:stroke-3"
        render={(indicatorProps, state) => <span {...indicatorProps}>{state.indeterminate ? <Minus aria-hidden /> : <Check aria-hidden />}</span>}
      />
    </BaseCheckbox.Root>
  );
}
