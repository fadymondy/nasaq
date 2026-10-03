// Copy of packages/html/src/core/locale.ts (kept in sync by test/sync.test.ts).
// Locale, direction, theme and brand on <html>: the same attributes the React NasaqProvider sets,
// so tokens.css (data-theme, data-brand) and the RTL rules in the component layer just follow.

export type Theme = "light" | "dark" | "system";

/** Arabic, Hebrew, Farsi and Urdu read right to left. */
export function isRtl(locale: string): boolean {
  return /^(ar|he|fa|ur)\b/i.test(locale);
}

export function dirOf(locale: string): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}

/** The document's current locale (`<html lang>`), "en" when unset. */
export function currentLocale(root: Element = document.documentElement): string {
  return root.closest("[lang]")?.getAttribute("lang") || "en";
}

/** Sets `lang` and `dir` together. */
export function setLocale(locale: string, root: HTMLElement = document.documentElement): void {
  root.lang = locale;
  root.dir = dirOf(locale);
  root.dispatchEvent(new CustomEvent("nq:locale", { bubbles: true, detail: { locale } }));
}

const THEME_KEY = "nq-theme";

/** Applies a theme; "system" removes the override so prefers-color-scheme decides. Persists to localStorage. */
export function setTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (theme === "system") {
    root.removeAttribute("data-theme");
    root.classList.remove("dark");
  } else {
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", theme === "dark");
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage blocked (private mode, sandboxed iframe): the theme still applies for this page
  }
  root.dispatchEvent(new CustomEvent("nq:theme", { bubbles: true, detail: { theme } }));
}

/** The resolved theme: the explicit attribute, else the OS preference. */
export function currentTheme(root: HTMLElement = document.documentElement): "light" | "dark" {
  const set = root.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function toggleTheme(root: HTMLElement = document.documentElement): void {
  setTheme(currentTheme(root) === "dark" ? "light" : "dark", root);
}

/** Restores the saved theme (call early, before first paint, to avoid a flash). */
export function restoreTheme(root: HTMLElement = document.documentElement): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {
    saved = null;
  }
  if (saved === "light" || saved === "dark") setTheme(saved, root);
}

/** Switches the brand palette (`data-brand`); pass null for the default Nasaq brand. */
export function setBrand(brand: string | null, root: HTMLElement = document.documentElement): void {
  if (brand) root.setAttribute("data-brand", brand);
  else root.removeAttribute("data-brand");
}
