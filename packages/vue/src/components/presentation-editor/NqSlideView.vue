<script setup lang="ts">
import { ImageOff } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqIcon } from "../icon";
import NqSlideText from "./NqSlideText.vue";
import { safeImageSrc, type Slide, type SlideTheme } from "./presentation-math";
import type { PresentationText } from "./presentation-strings";

/**
 * One 16:9 slide, drawn with container-relative units so it looks the same at any size: a thumbnail, the editing
 * canvas or the full-screen player. Set `editable` to edit the text in place; `change` carries the changed fields.
 */
interface Props {
  slide: Slide;
  editable?: boolean;
  /** Strings for placeholders and the empty image. Only needed when editable. */
  t?: PresentationText;
  /** Marks the frame as decorative (thumbnails). */
  decorative?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { editable: false, t: undefined, decorative: false });
const emit = defineEmits<{ change: [patch: Partial<Slide>] }>();

const THEME: Record<SlideTheme, string> = {
  light: "bg-card text-foreground",
  dark: "bg-nq-fg text-nq-bg",
  brand: "bg-primary text-primary-foreground",
};
const theme = computed(() => THEME[props.slide.theme ?? "light"]);
const image = computed(() => safeImageSrc(props.slide.image));
const ph = computed(() => props.t ?? ({} as Partial<PresentationText>));
const set = (key: keyof Slide, next: string) => emit("change", { [key]: next } as Partial<Slide>);
</script>

<template>
  <div
    data-slot="slide"
    :data-layout="props.slide.layout"
    :aria-hidden="props.decorative || undefined"
    :class="cn('@container relative aspect-video w-full overflow-hidden', theme, props.class)"
  >
    <div class="absolute inset-0 p-[6cqw]">
      <div v-if="props.slide.layout === 'title'" class="flex h-full flex-col justify-center gap-[2cqw]">
        <NqSlideText :value="props.slide.title" :editable="props.editable" :placeholder="ph.titlePlaceholder" class="text-[6.4cqw] leading-[1.1] font-semibold" @change="(v: string) => set('title', v)" />
        <NqSlideText :value="props.slide.subtitle" :editable="props.editable" :placeholder="ph.subtitlePlaceholder" class="text-[2.8cqw] leading-snug opacity-75" @change="(v: string) => set('subtitle', v)" />
      </div>
      <div v-else-if="props.slide.layout === 'section'" class="flex h-full flex-col justify-end gap-[1.5cqw]">
        <NqSlideText :value="props.slide.title" :editable="props.editable" :placeholder="ph.titlePlaceholder" class="text-[5.6cqw] leading-[1.1] font-semibold" @change="(v: string) => set('title', v)" />
        <NqSlideText :value="props.slide.subtitle" :editable="props.editable" :placeholder="ph.subtitlePlaceholder" class="text-[2.4cqw] leading-snug opacity-75" @change="(v: string) => set('subtitle', v)" />
      </div>
      <div v-else-if="props.slide.layout === 'content'" class="flex h-full flex-col gap-[3cqw]">
        <NqSlideText :value="props.slide.title" :editable="props.editable" :placeholder="ph.titlePlaceholder" class="text-[4.2cqw] leading-[1.15] font-semibold" @change="(v: string) => set('title', v)" />
        <NqSlideText :value="props.slide.body" :editable="props.editable" :placeholder="ph.bodyPlaceholder" bullets class="text-[2.6cqw] leading-snug" @change="(v: string) => set('body', v)" />
      </div>
      <div v-else-if="props.slide.layout === 'two-column'" class="flex h-full flex-col gap-[3cqw]">
        <NqSlideText :value="props.slide.title" :editable="props.editable" :placeholder="ph.titlePlaceholder" class="text-[4.2cqw] leading-[1.15] font-semibold" @change="(v: string) => set('title', v)" />
        <div class="grid min-h-0 flex-1 grid-cols-2 gap-[4cqw]">
          <NqSlideText :value="props.slide.body" :editable="props.editable" :placeholder="ph.leftPlaceholder" bullets class="text-[2.3cqw] leading-snug" @change="(v: string) => set('body', v)" />
          <NqSlideText :value="props.slide.body2" :editable="props.editable" :placeholder="ph.rightPlaceholder" bullets class="text-[2.3cqw] leading-snug" @change="(v: string) => set('body2', v)" />
        </div>
      </div>
      <div v-else-if="props.slide.layout === 'quote'" class="flex h-full flex-col justify-center gap-[3cqw] ps-[3cqw]">
        <NqSlideText :value="props.slide.body" :editable="props.editable" :placeholder="ph.quotePlaceholder" class="text-[3.8cqw] leading-[1.25] font-medium" @change="(v: string) => set('body', v)" />
        <NqSlideText :value="props.slide.subtitle" :editable="props.editable" :placeholder="ph.authorPlaceholder" class="text-[2.2cqw] opacity-70" @change="(v: string) => set('subtitle', v)" />
      </div>
      <div v-else-if="props.slide.layout === 'image'" class="flex h-full flex-col gap-[2.5cqw]">
        <NqSlideText :value="props.slide.title" :editable="props.editable" :placeholder="ph.titlePlaceholder" class="text-[4.2cqw] leading-[1.15] font-semibold" @change="(v: string) => set('title', v)" />
        <div class="relative min-h-0 flex-1 overflow-hidden rounded-[1cqw] border border-current/15 bg-current/5">
          <img v-if="image" :src="image" :alt="props.slide.imageAlt ?? ''" class="size-full object-cover" draggable="false" />
          <div v-else class="flex size-full flex-col items-center justify-center gap-[1cqw] text-[2cqw] opacity-50">
            <NqIcon :icon="ImageOff" class="size-[4cqw]" />
            {{ ph.noImage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
