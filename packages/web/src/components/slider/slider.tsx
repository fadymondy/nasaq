"use client";

import { Slider as BaseSlider } from "@base-ui/react/slider";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { type FormatNumberOptions, formatNumber } from "../numeric";

export interface SliderMark {
  /** Position on the scale, between `min` and `max`. */
  value: number;
  /** Text under the tick. Omit for a bare tick. */
  label?: ReactNode;
}

type SliderRootProps = Omit<BaseSlider.Root.Props, "children" | "format" | "orientation" | "getAriaLabel">;

export interface SliderProps extends SliderRootProps {
  /** Visible name shown above the track. Without it, pass `aria-label`. */
  label?: ReactNode;
  /** Show the formatted value at the inline end of the label row. Default true when `label` is set. */
  showValue?: boolean;
  /** `Intl.NumberFormat` options for the value label and the spoken value, e.g. `{ style: "percent" }`. */
  format?: FormatNumberOptions;
  /** Ticks under the track. `true` puts one on every step (only sensible for a few steps). */
  marks?: readonly SliderMark[] | boolean;
  /** Accessible name of each thumb of a range, e.g. `["Minimum price", "Maximum price"]`. */
  thumbLabels?: readonly string[];
}

/** Locale digits are always Latin (Nasaq numbering rule), whatever the UI language. */
function useLocale() {
  return useOptionalNasaq()?.locale ?? "en";
}

function markList(marks: SliderProps["marks"], min: number, max: number, step: number): readonly SliderMark[] {
  if (!marks) return [];
  if (marks !== true) return marks;
  const out: SliderMark[] = [];
  for (let v = min; v <= max; v += step) out.push({ value: v });
  return out;
}

/**
 * A draggable value or range picker. Pass a number for a single thumb, or an array for a range
 * (`defaultValue={[20, 80]}`). Built on Base UI Slider: keyboard, pointer and touch, Field wiring
 * (`name`, validity, disabled) and reading direction come from it. In RTL the track fills from the
 * right and ArrowLeft increases the value.
 */
export function Slider({
  label,
  showValue,
  format,
  marks,
  thumbLabels,
  min = 0,
  max = 100,
  step = 1,
  className,
  ...props
}: SliderProps) {
  const locale = useLocale();
  const fmt = (n: number) => formatNumber(n, locale, format);
  const list = markList(marks, min, max, step);
  const initial = props.value ?? props.defaultValue;
  const range = Array.isArray(initial);
  const thumbs = Array.isArray(initial) ? initial.length : 1;
  const withValue = showValue ?? label !== undefined;

  return (
    <BaseSlider.Root
      data-slot="slider"
      min={min}
      max={max}
      step={step}
      locale={locale}
      className={cn("flex w-full flex-col gap-2 data-disabled:opacity-50", className as string)}
      {...props}
    >
      {label !== undefined || withValue ? (
        <div data-slot="slider-head" className="flex items-baseline justify-between gap-3 text-body-sm">
          {label !== undefined ? <BaseSlider.Label className="text-label text-foreground">{label}</BaseSlider.Label> : <span />}
          {withValue ? (
            <BaseSlider.Value data-slot="slider-value" className="text-muted-foreground tabular-nums">
              {(_formatted, values) => <bdi>{values.map(fmt).join(" – ")}</bdi>}
            </BaseSlider.Value>
          ) : null}
        </div>
      ) : null}
      <BaseSlider.Control data-slot="slider-control" className="flex h-5 w-full touch-none select-none items-center">
        <BaseSlider.Track data-slot="slider-track" className="relative h-1.5 w-full rounded-full bg-nq-surface-soft">
          <BaseSlider.Indicator data-slot="slider-range" className="rounded-full bg-primary" />
          {Array.from({ length: thumbs }, (_, i) => (
            <BaseSlider.Thumb
              key={i}
              index={range ? i : undefined}
              data-slot="slider-thumb"
              getAriaLabel={thumbLabels?.[i] !== undefined ? () => thumbLabels[i] as string : undefined}
              getAriaValueText={(formatted, value) => fmt(value) || formatted}
              className={cn(
                "size-4 rounded-full border border-primary bg-card shadow-xs outline-none",
                "transition-[box-shadow] duration-150 ease-nq motion-reduce:transition-none",
                "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nq-focus has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-nq-focus",
                "data-dragging:shadow-md data-disabled:pointer-events-none",
              )}
            />
          ))}
        </BaseSlider.Track>
      </BaseSlider.Control>
      {list.length ? (
        <div data-slot="slider-marks" aria-hidden="true" className="relative h-6 w-full">
          {list.map((mark) => {
            const pct = max === min ? 0 : ((mark.value - min) / (max - min)) * 100;
            return (
              <span
                key={mark.value}
                data-slot="slider-mark"
                style={{ insetInlineStart: `${pct}%` }}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1 text-caption text-muted-foreground rtl:translate-x-1/2"
              >
                <span className="h-1.5 w-px bg-border" />
                {mark.label !== undefined ? <span className="tabular-nums">{mark.label}</span> : null}
              </span>
            );
          })}
        </div>
      ) : null}
    </BaseSlider.Root>
  );
}
