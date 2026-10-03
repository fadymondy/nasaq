// nqThemePreset: holds the chosen theme preset, remembers it and applies it (the useThemePreset of this stack).
// The picker is the Blade theme-presets.picker; bind it with x-model="presetId" (its radio group is x-modelable).
//
//   <div x-data="nqThemePreset({ defaultValue: 'purple' })">
//     <x-nq::theme-presets.picker x-model="presetId" />
//   </div>
//
// `apply` (default true) writes the brand variables on <html> and sets the $nq store theme to the preset mode. For a scoped
// preview use `<x-nq::theme-presets.scope x-bind:data-theme="mode" x-bind:style="scopeStyle">` and pass `{ apply: false }`.
// Options: `presets`, `defaultValue`, `storageKey` (default "nasaq-theme-preset", null = no persistence), `overrides`, `apply`.

import { applyThemePreset, THEME_PRESETS, themePresetVars, type ThemeOverrides, type ThemePreset } from "./theme-presets-logic";
import type { Magics, Register } from "./types";

interface Options {
  presets?: readonly ThemePreset[];
  defaultValue?: string;
  storageKey?: string | null;
  overrides?: ThemeOverrides;
  apply?: boolean;
}

interface Store {
  setTheme(theme: "light" | "dark" | "system"): void;
}

interface PresetState extends Magics {
  presetId: string;
  presets: readonly ThemePreset[];
  storageKey: string | null;
  overrides: ThemeOverrides;
  applyToPage: boolean;
  undo: (() => void) | undefined;
  readonly preset: ThemePreset | undefined;
  readonly mode: "light" | "dark";
  readonly scopeStyle: string;
  refresh(): void;
  clear(): void;
}

export const themePresets: Register = (Alpine) => {
  Alpine.data("nqThemePreset", (options: Options = {}) => ({
    presetId: options.defaultValue ?? (options.presets ?? THEME_PRESETS)[0]?.id ?? "",
    presets: options.presets ?? THEME_PRESETS,
    storageKey: options.storageKey === undefined ? "nasaq-theme-preset" : options.storageKey,
    overrides: options.overrides ?? {},
    applyToPage: options.apply !== false,
    undo: undefined as (() => void) | undefined,
    get preset(): ThemePreset | undefined {
      const self = this as unknown as PresetState;
      return self.presets.find((p) => p.id === self.presetId) ?? self.presets[0];
    },
    get mode(): "light" | "dark" {
      const self = this as unknown as PresetState;
      return self.preset?.mode ?? "dark";
    },
    /** Inline style for a scoped preview: the variables, pinned to the mode roles (as the Blade scope does). */
    get scopeStyle(): string {
      const self = this as unknown as PresetState;
      if (!self.preset) return "";
      const m = self.preset.mode === "dark" ? "d" : "l";
      const vars = {
        ...themePresetVars(self.preset, self.overrides),
        "--nq-brand": `var(--nq-brand-${m})`,
        "--nq-action": `var(--nq-action-${m})`,
        "--nq-on-action": `var(--nq-on-action-${m})`,
        "--nq-primary-action": `var(--nq-action-${m})`,
      };
      return Object.entries(vars)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
    },
    init(this: PresetState) {
      let stored: string | null = null;
      try {
        stored = this.storageKey ? localStorage.getItem(this.storageKey) : null;
      } catch {
        /* storage blocked */
      }
      if (stored && this.presets.some((p) => p.id === stored)) this.presetId = stored;
      this.refresh();
      this.$watch("presetId", (id: string) => {
        if (this.storageKey) {
          try {
            localStorage.setItem(this.storageKey, id);
          } catch {
            /* the choice still applies for this visit */
          }
        }
        this.refresh();
        this.$dispatch("nq-change", { value: id });
      });
    },
    destroy(this: PresetState) {
      this.clear();
    },
    clear(this: PresetState) {
      this.undo?.();
      this.undo = undefined;
    },
    refresh(this: PresetState) {
      this.clear();
      if (!this.applyToPage || !this.preset) return;
      (Alpine.store("nq") as Store | undefined)?.setTheme(this.preset.mode);
      this.undo = applyThemePreset(document.documentElement, this.preset, this.overrides);
    },
  }));
};
