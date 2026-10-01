<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { BRANDS, MARK_ACCENT_MIN_SIZE, markGeometry, resolveBrand, type MarkSpec } from "./brands";


interface Props {
  /** Brand key or legacy alias. Defaults to the provider's brand. */
  brand?: string;
  /** Or pass a MarkSpec directly (for previews of unreleased marks). */
  mark?: MarkSpec;
  /** Rendered size in px (square). */
  size?: number;
  /** Force the on-dark body. Defaults to the resolved theme. */
  onDark?: boolean;
  /** Accessible name. Defaults to the brand name; pass "" when a visible name sits beside it. */
  title?: string;
  /**
   * A custom logo image (an admin-uploaded brand logo) shown instead of the mark. When it fails to load, the mark
   * is drawn instead. It is sized to `size` and never recoloured or mirrored.
   */
  src?: string;
  /** Alias of `src`. */
  logoUrl?: string;
  class?: HTMLAttributes["class"];
}

/**
 * A brand's cube-lattice mark, drawn from its MarkSpec. Never recoloured, filtered, mirrored or
 * transformed: the dark variant is the spec's own bodyOnDark. SVG geometry is not affected by dir,
 * so RTL layouts never flip it.
 */
const props = withDefaults(defineProps<Props>(), { size: 24, onDark: undefined });
const nasaq = useNasaq();
const failed = ref<string | null>(null);

const customSrc = computed(() => props.src ?? props.logoUrl);
const showImg = computed(() => Boolean(customSrc.value) && failed.value !== customSrc.value);
const spec = computed<MarkSpec>(() => {
  if (props.mark) return props.mark;
  const resolved = props.brand ? resolveBrand(props.brand) : undefined;
  if (props.brand && !resolved) console.warn(`[nasaq] Unknown brand "${props.brand}"; falling back to the default mark.`);
  return (props.brand ? resolved?.mark : resolveBrand(nasaq.brand.value)?.mark) ?? BRANDS.nasaq.mark;
});
const dark = computed(() => props.onDark ?? nasaq.resolvedTheme.value === "dark");
const body = computed(() => (dark.value ? (spec.value.bodyOnDark ?? spec.value.body) : spec.value.body));
const showAccent = computed(() => props.size >= MARK_ACCENT_MIN_SIZE);
const geometry = computed(() => markGeometry(spec.value));
const label = computed(() => props.title ?? spec.value.name);
</script>

<template>
  <img
    v-if="showImg"
    data-slot="product-mark"
    data-custom=""
    :src="customSrc"
    :alt="label"
    :width="size"
    :height="size"
    draggable="false"
    :class="cn('shrink-0 object-contain', props.class)"
    @error="failed = customSrc ?? null"
  />
  <svg
    v-else
    data-slot="product-mark"
    viewBox="0 0 100 100"
    :width="size"
    :height="size"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : true"
    shape-rendering="crispEdges"
    :class="cn('shrink-0', props.class)"
  >
    <rect v-for="r in geometry.rects" :key="`${r.x},${r.y}`" :x="r.x" :y="r.y" :width="geometry.unit" :height="geometry.unit" :fill="r.accent && showAccent ? spec.accent : body" />
  </svg>
</template>
