"use client";
import { Field as BaseField } from "@base-ui/react/field";
import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface NativeSelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface NativeSelectProps extends Omit<ComponentProps<"select">, "size"> {
  /** Options as data. You can pass `<option>` / `<optgroup>` children instead. */
  options?: readonly NativeSelectOption[];
  /** A first, empty option shown while nothing is chosen. */
  placeholder?: string;
  size?: "sm" | "md";
}

/**
 * The browser's own `<select>`, styled like Input. Use it on mobile-first forms, long plain lists and server
 * forms that post without JavaScript. For search, icons or rich rows use `Select` or `Combobox`.
 * Inside a `Field` it picks up the label, description and invalid state.
 */
export function NativeSelect({ options, placeholder, size = "md", className, children, ...props }: NativeSelectProps) {
  return (
    <div data-slot="native-select" className={cn("relative w-full min-w-0", className)}>
      <BaseField.Control
        render={<select />}
        className={cn(
          "w-full min-w-0 appearance-none rounded-control border border-input bg-card ps-3 pe-9 text-body text-foreground",
          "min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none",
          "focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus",
          "data-invalid:border-nq-danger aria-invalid:border-nq-danger",
          "disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px]",
          size === "sm" ? "h-control-sm" : "h-control",
        )}
        {...(props as object)}
      >
        {placeholder !== undefined ? (
          <option value="" disabled={props.required}>
            {placeholder}
          </option>
        ) : null}
        {options?.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
        {children}
      </BaseField.Control>
      <ChevronDown aria-hidden className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
