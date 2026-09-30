import { type BrandKey, BRANDS, type BrandManifest, resolveBrand } from "@nasaq/brands";
import { densities, type Density, type Expression, expressions, space, type ThemeName, themes, typography } from "@nasaq/tokens";

type Kebab<S extends string> = S extends `${infer H}-${infer T}` ? `${H}${Capitalize<Kebab<T>>}` : S;
type ThemeColors = { [K in keyof (typeof themes)["light"] as Kebab<K & string>]: string };

export interface NasaqColors extends ThemeColors {
  /** The brand's own colour, for marks and brand moments, not for actions. */
  brand: string;
  /** Primary action fill, and its foreground. */
  action: string;
  onAction: string;
}

export type Script = "latin" | "arabic";
export type TextVariant = keyof (typeof typography)["latin"];

/** Everything a component needs to draw itself, as plain numbers and colours for StyleSheet. */
export interface NasaqTheme {
  brand: BrandManifest;
  scheme: ThemeName;
  expression: Expression;
  density: Density;
  colors: NasaqColors;
  space: typeof space;
  radius: (typeof expressions)[Expression]["radius"];
  size: (typeof densities)[Density];
}

const camel = (key: string) => key.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

/** Smallest touch target (Apple HIG 44pt; Material asks 48dp). */
export const TOUCH_MIN = 44;

/** The ceiling Text applies to the OS font scale, so headings still fit at the largest settings. */
export const MAX_FONT_SCALE = 1.4;

export interface ResolveThemeOptions {
  /** Brand key or legacy alias. */
  brand?: BrandKey | (string & {});
  scheme?: ThemeName;
  expression?: Expression;
  density?: Density;
}

export function resolveTheme({
  brand = "nasaq",
  scheme = "light",
  expression = "native",
  density = "comfortable",
}: ResolveThemeOptions = {}): NasaqTheme {
  const manifest = resolveBrand(brand) ?? BRANDS.nasaq;
  const base = Object.fromEntries(Object.entries(themes[scheme]).map(([k, v]) => [camel(k), v])) as ThemeColors;
  return {
    brand: manifest,
    scheme,
    expression,
    density,
    colors: {
      ...base,
      brand: manifest.color.brand[scheme],
      action: manifest.color.action[scheme],
      onAction: manifest.color.onAction[scheme],
    },
    space,
    radius: expressions[expression].radius,
    size: densities[density],
  };
}

/** Font size, line height (px) and letter spacing for a text role in one script. */
export function textMetrics(variant: TextVariant, script: Script) {
  const t = typography[script][variant];
  return {
    fontSize: t.size,
    lineHeight: Math.round(t.size * t.line),
    fontWeight: String(t.weight) as "400" | "500",
    letterSpacing: t.size * t.tracking,
  };
}
