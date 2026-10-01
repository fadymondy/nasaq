<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from "reka-ui";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFieldControl } from "../field/context";

// On/off for a setting that applies immediately. The thumb travels to the inline end, so it mirrors in RTL.
interface Props {
  /** Controlled value: `v-model`. */
  modelValue?: boolean;
  /** Uncontrolled initial value. */
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  id?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultChecked: false, disabled: undefined, required: undefined });
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const field = useFieldControl(() => props.id);
const checked = ref(props.modelValue ?? props.defaultChecked);
watch(() => props.modelValue, (v) => v !== undefined && (checked.value = v));
const isDisabled = computed(() => props.disabled ?? field.disabled.value);
function onUpdate(v: boolean) {
  checked.value = v;
  emit("update:modelValue", v);
}
defineOptions({ inheritAttrs: false });
</script>

<template>
  <SwitchRoot
    v-bind="$attrs"
    data-slot="switch"
    :id="field.id.value"
    :model-value="checked"
    :disabled="isDisabled"
    :required="props.required"
    :name="props.name ?? field.name.value"
    :value="props.value"
    :aria-describedby="field.describedBy.value"
    :data-checked="checked ? '' : undefined"
    :data-unchecked="checked ? undefined : ''"
    :data-invalid="field.invalid.value ? '' : undefined"
    :class="
      cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-nq-line-strong p-0.5 outline-none',
        'transition-colors duration-150 ease-nq data-checked:bg-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        props.class,
      )
    "
    @update:model-value="onUpdate"
  >
    <SwitchThumb
      data-slot="switch-thumb"
      :data-checked="checked ? '' : undefined"
      :data-unchecked="checked ? undefined : ''"
      class="block size-4 rounded-full bg-background shadow-xs data-checked:bg-primary-foreground transition-[translate] duration-150 ease-nq data-checked:translate-x-3.5 rtl:data-checked:-translate-x-3.5"
    />
  </SwitchRoot>
</template>
