<script setup lang="ts">
import { ref } from "vue";
import { NqInput } from "../field";
import { parseNumber } from "./report-math";

// Internal: a number the user is typing. It keeps the raw text while focused so "1." and "" are allowed, and accepts Arabic-Indic digits.
interface Props {
  value?: number;
  placeholder?: string;
  disabled?: boolean;
}
const props = defineProps<Props>();
const emit = defineEmits<{ value: [value: number] }>();
const draft = ref<string | null>(null);
</script>

<template>
  <NqInput
    dir="auto"
    inputmode="decimal"
    class="tabular-nums"
    :disabled="props.disabled"
    :placeholder="props.placeholder"
    :model-value="draft ?? (props.value === undefined ? '' : String(props.value))"
    @update:model-value="(v) => { draft = String(v ?? ''); emit('value', parseNumber(draft)); }"
    @blur="draft = null"
  />
</template>
