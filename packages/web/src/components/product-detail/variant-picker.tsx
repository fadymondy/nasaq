"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";
import { type CommerceOption, type CommerceProduct, type CommerceSelection, commerceValueAvailability } from "../../lib/commerce";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { selectOptionValue } from "./pdp-logic";
import { type ProductDetailLabels, usePdpStrings } from "./pdp-strings";

export interface ProductVariantPickerProps {
  product: CommerceProduct;
  selection: CommerceSelection;
  onSelectionChange: (selection: CommerceSelection) => void;
  /**
   * What to do with a value that no variant has together with the other picks (for example size L in a colour
   * that is only made in S and M). "hide" (default) removes it; "disable" keeps it visible and unselectable.
   * Sold-out values are always shown, crossed out, and can still be selected so the page can say so.
   */
  impossible?: "hide" | "disable";
  /** Extra content next to an axis label, such as a size guide link. */
  optionAction?: (option: CommerceOption) => ReactNode;
  /** Axes to flag as needing a pick, e.g. after "Add to cart" without a size. */
  invalid?: readonly string[];
  className?: string;
  labels?: ProductDetailLabels;
}

const focusRing = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus";

/**
 * Option axes as radio groups: colour swatches, size buttons, image tiles or a select. Availability comes from
 * `commerceValueAvailability`: sold-out values are crossed out, impossible ones hidden or disabled. Picking a
 * value keeps the other picks that still combine and drops the ones that do not (`selectOptionValue`).
 */
export function ProductVariantPicker({ product, selection, onSelectionChange, impossible = "hide", optionAction, invalid, className, labels }: ProductVariantPickerProps) {
  const { t } = usePdpStrings(labels);
  const uid = useId();
  return (
    <div data-slot="product-variant-picker" className={cn("flex flex-col gap-4", className)}>
      {product.options.map((option) => {
        const availability = commerceValueAvailability(product, selection, option.id);
        const values = option.values.filter((v) => impossible === "disable" || availability[v.id] !== "none");
        const picked = option.values.find((v) => v.id === selection[option.id]);
        const labelId = `${uid}-${option.id}`;
        const display = option.display ?? "button";
        const isInvalid = invalid?.includes(option.id);
        const change = (valueId: string | null) => valueId && onSelectionChange(selectOptionValue(product, selection, option.id, valueId));
        return (
          <div key={option.id} data-slot="product-option" data-option={option.id} data-invalid={isInvalid || undefined} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span id={labelId} className="text-label text-foreground">
                {option.name}
                {picked ? <span className="text-muted-foreground">{": "}</span> : null}
                {picked ? <span className="font-normal text-muted-foreground">{picked.label}</span> : null}
              </span>
              {optionAction?.(option)}
            </div>
            {display === "select" ? (
              <Select value={selection[option.id] ?? null} onValueChange={change}>
                <SelectTrigger aria-labelledby={labelId} aria-invalid={isInvalid || undefined} className="max-w-xs">
                  <SelectValue placeholder={t.selectOption(option.name)}>{picked?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {values.map((v) => (
                    <SelectItem key={v.id} value={v.id} disabled={availability[v.id] === "none"}>
                      {v.label}
                      {availability[v.id] === "out" ? ` · ${t.soldOut}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <BaseRadioGroup
                value={selection[option.id] ?? null}
                onValueChange={(v) => change(v as string)}
                aria-labelledby={labelId}
                aria-invalid={isInvalid || undefined}
                className={cn("flex flex-wrap gap-2", isInvalid && "rounded-control outline-1 outline-offset-4 outline-nq-danger")}
              >
                {values.map((v) => {
                  const state = availability[v.id] ?? "available";
                  const out = state === "out";
                  const none = state === "none";
                  const spoken = out ? `${v.label}, ${t.soldOut}` : none ? `${v.label}, ${t.unavailable}` : v.label;
                  const common = { value: v.id, disabled: none, "aria-label": spoken, "data-availability": state } as const;
                  if (display === "swatch") {
                    return (
                      <BaseRadio.Root
                        key={v.id}
                        {...common}
                        title={out ? `${v.label} · ${t.soldOut}` : v.label}
                        className={cn(
                          "relative inline-flex size-9 items-center justify-center rounded-full border border-nq-line-strong p-0.5 transition-shadow duration-150 ease-nq",
                          focusRing,
                          "data-checked:border-foreground data-checked:ring-1 data-checked:ring-foreground",
                          "data-disabled:cursor-not-allowed data-disabled:opacity-40",
                        )}
                      >
                        <span aria-hidden className="relative block size-full overflow-hidden rounded-full border border-border" style={{ backgroundColor: v.color }}>
                          {out && <span className="absolute start-1/2 top-1/2 h-px w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-nq-danger" />}
                        </span>
                      </BaseRadio.Root>
                    );
                  }
                  if (display === "image") {
                    return (
                      <BaseRadio.Root
                        key={v.id}
                        {...common}
                        className={cn(
                          "relative size-14 overflow-hidden rounded-control border border-border bg-secondary transition-colors duration-150 ease-nq",
                          focusRing,
                          "data-checked:border-foreground data-checked:ring-1 data-checked:ring-foreground",
                          "data-disabled:cursor-not-allowed data-disabled:opacity-40",
                          out && "opacity-60",
                        )}
                      >
                        {v.image ? <img src={v.image} alt="" width={56} height={56} loading="lazy" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-caption">{v.label}</span>}
                        {out && <span aria-hidden className="absolute start-1/2 top-1/2 h-px w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-nq-danger" />}
                      </BaseRadio.Root>
                    );
                  }
                  return (
                    <BaseRadio.Root
                      key={v.id}
                      {...common}
                      className={cn(
                        "relative inline-flex h-control min-w-11 items-center justify-center rounded-control border px-3 text-label transition-colors duration-150 ease-nq",
                        focusRing,
                        "border-border bg-card text-foreground hover:bg-nq-hover",
                        "data-checked:border-foreground data-checked:ring-1 data-checked:ring-foreground",
                        "data-disabled:cursor-not-allowed data-disabled:opacity-40 data-disabled:hover:bg-card",
                        out && "border-dashed text-muted-foreground line-through decoration-nq-danger",
                      )}
                    >
                      <bdi>{v.label}</bdi>
                    </BaseRadio.Root>
                  );
                })}
              </BaseRadioGroup>
            )}
          </div>
        );
      })}
    </div>
  );
}
