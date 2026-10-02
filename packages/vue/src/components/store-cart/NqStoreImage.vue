<script setup lang="ts">
import { ImageOff } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A product picture in a rounded, token-coloured frame. It reserves its size, loads lazily and shows a quiet icon when
// there is no `src` or the file fails to load, so a broken image never leaves a hole or a broken-image glyph.
interface Props {
  src?: string;
  /** Describes the product. Pass "" only when the name is written right next to the image. */
  alt: string;
  /** Rendered size in pixels; it also reserves the space so nothing jumps while it loads. Default 80. */
  size?: number;
  /** Lazy by default. Use "eager" for the first image on a page. */
  loading?: "lazy" | "eager";
  /** Fill the parent instead of using a fixed box; `size` still sets the intrinsic width and height of the file. */
  fluid?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { src: undefined, size: 80, loading: "lazy", fluid: false });
const failed = ref(false);
watch(() => props.src, () => (failed.value = false));
const showImage = computed(() => !!props.src && !failed.value);
</script>

<template>
  <span
    data-slot="store-image"
    :data-state="showImage ? 'image' : 'placeholder'"
    :style="props.fluid ? undefined : { width: `${props.size}px`, height: `${props.size}px` }"
    :class="cn(props.fluid && 'size-full', 'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary text-muted-foreground', props.class)"
  >
    <img v-if="showImage" :src="props.src" :alt="props.alt" :width="props.size" :height="props.size" :loading="props.loading" decoding="async" class="size-full object-cover" @error="failed = true" />
    <span v-else :role="props.alt ? 'img' : undefined" :aria-label="props.alt || undefined" class="inline-flex items-center justify-center">
      <ImageOff aria-hidden="true" class="size-1/3 min-h-4 min-w-4" />
    </span>
  </span>
</template>
