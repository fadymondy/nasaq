<script setup lang="ts">
import { NqInput } from "../field";
import { NqNum } from "../numeric";

// A number box for a per-line quantity, with its ceiling shown.
const props = defineProps<{ label: string; value: number; max: number; invalid?: boolean }>();
const emit = defineEmits<{ change: [n: number] }>();
</script>

<template>
  <div class="flex items-center gap-2">
    <NqInput
      type="number"
      inputmode="numeric"
      min="0"
      :max="props.max"
      :aria-label="props.label"
      :aria-invalid="props.invalid || undefined"
      :model-value="props.value"
      :disabled="props.max === 0"
      class="w-20"
      ltr
      @update:model-value="(v: string | number | undefined) => emit('change', Math.max(0, Math.floor(Number(v) || 0)))"
    />
    <span class="text-caption text-muted-foreground">/ <NqNum :value="props.max" /></span>
  </div>
</template>
