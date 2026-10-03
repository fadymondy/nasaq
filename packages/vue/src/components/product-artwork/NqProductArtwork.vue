<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqProductMark } from "../product-mark";

interface Props {
  /** The product whose manifest tints the field. Also sets `data-brand`, so `--nq-brand` inside is that product's colour. */
  brand: string;
  /** Size of the centred mark in px. Ignored when the default slot is given. */
  markSize?: number;
  class?: HTMLAttributes["class"];
}

/**
 * Product artwork: the official mark on a field of the product's own brand colour. The field is a gradient
 * derived from the manifest, never a raster, so it follows light, dark and every brand without assets. The
 * mark is drawn by `NqProductMark` and is never recoloured, cropped or stretched. The default slot replaces
 * the centred mark: a badge plus the mark, a product glimpse, a whole banner layout.
 */
const props = withDefaults(defineProps<Props>(), { markSize: 48 });

// Light falls from the inline-start top corner (`--art-x` flips in RTL), with a softer bounce opposite.
const FIELD = {
  backgroundImage: [
    "radial-gradient(110% 130% at var(--art-x) 0%, color-mix(in oklab, var(--nq-brand) 34%, transparent), transparent 65%)",
    "radial-gradient(90% 110% at calc(100% - var(--art-x)) 100%, color-mix(in oklab, var(--nq-brand) 14%, transparent), transparent 70%)",
  ].join(","),
};
</script>

<template>
  <div
    data-slot="product-artwork"
    :data-brand="brand"
    :class="cn('relative isolate flex items-center justify-center overflow-hidden rounded-card bg-nq-surface-raised [--art-x:100%] rtl:[--art-x:0%]', props.class)"
    :style="FIELD"
  >
    <span aria-hidden="true" class="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-[color-mix(in_oklab,var(--nq-brand)_16%,transparent)]" />
    <slot><NqProductMark :brand="brand" :size="markSize" title="" /></slot>
  </div>
</template>
