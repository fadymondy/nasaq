<script setup lang="ts">
import { cn } from "../../lib/cn";
import type { DataTableColumn, DataTableInstance } from "./use-data-table";

// The drag edge of a header: a focusable separator. Arrows resize by 16px (Shift: 64), double-click resets.
// Internal to the data table.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const props = defineProps<{ table: DataTableInstance<any>; column: DataTableColumn<any>; label: string }>();
let drag: { x: number; w: number; dir: number } | null = null;
const measure = (el: HTMLElement) => {
  const th = el.closest("th")!;
  return { w: th.getBoundingClientRect().width, dir: getComputedStyle(th).direction === "rtl" ? -1 : 1 };
};
function down(e: PointerEvent) {
  e.preventDefault();
  e.stopPropagation();
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  const { w, dir } = measure(e.currentTarget as HTMLElement);
  drag = { x: e.clientX, w, dir };
}
function move(e: PointerEvent) {
  if (drag) props.table.setColumnSize(props.column.id, drag.w + (e.clientX - drag.x) * drag.dir);
}
function key(e: KeyboardEvent) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  const { w, dir } = measure(e.currentTarget as HTMLElement);
  const grow = (e.key === "ArrowRight" ? 1 : -1) * dir;
  props.table.setColumnSize(props.column.id, (props.table.sizes[props.column.id] ?? w) + grow * (e.shiftKey ? 64 : 16));
}
</script>

<template>
  <div
    role="separator"
    aria-orientation="vertical"
    :aria-label="props.label"
    :aria-valuenow="props.table.sizes[props.column.id] ? Math.round(props.table.sizes[props.column.id]!) : undefined"
    :aria-valuemin="props.column.minSize ?? 48"
    :aria-valuemax="props.column.maxSize ?? 960"
    tabindex="0"
    data-slot="data-table-resize-handle"
    :class="
      cn(
        'absolute inset-y-0 end-0 z-[2] w-2 cursor-col-resize touch-none outline-none',
        'after:absolute after:inset-y-2 after:end-0 after:w-px after:bg-border after:transition-colors after:duration-150',
        'hover:after:bg-primary focus-visible:after:w-0.5 focus-visible:after:bg-nq-focus',
      )
    "
    @pointerdown="down"
    @pointermove="move"
    @pointerup="drag = null"
    @pointercancel="drag = null"
    @click.stop
    @dblclick="props.table.setColumnSize(props.column.id, null)"
    @keydown="key"
  />
</template>
