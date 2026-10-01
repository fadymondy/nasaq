// nqReadingSettings and nqWallpaperPicker: the state behind the appearance pickers (the theme gallery is a plain nqRadioGroup).
//
//   <div x-data="nqReadingSettings({ fontSize: 'md', width: 'normal', spacing: 'normal' }, false)" x-modelable="prefs">
//     <div x-data="nqToggleGroup(['md'])" x-modelable="value" x-model="fontSizeV" x-bind="root">…toggles…</div>
//     <button x-on:click="step(1)" x-bind:disabled="disabled || prefs.fontSize === 'xl'">+</button>
//     <button x-on:click="reset()" x-bind:disabled="disabled || isDefault">Reset</button>
//     <section x-bind:style="styleVars">…sample…</section>
//   </div>
//
//   <div x-data="nqWallpaperPicker('dawn', 20)" x-modelable="selected">
//     <div x-data="nqRadioGroup('dawn')" x-modelable="value" x-model="selected" x-bind="root">…tiles…</div>
//     <input type="file" x-ref="file" x-on:change="pick($event)">
//     <div x-data="nqSlider(…)" x-modelable="model" x-model="dimFraction">…</div>
//   </div>
//
// Events (bubbling): nq-change { fontSize, width, spacing } and nq-change { value } for the wallpaper, nq-dim { value }, nq-upload { file }.

import type { Magics, Register } from "./types";

type Size = "sm" | "md" | "lg" | "xl";
type Width = "narrow" | "normal" | "wide" | "full";
type Spacing = "compact" | "normal" | "relaxed";

interface Prefs {
  fontSize: Size;
  width: Width;
  spacing: Spacing;
}

const SIZES: Size[] = ["sm", "md", "lg", "xl"];
const WIDTHS: Width[] = ["narrow", "normal", "wide", "full"];
const SPACINGS: Spacing[] = ["compact", "normal", "relaxed"];
const DEFAULTS: Prefs = { fontSize: "md", width: "normal", spacing: "normal" };
const SCALE: Record<Size, string> = { sm: "0.875", md: "1", lg: "1.125", xl: "1.25" };
const CH: Record<Width, string> = { narrow: "52ch", normal: "68ch", wide: "88ch", full: "none" };
const LINE: Record<Spacing, string> = { compact: "1.4", normal: "1.6", relaxed: "1.85" };

const NONE = "__none__";
const MAX_DIM = 60;

interface ReadingState extends Magics {
  prefs: Prefs;
  disabled: boolean;
  setKey(key: keyof Prefs, next: string[]): void;
}

interface WallpaperState extends Magics {
  selected: string;
  dim: number;
}

const clampDim = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(MAX_DIM, Math.round(v))) : 0);

export const appearancePickers: Register = (Alpine) => {
  Alpine.data("nqReadingSettings", (initial: Partial<Prefs> = {}, disabled = false) => {
    const pick = <T extends string>(value: unknown, allowed: T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback);
    return {
      prefs: {
        fontSize: pick(initial?.fontSize, SIZES, DEFAULTS.fontSize),
        width: pick(initial?.width, WIDTHS, DEFAULTS.width),
        spacing: pick(initial?.spacing, SPACINGS, DEFAULTS.spacing),
      } as Prefs,
      disabled: Boolean(disabled),
      init(this: ReadingState) {
        this.$watch("prefs", (value: Prefs) => this.$dispatch("nq-change", { ...value }));
      },
      get isDefault(): boolean {
        const p = (this as unknown as ReadingState).prefs;
        return p.fontSize === DEFAULTS.fontSize && p.width === DEFAULTS.width && p.spacing === DEFAULTS.spacing;
      },
      get styleVars(): string {
        const p = (this as unknown as ReadingState).prefs;
        return `--reading-scale: ${SCALE[p.fontSize]}; --reading-max-width: ${CH[p.width]}; --reading-line-height: ${LINE[p.spacing]}`;
      },
      // The three toggle groups hold arrays; these adapt them to the single value.
      get fontSizeV(): string[] {
        const s = this as unknown as ReadingState;
        return [s.prefs.fontSize];
      },
      set fontSizeV(next: string[]) {
        (this as unknown as ReadingState).setKey("fontSize", next);
      },
      get widthV(): string[] {
        const s = this as unknown as ReadingState;
        return [s.prefs.width];
      },
      set widthV(next: string[]) {
        (this as unknown as ReadingState).setKey("width", next);
      },
      get spacingV(): string[] {
        const s = this as unknown as ReadingState;
        return [s.prefs.spacing];
      },
      set spacingV(next: string[]) {
        (this as unknown as ReadingState).setKey("spacing", next);
      },
      setKey(this: ReadingState, key: keyof Prefs, next: string[]) {
        const value = next?.[0];
        const allowed: string[] = key === "fontSize" ? SIZES : key === "width" ? WIDTHS : SPACINGS;
        if (!value || !allowed.includes(value)) {
          // Pressing the pressed item clears the group; one choice always stays, so press it back.
          const group = this.$root.closest("[data-slot=\"reading-settings\"]")?.querySelector<HTMLElement>(`[data-row="${key}"]`);
          const keep = this.prefs[key];
          if (group) this.$nextTick(() => ((Alpine as unknown as { $data(el: Element): { value: string[] } }).$data(group).value = [keep]));
          return;
        }
        if (this.prefs[key] !== value) this.prefs = { ...this.prefs, [key]: value };
      },
      step(this: ReadingState, delta: number) {
        const at = SIZES.indexOf(this.prefs.fontSize);
        const to = Math.max(0, Math.min(SIZES.length - 1, (at < 0 ? 1 : at) + Math.sign(delta)));
        if (SIZES[to] !== this.prefs.fontSize) this.prefs = { ...this.prefs, fontSize: SIZES[to]! };
      },
      reset(this: ReadingState) {
        this.prefs = { ...DEFAULTS };
      },
    };
  });

  Alpine.data("nqWallpaperPicker", (initial: string | null = NONE, dim = 0) => ({
    selected: initial ?? NONE,
    dim: clampDim(Number(dim)),
    init(this: WallpaperState) {
      this.$watch("selected", (value: string) => this.$dispatch("nq-change", { value: value === NONE ? null : value }));
      this.$watch("dim", (value: number) => this.$dispatch("nq-dim", { value }));
    },
    // The dim slider counts 0 to 0.6 so it can show a percent; this adapts it to whole percent.
    get dimFraction(): number {
      return (this as unknown as WallpaperState).dim / 100;
    },
    set dimFraction(v: number) {
      (this as unknown as WallpaperState).dim = clampDim(Number(v) * 100);
    },
    pick(this: WallpaperState, event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      input.value = "";
      if (file) this.$dispatch("nq-upload", { file });
    },
  }));
};
