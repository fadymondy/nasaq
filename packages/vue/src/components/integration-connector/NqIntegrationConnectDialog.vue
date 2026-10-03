<script setup lang="ts">
import { ref, useId } from "vue";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import type { IntegrationConnectorStrings } from "./strings";
import type { IntegrationResult, IntegrationService } from "./types";

// The consent dialog: exactly which permissions are asked for, required ones locked, then the host starts OAuth.
// Mounted only while open, so the ticked scopes always start from the service's current grant.
interface Props {
  service: IntegrationService;
  t: IntegrationConnectorStrings;
  onConnect: (id: string, scopeIds: string[]) => Promise<IntegrationResult>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const id = useId();
const granted = props.service.status === "connected" ? (props.service.grantedScopes ?? props.service.scopes.map((s) => s.id)) : null;
const picked = ref<string[]>(props.service.scopes.filter((s) => s.required || !granted || granted.includes(s.id)).map((s) => s.id));
const error = ref<string | null>(null);
const pending = ref(false);

function setPicked(scopeId: string, on: boolean) {
  picked.value = on ? [...picked.value, scopeId] : picked.value.filter((x) => x !== scopeId);
}

async function submit() {
  if (pending.value) return;
  if (picked.value.length === 0) {
    error.value = props.t.noPermissions;
    return;
  }
  pending.value = true;
  error.value = null;
  try {
    const result = await props.onConnect(props.service.id, picked.value);
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
  <NqDialog open @update:open="(open) => !open && !pending && emit('close')">
    <NqDialogContent data-slot="integration-connect-dialog">
      <form class="grid gap-4" @submit.prevent="submit()">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.dialogTitle(props.service.name) }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.dialogBody(props.service.name) }}</NqDialogDescription>
        </NqDialogHeader>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <fieldset class="grid gap-2 border-0 p-0">
          <legend class="mb-1 text-label text-foreground">{{ props.t.dialogPermissions }}</legend>
          <ul class="grid gap-1 rounded-card border border-border p-2">
            <li v-for="s in props.service.scopes" :key="s.id" class="flex items-start gap-2.5 rounded-control px-2 py-1.5">
              <NqCheckbox :id="`${id}-${s.id}`" class="mt-0.5" :model-value="picked.includes(s.id)" :disabled="s.required" @update:model-value="(v) => setPicked(s.id, v)" />
              <label :for="`${id}-${s.id}`" class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 text-body-sm text-foreground">
                {{ s.label }}
                <NqBadge v-if="s.required" variant="outline">{{ props.t.required }}</NqBadge>
              </label>
            </li>
          </ul>
        </fieldset>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending">{{ props.t.continue(props.service.name) }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
