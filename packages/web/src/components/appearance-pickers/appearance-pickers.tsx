"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Check, ImagePlus, Minus, Moon, Plus, RotateCcw, Sun } from "lucide-react";
import { type CSSProperties, type ReactNode, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Slider } from "../slider";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  type AppearanceTheme,
  type AppearanceWallpaper,
  clampWallpaperDim,
  DEFAULT_READING_PREFERENCES,
  groupWallpapers,
  isDefaultReading,
  READING_FONT_SIZES,
  READING_SPACINGS,
  READING_WIDTHS,
  type ReadingFontSize,
  type ReadingPreferences,
  type ReadingSpacing,
  type ReadingWidth,
  readingFontPercent,
  readingStyleVars,
  stepReadingFontSize,
  themePreviewColors,
  wallpaperCss,
} from "./appearance-model";

export interface AppearanceLabels {
  theme?: string;
  fontSize?: string;
  smaller?: string;
  larger?: string;
  width?: string;
  spacing?: string;
  reset?: string;
  preview?: string;
  previewTitle?: string;
  previewBody?: string;
  wallpaper?: string;
  none?: string;
  upload?: string;
  dim?: string;
  light?: string;
  dark?: string;
  sizes?: Partial<Record<ReadingFontSize, string>>;
  widths?: Partial<Record<ReadingWidth, string>>;
  spacings?: Partial<Record<ReadingSpacing, string>>;
}

const STRINGS: Record<"en" | "ar", Required<Omit<AppearanceLabels, "sizes" | "widths" | "spacings">> & { sizes: Record<ReadingFontSize, string>; widths: Record<ReadingWidth, string>; spacings: Record<ReadingSpacing, string> }> = {
  en: {
    theme: "Theme",
    fontSize: "Text size",
    smaller: "Smaller text",
    larger: "Larger text",
    width: "Line width",
    spacing: "Line spacing",
    reset: "Reset",
    preview: "Preview",
    previewTitle: "A quiet place to read",
    previewBody: "Good reading settings disappear. The text is large enough, the lines are short enough, and the space between them lets your eyes rest. Change a setting and this paragraph follows at once.",
    wallpaper: "Wallpaper",
    none: "None",
    upload: "Upload a picture",
    dim: "Dim the picture",
    light: "Light",
    dark: "Dark",
    sizes: { sm: "Small", md: "Medium", lg: "Large", xl: "Extra large" },
    widths: { narrow: "Narrow", normal: "Normal", wide: "Wide", full: "Full" },
    spacings: { compact: "Compact", normal: "Normal", relaxed: "Relaxed" },
  },
  ar: {
    theme: "المظهر",
    fontSize: "حجم النص",
    smaller: "نص أصغر",
    larger: "نص أكبر",
    width: "عرض السطر",
    spacing: "تباعد الأسطر",
    reset: "استعادة الافتراضي",
    preview: "معاينة",
    previewTitle: "مكان هادئ للقراءة",
    previewBody: "إعدادات القراءة الجيدة لا تُلاحَظ. النص كبير بما يكفي، والأسطر قصيرة بما يكفي، والمسافة بينها تريح العين. غيّر أي إعداد وستتبعه هذه الفقرة فورًا.",
    wallpaper: "الخلفية",
    none: "بلا خلفية",
    upload: "رفع صورة",
    dim: "تعتيم الصورة",
    light: "فاتح",
    dark: "داكن",
    sizes: { sm: "صغير", md: "متوسط", lg: "كبير", xl: "كبير جدًا" },
    widths: { narrow: "ضيق", normal: "عادي", wide: "واسع", full: "كامل" },
    spacings: { compact: "متقارب", normal: "عادي", relaxed: "مريح" },
  },
};

function useStrings(labels?: AppearanceLabels) {
  const locale = useOptionalNasaq()?.locale === "ar" ? "ar" : "en";
  const base = STRINGS[locale];
  return {
    ...base,
    ...labels,
    sizes: { ...base.sizes, ...labels?.sizes },
    widths: { ...base.widths, ...labels?.widths },
    spacings: { ...base.spacings, ...labels?.spacings },
  };
}

function useControlled<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void): [T, (next: T) => void] {
  const [inner, setInner] = useState(defaultValue);
  const current = value === undefined ? inner : value;
  return [
    current,
    (next) => {
      if (value === undefined) setInner(next);
      onChange?.(next);
    },
  ];
}

const cardItem = [
  "group relative flex min-w-0 cursor-pointer flex-col gap-2 rounded-card border border-border bg-card p-2 text-start outline-none transition-colors",
  "hover:border-nq-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
  "data-checked:border-primary data-checked:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50",
];

/* ─────────────────────────────── ThemeGallery ─────────────────────────────── */

export interface ThemeGalleryProps {
  themes: readonly AppearanceTheme[];
  /** Selected theme id (controlled). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** Visible heading. Default "Theme". Pass `false` to hide it and name the group with `aria-label`. */
  label?: ReactNode | false;
  /** Cards per row at the widest. Default 4; it drops to 2 on phones. */
  columns?: 2 | 3 | 4;
  disabled?: boolean;
  name?: string;
  labels?: AppearanceLabels;
  className?: string;
  "aria-label"?: string;
}

/**
 * Pick one of several themes from a gallery of small previews (page, sidebar, text and accent colours) instead of a
 * bare dropdown. Nasaq's `ThemeToggle` stays the quick light/dark/system switch; this is for products with named themes.
 * Selection is announced as a radio group; arrow keys move it.
 */
export function ThemeGallery({ themes, value, defaultValue, onValueChange, label, columns = 4, disabled, name, labels, className, "aria-label": ariaLabel }: ThemeGalleryProps) {
  const t = useStrings(labels);
  const [current, setCurrent] = useControlled(value, defaultValue ?? themes[0]?.id ?? "", onValueChange);
  const headingId = useId();
  const cols = { 2: "grid-cols-2", 3: "grid-cols-2 sm:grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" }[columns];
  return (
    <div data-slot="theme-gallery" className={cn("flex min-w-0 flex-col gap-2", className)}>
      {label !== false ? (
        <div id={headingId} className="text-label text-foreground">
          {label ?? t.theme}
        </div>
      ) : null}
      <BaseRadioGroup
        value={current}
        onValueChange={(v) => setCurrent(String(v))}
        disabled={disabled}
        name={name}
        aria-labelledby={label !== false ? headingId : undefined}
        aria-label={label === false ? (ariaLabel ?? t.theme) : undefined}
        className={cn("grid gap-3", cols)}
      >
        {themes.map((theme) => {
          const [bg, surface, text, accent] = themePreviewColors(theme);
          return (
            <BaseRadio.Root key={theme.id} value={theme.id} data-slot="theme-card" className={cn(cardItem)}>
              <span aria-hidden className="relative flex h-20 overflow-hidden rounded-control border border-border" style={{ background: bg }}>
                <span className="flex w-1/3 flex-col gap-1 p-1.5" style={{ background: surface }}>
                  <span className="h-1.5 w-full rounded-full opacity-80" style={{ background: accent }} />
                  <span className="h-1 w-3/4 rounded-full opacity-40" style={{ background: text }} />
                  <span className="h-1 w-1/2 rounded-full opacity-40" style={{ background: text }} />
                </span>
                <span className="flex flex-1 flex-col gap-1.5 p-2">
                  <span className="h-2 w-2/3 rounded-full opacity-70" style={{ background: text }} />
                  <span className="h-1.5 w-full rounded-full opacity-30" style={{ background: text }} />
                  <span className="h-1.5 w-5/6 rounded-full opacity-30" style={{ background: text }} />
                  <span className="mt-auto h-3.5 w-1/3 rounded-control" style={{ background: accent }} />
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-1.5 px-0.5 pb-0.5">
                {theme.mode === "dark" ? <Moon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" /> : theme.mode === "light" ? <Sun aria-hidden className="size-3.5 shrink-0 text-muted-foreground" /> : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label text-foreground">{theme.label}</span>
                  {theme.description ? <span className="block truncate text-caption text-muted-foreground">{theme.description}</span> : null}
                </span>
                <BaseRadio.Indicator className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check aria-hidden className="size-3" />
                </BaseRadio.Indicator>
              </span>
            </BaseRadio.Root>
          );
        })}
      </BaseRadioGroup>
    </div>
  );
}

/* ────────────────────────────── ReadingSettings ────────────────────────────── */

export interface ReadingSettingsProps {
  value?: ReadingPreferences;
  defaultValue?: ReadingPreferences;
  onValueChange?: (next: ReadingPreferences) => void;
  /** Show the live sample paragraph under the controls. Default true. */
  showPreview?: boolean;
  /** Replace the sample title and paragraph. */
  previewTitle?: ReactNode;
  previewBody?: ReactNode;
  /** Which controls to show. Default all three. */
  controls?: readonly ("fontSize" | "width" | "spacing")[];
  disabled?: boolean;
  labels?: AppearanceLabels;
  className?: string;
}

/**
 * Reading comfort settings: text size, line width and line spacing, with a live sample. It only holds the choice; apply it
 * to your reading area with `readingStyleVars(value)` (sets `--reading-scale`, `--reading-max-width`, `--reading-line-height`)
 * and save it with `JSON.stringify` (read it back with `parseReadingPreferences`).
 */
export function ReadingSettings({ value, defaultValue, onValueChange, showPreview = true, previewTitle, previewBody, controls = ["fontSize", "width", "spacing"], disabled, labels, className }: ReadingSettingsProps) {
  const t = useStrings(labels);
  const [prefs, setPrefs] = useControlled(value, defaultValue ?? DEFAULT_READING_PREFERENCES, onValueChange);
  const set = <K extends keyof ReadingPreferences>(key: K, next: ReadingPreferences[K] | undefined) => {
    if (next) setPrefs({ ...prefs, [key]: next });
  };
  const show = (key: "fontSize" | "width" | "spacing") => controls.includes(key);
  const styleVars = readingStyleVars(prefs) as CSSProperties;
  return (
    <div data-slot="reading-settings" className={cn("flex min-w-0 flex-col gap-4", className)}>
      {show("fontSize") ? (
        <Row label={t.fontSize}>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="icon-sm" aria-label={t.smaller} disabled={disabled || prefs.fontSize === READING_FONT_SIZES[0]} onClick={() => set("fontSize", stepReadingFontSize(prefs.fontSize, -1))}>
              <Minus aria-hidden />
            </Button>
            <ToggleGroup value={[prefs.fontSize]} onValueChange={(v) => set("fontSize", v[0] as ReadingFontSize | undefined)} disabled={disabled} aria-label={t.fontSize}>
              {READING_FONT_SIZES.map((size) => (
                <Toggle key={size} value={size} aria-label={t.sizes[size]}>
                  <span dir="ltr" className="tabular-nums">
                    {readingFontPercent(size)}%
                  </span>
                </Toggle>
              ))}
            </ToggleGroup>
            <Button variant="secondary" size="icon-sm" aria-label={t.larger} disabled={disabled || prefs.fontSize === READING_FONT_SIZES[READING_FONT_SIZES.length - 1]} onClick={() => set("fontSize", stepReadingFontSize(prefs.fontSize, 1))}>
              <Plus aria-hidden />
            </Button>
          </div>
        </Row>
      ) : null}
      {show("width") ? (
        <Row label={t.width}>
          <ToggleGroup value={[prefs.width]} onValueChange={(v) => set("width", v[0] as ReadingWidth | undefined)} disabled={disabled} aria-label={t.width}>
            {READING_WIDTHS.map((w) => (
              <Toggle key={w} value={w}>
                {t.widths[w]}
              </Toggle>
            ))}
          </ToggleGroup>
        </Row>
      ) : null}
      {show("spacing") ? (
        <Row label={t.spacing}>
          <ToggleGroup value={[prefs.spacing]} onValueChange={(v) => set("spacing", v[0] as ReadingSpacing | undefined)} disabled={disabled} aria-label={t.spacing}>
            {READING_SPACINGS.map((s) => (
              <Toggle key={s} value={s}>
                {t.spacings[s]}
              </Toggle>
            ))}
          </ToggleGroup>
        </Row>
      ) : null}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" disabled={disabled || isDefaultReading(prefs)} onClick={() => setPrefs({ ...DEFAULT_READING_PREFERENCES })}>
          <RotateCcw aria-hidden className="rtl:-scale-x-100" />
          {t.reset}
        </Button>
      </div>
      {showPreview ? (
        <section aria-label={t.preview} data-slot="reading-preview" className="min-w-0 overflow-hidden rounded-card border border-border bg-card p-4" style={styleVars}>
          <div className="mx-auto" style={{ maxWidth: "var(--reading-max-width)", fontSize: "calc(1rem * var(--reading-scale))", lineHeight: "var(--reading-line-height)" }}>
            <h3 className="mb-1 font-semibold text-foreground" style={{ fontSize: "1.25em", lineHeight: 1.3 }}>
              {previewTitle ?? t.previewTitle}
            </h3>
            <p className="text-nq-fg-body">{previewBody ?? t.previewBody}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="text-label text-foreground sm:w-32 sm:shrink-0">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ────────────────────────────── WallpaperPicker ────────────────────────────── */

export interface WallpaperPickerProps {
  wallpapers: readonly AppearanceWallpaper[];
  /** Selected wallpaper id, or `null` for none (controlled). */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (id: string | null) => void;
  /** Amount the picture is dimmed, 0 to 60 percent. Shows the slider when `onDimChange` or `dim` is set. */
  dim?: number;
  onDimChange?: (percent: number) => void;
  /** Shows the upload tile. Receives the chosen file; add the resulting wallpaper to `wallpapers` yourself. Async is fine. */
  onUpload?: (file: File) => void | Promise<void>;
  /** Accepted file types for the upload. Default "image/*". */
  accept?: string;
  /** Offer a "None" tile first. Default true. */
  allowNone?: boolean;
  label?: ReactNode | false;
  disabled?: boolean;
  labels?: AppearanceLabels;
  className?: string;
}

const NONE_VALUE = "__none__";

/**
 * Pick a wallpaper from gradients, colours and pictures, optionally upload your own and dim it so text stays readable.
 * Wallpapers are CSS backgrounds or picture URLs (see `AppearanceWallpaper`); the picker only reports the choice, you
 * paint it with `wallpaperCss(background)` and the dim as an overlay.
 */
export function WallpaperPicker({ wallpapers, value, defaultValue, onValueChange, dim, onDimChange, onUpload, accept = "image/*", allowNone = true, label, disabled, labels, className }: WallpaperPickerProps) {
  const t = useStrings(labels);
  const [current, setCurrent] = useControlled<string | null>(value, defaultValue ?? null, onValueChange);
  const [dimState, setDimState] = useState(0);
  const dimValue = clampWallpaperDim(dim ?? dimState);
  const headingId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const groups = groupWallpapers(wallpapers);
  const showDim = dim !== undefined || onDimChange !== undefined;
  const tile = "aspect-[4/3] w-full rounded-control border border-border";
  return (
    <div data-slot="wallpaper-picker" className={cn("flex min-w-0 flex-col gap-3", className)}>
      {label !== false ? (
        <div id={headingId} className="text-label text-foreground">
          {label ?? t.wallpaper}
        </div>
      ) : null}
      <BaseRadioGroup
        value={current ?? NONE_VALUE}
        onValueChange={(v) => setCurrent(v === NONE_VALUE ? null : String(v))}
        disabled={disabled}
        aria-labelledby={label !== false ? headingId : undefined}
        aria-label={label === false ? t.wallpaper : undefined}
        className="flex flex-col gap-3"
      >
        {groups.map(({ group, items }, gi) => (
          <div key={group || "_"} className="flex flex-col gap-1.5">
            {group ? <div className="text-caption text-muted-foreground">{group}</div> : null}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {gi === 0 && allowNone ? (
                <BaseRadio.Root value={NONE_VALUE} aria-label={t.none} data-slot="wallpaper-none" className={cn(cardItem, "p-1")}>
                  <span aria-hidden className={cn(tile, "grid place-items-center bg-nq-surface-soft text-caption text-muted-foreground")}>
                    {t.none}
                  </span>
                  <Chosen />
                </BaseRadio.Root>
              ) : null}
              {items.map((w) => (
                <BaseRadio.Root key={w.id} value={w.id} aria-label={w.label} title={w.label} data-slot="wallpaper-tile" className={cn(cardItem, "p-1")}>
                  <span aria-hidden className={tile} style={{ background: wallpaperCss(w.background) }} />
                  <Chosen />
                </BaseRadio.Root>
              ))}
              {gi === groups.length - 1 && onUpload ? (
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-[4/3] flex-col items-center justify-center gap-1 self-start rounded-card border border-border border-dashed p-1 text-caption text-muted-foreground outline-none transition-colors hover:border-nq-line-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-50"
                >
                  <ImagePlus aria-hidden className="size-4" />
                  {t.upload}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </BaseRadioGroup>
      {onUpload ? (
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setUploading(true);
            try {
              await onUpload(file);
            } finally {
              setUploading(false);
            }
          }}
        />
      ) : null}
      {showDim ? (
        <Slider
          label={t.dim}
          min={0}
          max={60}
          step={5}
          value={dimValue}
          disabled={disabled || current === null}
          format={{ style: "unit", unit: "percent", maximumFractionDigits: 0 }}
          onValueChange={(v) => {
            const next = clampWallpaperDim(Array.isArray(v) ? (v[0] ?? 0) : v);
            setDimState(next);
            onDimChange?.(next);
          }}
        />
      ) : null}
    </div>
  );
}

function Chosen() {
  return (
    <BaseRadio.Indicator className="absolute end-2 top-2 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground">
      <Check aria-hidden className="size-3" />
    </BaseRadio.Indicator>
  );
}
