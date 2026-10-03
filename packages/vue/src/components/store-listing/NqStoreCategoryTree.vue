<script setup lang="ts">
import { cn } from "../../lib/cn";
import { useFormatNumber } from "../numeric";
import type { CommerceCategoryFacet } from "./commerce";

// The category list of the facet sidebar, recursive. Internal to store-listing.
interface Props {
  nodes: CommerceCategoryFacet[];
  depth?: number;
}
const props = withDefaults(defineProps<Props>(), { depth: 0 });
const emit = defineEmits<{ select: [id: string | null] }>();
const fmt = useFormatNumber();
</script>

<template>
  <ul :class="cn('flex flex-col gap-0.5', props.depth > 0 && 'ms-3 border-s border-border ps-2')">
    <li v-for="n in props.nodes" :key="n.id">
      <button
        type="button"
        :aria-current="n.selected ? 'true' : undefined"
        :class="cn('flex w-full items-center justify-between gap-2 rounded-control px-2 py-1 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus', n.selected ? 'bg-nq-selected font-medium text-foreground' : 'text-muted-foreground')"
        @click="emit('select', n.selected ? null : n.id)"
      >
        <span class="min-w-0 truncate">{{ n.label }}</span>
        <bdi class="tabular-nums text-caption">{{ fmt(n.count) }}</bdi>
      </button>
      <NqStoreCategoryTree v-if="n.children.length && n.open" :nodes="n.children" :depth="props.depth + 1" @select="emit('select', $event)" />
    </li>
  </ul>
</template>
