// Pure helpers of the ColorPicker. Same functions as the React component's exports.

/** A colour choice: `value` is a hex string or a CSS custom property name; `label` is its accessible name. */
export interface ColorSwatch {
  /** A hex colour (3 or 6 digits, leading `#`) or a CSS custom property name such as `--nq-tag-red`. */
  value: string;
  /** Accessible name and tooltip of the swatch. Localise it. */
  label: string;
}

const TAG_HUES = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"] as const;

export const COLOR_STRINGS = {
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
export const colorStrings = (locale: string) => COLOR_STRINGS[locale.split("-")[0] === "ar" ? "ar" : "en"];

/** The default palette: the nine `--nq-tag-*` hues, named in the given locale. Values are CSS variable names, so they follow theme and brand. */
export function tagSwatches(locale = "en"): ColorSwatch[] {
  const names = colorStrings(locale).names;
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

export const sameColor = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const colorTriggerClass = [
  "flex h-control w-full min-w-0 items-center gap-2 rounded-control border border-input bg-card px-3 text-body text-foreground",
  "min-h-[var(--nq-touch-min,0px)] cursor-default select-none outline-none transition-colors duration-150 ease-nq",
  "focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-popup-open:border-nq-focus",
  "data-invalid:border-nq-danger aria-invalid:border-nq-danger data-disabled:cursor-not-allowed data-disabled:opacity-50 disabled:cursor-not-allowed disabled:opacity-50",
  "pointer-coarse:text-[16px]",
];
