"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Tooltip } from "@base-ui/react/tooltip";
import { type BrandKey, BRANDS, type BrandManifest, resolveBrand } from "@nasaq/brands";
import {
  type CustomBrandColors,
  customBrandCssVars,
  type Density,
  type Direction,
  type Expression,
  resolveCustomBrandColors,
  type ThemeName,
  type ThemePreference,
} from "@nasaq/tokens";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { THEME_STORAGE_KEY } from "./theme-script";

/**
 * A client's own brand, for an app that is not a registered Nasaq brand. Pass it as `brand`, or pass only
 * `brandColors`. Anything left out falls back to the Nasaq manifest.
 */
export interface CustomBrand {
  /** Your own identifier. Defaults to "custom". */
  key?: string;
  name?: BrandManifest["name"];
  wordmark?: BrandManifest["wordmark"];
  mark?: BrandManifest["mark"];
  typography?: BrandManifest["typography"];
  tagline?: BrandManifest["tagline"];
  links?: BrandManifest["links"];
  color?: CustomBrandColors;
}

export interface NasaqContextValue {
  brand: BrandManifest;
  /** True when the colours come from `brandColors` or a custom `brand` object (data-brand="custom"). */
  isCustomBrand: boolean;
  theme: ThemePreference;
  resolvedTheme: ThemeName;
  setTheme: (theme: ThemePreference) => void;
  direction: Direction;
  isRtl: boolean;
  density: Density;
  expression: Expression;
  locale: string;
  setLocale: (locale: string) => void;
  /** The locales offered by LocaleSwitcher and UserMenu. */
  locales: readonly LocaleOption[];
}

export interface LocaleOption {
  value: string;
  /** The language's own name (endonym), e.g. "العربية". */
  label: string;
  dir?: Direction;
}

export const DEFAULT_LOCALES: readonly LocaleOption[] = [
  { value: "en", label: "English", dir: "ltr" },
  { value: "ar", label: "العربية", dir: "rtl" },
];

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

const NasaqContext = createContext<NasaqContextValue | null>(null);

export interface NasaqProviderProps {
  children: ReactNode;
  /** A registered brand key or legacy alias (managy, cabrain, cloudy, …), or a `CustomBrand` object. */
  brand?: BrandKey | (string & {}) | CustomBrand;
  /**
   * Your own colours, written as CSS variables over the brand. Sets `data-brand="custom"`. Give `brand` and
   * `action` as "#RRGGBB" or `{ light, dark }`; missing dark steps, `onAction` (chosen for contrast) and
   * `accent` are derived, so every role resolves the way it does for a registered brand.
   */
  brandColors?: CustomBrandColors;
  /** Controlled theme. Omit to let the provider own it (persisted in localStorage). */
  theme?: ThemePreference;
  defaultTheme?: ThemePreference;
  onThemeChange?: (theme: ThemePreference) => void;
  /** Defaults to the active locale's direction (rtl for Arabic). */
  direction?: Direction;
  density?: Density;
  expression?: Expression;
  /** Controlled locale. Omit to let the provider own it. */
  locale?: string;
  defaultLocale?: string;
  onLocaleChange?: (locale: string) => void;
  locales?: readonly LocaleOption[];
  /**
   * document: write attributes to <html> (apps).
   * scope: render a wrapping <div> carrying the attributes (embeds, previews, side-by-side).
   */
  target?: "document" | "scope";
  className?: string;
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function NasaqProvider({
  children,
  brand: brandProp = "nasaq",
  brandColors,
  theme: controlledTheme,
  defaultTheme = "system",
  onThemeChange,
  locale: controlledLocale,
  defaultLocale = "en",
  onLocaleChange,
  locales = DEFAULT_LOCALES,
  direction: directionProp,
  density = "compact",
  expression = "grid",
  target = "document",
  className,
}: NasaqProviderProps) {
  const customObject = typeof brandProp === "object" && brandProp !== null ? brandProp : null;
  const registered = typeof brandProp === "string" ? (resolveBrand(brandProp) ?? BRANDS.nasaq) : BRANDS.nasaq;
  const colorInput = brandColors ?? customObject?.color;
  const isCustomBrand = !!colorInput || !!customObject;
  const colorKey = JSON.stringify(colorInput ?? null);
  const customKey = customObject ? JSON.stringify({ ...customObject, color: undefined, mark: customObject.mark }) : "";
  const brand = useMemo<BrandManifest>(() => {
    if (!isCustomBrand) return registered;
    const { key: _key, color: _color, ...rest } = customObject ?? {};
    return { ...registered, ...rest, color: resolveCustomBrandColors(colorInput, registered.color) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registered, isCustomBrand, colorKey, customKey]);
  const brandVars = useMemo<CSSProperties | undefined>(
    () => (isCustomBrand ? (customBrandCssVars(brand.color) as CSSProperties) : undefined),
    [isCustomBrand, brand],
  );

  const [storedTheme, setStoredTheme] = useState<ThemePreference>(defaultTheme);
  const theme = controlledTheme ?? storedTheme;
  const [system, setSystem] = useState<ThemeName>("light");

  useEffect(() => {
    if (controlledTheme) return;
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
    if (saved === "light" || saved === "dark" || saved === "system") setStoredTheme(saved);
  }, [controlledTheme]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystem(mq.matches ? "dark" : "light");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const [storedLocale, setStoredLocale] = useState(defaultLocale);
  const locale = controlledLocale ?? storedLocale;
  const lang = locale.split("-")[0] ?? "en";
  const direction: Direction =
    directionProp ?? locales.find((l) => l.value === locale)?.dir ?? (RTL_LANGS.has(lang) ? "rtl" : "ltr");

  const setLocale = useCallback(
    (next: string) => {
      if (controlledLocale === undefined) setStoredLocale(next);
      onLocaleChange?.(next);
    },
    [controlledLocale, onLocaleChange],
  );

  const resolvedTheme: ThemeName = theme === "system" ? system : theme;

  const setTheme = useCallback(
    (next: ThemePreference) => {
      if (!controlledTheme) {
        setStoredTheme(next);
        localStorage.setItem(THEME_STORAGE_KEY, next);
      }
      onThemeChange?.(next);
    },
    [controlledTheme, onThemeChange],
  );

  const attrs = {
    "data-brand": isCustomBrand ? "custom" : brand.key,
    "data-theme": resolvedTheme,
    "data-density": density,
    "data-expression": expression,
    dir: direction,
    lang,
  } as const;

  useIsoLayoutEffect(() => {
    if (target !== "document") return;
    const el = document.documentElement;
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.classList.toggle("dark", resolvedTheme === "dark");
    el.style.colorScheme = resolvedTheme;
    const written = Object.entries(brandVars ?? {});
    for (const [k, v] of written) el.style.setProperty(k, String(v));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", getComputedStyle(el).getPropertyValue("--nq-bg").trim());
    return () => {
      for (const [k] of written) el.style.removeProperty(k);
    };
  }, [target, brand.key, isCustomBrand, brandVars, resolvedTheme, density, expression, direction, lang]);

  const value = useMemo<NasaqContextValue>(
    () => ({
      brand,
      isCustomBrand,
      theme,
      resolvedTheme,
      setTheme,
      direction,
      isRtl: direction === "rtl",
      density,
      expression,
      locale,
      setLocale,
      locales,
    }),
    [brand, isCustomBrand, theme, resolvedTheme, setTheme, direction, density, expression, locale, setLocale, locales],
  );

  const inner = (
    <DirectionProvider direction={direction}>
      <Tooltip.Provider delay={500}>{children}</Tooltip.Provider>
    </DirectionProvider>
  );

  return (
    <NasaqContext.Provider value={value}>
      {target === "scope" ? (
        <div {...attrs} style={brandVars} className={[resolvedTheme === "dark" ? "dark" : "", className].filter(Boolean).join(" ")}>
          {inner}
        </div>
      ) : (
        inner
      )}
    </NasaqContext.Provider>
  );
}

export function useNasaq(): NasaqContextValue {
  const ctx = useContext(NasaqContext);
  if (!ctx) throw new Error("useNasaq() must be used inside <NasaqProvider>.");
  return ctx;
}

/** Like useNasaq, but returns null outside a provider (for components that must work standalone). */
export function useOptionalNasaq(): NasaqContextValue | null {
  return useContext(NasaqContext);
}
