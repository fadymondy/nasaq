<script setup lang="ts">
import { Eye, EyeOff } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import type { VaultLabels } from "./strings";
import type { VaultResult, VaultSecret, VaultSecretInput, VaultSecretKind } from "./types";

// The add / edit dialog of NqVault.
const props = defineProps<{
  initial: VaultSecret | undefined;
  groups: string[];
  secrets: readonly VaultSecret[];
  onSave: (input: VaultSecretInput) => Promise<VaultResult>;
  t: VaultLabels;
}>();
const emit = defineEmits<{ close: [] }>();

const KINDS: VaultSecretKind[] = ["api-key", "password", "token", "certificate", "ssh-key", "other"];
const name = ref(props.initial?.name ?? "");
const group = ref(props.initial?.group ?? "");
const kind = ref<VaultSecretKind>(props.initial?.kind ?? "api-key");
const value = ref("");
const note = ref(props.initial?.description ?? "");
const expires = ref(props.initial?.expiresAt ? new Date(props.initial.expiresAt).toISOString().slice(0, 10) : "");
const showValue = ref(false);
const touched = ref(false);
const error = ref<string | null>(null);
const pending = ref(false);
const id = `nq-vault-${useId()}`;

const trimmed = computed(() => name.value.trim());
const nameProblem = computed(() =>
  trimmed.value === ""
    ? props.t.nameEmpty
    : props.secrets.some((s) => s.id !== props.initial?.id && s.name === trimmed.value && s.group.trim() === group.value.trim())
      ? props.t.nameDuplicate
      : null,
);
const valueProblem = computed(() => (!props.initial && value.value === "" ? props.t.valueEmpty : null));
const invalid = computed(() => nameProblem.value !== null || valueProblem.value !== null);
const kindItems = computed(() => KINDS.map((k) => ({ value: k, label: props.t.kind[k] })));

async function submit() {
  touched.value = true;
  if (invalid.value || pending.value) return;
  pending.value = true;
  error.value = null;
  try {
    const input: VaultSecretInput = {
      name: trimmed.value,
      group: group.value.trim(),
      kind: kind.value,
      value: value.value,
      ...(note.value.trim() ? { description: note.value.trim() } : {}),
      ...(expires.value ? { expiresAt: expires.value } : {}),
    };
    const result = await props.onSave(input);
    if (result?.error) error.value = result.error;
    else emit("close");
  } catch {
    error.value = props.t.genericError;
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <NqDialog :open="true" @update:open="(open: boolean) => !open && !pending && emit('close')">
    <NqDialogContent data-slot="vault-secret-dialog">
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.initial ? props.t.editTitle(props.initial.name) : props.t.addTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.groupHint }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="touched && nameProblem !== null">
          <NqFieldLabel>{{ props.t.nameLabel }}</NqFieldLabel>
          <NqInput
            v-model="name"
            ltr
            autocomplete="off"
            :spellcheck="false"
            placeholder="STRIPE_SECRET_KEY"
            class="font-mono text-code"
            :aria-describedby="touched && nameProblem ? `${id}-name` : undefined"
            @blur="touched = true"
          />
          <p v-if="touched && nameProblem" :id="`${id}-name`" role="alert" class="text-caption text-nq-danger-text">{{ nameProblem }}</p>
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField>
            <NqFieldLabel>{{ props.t.groupLabel }}</NqFieldLabel>
            <NqInput v-model="group" :list="`${id}-groups`" autocomplete="off" />
            <datalist :id="`${id}-groups`">
              <option v-for="g in props.groups" :key="g" :value="g" />
            </datalist>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ props.t.kindLabel }}</NqFieldLabel>
            <NqSelect :model-value="kind" @update:model-value="(v: string | number | null) => v && (kind = v as VaultSecretKind)">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="k in kindItems" :key="k.value" :value="k.value">{{ k.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
        </div>
        <NqField :invalid="touched && valueProblem !== null">
          <NqFieldLabel>{{ props.t.valueLabel }}</NqFieldLabel>
          <NqTextarea
            v-model="value"
            dir="ltr"
            rows="3"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            :spellcheck="false"
            :class="cn('min-h-20 font-mono text-code text-start', !showValue && '[-webkit-text-security:disc]')"
            @blur="touched = true"
          />
          <span v-if="props.initial" class="text-caption text-muted-foreground">{{ props.t.valueKeep }}</span>
          <p v-if="touched && valueProblem" role="alert" class="text-caption text-nq-danger-text">{{ valueProblem }}</p>
          <button
            type="button"
            :aria-pressed="showValue"
            class="inline-flex w-fit items-center gap-1 text-caption text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="showValue = !showValue"
          >
            <EyeOff v-if="showValue" aria-hidden="true" class="size-3.5" />
            <Eye v-else aria-hidden="true" class="size-3.5" />
            {{ props.t.showValue }}
          </button>
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField>
            <NqFieldLabel>{{ props.t.noteLabel }}</NqFieldLabel>
            <NqInput v-model="note" autocomplete="off" />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ props.t.expiryLabel }}</NqFieldLabel>
            <NqInput v-model="expires" ltr type="date" />
          </NqField>
        </div>
        <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending">{{ props.t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
