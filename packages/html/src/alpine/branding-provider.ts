// nqBrandingProvider: applies a tenant's brand colours at runtime and shares the logo and name with everything inside it.
// The markup is the Blade branding-provider component; the React BrandingProvider renders no element, this is a `contents` div.
//
//   <div data-slot="branding-provider" class="contents" x-data="nqBrandingProvider({ brand: '#0A7C66', logoUrl: null, name: 'Acme' }, null)">
//     <img x-show="logoUrl" x-bind:src="logoUrl" x-bind:alt="name"> <span x-show="!logoUrl" x-text="name"></span>
//   </div>
//
// Children read `brand`, `brandDark`, `action`, `actionDark`, `accent`, `logoUrl` and `name` through Alpine's scope (the useBranding
// of this stack). `target` is a CSS selector for the element that gets the variables; null means <html>. Invalid colours are
// skipped. `set({ brand, … })` changes the colours at runtime; the variables are removed when the provider is destroyed.

import { applyBrand, type BrandColors } from "./branding-logic";
import type { Magics, Register } from "./types";

interface Info extends BrandColors {
  logoUrl?: string | null;
  name?: string;
}

interface BrandingState extends Magics, Info {
  target: string | null;
  cleanup: (() => void) | undefined;
  apply(): void;
}

export const brandingProvider: Register = (Alpine) => {
  Alpine.data("nqBrandingProvider", (info: Info = {}, target: string | null = null) => ({
    brand: info.brand,
    brandDark: info.brandDark,
    action: info.action,
    actionDark: info.actionDark,
    accent: info.accent,
    logoUrl: info.logoUrl?.trim() ? info.logoUrl : null,
    name: info.name,
    target,
    cleanup: undefined as (() => void) | undefined,
    init(this: BrandingState) {
      this.apply();
    },
    destroy(this: BrandingState) {
      this.cleanup?.();
    },
    apply(this: BrandingState) {
      this.cleanup?.();
      this.cleanup = undefined;
      const el = this.target ? document.querySelector<HTMLElement>(this.target) : document.documentElement;
      if (!el) return;
      this.cleanup = applyBrand(el, { brand: this.brand, brandDark: this.brandDark, action: this.action, actionDark: this.actionDark, accent: this.accent });
    },
    set(this: BrandingState, next: Info) {
      Object.assign(this, next);
      if (next.logoUrl !== undefined) this.logoUrl = next.logoUrl?.trim() ? next.logoUrl : null;
      this.apply();
    },
  }));
};
