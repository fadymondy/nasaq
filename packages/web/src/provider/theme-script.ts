export const THEME_STORAGE_KEY = "nasaq-theme";

const body = (initial: string) =>
  `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||${initial};var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.dataset.theme=d?"dark":"light";e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})();`;

/**
 * Inline, render-blocking script that applies the stored theme before first paint (no flash).
 * Put it in <head>: `<script dangerouslySetInnerHTML={{ __html: nasaqThemeScript() }} />`.
 * Under a strict CSP, use `nasaqThemeScriptProps` (nonce) or the static file `@fadymondy/nasaq/theme-script.js`.
 */
export function nasaqThemeScript(defaultTheme: "light" | "dark" | "system" = "system"): string {
  return body(JSON.stringify(defaultTheme));
}

/**
 * Props for a CSP-friendly `<script>`: spread them and pass your per-request nonce, which must be in your
 * `script-src` (`'nonce-…'`). `<script {...nasaqThemeScriptProps("system", { nonce })} />`.
 */
export function nasaqThemeScriptProps(
  defaultTheme: "light" | "dark" | "system" = "system",
  { nonce }: { nonce?: string } = {},
): { nonce?: string; suppressHydrationWarning: true; dangerouslySetInnerHTML: { __html: string } } {
  return { ...(nonce ? { nonce } : {}), suppressHydrationWarning: true, dangerouslySetInnerHTML: { __html: nasaqThemeScript(defaultTheme) } };
}

/**
 * The same script as a static file body, for `<script src>` (allowed by `script-src 'self'`, no nonce or hash).
 * The default theme comes from the tag's `data-default-theme` attribute, else "system". The package publishes it as
 * `@fadymondy/nasaq/theme-script.js`.
 */
export function nasaqThemeScriptFile(): string {
  return `${body(`(document.currentScript&&document.currentScript.getAttribute("data-default-theme"))||"system"`)}\n`;
}
