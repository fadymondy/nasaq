"use client";

import { type ComponentProps, createContext, type ReactNode, use } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";

const ChipGroupContext = createContext<{ value: string; onValueChange: (value: string) => void } | null>(null);

export interface ChipGroupProps extends Omit<ComponentProps<"div">, "onChange"> {
  /** The selected chip's value. */
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible name of the group: "Categories". Required, since the chips alone don't say what they filter. */
  "aria-label": string;
}

/**
 * A single-select row of filter chips (categories, views). Scrolls sideways on narrow screens instead of
 * wrapping into a block. For choices that change a setting use `Switch` or a radio group; for navigation
 * between views of the same content use `Tabs`.
 */
export function ChipGroup({ value, onValueChange, className, children, ...props }: ChipGroupProps) {
  return (
    <ChipGroupContext value={{ value, onValueChange }}>
      <div
        role="group"
        data-slot="chip-group"
        className={cn("-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
        {...props}
      >
        {children}
      </div>
    </ChipGroupContext>
  );
}

export interface ChipProps extends Omit<ComponentProps<typeof Button>, "value" | "variant" | "size"> {
  value: string;
  /** Leading icon element. */
  icon?: ReactNode;
}

/** One chip. Pressed state is exposed as `aria-pressed` and `data-selected`. */
export function Chip({ value, icon, className, children, ...props }: ChipProps) {
  const ctx = use(ChipGroupContext);
  if (!ctx) throw new Error("<Chip> must be inside <ChipGroup>");
  const selected = ctx.value === value;
  return (
    <Button
      data-slot="chip"
      data-selected={selected || undefined}
      aria-pressed={selected}
      size="sm"
      variant="ghost"
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "shrink-0 rounded-full px-3 text-muted-foreground",
        "data-selected:bg-nq-selected data-selected:text-foreground",
        className as string,
      )}
      {...props}
    >
      {icon}
      {children}
    </Button>
  );
}
