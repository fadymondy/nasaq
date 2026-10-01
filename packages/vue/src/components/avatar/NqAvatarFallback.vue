<script setup lang="ts">
import { AvatarFallback } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

/** The fallback part, for composing inside NqAvatar: shown while the image is missing or loading. */
const props = defineProps<{ delayMs?: number; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <AvatarFallback data-slot="avatar-fallback" :delay-ms="props.delayMs" :class="cn('flex size-full items-center justify-center', props.class)">
    <slot />
  </AvatarFallback>
</template>
