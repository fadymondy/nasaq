<script setup lang="ts">
import { ref, watch } from "vue";
import { cn } from "../../lib/cn";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { DESKTOP_ICON_CELL, snapTo, type DesktopIconItem, type DesktopIconOpenOn, type DesktopIconPosition } from "./desktop-icons-logic";
import NqDesktopIcon from "./NqDesktopIcon.vue";

// One icon in free-placement mode: a pointer-draggable wrapper around NqDesktopIcon. Internal.
const props = defineProps<{
  item: DesktopIconItem;
  position: DesktopIconPosition;
  bounds: HTMLElement | null;
  rtl: boolean;
  snap: boolean;
  selected: boolean;
  openOn: DesktopIconOpenOn;
  actions: ContextMenuAction[];
}>();
const emit = defineEmits<{ open: [item: DesktopIconItem]; select: []; move: [position: DesktopIconPosition] }>();

const live = ref<DesktopIconPosition>(props.position);
const dragging = ref(false);
let justDropped = false;
let drag: { x: number; y: number; base: DesktopIconPosition; moved: boolean; id: number } | null = null;
watch(
  () => props.position,
  (p) => {
    if (!drag) live.value = p;
  },
);

function clamp(p: DesktopIconPosition): DesktopIconPosition {
  const el = props.bounds;
  const maxX = Math.max(0, (el?.clientWidth ?? 0) - DESKTOP_ICON_CELL.w);
  const maxY = Math.max(0, (el?.clientHeight ?? 0) - DESKTOP_ICON_CELL.h);
  return { x: Math.min(Math.max(0, p.x), maxX), y: Math.min(Math.max(0, p.y), maxY) };
}
function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  drag = { x: event.clientX, y: event.clientY, base: live.value, moved: false, id: event.pointerId };
}
function onPointerMove(event: PointerEvent) {
  const d = drag;
  if (!d) return;
  const dx = (event.clientX - d.x) * (props.rtl ? -1 : 1);
  const dy = event.clientY - d.y;
  if (!d.moved) {
    if (Math.abs(dx) + Math.abs(dy) < 5) return;
    // Capture only once a real drag starts, so a plain click still fires click and dblclick.
    d.moved = true;
    (event.currentTarget as HTMLElement).setPointerCapture?.(d.id);
    dragging.value = true;
    emit("select");
  }
  live.value = clamp({ x: d.base.x + dx, y: d.base.y + dy });
}
function end(event: PointerEvent) {
  const d = drag;
  drag = null;
  if (!d?.moved) return;
  const el = event.currentTarget as HTMLElement;
  if (el.hasPointerCapture?.(d.id)) el.releasePointerCapture(d.id);
  dragging.value = false;
  justDropped = true;
  setTimeout(() => (justDropped = false), 0);
  const dropped = clamp(props.snap ? snapTo(live.value) : live.value);
  live.value = dropped;
  emit("move", dropped);
}
// A drag ends with a click on the same button; swallow it so dropping does not open the app.
function onClickCapture(event: MouseEvent) {
  if (justDropped) event.stopPropagation();
}
</script>

<template>
  <div
    data-slot="desktop-icon-position"
    :data-dragging="dragging ? '' : undefined"
    :class="cn('absolute [touch-action:none]', dragging && 'z-10 opacity-85')"
    :style="{ insetInlineStart: `${live.x}px`, top: `${live.y}px` }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="end"
    @pointercancel="end"
  >
    <NqContextMenuActions :actions="props.actions" class="contents">
      <NqDesktopIcon
        :item="props.item"
        :data-id="props.item.id"
        :selected="props.selected"
        :open-on="props.openOn"
        @open="emit('open', $event)"
        @select="emit('select')"
        @click.capture="onClickCapture"
      />
    </NqContextMenuActions>
  </div>
</template>
