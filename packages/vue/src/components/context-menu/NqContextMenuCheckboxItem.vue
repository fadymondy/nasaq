<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { ContextMenuCheckboxItem, ContextMenuItemIndicator } from "reka-ui";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { menuItemClass } from "../dropdown-menu/menu-styles";

// A toggle. v-model carries the checked state; a click does not close the menu unless `close-on-click`.
interface Props {
  modelValue?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  closeOnClick?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultChecked: false, closeOnClick: false });
const emits = defineEmits<{ "update:modelValue": [value: boolean]; select: [event: Event] }>();
const inner = ref(props.defaultChecked);
const checked = computed(() => props.modelValue ?? inner.value);
function onChange(value: boolean | "indeterminate") {
  inner.value = value === true;
  emits("update:modelValue", value === true);
}
function onSelect(event: Event) {
  emits("select", event);
  if (!props.closeOnClick) event.preventDefault();
}
</script>

<template>
  <ContextMenuCheckboxItem
    data-slot="context-menu-checkbox-item"
    :model-value="checked"
    :disabled="props.disabled"
    :data-checked="checked ? '' : undefined"
    :data-unchecked="checked ? undefined : ''"
    :class="cn(menuItemClass, 'ps-8', props.class)"
    @update:model-value="onChange"
    @select="onSelect"
  >
    <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
      <ContextMenuItemIndicator><Check /></ContextMenuItemIndicator>
    </span>
    <slot />
  </ContextMenuCheckboxItem>
</template>
