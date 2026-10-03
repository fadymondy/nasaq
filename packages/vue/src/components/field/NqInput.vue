<script setup lang="ts">
import { computed, type HTMLAttributes, type InputHTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFieldControl } from "./context";
import { controlClass } from "./variants";

interface Props {
  /** Force left-to-right entry and `text-start` alignment, for emails, URLs, codes and phone numbers in Arabic forms. */
  ltr?: boolean;
  type?: InputHTMLAttributes["type"];
  id?: string;
  name?: string;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { type: "text", disabled: undefined });
const model = defineModel<string | number | undefined>();
const field = useFieldControl(() => props.id);
const isDisabled = computed(() => props.disabled ?? (field.disabled.value || undefined));
</script>

<template>
  <input
    v-model="model"
    data-slot="input"
    :dir="props.ltr ? 'ltr' : undefined"
    :type="props.type"
    :id="field.id.value"
    :name="props.name ?? field.name.value"
    :disabled="isDisabled"
    :aria-describedby="field.describedBy.value"
    :aria-invalid="field.invalid.value || undefined"
    :data-invalid="field.invalid.value ? '' : undefined"
    :class="cn(controlClass, 'h-control', props.ltr && 'text-start', props.class)"
  />
</template>
