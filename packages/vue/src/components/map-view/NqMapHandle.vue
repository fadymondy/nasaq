<script setup lang="ts">
import { cn } from "../../lib/cn";

// A focusable handle that drags with the pointer or nudges with the arrow keys. Coordinates are canvas px.
defineOptions({ inheritAttrs: false });
interface Props {
  x: number;
  y: number;
  label: string;
  hint: string;
  canvas: HTMLElement | null;
  /** Delete and Backspace emit `remove`. */
  removable?: boolean;
  class?: string;
}
const props = withDefaults(defineProps<Props>(), { removable: false });
const emit = defineEmits<{ move: [screen: { x: number; y: number }]; remove: [] }>();

let grab: { dx: number; dy: number } | null = null;
const rel = (event: PointerEvent) => {
  const rect = props.canvas?.getBoundingClientRect();
  return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
};
function down(event: PointerEvent) {
  if (event.button !== 0) return;
  const at = rel(event);
  grab = { dx: props.x - at.x, dy: props.y - at.y };
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}
function move(event: PointerEvent) {
  if (!grab) return;
  const at = rel(event);
  emit("move", { x: at.x + grab.dx, y: at.y + grab.dy });
}
function up(event: PointerEvent) {
  grab = null;
  const el = event.currentTarget as HTMLElement;
  if (el.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId);
}
function key(event: KeyboardEvent) {
  const step = event.shiftKey ? 32 : 8;
  const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  const d = delta[event.key];
  if (d) emit("move", { x: props.x + d[0], y: props.y + d[1] });
  else if (props.removable && (event.key === "Delete" || event.key === "Backspace")) emit("remove");
  else return;
  event.preventDefault();
  event.stopPropagation();
}
</script>

<template>
  <button
    v-bind="$attrs"
    type="button"
    data-map-control=""
    :aria-label="props.label"
    :title="props.hint"
    :class="cn('absolute z-20 flex cursor-move touch-none items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus', props.class)"
    :style="{ left: `${props.x}px`, top: `${props.y}px` }"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="grab = null"
    @keydown="key"
  >
    <slot />
  </button>
</template>
