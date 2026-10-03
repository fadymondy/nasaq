<script setup lang="ts">
// A titled notice with an icon tile (SSO, register, blocked). Internal to SignInFlow.
defineProps<{ title: string; body: string }>();
</script>

<template>
  <div data-slot="sign-in-flow-notice" class="flex gap-3 rounded-card border border-border bg-muted/50 p-4">
    <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-control border border-border bg-card text-foreground [&_svg]:size-4">
      <slot name="icon" />
    </span>
    <div class="flex min-w-0 flex-col gap-0.5">
      <p class="text-label text-foreground">{{ title }}</p>
      <p class="text-body-sm text-muted-foreground">{{ body }}</p>
    </div>
  </div>
</template>
