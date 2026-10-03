<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { cn } from "../../lib/cn";
import type { DesktopPlatform } from "./permission";

// One slot of the stack: slides and fades in on the frame after it mounts.
defineProps<{ platform: DesktopPlatform }>();
const shown = ref(false);
let frame = 0;
onMounted(() => {
  frame = requestAnimationFrame(() => (shown.value = true));
});
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <div
    :class="
      cn(
        'transition-[opacity,translate] duration-200 ease-nq motion-reduce:transition-none',
        shown ? 'translate-x-0 translate-y-0 opacity-100' : platform === 'macos' ? 'opacity-0 ltr:translate-x-6 rtl:-translate-x-6' : 'translate-y-4 opacity-0',
      )
    "
  >
    <slot />
  </div>
</template>
