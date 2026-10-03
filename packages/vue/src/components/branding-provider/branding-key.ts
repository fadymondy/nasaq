import { inject, type ComputedRef, type InjectionKey } from "vue";
import type { BrandingValue } from "./branding";

export const BRANDING_KEY: InjectionKey<ComputedRef<BrandingValue>> = Symbol("nq-branding");

/** The nearest NqBrandingProvider's colours, logo and name, or null outside one. */
export function useBranding(): ComputedRef<BrandingValue> | null {
  return inject(BRANDING_KEY, null);
}
