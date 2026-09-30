export const THEME_STORAGE_KEY = "nasaq-theme";

/**
 * Inline, render-blocking script that applies the stored theme before first paint (no flash).
 * Put it in <head>: `<script dangerouslySetInnerHTML={{ __html: nasaqThemeScript() }} />`.
 */
export function nasaqThemeScript(defaultTheme: "light" | "dark" | "system" = "system"): string {
  return `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||${JSON.stringify(defaultTheme)};var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.dataset.theme=d?"dark":"light";e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})();`;
}
