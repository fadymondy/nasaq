<script setup lang="ts">
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Trash2, TriangleAlert } from "lucide-vue-next";
import { onBeforeUnmount, ref, type CSSProperties, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { NqEmptyState } from "../states";
import ProductAdminThumb from "./ProductAdminThumb.vue";
import { moveItem, nearestCentre } from "./product-admin-logic";
import type { CommerceImage } from "./product-types";
import { useProductAdminStrings, type StoreProductsAdminLabels } from "./strings";

// The picture manager of a product: add by URL, reorder by pointer drag (native pointer events), the move buttons or
// the keyboard, write alt text for each picture, and see which pictures still lack it. The first picture is the main
// image. A URL that fails to load shows a placeholder, never a broken icon. It stores no files: `images` are URLs.
const props = withDefaults(
  defineProps<{
    images: readonly CommerceImage[];
    /** Called with the whole new list after an add, reorder, alt-text edit or removal. */
    onImagesChange: (images: CommerceImage[]) => void;
    /** Most images. Default 12. */
    maxImages?: number;
    disabled?: boolean;
    labels?: StoreProductsAdminLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { maxImages: 12, disabled: false, labels: undefined },
);

const { t, n } = useProductAdminStrings(() => props.labels);
const url = ref("");
const announce = ref("");
const root = ref<HTMLElement | null>(null);
const keys = () => props.images.map((i) => i.src);
const missing = () => props.images.filter((i) => !i.alt.trim()).length;

function move(from: number, to: number) {
  if (to < 0 || to >= props.images.length || from === to) return;
  props.onImagesChange(moveItem(props.images, from, to));
  announce.value = t.value.movedTo(n(to + 1), n(props.images.length));
}
function add() {
  const src = url.value.trim();
  if (!src || keys().includes(src) || props.images.length >= props.maxImages) return;
  props.onImagesChange([...props.images, { src, alt: "" }]);
  url.value = "";
}

/* ----------------------------------------------------------- pointer drag */
const DRAG_DISTANCE = 4;
const drag = ref<{ from: number; over: number; dx: number; dy: number } | null>(null);
let session: { from: number; startX: number; startY: number; centres: { x: number; y: number }[]; id: number; active: boolean } | null = null;

function onDragStart(index: number, event: PointerEvent) {
  if (props.disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
  const tiles = [...(root.value?.querySelectorAll<HTMLElement>('[data-slot="media-tile"]') ?? [])];
  if (tiles.length < 2) return;
  session = {
    from: index,
    startX: event.clientX,
    startY: event.clientY,
    centres: tiles.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }),
    id: event.pointerId,
    active: false,
  };
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragEnd);
  window.addEventListener("pointercancel", stopDrag);
}
function onDragMove(event: PointerEvent) {
  if (!session || event.pointerId !== session.id) return;
  const dx = event.clientX - session.startX;
  const dy = event.clientY - session.startY;
  if (!session.active) {
    if (Math.hypot(dx, dy) < DRAG_DISTANCE) return;
    session.active = true;
  }
  event.preventDefault();
  const from = session.centres[session.from];
  drag.value = { from: session.from, over: from ? nearestCentre(session.centres, from.x + dx, from.y + dy) : session.from, dx, dy };
}
function stopDrag() {
  window.removeEventListener("pointermove", onDragMove);
  window.removeEventListener("pointerup", onDragEnd);
  window.removeEventListener("pointercancel", stopDrag);
  session = null;
  drag.value = null;
}
function onDragEnd(event: PointerEvent) {
  if (!session || event.pointerId !== session.id) return;
  const result = drag.value;
  stopDrag();
  if (result && result.over !== result.from) move(result.from, result.over);
}
onBeforeUnmount(stopDrag);

function tileStyle(index: number): CSSProperties | undefined {
  const d = drag.value;
  if (!d || index !== d.from) return undefined;
  return { transform: `translate(${d.dx}px, ${d.dy}px)`, transition: "none" };
}

function onHandleKey(index: number, e: KeyboardEvent) {
  const rtl = getComputedStyle(root.value ?? document.body).direction === "rtl";
  const back = rtl ? "ArrowRight" : "ArrowLeft";
  const forward = rtl ? "ArrowLeft" : "ArrowRight";
  if (e.key === back || e.key === "ArrowUp") move(index, index - 1);
  else if (e.key === forward || e.key === "ArrowDown") move(index, index + 1);
  else return;
  e.preventDefault();
}
</script>

<template>
  <section ref="root" data-slot="media-manager" :aria-label="t.mediaLabel" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <p v-if="missing() > 0" class="flex items-center gap-2 text-caption text-nq-warning-text">
      <TriangleAlert aria-hidden="true" class="size-4 shrink-0" />
      {{ t.missingAlt }}: <bdi class="tabular-nums">{{ n(missing()) }}</bdi>
    </p>

    <NqEmptyState v-if="props.images.length === 0" :icon="ImagePlus" :title="t.noImages" :description="t.noImagesHint" class="border-dashed" />
    <ul v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <li
        v-for="(img, i) in props.images"
        :key="img.src"
        data-slot="media-tile"
        :data-dragging="drag?.from === i ? '' : undefined"
        :style="tileStyle(i)"
        :class="cn('flex min-w-0 flex-col gap-2 rounded-card border border-border bg-card p-2', drag?.from === i && 'relative z-10 shadow-lg', drag && drag.over === i && drag.from !== i && 'border-primary')"
      >
        <div class="relative">
          <ProductAdminThumb :src="img.src" :alt="img.alt || t.mediaLabel" :size="160" :label="t.imageFailed" class="aspect-square !h-auto w-full" />
          <NqBadge v-if="i === 0" variant="brand" class="absolute start-1.5 top-1.5">{{ t.primary }}</NqBadge>
          <NqButton
            type="button"
            size="icon-sm"
            variant="secondary"
            data-slot="media-drag-handle"
            :disabled="props.disabled"
            :aria-label="t.dragHandle(n(i + 1))"
            class="absolute end-1.5 top-1.5 cursor-grab touch-none"
            @pointerdown="onDragStart(i, $event)"
            @keydown="onHandleKey(i, $event)"
          >
            <GripVertical aria-hidden="true" />
          </NqButton>
        </div>
        <NqField :invalid="!img.alt.trim()">
          <NqFieldLabel class="text-caption">{{ t.altText }}</NqFieldLabel>
          <NqInput :model-value="img.alt" :disabled="props.disabled" :placeholder="t.altHint" @update:model-value="(v) => props.onImagesChange(props.images.map((x, k) => (k === i ? { ...x, alt: String(v ?? '') } : x)))" />
        </NqField>
        <div class="flex items-center justify-between gap-1">
          <div class="flex gap-1">
            <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="t.moveEarlier" :disabled="props.disabled || i === 0" @click="move(i, i - 1)">
              <ChevronLeft aria-hidden="true" class="rtl:rotate-180" />
            </NqButton>
            <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="t.moveLater" :disabled="props.disabled || i === props.images.length - 1" @click="move(i, i + 1)">
              <ChevronRight aria-hidden="true" class="rtl:rotate-180" />
            </NqButton>
          </div>
          <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="t.removeImage" :disabled="props.disabled" @click="props.onImagesChange(props.images.filter((_, k) => k !== i))">
            <Trash2 aria-hidden="true" />
          </NqButton>
        </div>
      </li>
    </ul>

    <form class="flex flex-wrap items-end gap-2" @submit.prevent="add">
      <NqField class="min-w-0 flex-1 basis-56">
        <NqFieldLabel>{{ t.imageUrl }}</NqFieldLabel>
        <NqInput v-model="url" ltr type="url" inputmode="url" :placeholder="t.imageUrlPlaceholder" :disabled="props.disabled || props.images.length >= props.maxImages" />
      </NqField>
      <NqButton type="submit" variant="secondary" :disabled="props.disabled || !url.trim() || props.images.length >= props.maxImages">
        <ImagePlus aria-hidden="true" />
        {{ t.addImage }}
      </NqButton>
    </form>
    <p class="sr-only" role="status" aria-live="polite">{{ announce }}</p>
  </section>
</template>
