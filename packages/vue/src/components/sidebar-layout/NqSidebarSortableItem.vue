<script setup lang="ts">
import { inject, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { SORTABLE_KEY } from "./context";
import { beginPress } from "./drag";

interface Props {
  /** Must match an entry in `NqSidebarSortable`'s `ids`. */
  id: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const ctx = inject(SORTABLE_KEY, null);

function onPointerDown(event: PointerEvent) {
  if (!ctx || event.defaultPrevented) return;
  beginPress(event, event.currentTarget as HTMLElement, props.id, {
    distance: 4,
    delay: 250,
    tolerance: 6,
    onMove: ctx.onMove,
    // The mouseup that ends a drag would otherwise click the link under it.
    onEnd: () => (ctx.suppressClickUntil.value = performance.now() + 100),
  });
}

function onClickCapture(event: MouseEvent) {
  if (ctx && performance.now() < ctx.suppressClickUntil.value) {
    event.preventDefault();
    event.stopPropagation();
  }
}
</script>

<template>
  <div
    data-slot="sidebar-sortable-item"
    :data-sortable-id="props.id"
    :class="
      cn(
        'relative [&_a]:[-webkit-user-drag:none]',
        'data-dragging:z-10 data-dragging:cursor-grabbing data-dragging:*:bg-nq-surface-overlay data-dragging:*:shadow-floating',
        props.class,
      )
    "
    @click.capture="onClickCapture"
    @dragstart.prevent
    @pointerdown="onPointerDown"
  >
    <slot />
  </div>
</template>
