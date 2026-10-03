<script setup lang="ts">
import { ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCodeBlock } from "../code-block";
import { NqCopyField } from "../copy-button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { verifySnippet } from "./format";
import type { WebhooksManagerStrings } from "./strings";

// Shows a new or rotated signing secret once, with a snippet for verifying the signature. Internal.
const props = defineProps<{ reveal: { title: string; secret: string } | null; t: WebhooksManagerStrings }>();
const emit = defineEmits<{ close: [] }>();

const held = ref(props.reveal);
watch(
  () => props.reveal,
  (r) => {
    if (r) held.value = r;
    // Drop the secret from memory once the dialog has animated closed.
    else setTimeout(() => !props.reveal && (held.value = null), 300);
  },
);
</script>

<template>
  <NqDialog :open="props.reveal !== null" @update:open="(o: boolean) => !o && emit('close')">
    <NqDialogContent :show-close="false" data-slot="webhooks-reveal" class="max-w-lg">
      <NqDialogHeader>
        <NqDialogTitle>{{ held?.title }}</NqDialogTitle>
        <NqDialogDescription>{{ props.t.revealBody }}</NqDialogDescription>
      </NqDialogHeader>
      <NqAlert tone="warning">{{ props.t.revealAlert }}</NqAlert>
      <NqCopyField :value="held?.secret ?? ''" :label="props.t.secretLabel" />
      <div class="flex flex-col gap-2">
        <p class="text-label text-foreground">{{ props.t.verifyTitle }}</p>
        <p class="text-caption text-muted-foreground">{{ props.t.verifyBody }}</p>
        <NqCodeBlock :code="verifySnippet()" language="js" />
      </div>
      <NqDialogFooter>
        <NqButton type="button" variant="primary" @click="emit('close')">{{ props.t.done }}</NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
