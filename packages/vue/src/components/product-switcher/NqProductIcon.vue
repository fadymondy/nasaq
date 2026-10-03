<script setup lang="ts">
import { computed } from "vue";
import { NqProductMark } from "../product-mark";
import { resolveBrand } from "../product-mark/brands";
import type { Product } from "./types";

// The official mark at `size`, untouched. Hosts without a Nasaq brand pass `logo`; with neither, the initial.
interface Props {
  product: Product;
  size?: number;
}
const props = withDefaults(defineProps<Props>(), { size: 20 });
const known = computed(() => Boolean(props.product.brand && resolveBrand(props.product.brand)));
</script>

<template>
  <NqProductMark v-if="known" :brand="props.product.brand" :size="props.size" title="" />
  <span
    v-else-if="props.product.logo"
    class="inline-flex shrink-0 items-center justify-center overflow-hidden"
    :style="{ width: `${props.size}px`, height: `${props.size}px` }"
  >
    <component :is="props.product.logo" />
  </span>
  <!-- No official asset supplied: initials, never a stand-in pictogram. -->
  <span
    v-else
    aria-hidden="true"
    class="inline-flex shrink-0 items-center justify-center rounded-[4px] bg-secondary font-medium text-muted-foreground"
    :style="{ width: `${props.size}px`, height: `${props.size}px`, fontSize: `${Math.round(props.size * 0.45)}px` }"
  >
    {{ props.product.name.slice(0, 1) }}
  </span>
</template>
