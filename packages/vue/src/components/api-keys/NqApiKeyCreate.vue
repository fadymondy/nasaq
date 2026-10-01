<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { toggleScope } from "./format";
import type { ApiKeysLabels } from "./strings";
import type { ApiKeyCreateInput, ApiKeyScope, ApiKeySecretResult } from "./types";

interface Props {
  open: boolean;
  scopes: readonly ApiKeyScope[];
  defaultScopes: readonly string[];
  expiryOptions: readonly (number | null)[];
  defaultExpiryDays: number | null;
  onCreate: (input: ApiKeyCreateInput) => Promise<ApiKeySecretResult>;
  t: ApiKeysLabels;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:open": [open: boolean]; created: [secret: string] }>();

const id = `nq-api-key-${useId()}`;
const name = ref("");
const picked = ref<string[]>([...props.defaultScopes]);
const expiry = ref<string>(String(props.defaultExpiryDays ?? "never"));
const errors = ref<{ name?: string; scopes?: string; form?: string }>({});
const pending = ref(false);
const all = computed(() => props.scopes.map((s) => s.id));
const items = computed(() => props.expiryOptions.map((d) => ({ value: String(d ?? "never"), label: props.t.expiryLabel(d) })));

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    name.value = "";
    picked.value = [...props.defaultScopes];
    expiry.value = String(props.defaultExpiryDays ?? "never");
    errors.value = {};
  },
  { immediate: true },
);

async function submit() {
  if (pending.value) return;
  const next: typeof errors.value = {};
  if (!name.value.trim()) next.name = props.t.nameRequired;
  if (picked.value.length === 0) next.scopes = props.t.scopesRequired;
  errors.value = next;
  if (next.name || next.scopes) return;
  pending.value = true;
  try {
    const result = await props.onCreate({ name: name.value.trim(), scopes: picked.value, expiresInDays: expiry.value === "never" ? null : Number(expiry.value) });
    if (result.error !== undefined) errors.value = { form: result.error };
    else {
      emit("update:open", false);
      emit("created", result.secret);
    }
  } catch {
    errors.value = { form: props.t.genericError };
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(next: boolean) => !pending && emit('update:open', next)">
    <NqDialogContent data-slot="api-key-create">
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.createTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.createBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqAlert v-if="errors.form" tone="danger">{{ errors.form }}</NqAlert>
        <NqField :invalid="Boolean(errors.name)">
          <NqFieldLabel>{{ props.t.name }}</NqFieldLabel>
          <NqInput v-model="name" :placeholder="props.t.namePlaceholder" autocomplete="off" maxlength="60" />
          <NqFieldError v-if="errors.name" :match="true">{{ errors.name }}</NqFieldError>
        </NqField>
        <fieldset class="grid gap-2 border-0 p-0" :aria-describedby="`${id}-scopes`">
          <legend class="mb-1 text-label text-foreground">{{ props.t.scopes }}</legend>
          <p :id="`${id}-scopes`" class="text-caption text-muted-foreground">{{ props.t.scopesHint }}</p>
          <ul class="grid gap-1 rounded-card border border-border p-2">
            <li v-for="s in props.scopes" :key="s.id" class="flex items-start gap-2.5 rounded-control px-2 py-1.5 hover:bg-nq-hover">
              <NqCheckbox :id="`${id}-${s.id}`" class="mt-0.5" :model-value="picked.includes(s.id)" @update:model-value="picked = toggleScope(picked, s.id, all)" />
              <label :for="`${id}-${s.id}`" class="grid min-w-0 flex-1 cursor-pointer gap-0.5">
                <span class="text-body-sm text-foreground">{{ s.label }}</span>
                <span v-if="s.description" class="text-caption text-muted-foreground">{{ s.description }}</span>
              </label>
            </li>
          </ul>
          <p v-if="errors.scopes" role="alert" class="text-caption text-nq-danger-text">{{ errors.scopes }}</p>
        </fieldset>
        <NqField>
          <NqFieldLabel>{{ props.t.expiry }}</NqFieldLabel>
          <NqSelect :model-value="expiry" @update:model-value="(v: string | number | null) => v && (expiry = String(v))">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="o in items" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending">{{ props.t.submit }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
