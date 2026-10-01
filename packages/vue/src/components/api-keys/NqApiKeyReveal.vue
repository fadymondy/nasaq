<script setup lang="ts">
import { ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCopyField } from "../copy-button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import type { ApiKeysLabels } from "./strings";

// The one place the full secret appears. It lives in state only while the dialog is open.
interface Props {
  reveal: { title: string; secret: string } | null;
  t: ApiKeysLabels;
}
const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

// Keep the last secret mounted while the dialog animates closed, then drop it.
const held = ref(props.reveal);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => props.reveal,
  (next) => {
    clearTimeout(timer);
    if (next) held.value = next;
    else timer = setTimeout(() => (held.value = null), 300);
  },
);
</script>

<template>
  <NqDialog :open="props.reveal !== null" @update:open="(open: boolean) => !open && emit('close')">
    <NqDialogContent :show-close="false" data-slot="api-key-reveal">
      <NqDialogHeader>
        <NqDialogTitle>{{ held?.title }}</NqDialogTitle>
        <NqDialogDescription>{{ props.t.revealBody }}</NqDialogDescription>
      </NqDialogHeader>
      <NqAlert tone="warning">{{ props.t.revealAlert }}</NqAlert>
      <NqCopyField :value="held?.secret ?? ''" :label="props.t.secretLabel" />
      <NqDialogFooter>
        <NqButton type="button" variant="primary" @click="emit('close')">{{ props.t.done }}</NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
