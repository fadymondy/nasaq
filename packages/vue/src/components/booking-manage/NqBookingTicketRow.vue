<script setup lang="ts">
// One line of the ticket: an icon, a caption and the value. Internal to NqBookingTicket.
defineProps<{ label: string }>();
</script>

<template>
  <div class="flex items-start gap-3">
    <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><slot name="icon" /></span>
    <div class="flex min-w-0 flex-col">
      <dt class="text-caption text-muted-foreground">{{ label }}</dt>
      <dd class="m-0 text-body-sm text-foreground"><slot /></dd>
    </div>
  </div>
</template>
