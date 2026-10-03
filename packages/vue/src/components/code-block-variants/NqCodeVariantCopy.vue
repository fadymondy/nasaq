<script setup lang="ts">
import { Check, Copy } from "lucide-vue-next";
import { NqButton } from "../button";
import { copyText } from "../copy-button";
import { useFlash } from "./flash";

// An icon button that copies `text` and shows a check, with its own live region.
const props = defineProps<{ text: string; label: string; done: string }>();
const emit = defineEmits<{ copy: [text: string] }>();
const { done, flash } = useFlash();
async function copy() {
  const ok = await copyText(props.text);
  flash(props.done, ok);
  if (ok) emit("copy", props.text);
}
</script>

<template>
  <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="props.label" :data-copied="done ? '' : undefined" class="data-copied:text-nq-success-text" @click="copy">
    <Check v-if="done" aria-hidden="true" />
    <Copy v-else aria-hidden="true" />
  </NqButton>
  <span role="status" aria-live="polite" class="sr-only">{{ done ? props.done : "" }}</span>
</template>
