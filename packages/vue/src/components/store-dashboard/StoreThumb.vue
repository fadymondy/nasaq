<script setup lang="ts">
import { ImageOff } from "lucide-vue-next";
import { ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Product thumbnail with a neutral placeholder when the image is missing or fails to load.
const props = defineProps<{ src?: string; class?: HTMLAttributes["class"] }>();
const failed = ref(false);
</script>

<template>
  <span data-slot="store-dashboard-thumb" :class="cn('grid size-10 shrink-0 place-items-center overflow-hidden rounded-control bg-muted text-muted-foreground', props.class)">
    <img v-if="props.src && !failed" :src="props.src" alt="" width="40" height="40" loading="lazy" class="size-full object-cover" @error="failed = true" />
    <ImageOff v-else aria-hidden="true" class="size-4" />
  </span>
</template>
