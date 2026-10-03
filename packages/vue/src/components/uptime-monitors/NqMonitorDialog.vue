<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import type { UptimeStrings } from "./strings";
import type { MonitorInput, UptimeMonitor, UptimeResult } from "./types";

// The add / edit form of UptimeMonitors, in a dialog. Internal.
const props = defineProps<{
  open: boolean;
  monitor: UptimeMonitor | null;
  onSave: (input: MonitorInput, id?: string) => Promise<UptimeResult>;
  t: UptimeStrings;
}>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const name = ref("");
const target = ref("");
const kind = ref<UptimeMonitor["kind"]>("http");
const interval = ref("60");
const tried = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

watch(
  () => [props.open, props.monitor] as const,
  ([open]) => {
    if (!open) return;
    name.value = props.monitor?.name ?? "";
    target.value = props.monitor?.target ?? "";
    kind.value = props.monitor?.kind ?? "http";
    interval.value = String(props.monitor?.intervalSec ?? 60);
    tried.value = false;
    error.value = null;
  },
  { immediate: true },
);

const kindItems = computed(() => Object.keys(props.t.kinds).map((k) => ({ value: k, label: props.t.kinds[k] as string })));
const intervalItems = computed(() => Object.keys(props.t.intervals).map((k) => ({ value: k, label: props.t.intervals[Number(k)] as string })));

async function submit() {
  if (saving.value) return;
  tried.value = true;
  if (!name.value.trim() || !target.value.trim()) return;
  saving.value = true;
  error.value = null;
  try {
    const result = await props.onSave({ name: name.value.trim(), target: target.value.trim(), kind: kind.value, intervalSec: Number(interval.value) }, props.monitor?.id);
    if (result && result.error) error.value = result.error;
    else emit("update:open", false);
  } catch {
    error.value = props.t.genericError;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(next: boolean) => !saving && emit('update:open', next)">
    <NqDialogContent data-slot="monitor-dialog">
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.monitor ? props.t.dialogEdit : props.t.dialogNew }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.dialogBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <NqField :invalid="tried && !name.trim()">
          <NqFieldLabel>{{ props.t.name }}</NqFieldLabel>
          <NqInput v-model="name" dir="auto" />
          <NqFieldError v-if="tried && !name.trim()" :match="true">{{ props.t.required }}</NqFieldError>
        </NqField>
        <NqField :invalid="tried && !target.trim()">
          <NqFieldLabel>{{ props.t.target }}</NqFieldLabel>
          <NqInput v-model="target" ltr placeholder="https://example.com/health" />
          <NqFieldError v-if="tried && !target.trim()" :match="true">{{ props.t.required }}</NqFieldError>
          <p v-else class="mt-1 text-caption text-muted-foreground">{{ props.t.targetHint }}</p>
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField>
            <NqFieldLabel>{{ props.t.kind }}</NqFieldLabel>
            <NqSelect :model-value="kind" @update:model-value="(v: string | number | null) => v && (kind = String(v) as UptimeMonitor['kind'])">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="o in kindItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ props.t.interval }}</NqFieldLabel>
            <NqSelect :model-value="interval" @update:model-value="(v: string | number | null) => v && (interval = String(v))">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="o in intervalItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="saving" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="saving">{{ props.t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
