<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, watch } from "vue";
import { applyBrand, type BrandingValue } from "./branding";
import { BRANDING_KEY } from "./branding-key";

defineOptions({ inheritAttrs: false });
interface Props {
  /** Brand colour on light surfaces, `#RRGGBB` or `#RGB`. */
  brand?: string;
  /** Brand colour on dark surfaces. Default: a lighter step of `brand`. */
  brandDark?: string;
  /** Primary-button fill. Default: the brand colour. */
  action?: string;
  actionDark?: string;
  /** Accent (featured / new). */
  accent?: string;
  /** Shared through `useBranding()`. Blank becomes null. */
  logoUrl?: string | null;
  /** Tenant name, shared through `useBranding()`. */
  name?: string;
  /** Where the variables are written. Default `document.documentElement`. */
  target?: () => HTMLElement | null;
}

// Applies a tenant's brand colours at runtime and shares the logo and name with the tree (`useBranding`). Place it inside
// NasaqProvider. Renders no element; the server render uses the manifest colours.
const props = defineProps<Props>();
const value = computed<BrandingValue>(() => ({
  brand: props.brand,
  brandDark: props.brandDark,
  action: props.action,
  actionDark: props.actionDark,
  accent: props.accent,
  logoUrl: props.logoUrl?.trim() ? props.logoUrl : null,
  name: props.name,
}));
provide(BRANDING_KEY, value);

let cleanup: (() => void) | undefined;
function apply() {
  cleanup?.();
  cleanup = undefined;
  const el = props.target ? props.target() : typeof document !== "undefined" ? document.documentElement : null;
  if (!el) return;
  cleanup = applyBrand(el, { brand: props.brand, brandDark: props.brandDark, action: props.action, actionDark: props.actionDark, accent: props.accent });
}
onMounted(() => {
  apply();
  watch(() => [props.brand, props.brandDark, props.action, props.actionDark, props.accent, props.target], apply);
});
onBeforeUnmount(() => cleanup?.());
</script>

<template>
  <slot />
</template>
