import type { TagHue } from "../badge";

/** Fixed hues so a language reads the same everywhere. Anything else is gray. */
export const LANG_HUES: Record<string, TagHue> = { ar: "amber", en: "blue", fr: "violet", es: "orange", de: "teal", tr: "red", ur: "green", fa: "pink" };

/** The language's name in the reader's language, e.g. "Arabic" / "العربية" for `ar`. Falls back to the code. */
export function languageName(code: string, locale = "en"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}
