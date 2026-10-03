<script setup lang="ts">
import { X } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { useFormatNumber } from "../numeric";
import type { CommerceProduct } from "./commerce";
import { fillTemplate, useListingStrings, type ListingLabels } from "./listing-strings";
import NqStoreProductImage from "./NqStoreProductImage.vue";

// A bar pinned to the bottom of the listing while products are picked: thumbnails, remove, clear and Compare.
interface Props {
  /** The products picked for comparison, in pick order. */
  products: readonly CommerceProduct[];
  /** Most products that can be compared. Default 4. */
  max?: number;
  labels?: ListingLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { max: 4, labels: undefined });
const emit = defineEmits<{ remove: [product: CommerceProduct]; clear: []; compare: [] }>();
const { t } = useListingStrings(() => props.labels);
const fmt = useFormatNumber();
const slots = computed(() => Array.from({ length: props.max }, (_, i) => props.products[i]));
</script>

<template>
  <section
    v-if="props.products.length"
    data-slot="store-compare-tray"
    :aria-label="t.compareTray"
    :class="cn('sticky bottom-3 z-30 mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 rounded-floating border border-border bg-popover p-3 shadow-floating', props.class)"
  >
    <ul class="flex min-w-0 basis-full items-center gap-2 sm:flex-1 sm:basis-0">
      <li v-for="(p, i) in slots" :key="p?.id ?? `slot-${i}`" class="relative">
        <template v-if="p">
          <div class="size-12 overflow-hidden rounded-control border border-border bg-secondary sm:size-14">
            <NqStoreProductImage :src="p.images[0]?.src" :alt="p.name" />
          </div>
          <button
            type="button"
            :aria-label="fillTemplate(t.compareRemove, { name: p.name })"
            class="absolute -end-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="emit('remove', p)"
          >
            <X aria-hidden="true" class="size-3" />
          </button>
        </template>
        <div v-else :title="t.compareEmptySlot" class="size-12 rounded-control border border-dashed border-border sm:size-14" />
      </li>
    </ul>
    <div class="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-caption text-muted-foreground sm:flex-none sm:items-end" role="status" aria-live="polite">
      <span>{{ fillTemplate(t.compareCount, { n: fmt(props.products.length), max: fmt(props.max) }) }}</span>
      <span v-if="props.products.length < 2">{{ t.compareNeedTwo }}</span>
    </div>
    <div class="flex items-center gap-2">
      <NqButton variant="ghost" size="sm" @click="emit('clear')">{{ t.clearAll }}</NqButton>
      <NqButton variant="primary" size="sm" :disabled="props.products.length < 2" @click="emit('compare')">{{ fillTemplate(t.compareNow, { n: fmt(props.products.length) }) }}</NqButton>
    </div>
  </section>
</template>
