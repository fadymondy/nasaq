import type { BrandKey } from "@nasaq/brands";
import type { CustomBrandColors, Density, Direction, Expression, ThemeName } from "@nasaq/tokens";
import { createContext, type ReactNode, useContext, useEffect, useMemo } from "react";
import { I18nManager, Platform, StyleSheet, useColorScheme, View } from "react-native";
import { type CustomBrand, type NasaqTheme, resolveTheme, type Script } from "./theme";

export interface NasaqFonts {
  /** Family names as registered with the app (expo-font or native assets). Omit for the system face. */
  latin?: string;
  arabic?: string;
  mono?: string;
}

export interface NasaqContextValue extends NasaqTheme {
  locale: string;
  direction: Direction;
  isRtl: boolean;
  script: Script;
  fonts: NasaqFonts;
  /** Style for directional icons (arrows, chevrons): mirrored in RTL. Never apply it to marks or logos. */
  flip: { transform: { scaleX: number }[] };
}

const NasaqContext = createContext<NasaqContextValue | null>(null);
const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);
const NO_FONTS: NasaqFonts = {};

export interface NasaqProviderProps {
  children: ReactNode;
  /** A registered brand key or legacy alias, or a `CustomBrand` object for an app that is not a Nasaq brand. */
  brand?: BrandKey | (string & {}) | CustomBrand;
  /**
   * Your own colours over the brand, e.g. the admin colours from your API. `{ brand, action, onAction, accent }`,
   * each "#RRGGBB" or `{ light, dark }`. Dark steps and on-colours are derived for contrast.
   */
  brandColors?: CustomBrandColors;
  /** Omit to follow the OS appearance. */
  scheme?: ThemeName;
  expression?: Expression;
  density?: Density;
  locale?: string;
  /** Defaults to the locale's direction. */
  direction?: Direction;
  fonts?: NasaqFonts;
  /**
   * Native only. React Native fixes the layout direction at launch, so a direction change is written with
   * I18nManager.forceRTL and applies on the next launch. Reload here (expo-updates `reloadAsync`,
   * `DevSettings.reload`) to apply it now.
   */
  onDirectionChangeRequiresReload?: (direction: Direction) => void;
}

export function NasaqProvider({
  children,
  brand = "nasaq",
  brandColors,
  scheme,
  expression = "native",
  density = "comfortable",
  locale = "en",
  direction,
  fonts = NO_FONTS,
  onDirectionChangeRequiresReload,
}: NasaqProviderProps) {
  const os = useColorScheme();
  const resolvedScheme: ThemeName = scheme ?? (os === "dark" ? "dark" : "light");
  const dir: Direction = direction ?? (RTL_LANGS.has(locale.split("-")[0] ?? "") ? "rtl" : "ltr");
  const isRtl = dir === "rtl";

  useEffect(() => {
    if (Platform.OS === "web" || I18nManager.isRTL === isRtl) return;
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(isRtl);
    onDirectionChangeRequiresReload?.(dir);
  }, [isRtl, dir, onDirectionChangeRequiresReload]);

  // Objects are usually rebuilt each render; compare by content so the theme is not recomputed for nothing.
  const sig = JSON.stringify([brand, brandColors]);
  const value = useMemo<NasaqContextValue>(
    () => ({
      ...resolveTheme({ brand, brandColors, scheme: resolvedScheme, expression, density }),
      locale,
      direction: dir,
      isRtl,
      script: locale.startsWith("ar") ? "arabic" : "latin",
      fonts,
      flip: { transform: [{ scaleX: isRtl ? -1 : 1 }] },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sig, resolvedScheme, expression, density, locale, dir, isRtl, fonts],
  );

  // react-native-web writes `dir` and `lang` to the DOM, which is how RTL reaches the browser.
  const web = Platform.OS === "web" ? ({ dir, lang: locale } as object) : {};
  return (
    <NasaqContext value={value}>
      <View style={[styles.root, { backgroundColor: value.colors.bg }]} {...web}>
        {children}
      </View>
    </NasaqContext>
  );
}

export function useNasaq(): NasaqContextValue {
  const value = useContext(NasaqContext);
  if (!value) throw new Error("useNasaq() must be used inside <NasaqProvider>.");
  return value;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
