<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import NqCopyButton from "./NqCopyButton.vue";

// A read-only field with a copy button, for API keys, invite links and URLs. The value is always left-to-right,
// also in Arabic, and selects on focus so it can be copied by hand.
interface Props {
  /** The value shown and copied. */
  value: string;
  /** Accessible name of the input. Prefer a visible Field label instead when there is one. */
  label?: string;
  copyLabel?: string;
  copiedLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ copy: [text: string] }>();
</script>

<template>
  <NqInputGroup data-slot="copy-field" :class="props.class">
    <NqInputGroupInput readonly ltr :model-value="props.value" :aria-label="props.label" @focus="(e: FocusEvent) => (e.currentTarget as HTMLInputElement).select()" />
    <NqInputGroupAddon align="end">
      <NqCopyButton :value="props.value" :label="props.copyLabel" :copied-label="props.copiedLabel" @copy="(t: string) => emit('copy', t)" />
    </NqInputGroupAddon>
  </NqInputGroup>
</template>
