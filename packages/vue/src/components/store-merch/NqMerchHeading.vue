<script setup lang="ts">
// Internal: the section heading row of the merchandising blocks.
defineProps<{ id: string }>();
</script>

<template>
  <div class="mb-4 flex items-end justify-between gap-4">
    <h2 :id="id" class="text-h2 text-foreground"><slot /></h2>
    <slot name="action" />
  </div>
</template>
