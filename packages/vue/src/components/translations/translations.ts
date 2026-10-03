import { inject, type InjectionKey } from "vue";
import type { Translate } from "./translations-logic";

export interface TranslationsValue {
  t: Translate;
  /** The active locale (from `NasaqProvider`). */
  locale: string;
  /** Switches the locale and remembers the choice. */
  setLocale: (locale: string) => void;
  /**
   * Applies a locale the reader did not choose (a server default, an account setting) only when nothing is stored
   * yet. It is not remembered, so a choice the reader makes later still wins.
   */
  seedLocale: (locale: string) => void;
  /** Whether the reader has a stored choice. */
  hasStoredLocale: () => boolean;
}

export const TRANSLATIONS_KEY: InjectionKey<{ readonly value: TranslationsValue }> = Symbol("nasaq-translations");

/**
 * `t`, the locale and its setters (the React `useT`; named `useTranslations` here because `useT` is already the
 * built-in `(en, ar)` picker). Read `.value` in templates and computeds so it follows the locale. Throws outside
 * `NqTranslationsProvider`.
 */
export function useTranslations(): { readonly value: TranslationsValue } {
  const value = inject(TRANSLATIONS_KEY, null);
  if (!value) throw new Error("useTranslations() must be used inside <NqTranslationsProvider>.");
  return value;
}

/** Like `useTranslations()`, but `null` outside a provider: for components that also work without app strings. */
export function useOptionalTranslations(): { readonly value: TranslationsValue } | null {
  return inject(TRANSLATIONS_KEY, null);
}
