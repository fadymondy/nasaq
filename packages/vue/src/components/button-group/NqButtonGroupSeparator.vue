<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A divider inside the group. Needed between buttons that have no border of their own (a primary split button).
interface Props {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <div
    role="separator"
    data-slot="button-group-separator"
    :class="cn('w-px shrink-0 self-stretch bg-primary-foreground/30 in-data-[orientation=vertical]:h-px in-data-[orientation=vertical]:w-auto', props.class)"
  />
</template>
