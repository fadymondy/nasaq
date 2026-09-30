"use client";

import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import { type ComponentProps, createContext, use } from "react";
import { cn } from "../../lib/cn";

type ToggleGroupVariant = "segmented" | "outline";
const VariantContext = createContext<ToggleGroupVariant | null>(null);

const itemBase = [
  "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-label text-muted-foreground outline-none",
  "transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
  "data-disabled:pointer-events-none data-disabled:opacity-50",
];

export interface ToggleGroupProps extends ComponentProps<typeof BaseToggleGroup> {
  /** "segmented" (default): items in a tinted track, the pressed one raised. "outline": bordered, joined buttons. */
  variant?: ToggleGroupVariant;
}

/**
 * A row of toggle buttons. By default one item is pressed at a time (a segmented control: view mode, alignment);
 * set `multiple` to allow several (text formatting). `value` is always an array. Arrow keys follow the reading direction.
 * For switching between panels of content use `Tabs`.
 */
export function ToggleGroup({ variant = "segmented", className, ...props }: ToggleGroupProps) {
  return (
    <VariantContext value={variant}>
      <BaseToggleGroup
        data-slot="toggle-group"
        data-variant={variant}
        className={cn(
          "flex w-fit max-w-full",
          variant === "segmented" ? "gap-0.5 rounded-control bg-secondary p-0.5" : "rounded-control",
          className as string,
        )}
        {...props}
      />
    </VariantContext>
  );
}

/** One pressed-state button inside a `ToggleGroup`, or on its own (then it looks like an outline button). Give icon-only items an `aria-label`. */
export function Toggle({ className, ...props }: ComponentProps<typeof BaseToggle>) {
  const variant = use(VariantContext);
  return (
    <BaseToggle
      data-slot="toggle"
      className={cn(
        itemBase,
        variant === "segmented" &&
          "rounded-[calc(var(--radius-control)-2px)] data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-xs",
        variant === "outline" &&
          "border border-border bg-card first:rounded-s-control last:rounded-e-control not-first:-ms-px data-pressed:z-1 data-pressed:border-primary data-pressed:bg-nq-selected data-pressed:text-foreground",
        variant === null &&
          "rounded-control border border-border bg-card data-pressed:border-primary data-pressed:bg-nq-selected data-pressed:text-foreground",
        className as string,
      )}
      {...props}
    />
  );
}
