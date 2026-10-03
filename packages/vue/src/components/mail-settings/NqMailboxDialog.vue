<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { validateMailbox } from "./mail-format";
import type { MailSettingsLabels } from "./strings";
import type { MailboxInput, MailResult } from "./types";

// Add a mailbox: local part, quota in MB and a password.
interface Props {
  open: boolean;
  domain: string;
  t: MailSettingsLabels;
  onAdd: (input: MailboxInput) => Promise<MailResult> | MailResult;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:open": [value: boolean] }>();

const local = ref("");
const quota = ref("2048");
const password = ref("");
const touched = ref(false);
const pending = ref(false);
const error = ref<string | null>(null);
watch(
  () => props.open,
  (open) => {
    if (open) {
      local.value = "";
      quota.value = "2048";
      password.value = "";
      touched.value = false;
      error.value = null;
    }
  },
);
const problems = computed(() => validateMailbox({ local: local.value, quotaMb: quota.value, password: password.value }));

function onOpen(next: boolean) {
  if (!pending.value) emit("update:open", next);
}

async function submit() {
  touched.value = true;
  if (problems.value.length) return;
  pending.value = true;
  error.value = null;
  try {
    const result = await props.onAdd({ local: local.value.trim().toLowerCase(), quotaMb: Number(quota.value), password: password.value });
    if (result && result.error) error.value = result.error;
    else emit("update:open", false);
  } catch {
    error.value = props.t.genericError;
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="onOpen">
    <NqDialogContent data-slot="mail-add-mailbox" class="max-w-md">
      <form novalidate class="flex flex-col gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.addMailboxTitle }}</NqDialogTitle>
          <NqDialogDescription><bdi dir="ltr">@{{ props.domain }}</bdi></NqDialogDescription>
        </NqDialogHeader>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <NqField :invalid="touched && problems.includes('local')">
          <NqFieldLabel>{{ props.t.localPart }}</NqFieldLabel>
          <NqInput v-model="local" ltr :placeholder="props.t.localPlaceholder" autocomplete="off" :spellcheck="false" />
          <NqFieldError v-if="touched && problems.includes('local')" match>{{ props.t.localInvalid }}</NqFieldError>
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="touched && problems.includes('quota')">
            <NqFieldLabel>{{ props.t.quotaLabel }}</NqFieldLabel>
            <NqInput v-model="quota" ltr inputmode="numeric" autocomplete="off" />
            <NqFieldError v-if="touched && problems.includes('quota')" match>{{ props.t.quotaInvalid }}</NqFieldError>
          </NqField>
          <NqField :invalid="touched && problems.includes('password')">
            <NqFieldLabel>{{ props.t.mailboxPassword }}</NqFieldLabel>
            <NqInput v-model="password" ltr type="password" autocomplete="new-password" />
            <NqFieldError v-if="touched && problems.includes('password')" match>{{ props.t.mailboxPasswordInvalid }}</NqFieldError>
          </NqField>
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending">{{ props.t.add }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
