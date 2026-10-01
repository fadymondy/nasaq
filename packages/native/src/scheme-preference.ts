import { useCallback, useEffect, useRef, useState } from "react";
import { parseSchemePreference, type SchemePreference, schemeFromPreference } from "./logic";

/** Where the preference is kept. AsyncStorage, MMKV or SecureStore all fit with a one-line wrapper; none is a dependency. */
export interface SchemeStorage {
  getItem(key: string): string | null | undefined | Promise<string | null | undefined>;
  setItem(key: string, value: string): void | Promise<void>;
}

export interface UseSchemePreferenceOptions {
  /** Persistence adapter. Without one the choice lasts for the session only. */
  storage?: SchemeStorage;
  /** Storage key. Default `nasaq-scheme`. */
  storageKey?: string;
  /** Used until the stored value loads. Default `system`. */
  initial?: SchemePreference;
}

export interface SchemePreferenceState {
  /** `system`, `light` or `dark`: what the user chose. */
  preference: SchemePreference;
  setPreference: (next: SchemePreference) => void;
  /** Pass to `NasaqProvider scheme`: undefined for `system`, so the OS decides. */
  scheme: "light" | "dark" | undefined;
  /** False until the stored value has been read. Hold the splash screen until it is true to avoid a flash. */
  ready: boolean;
}

/**
 * The user's appearance choice (system, light, dark) with optional persistence through an adapter you inject.
 * `<NasaqProvider scheme={state.scheme}>`.
 */
export function useSchemePreference({ storage, storageKey = "nasaq-scheme", initial = "system" }: UseSchemePreferenceOptions = {}): SchemePreferenceState {
  const [preference, setState] = useState<SchemePreference>(initial);
  const [ready, setReady] = useState(!storage);
  const touched = useRef(false);

  useEffect(() => {
    if (!storage) return;
    let live = true;
    Promise.resolve(storage.getItem(storageKey))
      .then((raw) => {
        // A choice made before the read finished wins over what was stored.
        if (live && !touched.current && raw != null) setState(parseSchemePreference(raw));
      })
      .catch(() => undefined)
      .finally(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [storage, storageKey]);

  const setPreference = useCallback(
    (next: SchemePreference) => {
      touched.current = true;
      setState(next);
      if (storage) void Promise.resolve(storage.setItem(storageKey, next)).catch(() => undefined);
    },
    [storage, storageKey],
  );

  return { preference, setPreference, scheme: schemeFromPreference(preference), ready };
}
