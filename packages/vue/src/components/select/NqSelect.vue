<script setup lang="ts">
import { SelectRoot, useForwardPropsEmits } from "reka-ui";

// Pick one value from a list. v-model carries the value; `name` adds a hidden native field for forms.
// The trigger shows the selected item's label, not its raw value, even before the list has opened.
interface Props {
  modelValue?: string | number | null;
  defaultValue?: string | number;
  open?: boolean;
  defaultOpen?: boolean;
  /** Form field name. */
  name?: string;
  disabled?: boolean;
  required?: boolean;
  /** Allow several values (modelValue is then an array). */
  multiple?: boolean;
  dir?: "ltr" | "rtl";
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined, open: undefined, defaultOpen: false, name: undefined, dir: undefined });
const emits = defineEmits<{ "update:modelValue": [value: string | number | null]; "update:open": [value: boolean] }>();
const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <SelectRoot v-slot="slotProps" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </SelectRoot>
</template>
