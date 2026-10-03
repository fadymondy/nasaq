<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A settings line: label and hint on one side, the control on the other. Stacks on narrow screens.
interface Props {
  /** Matches `SettingsEntry.id`, so search can scroll here. */
  id: string;
  label?: string;
  description?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <div
    data-slot="setting-row"
    :data-setting-id="props.id"
    :class="
      cn(
        'flex flex-col gap-2 rounded-control py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        'data-[highlight=true]:bg-nq-selected data-[highlight=true]:outline-2 data-[highlight=true]:outline-offset-4 data-[highlight=true]:outline-nq-focus',
        props.class,
      )
    "
  >
    <div class="flex min-w-0 flex-col gap-0.5">
      <span class="text-label text-foreground"><slot name="label">{{ props.label }}</slot></span>
      <span v-if="$slots.description || props.description" class="text-body-sm text-muted-foreground"><slot name="description">{{ props.description }}</slot></span>
    </div>
    <div v-if="$slots.default" class="flex shrink-0 items-center gap-2 sm:max-w-[50%]"><slot /></div>
  </div>
</template>
