<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { FIELD } from "./context";

interface Props {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const id = `nq-field-description-${useId()}`;
const field = inject(FIELD, null);
let off: (() => void) | undefined;
onMounted(() => (off = field?.register(id)));
onBeforeUnmount(() => off?.());
</script>

<template>
  <p data-slot="field-description" :id="id" :class="cn('text-caption text-muted-foreground', props.class)">
    <slot />
  </p>
</template>
