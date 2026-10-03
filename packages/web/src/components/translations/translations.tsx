"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from "react";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { createTranslator, type MessageBundle, readStoredLocale, type Translate, writeStoredLocale } from "./translations-logic";

export * from "./translations-logic";

export interface TranslationsProviderProps {
  /** Dictionaries by locale: `{ en: {...}, ar: {...} }`. Nested objects, `ns:key` and plural keys are supported. */
  messages: MessageBundle;
  /** Searched when a key is missing in the active locale. Default `"en"`. */
  fallbackLocale?: string;
  /** Where the reader's choice is remembered. `null` turns persistence off. Default `"nasaq-locale"`. */
  storageKey?: string | null;
  /** Used when there is no `NasaqProvider` above. Default `"en"`. */
  locale?: string;
  children?: ReactNode;
}

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

const TranslationsContext = createContext<TranslationsValue | null>(null);

/**
 * App strings for the Nasaq locale. It reads and drives `NasaqProvider`'s locale (so direction and the built-in
 * component strings follow), restores the reader's stored choice on mount, and gives `useT()` to everything below.
 */
export function TranslationsProvider({
  messages,
  fallbackLocale = "en",
  storageKey = "nasaq-locale",
  locale: localeProp = "en",
  children,
}: TranslationsProviderProps) {
  const nq = useOptionalNasaq();
  const locale = nq?.locale ?? localeProp;
  const applyLocale = nq?.setLocale;

  // Restore the stored choice once per storage key; later changes come from setLocale.
  useEffect(() => {
    const stored = readStoredLocale(storageKey);
    if (stored && stored !== locale) applyLocale?.(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const setLocale = useCallback(
    (next: string) => {
      writeStoredLocale(storageKey, next);
      applyLocale?.(next);
    },
    [storageKey, applyLocale],
  );
  const hasStoredLocale = useCallback(() => readStoredLocale(storageKey) !== null, [storageKey]);
  const seedLocale = useCallback(
    (next: string) => {
      if (readStoredLocale(storageKey) === null) applyLocale?.(next);
    },
    [storageKey, applyLocale],
  );

  const value = useMemo<TranslationsValue>(
    () => ({ t: createTranslator(messages, locale, fallbackLocale), locale, setLocale, seedLocale, hasStoredLocale }),
    [messages, locale, fallbackLocale, setLocale, seedLocale, hasStoredLocale],
  );
  return <TranslationsContext.Provider value={value}>{children}</TranslationsContext.Provider>;
}

/** `t`, the locale and its setters. Throws outside `TranslationsProvider`. */
export function useT(): TranslationsValue {
  const value = useContext(TranslationsContext);
  if (!value) throw new Error("useT() must be used inside <TranslationsProvider>.");
  return value;
}

/** Like `useT()`, but `null` outside a provider: for components that also work without app strings. */
export function useOptionalT(): TranslationsValue | null {
  return useContext(TranslationsContext);
}
