<script setup lang="ts">
import { computed, ref } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqTextarea } from "../field";
import type { ApprovalItem } from "./approval-queue-logic";
import type { Strings } from "./approval-queue-strings";

// The reason dialog shown when rejecting. A reason is required.
interface Props {
  item: ApprovalItem | null;
  t: Strings;
  /** Resolves to an error message, or null when saved. */
  onSubmit: (id: string, reason: string) => Promise<string | null>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ cancel: [] }>();

const reason = ref("");
const touched = ref(false);
const error = ref<string | null>(null);
const busy = ref(false);
const empty = computed(() => reason.value.trim() === "");

function reset() {
  reason.value = "";
  touched.value = false;
  error.value = null;
}
function close() {
  if (busy.value) return;
  reset();
  emit("cancel");
}
async function submit() {
  touched.value = true;
  if (!props.item || empty.value) return;
  busy.value = true;
  error.value = null;
  const err = await props.onSubmit(props.item.id, reason.value.trim());
  busy.value = false;
  if (err) error.value = err;
  else reset();
}
</script>

<template>
  <NqDialog :open="props.item !== null" @update:open="(open: boolean) => !open && close()">
    <NqDialogContent data-slot="approval-reject">
      <NqDialogHeader>
        <NqDialogTitle>{{ props.item ? props.t.rejectTitle(props.item.title) : "" }}</NqDialogTitle>
        <NqDialogDescription>{{ props.t.rejectBody }}</NqDialogDescription>
      </NqDialogHeader>
      <NqField :invalid="touched && empty">
        <NqFieldLabel>{{ props.t.reasonLabel }}</NqFieldLabel>
        <NqTextarea v-model="reason" :placeholder="props.t.reasonPlaceholder" :rows="3" />
        <NqFieldError v-if="touched && empty" match>{{ props.t.reasonRequired }}</NqFieldError>
      </NqField>
      <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
      <NqDialogFooter>
        <NqButton variant="ghost" :disabled="busy" @click="close">{{ props.t.cancel }}</NqButton>
        <NqButton variant="danger" :loading="busy" @click="submit">{{ props.t.reject }}</NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
