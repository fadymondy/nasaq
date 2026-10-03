// nqColorPicker: a swatch trigger, a swatch grid (a radio group), a validated hex field and the native colour input.
// The markup is the React ColorPicker's; the Blade component renders the swatches and strings, the state lives here.
//
//   <div x-data="nqColorPicker({ value: '--nq-tag-teal', swatches: [{ value: '--nq-tag-red', label: 'Red' }], rtl: false })" x-modelable="color" class="contents">
//     <div x-data="nqPopover()">  trigger (x-text="label ?? placeholder") + teleported content:
//       <div role="radiogroup" x-on:keydown="swatchKey($event)">
//         <button role="radio" data-value="--nq-tag-red" :aria-checked="isOn('--nq-tag-red')" :tabindex="tab('--nq-tag-red')" x-on:click="pick('--nq-tag-red')">
//       <input data-slot="color-picker-hex" :value="draft" x-on:input="onHex($event)" x-on:blur="submitDraft()" x-on:keydown.enter.prevent="submitDraft()">
//       <button x-on:click="openNative()"> + <input type="color" x-on:change="onNative($event)">
//
// color is x-modelable (x-model / wire:model): a 6 digit hex string ("#1a73e8") or a CSS custom property name ("--nq-tag-red"), or null.
// A complete 6 digit hex applies as you type; 3 digit shorthand waits for Enter or blur. Fires `color-change` ({ value }) on the root.

import type { Magics, Register } from "./types";

export interface ColorSwatch {
  value: string;
  label: string;
}

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Expands 3 digits to 6 and lower-cases. Accepts a missing `#`. Returns null when the text is not a hex colour. */
export function normalizeHexColor(input: string): string | null {
  const text = input.trim();
  const withHash = text.startsWith("#") ? text : `#${text}`;
  if (!HEX_RE.test(withHash)) return null;
  const digits = withHash.slice(1).toLowerCase();
  return `#${digits.length === 3 ? [...digits].map((c) => c + c).join("") : digits}`;
}

/** A value as a CSS colour: hex stays, `--nq-tag-red` becomes `var(--nq-tag-red)`. */
export const colorToCss = (value: string) => (value.trim().startsWith("--") ? `var(${value.trim()})` : value.trim());

const same = (a: string | null | undefined, b: string | null | undefined) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

interface ColorState extends Magics {
  color: string | null;
  draft: string;
  showError: boolean;
  swatches: ColorSwatch[];
  placeholder: string;
  none: string;
  choose: string;
  rtl: boolean;
  root: HTMLElement | null;
  readonly label: string | null;
  readonly triggerLabel: string;
  readonly draftColor: string | null;
  commit(next: string): void;
}

export const colorPicker: Register = (Alpine) => {
  Alpine.data(
    "nqColorPicker",
    ({ value = null, swatches = [], placeholder = "", none = "No colour", choose = "Choose colour", rtl = false }: Partial<ColorState> & { value?: string | null } = {}) => ({
      color: (value || null) as string | null,
      draft: "",
      showError: false,
      swatches: swatches as ColorSwatch[],
      placeholder,
      none,
      choose,
      rtl: Boolean(rtl),
      root: null as HTMLElement | null,
      init(this: ColorState) {
        this.root = this.$el;
      },
      /** The visible text: the swatch's name, else the hex, else null. */
      get label(): string | null {
        const self = this as unknown as ColorState;
        if (!self.color) return null;
        return self.swatches.find((s) => same(s.value, self.color))?.label ?? normalizeHexColor(self.color) ?? self.color;
      },
      /** aria-label of the trigger: "Choose colour: Teal". */
      get triggerLabel(): string {
        const self = this as unknown as ColorState;
        return `${self.choose}: ${self.label ?? self.none}`;
      },
      /** The draft as a colour for the little chip next to the hex field, or null while it is not valid. */
      get draftColor(): string | null {
        return normalizeHexColor((this as unknown as ColorState).draft);
      },
      css: colorToCss,
      isOn(this: ColorState, value: string) {
        return same(this.color, value);
      },
      /** Roving tabindex: the chosen swatch, else the first. */
      tab(this: ColorState, value: string) {
        const checked = this.swatches.find((s) => same(s.value, this.color));
        return (checked ? checked.value === value : this.swatches[0]?.value === value) ? 0 : -1;
      },
      commit(this: ColorState, next: string) {
        this.color = next;
        this.root?.dispatchEvent(new CustomEvent("color-change", { detail: { value: next }, bubbles: true }));
      },
      pick(this: ColorState, value: string) {
        this.commit(value);
      },
      /** Arrow keys move the choice through the grid, like a radio group. Physical: in RTL, ArrowRight is the previous swatch. */
      swatchKey(this: ColorState, event: KeyboardEvent) {
        const dir = ({ ArrowRight: this.rtl ? -1 : 1, ArrowLeft: this.rtl ? 1 : -1, ArrowDown: 1, ArrowUp: -1 } as Record<string, number>)[event.key];
        if (!dir) return;
        const items = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[data-slot="color-picker-swatch"]')];
        const at = items.indexOf(document.activeElement as HTMLElement);
        const next = items[(at + dir + items.length) % items.length];
        if (!next) return;
        event.preventDefault();
        next.focus();
        (this as unknown as { pick(v: string): void }).pick(next.dataset.value ?? "");
      },
      /** Called when the popup opens: the hex field starts from the current colour. */
      syncDraft(this: ColorState) {
        this.draft = this.color ? (normalizeHexColor(this.color) ?? "") : "";
        this.showError = false;
      },
      onHex(this: ColorState, event: Event) {
        const text = (event.target as HTMLInputElement).value;
        this.draft = text;
        this.showError = false;
        const hex = normalizeHexColor(text);
        if (hex && text.replace("#", "").length === 6 && !same(this.color, hex)) this.commit(hex);
      },
      submitDraft(this: ColorState) {
        const hex = normalizeHexColor(this.draft);
        if (!hex) {
          this.showError = this.draft.trim() !== "";
          return;
        }
        this.showError = false;
        this.draft = hex;
        if (!same(this.color, hex)) this.commit(hex);
      },
      openNative(this: ColorState) {
        const input = this.$el.parentElement?.querySelector<HTMLInputElement>('input[type="color"]');
        if (!input) return;
        const hex = this.color ? normalizeHexColor(this.color) : null;
        if (hex) input.value = hex;
        input.click();
      },
      onNative(this: ColorState, event: Event) {
        const hex = normalizeHexColor((event.target as HTMLInputElement).value);
        if (!hex) return;
        this.draft = hex;
        this.showError = false;
        this.commit(hex);
      },
    }),
  );
};
