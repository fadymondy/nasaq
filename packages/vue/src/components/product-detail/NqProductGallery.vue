<script setup lang="ts">
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogTitle } from "../dialog";
import { NqIcon } from "../icon";
import { useFormatNumber } from "../numeric";
import type { CommerceImage } from "./commerce";
import NqProductGalleryThumbs from "./NqProductGalleryThumbs.vue";
import NqProductGalleryViewport from "./NqProductGalleryViewport.vue";
import { stepIndex } from "./pdp-logic";
import { usePdpStrings, type ProductDetailLabels } from "./pdp-strings";

// The product media block: a large image with hover zoom on a mouse, swipe on touch and arrow keys, a thumbnail
// strip, a video badge and a full-screen viewer with click zoom. It does not know about variants: drive
// `v-model:index` from `imageForSelection` to make the picture follow the colour.
interface Props {
  images: readonly CommerceImage[];
  /** Current slide (v-model:index). Uncontrolled when omitted. */
  index?: number;
  defaultIndex?: number;
  /** Hover-zoom on mouse pointers and the full-screen viewer. Default true. */
  zoom?: boolean;
  /** Fallback alt text when an image has none. */
  name?: string;
  labels?: ProductDetailLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { index: undefined, defaultIndex: 0, zoom: true, name: undefined, labels: undefined });
const emit = defineEmits<{ "update:index": [index: number] }>();

const s = usePdpStrings(() => props.labels);
const fmtNumber = useFormatNumber();
const fmt = (n: number) => fmtNumber(n);
const inner = ref(props.defaultIndex);
const open = ref(false);
const raw = computed(() => (props.index !== undefined ? props.index : inner.value));
const current = computed(() => (props.images.length ? Math.min(Math.max(raw.value, 0), props.images.length - 1) : 0));
const go = (next: number) => {
  if (props.index === undefined) inner.value = next;
  emit("update:index", next);
};
const step = (delta: number) => go(stepIndex(current.value, delta, props.images.length));
const image = computed(() => props.images[current.value]);
const many = computed(() => props.images.length > 1);
const position = computed(() => s.value.t.imageOf(fmt(current.value + 1), fmt(props.images.length)));
</script>

<template>
  <div data-slot="product-gallery" role="group" aria-roledescription="carousel" :aria-label="s.t.gallery" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <div class="relative">
      <NqProductGalleryViewport
        :image="image"
        :name="props.name"
        :rtl="s.rtl"
        :zoom="props.zoom"
        zoom-mode="hover"
        fit="contain"
        :activatable="props.zoom"
        :activate-label="props.zoom ? s.t.fullScreen : position"
        :no-image-label="s.t.noImage"
        :video-label="s.t.video"
        eager
        class="aspect-square rounded-card border border-border"
        @step="step"
        @activate="open = true"
      />
      <template v-if="many">
        <NqButton type="button" variant="secondary" size="icon-sm" :aria-label="s.t.prevImage" class="absolute start-2 top-1/2 -translate-y-1/2 rounded-full opacity-90 shadow-sm" @click="step(-1)">
          <NqIcon :icon="ChevronLeft" directional />
        </NqButton>
        <NqButton type="button" variant="secondary" size="icon-sm" :aria-label="s.t.nextImage" class="absolute end-2 top-1/2 -translate-y-1/2 rounded-full opacity-90 shadow-sm" @click="step(1)">
          <NqIcon :icon="ChevronRight" directional />
        </NqButton>
      </template>
      <NqButton v-if="props.zoom" type="button" variant="secondary" size="icon-sm" :aria-label="s.t.fullScreen" class="absolute end-2 top-2 rounded-full opacity-90 shadow-sm" @click="open = true">
        <Maximize2 aria-hidden="true" />
      </NqButton>
      <span class="pointer-events-none absolute bottom-2 end-2 rounded-full bg-background/90 px-2 py-0.5 text-caption tabular-nums text-muted-foreground" aria-hidden="true">
        <bdi>{{ fmt(current + 1) }}</bdi> / <bdi>{{ fmt(props.images.length) }}</bdi>
      </span>
    </div>
    <p class="sr-only" aria-live="polite">{{ position }}</p>
    <NqProductGalleryThumbs v-if="many" :images="props.images" :index="current" :name="props.name" :labels="s.t" @select="go" />

    <NqDialog v-if="props.zoom" v-model:open="open">
      <NqDialogContent class="h-[calc(100dvh-1rem)] max-h-none w-[calc(100%-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-3">
        <div class="flex items-center justify-between gap-3 pe-10">
          <NqDialogTitle class="text-body font-medium">{{ props.name ?? s.t.lightbox }}</NqDialogTitle>
          <NqDialogDescription class="text-caption tabular-nums">{{ position }}</NqDialogDescription>
        </div>
        <div class="relative min-h-0">
          <NqProductGalleryViewport
            :image="image"
            :name="props.name"
            :rtl="s.rtl"
            zoom
            zoom-mode="click"
            fit="contain"
            :activate-label="s.t.zoomIn"
            :no-image-label="s.t.noImage"
            :video-label="s.t.video"
            class="size-full rounded-card"
            @step="step"
          />
          <template v-if="many">
            <NqButton type="button" variant="secondary" size="icon" :aria-label="s.t.prevImage" class="absolute start-2 top-1/2 -translate-y-1/2 rounded-full" @click="step(-1)">
              <NqIcon :icon="ChevronLeft" directional />
            </NqButton>
            <NqButton type="button" variant="secondary" size="icon" :aria-label="s.t.nextImage" class="absolute end-2 top-1/2 -translate-y-1/2 rounded-full" @click="step(1)">
              <NqIcon :icon="ChevronRight" directional />
            </NqButton>
          </template>
          <span class="pointer-events-none absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-caption text-muted-foreground" aria-hidden="true">
            <ZoomIn class="size-3" />
          </span>
        </div>
        <NqProductGalleryThumbs v-if="many" :images="props.images" :index="current" :name="props.name" :labels="s.t" class="justify-center" @select="go" />
      </NqDialogContent>
    </NqDialog>
  </div>
</template>
