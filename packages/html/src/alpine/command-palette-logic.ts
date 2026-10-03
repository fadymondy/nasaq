// Pure helpers for the command palette (a copy of the Vue and React scoring and section logic; no framework).

export interface PaletteCommand {
  id: string;
  label: string;
  section?: string;
  sectionLabel?: string;
  sectionOrder?: number;
  /** Trusted HTML for the icon (the Blade component draws the lucide glyph). */
  iconHtml?: string;
  keywords?: string[];
  /** "Mod K", "G I", "Shift A": shown as keys; the palette does not bind them. */
  shortcut?: string;
  hint?: string;
  priority?: number;
  disabled?: boolean;
  searchOnly?: boolean;
  keepOpen?: boolean;
  href?: string;
  children?: PaletteCommand[];
}

const APPLE_PLATFORMS = new Set(["darwin", "macos", "ios"]);
const BROWSER_PLATFORMS = new Set(["web", "extension"]);

/** Command or Ctrl. <html data-platform> wins when it is set; otherwise the browser's own platform decides. */
export function isApplePlatform(): boolean {
  if (typeof document !== "undefined") {
    const platform = document.documentElement.dataset.platform;
    if (platform && !BROWSER_PLATFORMS.has(platform)) return APPLE_PLATFORMS.has(platform);
  }
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

export const COMMAND_SECTIONS = ["context", "search", "create", "navigation", "products", "ai", "system"] as const;

export const DEFAULT_SECTION_LABELS: Record<string, { en: string; ar: string }> = {
  context: { en: "This page", ar: "هذه الصفحة" },
  search: { en: "Results", ar: "النتائج" },
  create: { en: "Create", ar: "إنشاء" },
  navigation: { en: "Go to", ar: "انتقال" },
  products: { en: "Switch product", ar: "تبديل المنتج" },
  ai: { en: "Ask AI", ar: "الذكاء الاصطناعي" },
  system: { en: "System", ar: "النظام" },
};

/** Lowercase, no diacritics or tatweel, one form of the Arabic alef, yeh and teh marbuta. */
export function normalizeForSearch(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

/** 0 = no match. Prefix of the label beats a word prefix beats a substring beats a keyword. */
export function scoreCommand(command: PaletteCommand, query: string) {
  if (!query) return 1;
  const label = normalizeForSearch(command.label);
  if (label.startsWith(query)) return 4;
  if (label.split(/\s+/).some((w) => w.startsWith(query))) return 3;
  if (label.includes(query)) return 2;
  const keywords = (command.keywords ?? []).map(normalizeForSearch);
  if (keywords.some((k) => k.startsWith(query))) return 1.5;
  if (keywords.some((k) => k.includes(query))) return 1;
  return 0;
}

export const sectionOrder = (c: PaletteCommand) => {
  const i = (COMMAND_SECTIONS as readonly string[]).indexOf(c.section ?? "context");
  return i >= 0 ? i : (c.sectionOrder ?? 4.5);
};
