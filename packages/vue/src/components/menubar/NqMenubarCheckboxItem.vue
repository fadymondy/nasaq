<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { MenubarCheckboxItem, MenubarItemIndicator } from "reka-ui";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { menuItemClass } from "../dropdown-menu/menu-styles";
import NqMenubarShortcut from "./NqMenubarShortcut.vue";

// A toggle. v-model carries the checked state; a click does not close the menu unless `close-on-click`.
interface Props {
  modelValue?: boolean;
  defaultChecked?: boolean;
  shortcut?: string | readonly string[];
  disabled?: boolean;
  closeOnClick?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, shortcut: undefined, defaultChecked: false, closeOnClick: false });
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
  <MenubarCheckboxItem
    data-slot="menubar-checkbox-item"
    :model-value="checked"
    :disabled="props.disabled"
    :data-checked="checked ? '' : undefined"
    :data-unchecked="checked ? undefined : ''"
    :class="cn(menuItemClass, 'ps-8', props.class)"
    @update:model-value="onChange"
    @select="onSelect"
  >
    <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
      <MenubarItemIndicator><Check /></MenubarItemIndicator>
    </span>
    <slot />
    <NqMenubarShortcut v-if="props.shortcut" :keys="typeof props.shortcut === 'string' ? undefined : props.shortcut">{{ typeof props.shortcut === "string" ? props.shortcut : "" }}</NqMenubarShortcut>
  </MenubarCheckboxItem>
</template>
