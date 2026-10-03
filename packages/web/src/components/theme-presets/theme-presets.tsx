"use client";

import { type ComponentProps, type CSSProperties, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { ThemeGallery, type ThemeGalleryProps } from "../appearance-pickers";
import { THEME_PRESETS, type ThemeOverrides, type ThemePreset, themePresetSwatches, themePresetVars } from "./theme-presets-logic";

export * from "./theme-presets-logic";

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
  /** Colours over the chosen preset, e.g. a tenant's brand colour from its settings. */
  overrides?: ThemeOverrides;
  /** Apply the colours to `<html>` and switch `NasaqProvider` to the preset's light or dark. Default `true`. */
  apply?: boolean;
}

/**
 * Holds the chosen preset, remembers it and, with `apply` (the default), applies it to the whole app: brand
 * variables on `<html>` and the provider's theme set to the preset's mode.
 */
export function useThemePreset({ presets = THEME_PRESETS, defaultValue, storageKey = "nasaq-theme-preset", overrides, apply = true }: UseThemePresetOptions = {}) {
  const fallback = defaultValue ?? presets[0]?.id ?? "";
  const [value, setInner] = useState(fallback);
  const setTheme = useOptionalNasaq()?.setTheme;

  useEffect(() => {
    const stored = readStored(storageKey);
    if (stored && presets.some((p) => p.id === stored)) setInner(stored);
  }, [storageKey, presets]);

  const preset = presets.find((p) => p.id === value) ?? presets[0];
  const overrideKey = JSON.stringify(overrides ?? {});

  useEffect(() => {
    if (!apply || !preset) return;
    setTheme?.(preset.mode);
    return applyThemePreset(document.documentElement, preset, overrides);
    // overrides is compared by value through overrideKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apply, preset, overrideKey, setTheme]);

  const setValue = (id: string) => {
    setInner(id);
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      /* Ignore: the choice still applies for this visit. */
    }
  };
  return { value, preset, setValue, presets };
}

export interface ThemePresetPickerProps extends Omit<ThemeGalleryProps, "themes"> {
  /** Default: `THEME_PRESETS` (Nasaq, purple, rose and emerald, each dark and light). */
  presets?: readonly ThemePreset[];
  /** Shown in every preview, so a tenant colour can be compared across light and dark. */
  overrides?: ThemeOverrides;
}

/**
 * A gallery of named themes (light or dark plus brand colours). It only reports the choice: apply it with
 * `useThemePreset`, or preview a region with `ThemePresetScope`.
 */
export function ThemePresetPicker({ presets = THEME_PRESETS, overrides, ...props }: ThemePresetPickerProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const themes = useMemo(
    () =>
      presets.map((p) => ({
        id: p.id,
        label: (ar && p.labelAr) || p.label,
        mode: p.mode,
        swatches: themePresetSwatches(p, overrides),
      })),
    [presets, overrides, ar],
  );
  return <ThemeGallery themes={themes} {...props} />;
}

export interface ThemePresetScopeProps extends ComponentProps<"div"> {
  preset: ThemePreset;
  overrides?: ThemeOverrides;
}

/** Renders `children` in a preset without touching the rest of the page: a live preview beside the picker. */
export function ThemePresetScope({ preset, overrides, className, style, children, ...props }: ThemePresetScopeProps) {
  // Pin the mode's roles inline: inside a dark page `.dark [data-brand]` would otherwise outrank a light scope.
  const m = preset.mode === "dark" ? "d" : "l";
  const vars = {
    ...themePresetVars(preset, overrides),
    "--nq-brand": `var(--nq-brand-${m})`,
    "--nq-action": `var(--nq-action-${m})`,
    "--nq-on-action": `var(--nq-on-action-${m})`,
    "--nq-primary-action": `var(--nq-action-${m})`,
  } as CSSProperties;
  return (
    <div data-slot="theme-preset-scope" data-theme={preset.mode} className="contents">
      <div data-brand="runtime" style={{ ...vars, ...style }} className={cn("bg-background text-foreground", className)} {...props}>
        {children}
      </div>
    </div>
  );
}
