<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { POPOVER_CONTENT } from "./context";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const ctx = inject(POPOVER_CONTENT, null);
onMounted(() => ctx && (ctx.hasDescription.value = true));
onBeforeUnmount(() => ctx && (ctx.hasDescription.value = false));
</script>

<template>
  <p :id="ctx?.descriptionId" data-slot="popover-description" :class="cn('mt-1 text-body-sm text-muted-foreground', props.class)"><slot /></p>
</template>
