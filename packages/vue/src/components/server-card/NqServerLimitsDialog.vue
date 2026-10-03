<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { LIMIT_RANGES, validateLimits, type ServerLimitField, type ServerLimits } from "./server-format";
import type { ServerCardStrings } from "./strings";

// The resource limits editor: three whole numbers, checked against LIMIT_RANGES before the host callback runs.
interface Props {
  open: boolean;
  limits: ServerLimits;
  t: ServerCardStrings;
  onSave: (limits: ServerLimits) => Promise<void>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const keys = Object.keys(LIMIT_RANGES) as ServerLimitField[];
const initial = (): Record<ServerLimitField, string> => ({ cpuCores: String(props.limits.cpuCores), memoryMb: String(props.limits.memoryMb), diskGb: String(props.limits.diskGb) });
const raw = ref(initial());
const tried = ref(false);
const saving = ref(false);
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    raw.value = initial();
    tried.value = false;
  },
);
const checked = computed(() => validateLimits(raw.value));

function setOpen(next: boolean) {
  if (!saving.value) emit("update:open", next);
}

async function submit() {
  tried.value = true;
  const value = checked.value.value;
  if (!value) return;
  saving.value = true;
  try {
    await props.onSave(value);
  } finally {
    saving.value = false;
    emit("update:open", false);
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="setOpen">
    <NqDialogContent data-slot="server-limits">
      <form class="grid gap-4" novalidate @submit.prevent="submit()">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.limits }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.limitsBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField v-for="key in keys" :key="key" :invalid="Boolean(tried && checked.errors[key])">
          <NqFieldLabel>{{ props.t.limitFields[key] }}</NqFieldLabel>
          <NqInput v-model="raw[key]" ltr inputmode="numeric" />
          <NqFieldError v-if="tried && checked.errors[key]" match>{{ checked.errors[key] === "integer" ? props.t.limitErrors.integer : props.t.limitErrors.range(LIMIT_RANGES[key].min, LIMIT_RANGES[key].max) }}</NqFieldError>
        </NqField>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="saving" @click="setOpen(false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="saving">{{ props.t.limitsSave }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
