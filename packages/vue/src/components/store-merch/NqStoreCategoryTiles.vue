<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFormatNumber } from "../numeric";
import { NqStoreProductImage } from "../store-listing";
import NqMerchHeading from "./NqMerchHeading.vue";
import { merchFill, useMerchStrings, type MerchLabels } from "./strings";
import type { StoreCategoryTile } from "./types";

// A responsive grid of image tiles that lead into categories.
interface Props {
  items: readonly StoreCategoryTile[];
  /** Section heading. Pass `null` to hide. Default "Shop by category". */
  title?: string | null;
  /** Tile shape. Default "square". */
  ratio?: "square" | "landscape";
  labels?: MerchLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { title: undefined, ratio: "square", labels: undefined });
/** Called on activation, before the link navigates. */
const emit = defineEmits<{ select: [item: StoreCategoryTile] }>();
const { t } = useMerchStrings(() => props.labels);
const fmt = useFormatNumber();
const heading = computed(() => (props.title === undefined ? t.value.categories : props.title));
</script>

<template>
  <section data-slot="store-category-tiles" :aria-labelledby="heading ? 'store-cats-h' : undefined" :aria-label="heading ? undefined : t.categories" :class="props.class">
    <NqMerchHeading v-if="heading" id="store-cats-h">
      <slot name="title">{{ heading }}</slot>
    </NqMerchHeading>
    <ul class="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-6">
      <li v-for="item in props.items" :key="item.id">
        <a
          :href="item.href ?? `#${item.id}`"
          class="group flex flex-col gap-2 rounded-card no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
          @click="emit('select', item)"
        >
          <span :class="cn('relative overflow-hidden rounded-card bg-secondary', props.ratio === 'square' ? 'aspect-square' : 'aspect-[4/3]')">
            <NqStoreProductImage :src="item.image" alt="" class="transition-transform duration-300 ease-nq group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
          </span>
          <span class="flex flex-col">
            <span class="text-label text-foreground group-hover:underline">{{ item.label }}</span>
            <span v-if="item.count !== undefined" class="text-caption text-muted-foreground">{{ merchFill(t.itemsCount, { n: fmt(item.count) }) }}</span>
          </span>
        </a>
      </li>
    </ul>
  </section>
</template>
