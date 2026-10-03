<script setup lang="ts">
import { ToggleGroupRoot } from "reka-ui";
import { computed, provide, ref, toRef, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { TOGGLE_GROUP_VARIANT, type ToggleGroupVariant } from "./context";

// A row of toggle buttons. By default one item is pressed at a time (a segmented control: view mode, alignment);
// set `multiple` to allow several (text formatting). `modelValue` is always an array. Arrow keys follow the reading
// direction. For switching between panels of content use NqTabs.
interface Props {
  /** The pressed values (`v-model`). Always an array. */
  modelValue?: string[];
  /** Uncontrolled initial values. */
  defaultValue?: string[];
  /** Allow several pressed items. */
  multiple?: boolean;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  /** "segmented" (default): items in a tinted track, the pressed one raised. "outline": bordered, joined buttons. */
  variant?: ToggleGroupVariant;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined, multiple: false, disabled: false, orientation: "horizontal", variant: "segmented" });
const emit = defineEmits<{ "update:modelValue": [value: string[]] }>();

provide(TOGGLE_GROUP_VARIANT, toRef(props, "variant"));
// Uncontrolled state; when v-model is bound the prop is the only source, so a parent can reject a press or clear it.
const local = ref<string[]>(props.defaultValue ?? []);
const value = computed(() => props.modelValue ?? local.value);
// Reka's single mode holds a string; the Nasaq API (like Base UI's) is always an array.
const inner = computed(() => (props.multiple ? value.value : (value.value[0] ?? "")));
function onUpdate(v: unknown) {
  const next = Array.isArray(v) ? (v as string[]) : v ? [v as string] : [];
  local.value = next;
  emit("update:modelValue", next);
}
defineOptions({ inheritAttrs: false });
</script>

<template>
  <ToggleGroupRoot
    v-bind="$attrs"
    data-slot="toggle-group"
    :data-variant="props.variant"
    :data-multiple="props.multiple ? '' : undefined"
    :type="props.multiple ? 'multiple' : 'single'"
    :model-value="inner as never"
    :disabled="props.disabled"
    :orientation="props.orientation"
    :class="cn('flex w-fit max-w-full', props.variant === 'segmented' ? 'gap-0.5 rounded-control bg-secondary p-0.5' : 'rounded-control', props.class)"
    @update:model-value="onUpdate"
  >
    <slot />
  </ToggleGroupRoot>
</template>
