import { computed, onMounted, onScopeDispose, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter } from "vue";
import { useNasaq } from "../../provider";
import { THEME_PRESETS, themePresetVars, type ThemeOverrides, type ThemePreset } from "./theme-presets-logic";

/**
 * Writes a preset's brand variables onto `root` as inline styles and returns a function that removes them. A
 * scoped `root` (not `<html>`) also gets `data-brand="runtime"`, because the derived colour roles re-resolve only
 * on `:root` and `[data-brand]`. Light or dark is not set here: pass `preset.mode` to `setTheme`.
 */
export function applyThemePreset(root: HTMLElement, preset: ThemePreset, overrides?: ThemeOverrides): () => void {
  const vars = themePresetVars(preset, overrides);
  const scoped = root !== root.ownerDocument.documentElement && !root.hasAttribute("data-brand");
  if (scoped) root.setAttribute("data-brand", "runtime");
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  return () => {
    for (const name of Object.keys(vars)) root.style.removeProperty(name);
    if (scoped) root.removeAttribute("data-brand");
  };
}

function readStored(key: string | null): string | null {
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export interface UseThemePresetOptions {
  presets?: readonly ThemePreset[];
  /** Used when nothing is stored. Default: the first preset. */
  defaultValue?: string;
  /** Where the choice is remembered. `null` turns persistence off. Default `"nasaq-theme-preset"`. */
  storageKey?: string | null;
  /** Colours over the chosen preset, e.g. a tenant's brand colour from its settings (a value, a ref or a getter). */
  overrides?: MaybeRefOrGetter<ThemeOverrides | undefined>;
  /** Apply the colours to `<html>` and switch `NasaqProvider` to the preset's light or dark. Default `true`. */
  apply?: boolean;
}

/**
 * Holds the chosen preset, remembers it and, with `apply` (the default), applies it to the whole app: brand
 * variables on `<html>` and the provider's theme set to the preset's mode.
 */
export function useThemePreset({ presets = THEME_PRESETS, defaultValue, storageKey = "nasaq-theme-preset", overrides, apply = true }: UseThemePresetOptions = {}) {
  const value = ref(defaultValue ?? presets[0]?.id ?? "");
  const nq = useNasaq();
  const preset: ComputedRef<ThemePreset | undefined> = computed(() => presets.find((p) => p.id === value.value) ?? presets[0]);

  onMounted(() => {
    const stored = readStored(storageKey);
    if (stored && presets.some((p) => p.id === stored)) value.value = stored;
  });

  let undo: (() => void) | undefined;
  const clear = () => {
    undo?.();
    undo = undefined;
  };
  watch(
    () => [preset.value, JSON.stringify(toValue(overrides) ?? {})] as const,
    () => {
      clear();
      if (!apply || !preset.value || typeof document === "undefined") return;
      nq.setTheme(preset.value.mode);
      undo = applyThemePreset(document.documentElement, preset.value, toValue(overrides));
    },
    { immediate: true, flush: "post" },
  );
  onScopeDispose(clear);

  const setValue = (id: string) => {
    value.value = id;
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      /* Ignore: the choice still applies for this visit. */
    }
  };
  return { value, preset, setValue, presets };
}
