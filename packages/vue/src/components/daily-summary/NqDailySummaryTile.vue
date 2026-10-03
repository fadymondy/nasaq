<script setup lang="ts">
// The icon and label row at the top of a summary tile (React TileLabel).
</script>

<template>
  <div class="flex items-center gap-2">
    <span aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-control bg-secondary text-muted-foreground [&_svg]:size-4">
      <slot name="icon" />
    </span>
    <div class="min-w-0 truncate text-body-sm text-muted-foreground"><slot /></div>
  </div>
</template>
