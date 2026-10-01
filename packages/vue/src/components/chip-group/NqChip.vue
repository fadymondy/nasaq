<script setup lang="ts">
import { computed, inject, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { chipGroupKey } from "./context";

// One chip. Pressed state is exposed as aria-pressed and data-selected. The leading icon goes in the `icon` slot.
interface Props {
  value: string;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const ctx = inject(chipGroupKey);
if (!ctx) throw new Error("<NqChip> must be inside <NqChipGroup>");
const selected = computed(() => ctx.value.value === props.value);
</script>

<template>
  <NqButton
    data-slot="chip"
    :data-selected="selected ? '' : undefined"
    :aria-pressed="selected"
    size="sm"
    variant="ghost"
    :disabled="props.disabled"
    :class="cn('shrink-0 rounded-full px-3 text-muted-foreground', 'data-selected:bg-nq-selected data-selected:text-foreground', props.class)"
    @click="ctx.select(props.value)"
  >
    <slot name="icon" />
    <slot />
  </NqButton>
</template>
