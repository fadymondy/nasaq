<script setup lang="ts">
import { ChevronDown } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The browser's own <select>, styled like Input. Use it on mobile-first forms, long plain lists and server
// forms that post without JavaScript. For search, icons or rich rows use NqSelect. Native attributes
// (name, required, disabled, id …) go to the <select>; `class` goes to the wrapper.
export interface NativeSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  /** Options as data. You can put <option> / <optgroup> in the default slot instead. */
  options?: readonly NativeSelectOption[];
  /** A first, empty option shown while nothing is chosen. */
  placeholder?: string;
  size?: "sm" | "md";
  modelValue?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  /** Marks the control invalid (data-invalid + aria-invalid). */
  invalid?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { size: "md", options: undefined, placeholder: undefined, modelValue: undefined, defaultValue: undefined });
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
defineOptions({ inheritAttrs: false });

const inner = ref(props.defaultValue ?? "");
const current = computed(() => props.modelValue ?? inner.value);
function onChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value;
  inner.value = v;
  emit("update:modelValue", v);
}
</script>

<template>
  <div data-slot="native-select" :class="cn('relative w-full min-w-0', props.class)">
    <select
      v-bind="$attrs"
      :value="current"
      :required="props.required"
      :disabled="props.disabled"
      :aria-invalid="props.invalid || undefined"
      :data-invalid="props.invalid ? '' : undefined"
      :class="
        cn(
          'w-full min-w-0 appearance-none rounded-control border border-input bg-card ps-3 pe-9 text-body text-foreground',
          'min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none',
          'focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus',
          'data-invalid:border-nq-danger aria-invalid:border-nq-danger',
          'disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:text-[16px]',
          props.size === 'sm' ? 'h-control-sm' : 'h-control',
        )
      "
      @change="onChange"
    >
      <option v-if="props.placeholder !== undefined" value="" :disabled="props.required">{{ props.placeholder }}</option>
      <option v-for="o in props.options" :key="o.value" :value="o.value" :disabled="o.disabled">{{ o.label }}</option>
      <slot />
    </select>
    <ChevronDown aria-hidden="true" class="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
  </div>
</template>
