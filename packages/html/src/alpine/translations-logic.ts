/** A dictionary for one locale: nested objects or flat keys, string leaves. */
export type Messages = { [key: string]: string | Messages };

/** Dictionaries by locale (`en`, `ar`, `en-GB`). */
export type MessageBundle = Record<string, Messages>;

/** Interpolation values; `count` also picks the plural form. */
export type TranslateVars = Record<string, string | number | null | undefined>;

export type Translate = (key: string, vars?: TranslateVars & { defaultValue?: string }) => string;

/** Looks a key up in one dictionary: `a.b.c`, or `ns:a.b` where `ns` is a top-level namespace. Flat keys win. */
export function translationsLookup(messages: Messages | undefined, key: string): string | undefined {
  if (!messages) return undefined;
  const flat = messages[key];
  if (typeof flat === "string") return flat;
  const path = key.replace(":", ".").split(".");
  let node: string | Messages | undefined = messages;
  for (const part of path) {
    if (!node || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Replaces `{name}` and `{{name}}` with `vars.name`. Numbers are formatted for the locale; unknown names stay. */
export function translationsInterpolate(text: string, vars: TranslateVars = {}, locale = "en"): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}|\{(\w+)\}/g, (match, a: string | undefined, b: string | undefined) => {
    const value = vars[(a ?? b)!];
    if (value === undefined || value === null) return match;
    return typeof value === "number" ? new Intl.NumberFormat(locale).format(value) : value;
  });
}

/** The locales to search, in order: `ar-EG` gives `ar-EG`, `ar`, then the fallback and its base. */
export function translationsLocaleChain(locale: string, fallback = "en"): string[] {
  const chain = [locale, locale.split(/[-_]/)[0]!, fallback, fallback.split(/[-_]/)[0]!];
  return chain.filter((l, i) => l && chain.indexOf(l) === i);
}

function pluralRule(locale: string, count: number): string {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return count === 1 ? "one" : "other";
  }
}

/**
 * A `t(key, vars)` over a bundle. Missing keys fall back along the locale chain, then to `vars.defaultValue`, then
 * to the key itself. With a numeric `vars.count`, `key_zero` (for 0), the CLDR form (`key_one`, `key_two`,
 * `key_few`, `key_many`) and `key_other` are tried before `key`.
 */
export function createTranslator(bundle: MessageBundle, locale: string, fallback = "en"): Translate {
  const chain = translationsLocaleChain(locale, fallback);
  return (key, vars = {}) => {
    const { defaultValue, ...rest } = vars;
    const count = typeof rest.count === "number" ? rest.count : undefined;
    for (const l of chain) {
      const dict = bundle[l];
      if (!dict) continue;
      const keys =
        count === undefined
          ? [key]
          : [...(count === 0 ? [`${key}_zero`] : []), `${key}_${pluralRule(l, count)}`, `${key}_other`, key];
      for (const k of keys) {
        const hit = translationsLookup(dict, k);
        if (hit !== undefined) return translationsInterpolate(hit, rest, l);
      }
    }
    return translationsInterpolate(defaultValue ?? key, rest, locale);
  };
}

/** Reads a stored locale, or `null` when there is none or storage is unavailable. */
export function readStoredLocale(storageKey: string | null): string | null {
  if (!storageKey) return null;
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

/** Stores the reader's choice. Errors (privacy mode, quota) are ignored. */
export function writeStoredLocale(storageKey: string | null, locale: string): void {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, locale);
  } catch {
    /* Ignore: the choice still applies for this visit. */
  }
}
