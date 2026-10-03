<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// One labelled fact inside an engine card body: a caption over a figure.
const props = defineProps<{ label: string; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="engine-card-fact" :class="cn('flex min-w-0 flex-col gap-0.5', props.class)">
    <dt class="text-caption text-muted-foreground">{{ props.label }}</dt>
    <dd class="m-0 text-body-sm font-medium text-foreground"><slot /></dd>
  </div>
</template>
