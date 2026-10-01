<script setup lang="ts">
import { injectToggleGroupRootContext, Toggle, ToggleGroupItem } from "reka-ui";
import { computed, inject, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { TOGGLE_GROUP_VARIANT } from "./context";

// One pressed-state button inside a NqToggleGroup, or on its own (then it looks like an outline button).
// Give icon-only items an `aria-label`.
interface Props {
  /** The value this item adds to the group's `modelValue`. Required inside a group. */
  value?: string;
  /** Standalone only: controlled pressed state (`v-model`). */
  modelValue?: boolean;
  /** Standalone only: uncontrolled initial state. */
  defaultPressed?: boolean;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { value: undefined, modelValue: undefined, defaultPressed: false, disabled: undefined });
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const group = injectToggleGroupRootContext(null as never) as ReturnType<typeof injectToggleGroupRootContext> | null;
const variant = inject(TOGGLE_GROUP_VARIANT, null);

const own = ref(props.modelValue ?? props.defaultPressed);
watch(() => props.modelValue, (v) => v !== undefined && (own.value = v));
const pressed = computed(() => {
  if (!group) return own.value;
  const v = group.modelValue.value;
  return Array.isArray(v) ? v.includes(props.value as never) : v === props.value;
});
function onStandalone(v: boolean) {
  own.value = v;
  emit("update:modelValue", v);
}

const itemBase = [
  "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-label text-muted-foreground outline-none",
  "transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
  "data-disabled:pointer-events-none data-disabled:opacity-50",
];
const classes = computed(() =>
  cn(
    itemBase,
    variant?.value === "segmented" && "rounded-[calc(var(--radius-control)-2px)] data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-xs",
    variant?.value === "outline" &&
      "border border-border bg-card first:rounded-s-control last:rounded-e-control not-first:-ms-px data-pressed:z-1 data-pressed:border-primary data-pressed:bg-nq-selected data-pressed:text-foreground",
    !variant && "rounded-control border border-border bg-card data-pressed:border-primary data-pressed:bg-nq-selected data-pressed:text-foreground",
    props.class,
  ),
);
defineOptions({ inheritAttrs: false });
</script>

<template>
  <ToggleGroupItem
    v-bind="$attrs"
    v-if="group"
    data-slot="toggle"
    :value="props.value as string"
    :disabled="props.disabled"
    :data-pressed="pressed ? '' : undefined"
    :class="classes"
  >
    <slot />
  </ToggleGroupItem>
  <Toggle
    v-bind="$attrs"
    v-else
    data-slot="toggle"
    :model-value="own"
    :disabled="props.disabled"
    :data-pressed="pressed ? '' : undefined"
    :class="classes"
    @update:model-value="onStandalone"
  >
    <slot />
  </Toggle>
</template>
