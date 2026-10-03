<script setup lang="ts">
import { AccordionItem, injectAccordionRootContext, useId } from "reka-ui";
import { computed, provide, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { ACCORDION_PANEL_ID } from "./context";

// One section. `value` identifies it in the root's v-model.
interface Props {
  value: string;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const root = injectAccordionRootContext();
provide(ACCORDION_PANEL_ID, useId(undefined, "nq-accordion-panel"));
// Base UI marks an open item with data-open; the root context says which items are open.
const open = computed(() => {
  const v = root.modelValue.value;
  return root.isSingle.value ? v === props.value : Array.isArray(v) && v.includes(props.value);
});
</script>

<template>
  <AccordionItem
    data-slot="accordion-item"
    :value="props.value"
    :disabled="props.disabled"
    :data-open="open ? '' : undefined"
    :data-closed="open ? undefined : ''"
    :class="cn('border-b border-border first:rounded-t-card last:rounded-b-card last:border-b-0', props.class)"
  >
    <slot :open="open" />
  </AccordionItem>
</template>
