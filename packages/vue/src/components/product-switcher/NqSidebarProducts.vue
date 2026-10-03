<script setup lang="ts">
import { computed } from "vue";
import { useNasaq } from "../../provider";
import { NqSidebarGroup, NqSidebarItem, useSidebarCollapsed } from "../app-shell";
import { NqSidebarSortable, NqSidebarSortableItem } from "../sidebar-layout";
import NqProductIcon from "./NqProductIcon.vue";
import type { Product } from "./types";

// The sidebar's products group: official marks, the current product selected, badges at the end.
// The `action` slot is a header action, e.g. an NqProductSwitcher opening the full grid. Pass `onMove` to let the items be dragged.
interface Props {
  products: Product[];
  current?: string;
  label?: string;
  /** Shows only pinned products (default true); falls back to all when none are pinned. */
  pinnedOnly?: boolean;
  /**
   * The user's order and choice of products, by id (e.g. `useSidebarLayout(...).visible`). Overrides
   * `pinned`. With `onMove`, the items can be dragged like the rest of the sidebar.
   */
  order?: string[];
  onMove?: (activeId: string, overId: string) => void;
}
const props = withDefaults(defineProps<Props>(), { current: undefined, label: undefined, pinnedOnly: true, order: undefined, onMove: undefined });
const emit = defineEmits<{ select: [product: Product] }>();

const nq = useNasaq();
const collapsedState = useSidebarCollapsed();
const collapsed = computed(() => Boolean(collapsedState.value));
const shown = computed(() => {
  const byId = new Map(props.products.map((p) => [p.id, p]));
  const pinned = props.products.filter((p) => p.pinned);
  if (props.order) return props.order.flatMap((id) => byId.get(id) ?? []);
  return props.pinnedOnly && pinned.length ? pinned : props.products;
});

function press(p: Product, event: MouseEvent) {
  if (!p.href) event.preventDefault();
  emit("select", p);
}
</script>

<template>
  <NqSidebarGroup v-if="shown.length" :label="props.label ?? (nq.locale.value.startsWith('ar') ? 'التطبيقات' : 'Apps')" collapsible>
    <template v-if="$slots.action" #action><slot name="action" /></template>
    <component :is="props.onMove ? NqSidebarSortable : 'div'" v-bind="props.onMove ? { ids: shown.map((p) => p.id), onMove: props.onMove } : { class: 'contents' }">
      <component :is="props.onMove ? NqSidebarSortableItem : 'div'" v-for="p in shown" :key="p.id" v-bind="props.onMove ? { id: p.id } : { class: 'contents' }">
        <NqSidebarItem :href="p.href ?? '#'" :active="p.id === props.current" :tooltip="collapsed ? p.name : undefined" @click="press(p, $event)">
          <template #icon><NqProductIcon :product="p" :size="16" /></template>
          {{ p.name }}
          <template v-if="p.badge" #trailing>{{ p.badge }}</template>
        </NqSidebarItem>
      </component>
    </component>
  </NqSidebarGroup>
</template>
