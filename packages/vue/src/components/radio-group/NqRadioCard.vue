<script setup lang="ts">
import { injectRadioGroupRootContext, RadioGroupIndicator, RadioGroupItem } from "reka-ui";
import { computed, useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The card variant: the whole bordered card is the radio. For plan-style choices where each option needs a description or price.
interface Props {
  value: string;
  /** The option's name: "Pro". (Or the default slot.) */
  title?: string;
  /** Supporting text under the title. (Or the `description` slot.) */
  description?: string;
  /** Trailing content at the inline end, such as a price. (Or the `meta` slot.) */
  meta?: string;
  disabled?: boolean;
  id?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const slots = useSlots();
const root = injectRadioGroupRootContext();
const checked = computed(() => root.modelValue?.value === props.value);
defineOptions({ inheritAttrs: false });
</script>

<template>
  <RadioGroupItem
    v-bind="$attrs"
    data-slot="radio-card"
    :id="props.id"
    :value="props.value"
    :disabled="props.disabled"
    :data-checked="checked ? '' : undefined"
    :data-unchecked="checked ? undefined : ''"
    :class="
      cn(
        'group/card relative flex w-full cursor-pointer items-start gap-3 rounded-card border border-border bg-card p-4 text-start outline-none',
        'transition-colors duration-150 ease-nq hover:border-nq-line-strong',
        'data-checked:border-primary data-checked:bg-nq-selected',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        props.class,
      )
    "
  >
    <span
      data-slot="radio-card-mark"
      aria-hidden="true"
      class="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-nq-line-strong bg-card group-data-checked/card:border-primary group-data-checked/card:bg-primary"
    >
      <RadioGroupIndicator class="block size-1.5 rounded-full bg-primary-foreground" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span data-slot="radio-card-title" class="text-label text-foreground"><slot>{{ props.title }}</slot></span>
      <span v-if="props.description || slots.description" data-slot="radio-card-description" class="text-caption text-muted-foreground">
        <slot name="description">{{ props.description }}</slot>
      </span>
    </span>
    <span v-if="props.meta || slots.meta" data-slot="radio-card-meta" class="shrink-0 text-label text-foreground">
      <slot name="meta">{{ props.meta }}</slot>
    </span>
  </RadioGroupItem>
</template>
