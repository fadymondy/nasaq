<script setup lang="ts">
// Internal: one radio of a theme gallery or wallpaper picker (Base UI's Radio.Root). Maps Reka's state to the
// data-checked / data-unchecked attributes the card classes target.
import { injectRadioGroupRootContext, RadioGroupItem } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { cardItem } from "./strings";

interface Props {
  value: string;
  dataSlot: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const root = injectRadioGroupRootContext();
const checked = computed(() => root.modelValue?.value === props.value);
defineOptions({ inheritAttrs: false });
</script>

<template>
  <RadioGroupItem
    v-bind="$attrs"
    :data-slot="props.dataSlot"
    :value="props.value"
    :data-checked="checked ? '' : undefined"
    :data-unchecked="checked ? undefined : ''"
    :class="cn(cardItem, props.class)"
  >
    <slot :checked="checked" />
  </RadioGroupItem>
</template>
