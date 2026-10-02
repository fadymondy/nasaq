<script setup lang="ts">
import { ImageOff } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A product picture that falls back to a token-coloured placeholder when the URL is missing or fails. Internal.
const props = withDefaults(defineProps<{ src?: string; alt: string; size?: number; label?: string; class?: HTMLAttributes["class"] }>(), { src: undefined, size: 40, label: undefined });
const failed = ref<string | null>(null);
watch(() => props.src, () => (failed.value = null));
const ok = computed(() => Boolean(props.src) && failed.value !== props.src);
</script>

<template>
  <img
    v-if="ok"
    :src="props.src"
    :alt="props.alt"
    :width="props.size"
    :height="props.size"
    loading="lazy"
    :class="cn('shrink-0 rounded-control border border-border bg-secondary object-cover', props.class)"
    :style="{ width: `${props.size}px`, height: `${props.size}px` }"
    @error="failed = props.src ?? null"
  />
  <span
    v-else
    role="img"
    :aria-label="props.label ?? props.alt"
    :title="props.label"
    :class="cn('flex shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-muted-foreground', props.class)"
    :style="{ width: `${props.size}px`, height: `${props.size}px` }"
  >
    <ImageOff aria-hidden="true" class="size-1/2" />
  </span>
</template>
