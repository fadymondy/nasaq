<script setup lang="ts">
import { ImageOff, Play } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { CommerceImage } from "./commerce";
import NqProductPicture from "./NqProductPicture.vue";
import { resolveSwipe, zoomOrigin } from "./pdp-logic";

// One image with swipe, hover or click zoom and arrow-key stepping. Purely visual: the caller owns the index. Internal.
const props = defineProps<{
  image: CommerceImage | undefined;
  name?: string;
  rtl: boolean;
  zoom: boolean;
  /** "hover": follow a mouse pointer. "click": toggle at the click point (the full-screen viewer). */
  zoomMode: "hover" | "click";
  fit: "contain" | "cover";
  activateLabel: string;
  noImageLabel: string;
  videoLabel: string;
  /** Whether a click on the stage means something (opens the viewer). */
  activatable?: boolean;
  eager?: boolean;
  class?: HTMLAttributes["class"];
}>();
const emit = defineEmits<{ step: [delta: number]; activate: [] }>();

const origin = ref<{ x: number; y: number } | null>(null);
const start = ref<{ x: number; y: number } | null>(null);
let swiped = false;
const root = ref<HTMLElement | null>(null);
const zoomed = computed(() => origin.value !== null);

const track = (event: PointerEvent) => {
  const rect = root.value?.getBoundingClientRect();
  if (rect) origin.value = zoomOrigin(event.clientX, event.clientY, rect);
};
const onKey = (event: KeyboardEvent) => {
  const forward = props.rtl ? "ArrowLeft" : "ArrowRight";
  const back = props.rtl ? "ArrowRight" : "ArrowLeft";
  if (event.key === forward) emit("step", 1);
  else if (event.key === back) emit("step", -1);
  else if (event.key === "Escape" && zoomed.value) origin.value = null;
  else return;
  if (event.key !== "Escape") origin.value = null;
};
const onDown = (event: PointerEvent) => {
  swiped = false;
  start.value = { x: event.clientX, y: event.clientY };
};
const onUp = (event: PointerEvent) => {
  const from = start.value;
  start.value = null;
  if (!from || zoomed.value) return;
  const result = resolveSwipe(event.clientX - from.x, event.clientY - from.y, { rtl: props.rtl });
  if (result) {
    swiped = true;
    emit("step", result === "next" ? 1 : -1);
  }
};
const onMove = (event: PointerEvent) => {
  if (props.zoom && props.zoomMode === "hover" && event.pointerType === "mouse" && zoomed.value) track(event);
};
const onEnter = (event: PointerEvent) => {
  if (props.zoom && props.zoomMode === "hover" && event.pointerType === "mouse") track(event);
};
const onLeave = () => {
  if (props.zoomMode === "hover") origin.value = null;
};
const onClick = (event: MouseEvent) => {
  if (swiped) {
    swiped = false;
    return;
  }
  if (props.zoomMode === "click") {
    if (zoomed.value) origin.value = null;
    else {
      const rect = root.value?.getBoundingClientRect();
      if (rect) origin.value = zoomOrigin(event.clientX, event.clientY, rect);
    }
  } else if (props.activatable) emit("activate");
};
</script>

<template>
  <div
    ref="root"
    data-slot="product-gallery-viewport"
    :data-zoomed="zoomed ? '' : undefined"
    :class="cn('relative overflow-hidden bg-secondary [touch-action:pan-y]', props.class)"
    @pointerdown="onDown"
    @pointerup="onUp"
    @pointercancel="start = null"
    @pointermove="onMove"
    @pointerenter="onEnter"
    @pointerleave="onLeave"
  >
    <button
      type="button"
      data-slot="product-gallery-stage"
      :aria-label="props.activateLabel"
      :class="
        cn(
          'block size-full outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
          props.zoomMode === 'click' ? (zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in') : props.zoom ? 'cursor-zoom-in' : 'cursor-pointer',
        )
      "
      @keydown="onKey"
      @click="onClick"
    >
      <NqProductPicture
        v-if="props.image"
        :image="props.image"
        :name="props.name"
        :label="props.noImageLabel"
        :eager="props.eager"
        :class="cn('size-full select-none transition-transform duration-200 ease-nq motion-reduce:transition-none', props.fit === 'contain' ? 'object-contain' : 'object-cover')"
        :style="{ transform: zoomed ? 'scale(2)' : undefined, transformOrigin: origin ? `${origin.x}% ${origin.y}%` : undefined }"
      />
      <div v-else role="img" :aria-label="props.noImageLabel" class="flex size-full items-center justify-center bg-secondary text-muted-foreground">
        <ImageOff aria-hidden="true" class="size-8" />
      </div>
    </button>
    <span v-if="props.image?.kind === 'video'" class="pointer-events-none absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-caption font-medium text-foreground">
      <Play aria-hidden="true" class="size-3 fill-current" />
      {{ props.videoLabel }}
    </span>
  </div>
</template>
