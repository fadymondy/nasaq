<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { POPOVER_CONTENT } from "./context";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const ctx = inject(POPOVER_CONTENT, null);
onMounted(() => ctx && (ctx.hasTitle.value = true));
onBeforeUnmount(() => ctx && (ctx.hasTitle.value = false));
</script>

<template>
  <h2 :id="ctx?.titleId" data-slot="popover-title" :class="cn('text-body-sm font-semibold text-foreground', props.class)"><slot /></h2>
</template>
