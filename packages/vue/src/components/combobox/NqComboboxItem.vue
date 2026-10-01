<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { ComboboxItem, ComboboxItemIndicator } from "reka-ui";
import { computed, inject, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { COMBOBOX_KEY } from "./context";

// One choice. `value` is the item (object) as it appears in the root `items`.
interface Props {
  value: unknown;
  disabled?: boolean;
  /** Text Reka matches against when the root has no `items`. Default: the item's label. */
  textValue?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { textValue: undefined });
const ctx = inject(COMBOBOX_KEY);
if (!ctx) throw new Error("NqComboboxItem must be inside NqCombobox");
const selected = computed(() => ctx.isSelected(props.value));
</script>

<template>
  <ComboboxItem
    data-slot="combobox-item"
    :value="(props.value as never)"
    :disabled="props.disabled"
    :text-value="props.textValue ?? ctx.labelOf(props.value)"
    :data-selected="selected ? '' : undefined"
    :class="
      cn(
        'relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none',
        'data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50',
        props.class,
      )
    "
  >
    <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
      <ComboboxItemIndicator><Check class="size-4" /></ComboboxItemIndicator>
    </span>
    <span class="min-w-0 flex-1 truncate"><slot /></span>
  </ComboboxItem>
</template>
