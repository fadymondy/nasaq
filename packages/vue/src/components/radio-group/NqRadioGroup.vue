<script setup lang="ts">
import { RadioGroupRoot } from "reka-ui";
import { ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFieldControl } from "../field/context";

// Pick exactly one option from a short list. Arrow keys move and select, following the reading direction.
// Put it inside a `NqField` and name it with `NqFieldLabel` (or `aria-labelledby` / `aria-label`).
interface Props {
  /** Controlled value: `v-model`. */
  modelValue?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  orientation?: "horizontal" | "vertical";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined, disabled: undefined, required: undefined, orientation: "vertical" });
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const field = useFieldControl(() => undefined);
const value = ref(props.modelValue ?? props.defaultValue);
watch(() => props.modelValue, (v) => v !== undefined && (value.value = v));
function onUpdate(v: unknown) {
  value.value = v as string;
  emit("update:modelValue", v as string);
}
defineOptions({ inheritAttrs: false });
</script>

<template>
  <RadioGroupRoot
    v-bind="$attrs"
    data-slot="radio-group"
    :model-value="value"
    :disabled="props.disabled ?? field.disabled.value"
    :required="props.required"
    :name="props.name ?? field.name.value"
    :orientation="props.orientation"
    :aria-describedby="field.describedBy.value"
    :aria-invalid="field.invalid.value || undefined"
    :data-invalid="field.invalid.value ? '' : undefined"
    :class="cn('flex flex-col gap-2', props.class)"
    @update:model-value="onUpdate"
  >
    <slot />
  </RadioGroupRoot>
</template>
