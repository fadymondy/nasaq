<script setup lang="ts">
import { ImageOff } from "lucide-vue-next";
import { ref, type CSSProperties, type HTMLAttributes } from "vue";
import type { CommerceImage } from "./commerce";

// An image that falls back to a neutral token-coloured stand-in when it is missing or fails to load. Internal.
const props = defineProps<{ image: CommerceImage | undefined; name?: string; label: string; eager?: boolean; class?: HTMLAttributes["class"]; style?: CSSProperties }>();
const failed = ref<string | null>(null);
</script>

<template>
  <div v-if="!props.image || failed === props.image.src" role="img" :aria-label="props.label" class="flex size-full items-center justify-center bg-secondary text-muted-foreground">
    <ImageOff aria-hidden="true" class="size-8" />
  </div>
  <img
    v-else
    :src="props.image.src"
    :alt="props.image.alt || props.name || ''"
    :width="props.image.width ?? 800"
    :height="props.image.height ?? 800"
    :loading="props.eager ? 'eager' : 'lazy'"
    decoding="async"
    draggable="false"
    :class="props.class"
    :style="props.style"
    @error="failed = props.image!.src"
  />
</template>
