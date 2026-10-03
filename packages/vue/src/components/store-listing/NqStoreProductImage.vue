<script setup lang="ts">
import { ImageOff } from "lucide-vue-next";
import { ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Fills its parent. Shows a neutral token-coloured placeholder when the image is missing or fails to load.
interface Props {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  /** Load eagerly (above the fold). Default lazy. */
  eager?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { src: undefined, width: undefined, height: undefined, eager: false });
const failed = ref(false);
watch(() => props.src, () => (failed.value = false));
</script>

<template>
  <div v-if="!props.src || failed" role="img" :aria-label="props.alt" data-slot="store-image-placeholder" :class="cn('flex size-full items-center justify-center bg-secondary text-muted-foreground', props.class)">
    <ImageOff aria-hidden="true" class="size-6 opacity-60" />
  </div>
  <img
    v-else
    :src="props.src"
    :alt="props.alt"
    :width="props.width"
    :height="props.height"
    :loading="props.eager ? 'eager' : 'lazy'"
    decoding="async"
    data-slot="store-image"
    :class="cn('size-full object-cover', props.class)"
    @error="failed = true"
  />
</template>
