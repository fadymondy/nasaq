<script setup lang="ts">
import { ref, useId } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import type { BoardSettingValue } from "./board-math";
import type { DashboardBoardLabels } from "./board-strings";
import type { DashboardWidgetDef } from "./board-types";

// The per-widget settings dialog of the dashboard board. Internal: the board mounts it while a card's Settings is open.
const props = defineProps<{
  def?: DashboardWidgetDef;
  initial: Record<string, BoardSettingValue>;
  labels: DashboardBoardLabels;
  onSave: (values: Record<string, BoardSettingValue>) => void | Promise<void>;
}>();
const emit = defineEmits<{ close: [] }>();

const values = ref<Record<string, BoardSettingValue>>({ ...props.initial });
const busy = ref(false);
const failed = ref(false);
const base = useId();
const set = (key: string, value: BoardSettingValue) => (values.value = { ...values.value, [key]: value });

async function submit() {
  busy.value = true;
  failed.value = false;
  try {
    await props.onSave(values.value);
  } catch {
    failed.value = true;
    busy.value = false;
  }
}
const onOpen = (open: boolean) => {
  if (!open && !busy.value) emit("close");
};
</script>

<template>
  <NqDialog :open="true" @update:open="onOpen">
    <NqDialogContent :close-label="props.labels.close" data-slot="dashboard-board-settings">
      <NqDialogHeader>
        <NqDialogTitle>{{ props.labels.settingsTitle(props.def?.title ?? "") }}</NqDialogTitle>
        <NqDialogDescription>{{ props.labels.settingsBody }}</NqDialogDescription>
      </NqDialogHeader>
      <form class="grid gap-4" @submit.prevent="submit">
        <template v-for="f in props.def?.fields ?? []" :key="f.key">
          <div v-if="f.type === 'toggle'" class="flex items-center justify-between gap-3">
            <span :id="`${base}-${f.key}`" class="text-body">{{ f.label }}</span>
            <NqSwitch :model-value="values[f.key] === true" :aria-labelledby="`${base}-${f.key}`" @update:model-value="set(f.key, $event)" />
          </div>
          <div v-else-if="f.type === 'select'" class="grid gap-1.5">
            <span :id="`${base}-${f.key}`" class="text-label font-medium">{{ f.label }}</span>
            <NqSelect :model-value="String(values[f.key] ?? '')" @update:model-value="(v) => v !== null && set(f.key, String(v))">
              <NqSelectTrigger :aria-labelledby="`${base}-${f.key}`"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </div>
          <NqField v-else>
            <NqFieldLabel>{{ f.label }}</NqFieldLabel>
            <NqInput
              v-if="f.type === 'number'"
              type="number"
              inputmode="numeric"
              ltr
              :min="f.min"
              :max="f.max"
              :step="f.step"
              :model-value="String(values[f.key] ?? '')"
              @update:model-value="(v) => set(f.key, v === '' ? '' : Number(v))"
            />
            <NqInput v-else :placeholder="f.placeholder" :model-value="String(values[f.key] ?? '')" @update:model-value="(v) => set(f.key, String(v ?? ''))" />
          </NqField>
        </template>
        <p v-if="failed" role="alert" class="text-body-sm text-danger">{{ props.labels.settingsFailed }}</p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="busy" @click="emit('close')">{{ props.labels.cancel }}</NqButton>
          <NqButton type="submit" :loading="busy">{{ props.labels.settingsSave }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
