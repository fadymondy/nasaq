<script setup lang="ts">
import { useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

/** The quiet last row of a top-navigation app: copyright or status in the `start` slot, links (`NqAppFooterLink`) at the end. */
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const slots = useSlots();
</script>

<template>
  <footer
    data-slot="app-footer"
    :class="
      cn(
        'mt-auto flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-t border-border px-4 py-3 text-caption text-muted-foreground md:px-page',
        props.class,
      )
    "
  >
    <div v-if="slots.start" class="flex min-w-0 items-center gap-2"><slot name="start" /></div>
    <div class="ms-auto flex flex-wrap items-center gap-x-5 gap-y-1"><slot /></div>
  </footer>
</template>
