<script setup lang="ts">
import { OctagonX } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqTextarea } from "../field";
import type { KillSwitchStrings } from "./strings";
import type { KillSwitchResult } from "./types";

// The reason step of the emergency stop. A reason is required; a failure keeps the dialog open.
interface Props {
  open: boolean;
  t: KillSwitchStrings;
  onPause: (reason: string) => Promise<KillSwitchResult>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const reason = ref("");
const touched = ref(false);
const busy = ref(false);
const error = ref<string | null>(null);
const empty = computed(() => reason.value.trim() === "");

function close() {
  if (busy.value) return;
  reason.value = "";
  touched.value = false;
  error.value = null;
  emit("close");
}

async function submit() {
  touched.value = true;
  if (empty.value) return;
  busy.value = true;
  error.value = null;
  let message: string | null = null;
  try {
    const r = await props.onPause(reason.value.trim());
    if (r && typeof r === "object" && r.error) message = r.error;
  } catch {
    message = props.t.failed;
  }
  busy.value = false;
  if (message) error.value = message;
  else {
    reason.value = "";
    touched.value = false;
    emit("close");
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(o: boolean) => !o && close()">
    <NqDialogContent data-slot="kill-switch-dialog">
      <NqDialogHeader>
        <NqDialogTitle>{{ props.t.stopTitle }}</NqDialogTitle>
        <NqDialogDescription>{{ props.t.stopBody }}</NqDialogDescription>
      </NqDialogHeader>
      <NqField :invalid="touched && empty">
        <NqFieldLabel>{{ props.t.reasonLabel }}</NqFieldLabel>
        <NqTextarea v-model="reason" :placeholder="props.t.reasonPlaceholder" rows="3" />
        <NqFieldError v-if="touched && empty" match>{{ props.t.reasonRequired }}</NqFieldError>
        <p v-else class="text-caption text-muted-foreground">{{ props.t.reasonHint }}</p>
      </NqField>
      <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
      <NqDialogFooter>
        <NqButton variant="ghost" :disabled="busy" @click="close">{{ props.t.cancel }}</NqButton>
        <NqButton variant="danger" :loading="busy" @click="submit">
          <OctagonX aria-hidden="true" />
          {{ props.t.stopConfirm }}
        </NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
