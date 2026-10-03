<script setup lang="ts">
// A quiet "label: value" line for card bodies.
const props = defineProps<{ label: string }>();
</script>

<template>
  <div data-slot="card-meta" class="flex items-center justify-between gap-3 text-body-sm">
    <span class="shrink-0 text-muted-foreground">{{ props.label }}</span>
    <span class="min-w-0 truncate text-end"><slot /></span>
  </div>
</template>
