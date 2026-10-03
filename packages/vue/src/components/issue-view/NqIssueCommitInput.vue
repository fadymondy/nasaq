<script setup lang="ts">
import { ref, watch, type InputHTMLAttributes } from "vue";
import { NqInput } from "../field";

// A text input that saves on Enter or blur and reverts on Escape.
const props = defineProps<{ value: string; disabled?: boolean; ltr?: boolean; type?: InputHTMLAttributes["type"] }>();
const emit = defineEmits<{ commit: [text: string] }>();
const draft = ref(props.value);
watch(() => props.value, (v) => (draft.value = v));
const commit = () => {
  if (draft.value !== props.value) emit("commit", draft.value);
};
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault();
    commit();
  } else if (e.key === "Escape") draft.value = props.value;
};
</script>

<template>
  <NqInput
    v-model="draft"
    :ltr="props.ltr"
    :type="props.type"
    :disabled="props.disabled"
    class="h-control-sm border-transparent bg-transparent px-2 hover:bg-nq-hover focus:bg-card"
    @blur="commit"
    @keydown="onKeydown"
  />
</template>
