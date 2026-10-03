<script setup lang="ts">
import { Check, Minus } from "lucide-vue-next";
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFieldControl } from "../field/context";

// A choice that is applied on submit, or a row in a selection. `indeterminate` shows a dash for "some selected".
// For a setting that applies immediately, use Switch.
interface Props {
  /** Controlled value: `v-model`. */
  modelValue?: boolean;
  /** Uncontrolled initial value. */
  defaultChecked?: boolean;
  /** A dash and `aria-checked="mixed"`: "some selected". */
  indeterminate?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  id?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultChecked: false, indeterminate: false, disabled: undefined, required: undefined });
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const field = useFieldControl(() => props.id);
const checked = ref(props.modelValue ?? props.defaultChecked);
watch(() => props.modelValue, (v) => v !== undefined && (checked.value = v));
const state = computed(() => (props.indeterminate ? "indeterminate" : checked.value));
const isDisabled = computed(() => props.disabled ?? field.disabled.value);
function onUpdate(v: boolean | "indeterminate") {
  checked.value = v === true;
  emit("update:modelValue", v === true);
}
defineOptions({ inheritAttrs: false });
</script>

<template>
  <CheckboxRoot
    v-bind="$attrs"
    data-slot="checkbox"
    :id="field.id.value"
    :model-value="state"
    :disabled="isDisabled"
    :required="props.required"
    :name="props.name ?? field.name.value"
    :value="props.value"
    :aria-describedby="field.describedBy.value"
    :data-checked="state === true ? '' : undefined"
    :data-unchecked="state === false ? '' : undefined"
    :data-indeterminate="state === 'indeterminate' ? '' : undefined"
    :data-invalid="field.invalid.value ? '' : undefined"
    :class="
      cn(
        'relative inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-nq-line-strong bg-card text-primary-foreground outline-none',
        'transition-colors duration-150 ease-nq data-checked:border-primary data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        // A 24px hit area around the 16px box, without changing layout.
        'after:absolute after:-inset-1',
        props.class,
      )
    "
    @update:model-value="onUpdate"
  >
    <CheckboxIndicator data-slot="checkbox-indicator" class="flex items-center justify-center [&_svg]:size-3 [&_svg]:stroke-3">
      <Minus v-if="state === 'indeterminate'" aria-hidden="true" />
      <Check v-else aria-hidden="true" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
