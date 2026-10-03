// nqTranslations: app strings for the Nasaq locale (the TranslationsProvider and useT of this stack).
// The markup is the Blade translations.provider, a `contents` div; children read `t(key, vars)`, `locale`, `setLocale(l)`,
// `seedLocale(l)` and `hasStoredLocale()` through Alpine scope.
//
//   <div class="contents" x-data="nqTranslations({ en: { hi: 'Hello {name}' }, ar: { hi: 'مرحبا {name}' } }, { fallbackLocale: 'en' })">
//     <span x-text="t('hi', { name: 'Sara' })"></span> <button x-on:click="setLocale('ar')">AR</button>
//   </div>
//
// It drives the $nq store (locale, direction, built-in strings), restores the stored choice on init and remembers new ones under
// `storageKey` (default "nasaq-locale", null = off). `t` reads the store locale, so every x-text using it follows a locale change.

import { createTranslator, readStoredLocale, writeStoredLocale, type MessageBundle, type TranslateVars } from "./translations-logic";
import type { Register } from "./types";

interface Options {
  fallbackLocale?: string;
  storageKey?: string | null;
}

interface Store {
  locale: string;
  setLocale(locale: string): void;
}

export const translations: Register = (Alpine) => {
  const nq = () => Alpine.store("nq") as Store;
  Alpine.data("nqTranslations", (messages: MessageBundle = {}, { fallbackLocale = "en", storageKey = "nasaq-locale" }: Options = {}) => ({
    messages,
    fallbackLocale,
    storageKey,
    get locale(): string {
      return nq().locale;
    },
    init() {
      const stored = readStoredLocale(this.storageKey);
      if (stored && stored !== nq().locale) nq().setLocale(stored);
    },
    t(key: string, vars: TranslateVars & { defaultValue?: string } = {}): string {
      return createTranslator(this.messages, nq().locale, this.fallbackLocale)(key, vars);
    },
    setLocale(next: string) {
      writeStoredLocale(this.storageKey, next);
      nq().setLocale(next);
    },
    /** Applies a locale the reader did not choose only when nothing is stored yet; it is not remembered. */
    seedLocale(next: string) {
      if (readStoredLocale(this.storageKey) === null) nq().setLocale(next);
    },
    hasStoredLocale(): boolean {
      return readStoredLocale(this.storageKey) !== null;
    },
  }));
};
