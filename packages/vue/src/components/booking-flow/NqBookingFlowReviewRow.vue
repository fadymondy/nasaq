<script setup lang="ts">
import { Pencil } from "lucide-vue-next";
import { NqButton } from "../button";

// One line of the review step with its edit button. Internal to NqBookingFlow.
defineProps<{ label: string; edit: string }>();
defineEmits<{ edit: [] }>();
</script>

<template>
  <div class="flex items-start justify-between gap-3 border-b border-nq-line pb-3 last:border-0 last:pb-0">
    <div class="min-w-0">
      <dt class="text-caption text-muted-foreground">{{ label }}</dt>
      <dd class="m-0 text-body-sm"><slot /></dd>
    </div>
    <NqButton variant="link" size="sm" @click="$emit('edit')">
      <Pencil aria-hidden="true" />
      {{ edit }}
    </NqButton>
  </div>
</template>
