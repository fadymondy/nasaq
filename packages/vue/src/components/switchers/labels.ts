import { Monitor, Moon, Sun } from "lucide-vue-next";
import type { Component } from "vue";
import { useNasaq, type ThemePreference } from "../../provider";

export interface ThemeLabels {
  light: string;
  dark: string;
  system: string;
  group: string;
  /** NqThemeToggle's name while the page is light. */
  toDark: string;
  /** NqThemeToggle's name while the page is dark. */
  toLight: string;
}
const EN_THEME: ThemeLabels = {
  light: "Light",
  dark: "Dark",
  system: "System",
  group: "Theme",
  toDark: "Switch to dark theme",
  toLight: "Switch to light theme",
};
const AR_THEME: ThemeLabels = {
  light: "فاتح",
  dark: "داكن",
  system: "النظام",
  group: "المظهر",
  toDark: "التبديل إلى المظهر الداكن",
  toLight: "التبديل إلى المظهر الفاتح",
};

export const THEME_OPTIONS: readonly { value: ThemePreference; icon: Component }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

export interface LocaleOption {
  value: string;
  /** The language's own name (endonym). */
  label: string;
  dir?: "ltr" | "rtl";
}
export const DEFAULT_LOCALES: readonly LocaleOption[] = [
  { value: "en", label: "English", dir: "ltr" },
  { value: "ar", label: "العربية", dir: "rtl" },
];

/** Built-in labels follow the provider locale; pass `labels` to override. Call inside setup (the result is not reactive). */
export function useThemeLabels(labels?: Partial<ThemeLabels>): ThemeLabels {
  const { locale } = useNasaq();
  return themeLabelsFor(locale.value, labels);
}

/** Labels for a locale you already hold; use inside `computed` to stay reactive. */
export function themeLabelsFor(locale: string, labels?: Partial<ThemeLabels>): ThemeLabels {
  return { ...(locale.startsWith("ar") ? AR_THEME : EN_THEME), ...labels };
}
