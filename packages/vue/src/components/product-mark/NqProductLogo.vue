<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { BRANDS, resolveBrand } from "./brands";
import NqProductMark from "./NqProductMark.vue";

interface Props {
  brand?: string;
  size?: number;
  /** Show the Arabic name where the brand has one. Defaults to the provider locale. */
  arabic?: boolean;
  class?: HTMLAttributes["class"];
}

/**
 * Mark + typeset name as a UI label (B10). This is never exported as a lockup image.
 * Latin: JetBrains Mono 500, +0.14em, uppercase, LTR. Arabic: the Arabic face, no tracking.
 * The name scales with `size` (0.6x Latin, 0.7x Arabic).
 */
const props = withDefaults(defineProps<Props>(), { size: 20, arabic: undefined });
const nasaq = useNasaq();
const manifest = computed(() => (props.brand ? resolveBrand(props.brand) : resolveBrand(nasaq.brand.value)) ?? BRANDS.nasaq);
const useArabic = computed(() => (props.arabic ?? nasaq.locale.value.startsWith("ar")) && Boolean(manifest.value.wordmark.arabic));
</script>

<template>
  <span data-slot="product-logo" :class="cn('inline-flex items-center gap-2', props.class)">
    <NqProductMark :brand="manifest.key" :size="size" title="" />
    <span v-if="useArabic" lang="ar" class="font-arabic font-medium tracking-normal text-foreground" :style="{ fontSize: `${size * 0.7}px` }">{{ manifest.wordmark.arabic }}</span>
    <span v-else dir="ltr" class="font-mono font-medium tracking-[0.14em] uppercase text-foreground" :style="{ fontSize: `${size * 0.6}px` }">{{ manifest.wordmark.latin }}</span>
  </span>
</template>
