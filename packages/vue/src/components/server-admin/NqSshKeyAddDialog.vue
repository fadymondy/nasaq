<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { parseSshPublicKey } from "./format";
import type { ServerAdminLabels } from "./strings";
import type { ServerAdminResult, SshKeyInput } from "./types";

// The add-key dialog of NqSshKeyManager. Internal: use NqSshKeyManager.
const props = defineProps<{ open: boolean; onAdd: (input: SshKeyInput) => Promise<ServerAdminResult>; t: ServerAdminLabels }>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const name = ref("");
const text = ref("");
const touched = ref(false);
const pending = ref(false);
const error = ref<string | null>(null);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    name.value = "";
    text.value = "";
    touched.value = false;
    error.value = null;
  },
);

const parsed = computed(() => parseSshPublicKey(text.value));
const nameError = computed(() => touched.value && name.value.trim() === "");
const keyError = computed(() => {
  const p = parsed.value;
  return touched.value && !p.ok ? props.t.keyProblems[p.problem] : null;
});
// A private key is dangerous enough to warn about the moment it is pasted, not only on submit.
const privateKey = computed(() => {
  const p = parsed.value;
  return !p.ok && p.problem === "private" ? props.t.keyProblems.private : null;
});
const detected = computed(() => {
  const p = parsed.value;
  return p.ok ? props.t.keyDetected(p.type, p.comment) : null;
});

async function submit() {
  touched.value = true;
  if (!name.value.trim() || !parsed.value.ok) return;
  pending.value = true;
  error.value = null;
  try {
    const result = await props.onAdd({ name: name.value.trim(), publicKey: text.value.trim() });
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
  <NqDialog :open="props.open" @update:open="(next: boolean) => !pending && emit('update:open', next)">
    <NqDialogContent data-slot="ssh-key-add" class="max-w-lg">
      <form novalidate class="flex flex-col gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.addKeyTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.addKeyBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <NqAlert v-if="privateKey" tone="danger">{{ privateKey }}</NqAlert>
        <NqField :invalid="nameError">
          <NqFieldLabel>{{ props.t.keyName }}</NqFieldLabel>
          <NqInput v-model="name" :placeholder="props.t.keyNamePlaceholder" autocomplete="off" />
          <NqFieldError v-if="nameError" :match="true">{{ props.t.keyNameRequired }}</NqFieldError>
        </NqField>
        <NqField :invalid="keyError !== null && !privateKey">
          <NqFieldLabel>{{ props.t.publicKey }}</NqFieldLabel>
          <NqTextarea
            v-model="text"
            dir="ltr"
            :rows="4"
            :spellcheck="false"
            autocomplete="off"
            placeholder="ssh-ed25519 AAAAC3Nza… you@laptop"
            class="text-start font-mono text-code"
          />
          <NqFieldError v-if="keyError && !privateKey" :match="true">{{ keyError }}</NqFieldError>
          <NqFieldDescription v-if="detected">{{ detected }}</NqFieldDescription>
        </NqField>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending">{{ props.t.addKey }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
