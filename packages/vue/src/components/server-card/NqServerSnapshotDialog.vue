<script setup lang="ts">
import { ref, watch } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import type { ServerCardStrings } from "./strings";

// "Take a snapshot": an optional name, then the host callback runs.
interface Props {
  open: boolean;
  t: ServerCardStrings;
  onCreate: (name: string) => Promise<void>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const name = ref("");
const saving = ref(false);
watch(
  () => props.open,
  (open) => {
    if (open) name.value = "";
  },
);

function setOpen(next: boolean) {
  if (!saving.value) emit("update:open", next);
}

async function submit() {
  saving.value = true;
  try {
    await props.onCreate(name.value.trim());
  } finally {
    saving.value = false;
    emit("update:open", false);
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="setOpen">
    <NqDialogContent data-slot="server-snapshot-dialog">
      <form class="grid gap-4" @submit.prevent="submit()">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.takeSnapshot }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.snapshotsBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField>
          <NqFieldLabel>{{ props.t.snapshotName }}</NqFieldLabel>
          <NqInput v-model="name" :maxlength="60" dir="auto" />
          <NqFieldDescription>{{ props.t.snapshotNameHint }}</NqFieldDescription>
        </NqField>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="saving" @click="setOpen(false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="saving">{{ props.t.snapshotCreate }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
