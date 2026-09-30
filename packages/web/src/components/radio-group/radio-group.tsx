"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Pick exactly one option from a short list. Arrow keys move and select, following the reading direction.
 * Put it inside a `Field` and name it with `FieldLabel` (or `aria-labelledby` / `aria-label`).
 */
export function RadioGroup({ className, ...props }: ComponentProps<typeof BaseRadioGroup>) {
  return <BaseRadioGroup data-slot="radio-group" className={cn("flex flex-col gap-2", className as string)} {...props} />;
}

/** One round radio. Pair it with a `<label>` so the text is clickable. */
export function Radio({ className, ...props }: ComponentProps<typeof BaseRadio.Root>) {
  return (
    <BaseRadio.Root
      data-slot="radio"
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-nq-line-strong bg-card outline-none",
        "transition-colors duration-150 ease-nq data-checked:border-primary data-checked:bg-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        // A 24px hit area around the 16px circle, without changing layout.
        "after:absolute after:-inset-1 after:rounded-full",
        className as string,
      )}
      {...props}
    >
      <BaseRadio.Indicator data-slot="radio-indicator" className="block size-1.5 rounded-full bg-primary-foreground" />
    </BaseRadio.Root>
  );
}

export interface RadioCardProps extends Omit<ComponentProps<typeof BaseRadio.Root>, "children" | "title"> {
  /** The option's name: "Pro". */
  title: ReactNode;
  /** Supporting text under the title. */
  description?: ReactNode;
  /** Trailing content at the inline end, such as a price. */
  meta?: ReactNode;
}

/** The card variant: the whole bordered card is the radio. For plan-style choices where each option needs a description or price. */
export function RadioCard({ title, description, meta, className, ...props }: RadioCardProps) {
  return (
    <BaseRadio.Root
      data-slot="radio-card"
      className={cn(
        "group/card relative flex w-full cursor-pointer items-start gap-3 rounded-card border border-border bg-card p-4 text-start outline-none",
        "transition-colors duration-150 ease-nq hover:border-nq-line-strong",
        "data-checked:border-primary data-checked:bg-nq-selected",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className as string,
      )}
      {...props}
    >
      <span
        data-slot="radio-card-mark"
        aria-hidden
        className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-nq-line-strong bg-card group-data-checked/card:border-primary group-data-checked/card:bg-primary"
      >
        <BaseRadio.Indicator className="block size-1.5 rounded-full bg-primary-foreground" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span data-slot="radio-card-title" className="text-label text-foreground">
          {title}
        </span>
        {description ? (
          <span data-slot="radio-card-description" className="text-caption text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      {meta ? (
        <span data-slot="radio-card-meta" className="shrink-0 text-label text-foreground">
          {meta}
        </span>
      ) : null}
    </BaseRadio.Root>
  );
}
