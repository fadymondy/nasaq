<script setup lang="ts">
import { X } from "lucide-vue-next";
import { NqButton } from "../button";

// The title row every canvas side panel shares.
const props = defineProps<{ title: string; hint?: string; closeLabel: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div class="flex items-start gap-3 border-b border-border px-4 py-3">
    <span v-if="$slots.icon" class="flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary [&_svg]:size-4"><slot name="icon" /></span>
    <div class="min-w-0 flex-1">
      <h2 class="text-label text-foreground">{{ props.title }}</h2>
      <p v-if="props.hint" class="text-caption text-muted-foreground">{{ props.hint }}</p>
    </div>
    <NqButton variant="ghost" size="icon-sm" :aria-label="props.closeLabel" :title="props.closeLabel" @click="emit('close')">
      <X aria-hidden="true" />
    </NqButton>
  </div>
</template>
