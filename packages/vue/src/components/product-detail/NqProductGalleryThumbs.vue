<script setup lang="ts">
import { Play } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFormatNumber } from "../numeric";
import type { CommerceImage } from "./commerce";
import NqProductPicture from "./NqProductPicture.vue";
import type { PdpStrings } from "./pdp-strings";

// The thumbnail strip of the gallery. Internal.
const props = defineProps<{ images: readonly CommerceImage[]; index: number; name?: string; labels: PdpStrings; class?: HTMLAttributes["class"] }>();
const emit = defineEmits<{ select: [index: number] }>();
const fmt = useFormatNumber();
</script>

<template>
  <ul data-slot="product-gallery-thumbs" :class="cn('flex gap-2 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', props.class)">
    <li v-for="(image, i) in props.images" :key="`${image.src}-${i}`" class="shrink-0">
      <button
        type="button"
        :aria-label="props.labels.showImage(fmt(i + 1))"
        :aria-current="i === props.index ? 'true' : undefined"
        :class="
          cn(
            'relative block size-16 overflow-hidden rounded-control border bg-secondary outline-none transition-colors duration-150 ease-nq',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
            i === props.index ? 'border-foreground ring-1 ring-foreground' : 'border-border opacity-80 hover:opacity-100',
          )
        "
        @click="emit('select', i)"
      >
        <NqProductPicture :image="image" :name="props.name" :label="props.labels.noImage" class="size-full object-cover" />
        <span v-if="image.kind === 'video'" class="absolute inset-0 flex items-center justify-center bg-nq-fg/25 text-background">
          <Play aria-hidden="true" class="size-4 fill-current" />
          <span class="sr-only">{{ props.labels.video }}</span>
        </span>
      </button>
    </li>
  </ul>
</template>
