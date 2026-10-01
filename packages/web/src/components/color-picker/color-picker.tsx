"use client";

import { Field as BaseField } from "@base-ui/react/field";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { ChevronsUpDown, Pipette } from "lucide-react";
import { useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useCalendarLocale } from "../calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

/** A colour choice: `value` is a hex string or a CSS custom property name; `label` is its accessible name. */
export interface ColorSwatch {
  /** A hex colour (3 or 6 digits, leading `#`) or a CSS custom property name such as `--nq-tag-red`. */
  value: string;
  /** Accessible name and tooltip of the swatch. Localise it. */
  label: string;
}

const TAG_HUES = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"] as const;

const STRINGS = {
  en: {
    choose: "Choose colour",
    swatches: "Colours",
    hex: "Hex value",
    invalid: "Use 3 or 6 hex digits, for example 1A73E8.",
    custom: "Custom",
    none: "No colour",
    names: { gray: "Gray", red: "Red", orange: "Orange", amber: "Amber", green: "Green", teal: "Teal", blue: "Blue", violet: "Violet", pink: "Pink" },
  },
  ar: {
    choose: "اختيار اللون",
    swatches: "الألوان",
    hex: "القيمة السداسية",
    invalid: "أدخل 3 أو 6 خانات سداسية، مثل 1A73E8.",
    custom: "مخصص",
    none: "بلا لون",
    names: { gray: "رمادي", red: "أحمر", orange: "برتقالي", amber: "كهرماني", green: "أخضر", teal: "تركوازي", blue: "أزرق", violet: "بنفسجي", pink: "وردي" },
  },
} as const;
const strings = (locale: string) => STRINGS[locale.split("-")[0] === "ar" ? "ar" : "en"];

/** The default palette: the nine `--nq-tag-*` hues, named in the given locale. Values are CSS variable names, so they follow theme and brand. */
export function tagSwatches(locale = "en"): ColorSwatch[] {
  const names = strings(locale).names;
  return TAG_HUES.map((hue) => ({ value: `--nq-tag-${hue}`, label: names[hue] }));
}

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** True for a 3 or 6 digit hex colour with a leading `#`. */
export const isHexColor = (value: string) => HEX_RE.test(value.trim());

/** Expands 3 digits to 6 and lower-cases. Accepts a missing `#`. Returns null when the text is not a hex colour. */
export function normalizeHexColor(input: string): string | null {
  const text = input.trim();
  const withHash = text.startsWith("#") ? text : `#${text}`;
  if (!HEX_RE.test(withHash)) return null;
  const digits = withHash.slice(1).toLowerCase();
  return `#${digits.length === 3 ? [...digits].map((c) => c + c).join("") : digits}`;
}

/** A value as a CSS colour: hex stays, `--nq-tag-red` becomes `var(--nq-tag-red)`. */
export function colorToCss(value: string): string {
  const v = value.trim();
  return v.startsWith("--") ? `var(${v})` : v;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const triggerClass = [
  "flex h-control w-full min-w-0 items-center gap-2 rounded-control border border-input bg-card px-3 text-body text-foreground",
  "min-h-[var(--nq-touch-min,0px)] cursor-default select-none outline-none transition-colors duration-150 ease-nq",
  "focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-popup-open:border-nq-focus",
  "data-invalid:border-nq-danger aria-invalid:border-nq-danger data-disabled:cursor-not-allowed data-disabled:opacity-50 disabled:cursor-not-allowed disabled:opacity-50",
  "pointer-coarse:text-[16px]",
];

function Chip({ color, className }: { color: string | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-slot="color-picker-chip"
      style={color ? { backgroundColor: colorToCss(color) } : undefined}
      className={cn("inline-block size-5 shrink-0 rounded-[6px] border border-nq-line-strong", !color && "border-dashed bg-transparent", className)}
    />
  );
}

export interface ColorPickerProps {
  /** Controlled value: a hex string with a leading hash or a CSS custom property name (`--nq-tag-red`). `null` is no colour. */
  value?: string | null;
  defaultValue?: string | null;
  /** Called with a lower-case 6 digit hex string, or the swatch's own value (which may be a `--var` name). */
  onValueChange?: (value: string) => void;
  /** Choices in the grid. Default: the nine `--nq-tag-*` hues (see `tagSwatches`). An empty array hides the grid. */
  swatches?: readonly ColorSwatch[];
  /** `"hex"` is a hex-only picker: no swatch grid, the hex field (and the native "Custom" button) only. Default `"swatches"`. */
  mode?: "swatches" | "hex";
  /** Swatches per row. Default 5. */
  columns?: number;
  /** Show the hex input. Default true. */
  allowHex?: boolean;
  /** Show the "Custom" button that opens the browser's native colour input. Default true. */
  allowNative?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** Form field name: a hidden input carries the value. */
  name?: string;
  id?: string;
  className?: string;
  /** Text on the trigger when nothing is chosen. */
  placeholder?: string;
  locale?: string;
  dir?: "ltr" | "rtl";
  "aria-label"?: string;
}

/**
 * Colour input: a swatch trigger that opens a popover with a swatch grid, a validated hex field and an
 * optional native colour input. Field.Control renders as the trigger, so Field label and error apply.
 */
export function ColorPicker({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  swatches: swatchesProp,
  mode = "swatches",
  columns = 5,
  allowHex = true,
  allowNative = true,
  disabled,
  invalid,
  name,
  id,
  className,
  placeholder,
  locale: localeProp,
  dir: dirProp,
  "aria-label": ariaLabel,
}: ColorPickerProps) {
  const { locale, dir } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const t = strings(locale);
  const swatches = swatchesProp ?? tagSwatches(locale);
  const showSwatches = mode !== "hex" && swatches.length > 0;
  const [inner, setInner] = useState<string | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : inner;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [showError, setShowError] = useState(false);
  const nativeRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const match = value ? swatches.find((s) => same(s.value, value)) : undefined;
  const label = match?.label ?? (value ? (normalizeHexColor(value) ?? value) : null);

  const commit = (next: string) => {
    setInner(next);
    onValueChange?.(next);
  };

  const submitDraft = () => {
    const hex = normalizeHexColor(draft);
    if (!hex) {
      setShowError(draft.trim() !== "");
      return;
    }
    setShowError(false);
    setDraft(hex);
    if (!value || !same(value, hex)) commit(hex);
  };

  const openNative = () => {
    const input = nativeRef.current;
    if (!input) return;
    const hex = value ? normalizeHexColor(value) : null;
    if (hex) input.value = hex;
    input.click();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft(value ? (normalizeHexColor(value) ?? "") : "");
          setShowError(false);
        }
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        render={<BaseField.Control render={<button type="button" />} />}
        id={id}
        aria-label={`${ariaLabel ?? t.choose}: ${label ?? t.none}`}
        aria-invalid={invalid || undefined}
        data-invalid={invalid ? "" : undefined}
        data-slot="color-picker-trigger"
        className={cn(triggerClass, className)}
      >
        <Chip color={value} />
        <span className={cn("min-w-0 flex-1 truncate text-start", !label && "text-muted-foreground")} dir="auto">
          {label ?? placeholder ?? t.none}
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      <PopoverContent align="start" dir={dir} lang={locale} aria-label={t.choose} className="w-64 p-3">
        {/* A fresh Field scope: without it the swatches inherit the outer Field's label and description. */}
        <BaseField.Root render={<div />} className="flex flex-col gap-3">
          {showSwatches ? (
          <BaseRadioGroup
            aria-label={t.swatches}
            value={match?.value ?? null}
            onValueChange={(next) => commit(String(next))}
            data-slot="color-picker-swatches"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            className="grid gap-2"
          >
            {swatches.map((swatch) => (
              <BaseRadio.Root
                key={swatch.value}
                value={swatch.value}
                aria-label={swatch.label}
                title={swatch.label}
                data-slot="color-picker-swatch"
                style={{ backgroundColor: colorToCss(swatch.value) }}
                className={cn(
                  "relative aspect-square w-full cursor-default rounded-control border border-nq-line-strong outline-none",
                  "transition-shadow duration-150 ease-nq",
                  "hover:shadow-[0_0_0_2px_var(--nq-line-strong)]",
                  "data-checked:shadow-[0_0_0_2px_var(--popover),0_0_0_4px_var(--foreground)]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                )}
              />
            ))}
          </BaseRadioGroup>
          ) : null}

          {allowHex ? (
            <div className="flex flex-col gap-1">
              <div
                className={cn(
                  "flex h-control items-center gap-2 rounded-control border border-input bg-card px-2",
                  "focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus",
                  showError && "border-nq-danger",
                )}
              >
                <Chip color={normalizeHexColor(draft)} />
                <input
                  type="text"
                  dir="ltr"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={7}
                  aria-label={t.hex}
                  aria-invalid={showError || undefined}
                  aria-describedby={showError ? errorId : undefined}
                  data-slot="color-picker-hex"
                  value={draft}
                  onChange={(e) => {
                    const text = e.target.value;
                    setDraft(text);
                    setShowError(false);
                    const hex = normalizeHexColor(text);
                    // A complete 6 digit colour applies as you type; 3 digit shorthand waits for Enter or blur.
                    if (hex && text.replace("#", "").length === 6 && (!value || !same(value, hex))) commit(hex);
                  }}
                  onBlur={submitDraft}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitDraft();
                    }
                  }}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent text-start font-mono text-body-sm text-foreground outline-none pointer-coarse:text-[16px]"
                />
              </div>
              {showError ? (
                <p id={errorId} role="alert" data-slot="color-picker-error" className="text-caption text-nq-danger-text">
                  {t.invalid}
                </p>
              ) : null}
            </div>
          ) : null}

          {allowNative ? (
            <>
              <button
                type="button"
                onClick={openNative}
                data-slot="color-picker-custom"
                className="inline-flex h-control-sm min-h-[var(--nq-touch-min,0px)] items-center justify-center gap-2 rounded-control border border-border bg-card px-2.5 text-label text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-4"
              >
                <Pipette aria-hidden="true" />
                {t.custom}
              </button>
              <input
                ref={nativeRef}
                type="color"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const hex = normalizeHexColor(e.target.value);
                  if (!hex) return;
                  setDraft(hex);
                  setShowError(false);
                  commit(hex);
                }}
                className="sr-only"
              />
            </>
          ) : null}
        </BaseField.Root>
      </PopoverContent>
    </Popover>
  );
}
