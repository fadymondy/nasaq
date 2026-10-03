<script setup lang="ts">
import { DropdownMenuRadioGroup } from "reka-ui";
import { computed, provide, ref } from "vue";
import { MENU_RADIO_VALUE } from "./context";

// Place NqDropdownMenuRadioItem inside. v-model carries the chosen value.
interface Props {
  modelValue?: string;
  defaultValue?: string;
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined });
const emits = defineEmits<{ "update:modelValue": [value: string] }>();
const inner = ref(props.defaultValue);
const current = computed(() => props.modelValue ?? inner.value);
provide(MENU_RADIO_VALUE, current);
function onChange(payload: unknown) {
  const value = String(payload ?? "");
  inner.value = value;
  emits("update:modelValue", value);
}
</script>

<template>
  <DropdownMenuRadioGroup data-slot="dropdown-menu-radio-group" :model-value="current" @update:model-value="onChange"><slot /></DropdownMenuRadioGroup>
</template>
