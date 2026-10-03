<script setup lang="ts">
import { inject, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { FIELD } from "./context";

interface Props {
  /** The control to label. Defaults to the Field's control. */
  for?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const field = inject(FIELD, null);
</script>

<template>
  <label
    data-slot="field-label"
    :for="props.for ?? field?.controlId.value"
    :data-disabled="field?.disabled.value ? '' : undefined"
    :data-invalid="field?.invalid.value ? '' : undefined"
    :class="cn('text-label text-foreground data-disabled:opacity-50', props.class)"
  >
    <slot />
  </label>
</template>
