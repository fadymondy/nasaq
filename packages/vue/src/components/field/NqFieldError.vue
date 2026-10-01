<script setup lang="ts">
import { computed, inject, onBeforeUnmount, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { FIELD } from "./context";

// Error text is never colour-only: it is announced and paired with the invalid border. It shows while the Field
// is `invalid` (or always, with `match`).
interface Props {
  /** Force it visible (true) or hidden (false) regardless of the Field. */
  match?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { match: undefined });
const id = `nq-field-error-${useId()}`;
const field = inject(FIELD, null);
const visible = computed(() => props.match ?? field?.invalid.value ?? false);
let off: (() => void) | undefined;
watch(
  visible,
  (v) => {
    off?.();
    off = v ? field?.register(id) : undefined;
  },
  { immediate: true },
);
onBeforeUnmount(() => off?.());
</script>

<template>
  <div v-if="visible" data-slot="field-error" :id="id" role="alert" :class="cn('text-caption text-nq-danger-text', props.class)">
    <slot />
  </div>
</template>
