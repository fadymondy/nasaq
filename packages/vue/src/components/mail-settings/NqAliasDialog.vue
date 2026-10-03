<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { validateAlias } from "./mail-format";
import type { MailSettingsLabels } from "./strings";
import type { AliasInput, MailResult } from "./types";

// Add an alias: the part before the @ (or * for a catch-all) and the address it forwards to.
interface Props {
  open: boolean;
  domain: string;
  t: MailSettingsLabels;
  onAdd: (input: AliasInput) => Promise<MailResult> | MailResult;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:open": [value: boolean] }>();

const source = ref("");
const destination = ref("");
const touched = ref(false);
const pending = ref(false);
const error = ref<string | null>(null);
watch(
  () => props.open,
  (open) => {
    if (open) {
      source.value = "";
      destination.value = "";
      touched.value = false;
      error.value = null;
    }
  },
);
const problems = computed(() => validateAlias({ source: source.value, destination: destination.value }));

function onOpen(next: boolean) {
  if (!pending.value) emit("update:open", next);
}

async function submit() {
  touched.value = true;
  if (problems.value.length) return;
  pending.value = true;
  error.value = null;
  try {
    const result = await props.onAdd({ source: source.value.trim().toLowerCase(), destination: destination.value.trim() });
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
    <NqDialogContent data-slot="mail-add-alias" class="max-w-md">
      <form novalidate class="flex flex-col gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.addAliasTitle }}</NqDialogTitle>
          <NqDialogDescription><bdi dir="ltr">@{{ props.domain }}</bdi></NqDialogDescription>
        </NqDialogHeader>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <NqField :invalid="touched && problems.includes('source')">
          <NqFieldLabel>{{ props.t.aliasSourceLabel }}</NqFieldLabel>
          <NqInput v-model="source" ltr :placeholder="props.t.aliasSourcePlaceholder" autocomplete="off" :spellcheck="false" />
          <NqFieldError v-if="touched && problems.includes('source')" match>{{ props.t.aliasSourceInvalid }}</NqFieldError>
        </NqField>
        <NqField :invalid="touched && problems.includes('destination')">
          <NqFieldLabel>{{ props.t.aliasDestLabel }}</NqFieldLabel>
          <NqInput v-model="destination" ltr type="email" :placeholder="props.t.aliasDestPlaceholder" autocomplete="off" />
          <NqFieldError v-if="touched && problems.includes('destination')" match>{{ props.t.aliasDestInvalid }}</NqFieldError>
        </NqField>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending">{{ props.t.add }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
