"use client";

import { Field as BaseField } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

const controlClass = [
  "w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground",
  "min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none",
  "placeholder:text-muted-foreground",
  "focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus",
  "data-invalid:border-nq-danger aria-invalid:border-nq-danger",
  "disabled:cursor-not-allowed disabled:opacity-50",
  // 16px on coarse pointers so iOS does not zoom on focus.
  "pointer-coarse:text-[16px]",
];

export interface InputProps extends ComponentProps<typeof BaseInput> {
  /** Force left-to-right entry and `text-start` alignment, for emails, URLs, codes and phone numbers in Arabic forms. */
  ltr?: boolean;
}

export function Input({ className, ltr, ...props }: InputProps) {
  return (
    <BaseInput
      data-slot="input"
      {...(ltr ? { dir: "ltr" as const } : {})}
      className={cn(controlClass, "h-control", ltr && "text-start", className as string)}
      {...props}
    />
  );
}

/** A Base UI Field control rendered as a `<textarea>`: label, description, error and `data-invalid` wire up like Input. */
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <BaseField.Control
      render={<textarea />}
      data-slot="textarea"
      className={cn(controlClass, "min-h-20 py-2", className)}
      {...(props as object)}
    />
  );
}

export function Field({ className, ...props }: ComponentProps<typeof BaseField.Root>) {
  return <BaseField.Root data-slot="field" className={cn("flex flex-col gap-1.5", className as string)} {...props} />;
}

export function FieldLabel({ className, ...props }: ComponentProps<typeof BaseField.Label>) {
  return (
    <BaseField.Label
      data-slot="field-label"
      className={cn("text-label text-foreground data-disabled:opacity-50", className as string)}
      {...props}
    />
  );
}

export function FieldDescription({ className, ...props }: ComponentProps<typeof BaseField.Description>) {
  return (
    <BaseField.Description
      data-slot="field-description"
      className={cn("text-caption text-muted-foreground", className as string)}
      {...props}
    />
  );
}

/** Error text is never colour-only: it is announced and paired with the invalid border. */
export function FieldError({ className, ...props }: ComponentProps<typeof BaseField.Error>) {
  return (
    <BaseField.Error
      data-slot="field-error"
      className={cn("text-caption text-nq-danger-text", className as string)}
      {...props}
    />
  );
}

export const FieldControl = BaseField.Control;
