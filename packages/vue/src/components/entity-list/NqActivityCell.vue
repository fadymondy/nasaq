<script setup lang="ts">
import { type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqDateTime } from "../numeric";

// "3 days ago", with the full date on hover. Renders a dash when there is no date.
interface Props {
  value?: Date | string | number | null;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <span v-if="props.value == null" class="text-muted-foreground">—</span>
  <NqDateTime v-else :value="props.value" relative :class="cn('text-body-sm text-muted-foreground', props.class)" />
</template>
