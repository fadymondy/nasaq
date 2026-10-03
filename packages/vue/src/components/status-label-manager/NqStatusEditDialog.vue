<script setup lang="ts">
import { computed, ref } from "vue";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqColorPicker, type ColorSwatch } from "../color-picker";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NAME_MAX, STATUS_HUES, STATUS_STAGES, validateName, type StatusHue, type StatusStage, type WorkLabel, type WorkStatus } from "./status-label-logic";
import type { StatusLabelStrings } from "./strings";
import type { LabelDraft, StatusDraft, StatusLabelResult } from "./types";

// The create / edit dialog for one status or label. The parent keys it by what is being edited, so the draft resets when another item opens.
const props = defineProps<{
  kind: "status" | "label";
  item: WorkStatus | WorkLabel | null;
  statuses: WorkStatus[];
  labels: WorkLabel[];
  t: StatusLabelStrings;
  onSaveStatus: (draft: StatusDraft) => Promise<StatusLabelResult>;
  onSaveLabel: (draft: LabelDraft) => Promise<StatusLabelResult>;
}>();
const emit = defineEmits<{ close: [] }>();

const isStatus = props.kind === "status";
const name = ref(props.item?.name ?? "");
const hue = ref<StatusHue>(props.item?.hue ?? "blue");
const stage = ref<StatusStage>(isStatus ? ((props.item as WorkStatus | null)?.stage ?? "todo") : "todo");
const touched = ref(false);
const busy = ref(false);
const error = ref<string | null>(null);

const nameError = computed(() => validateName(name.value, isStatus ? props.statuses : props.labels, props.item?.id));
const message = computed(() => (nameError.value ? (nameError.value === "tooLong" ? props.t.errors.tooLong(NAME_MAX) : props.t.errors[nameError.value]) : null));
const swatches = computed<ColorSwatch[]>(() => STATUS_HUES.map((h) => ({ value: `--nq-tag-${h}`, label: props.t.colours[h] })));
const stageItems = computed(() => STATUS_STAGES.map((s) => ({ value: s, label: props.t.stage[s] })));

function setHue(value: string | null) {
  hue.value = (STATUS_HUES.find((h) => value === `--nq-tag-${h}`) ?? "gray") as StatusHue;
}

async function submit() {
  touched.value = true;
  if (nameError.value) return;
  busy.value = true;
  error.value = null;
  let failure: string | null = null;
  try {
    const id = props.item?.id;
    const r = isStatus ? await props.onSaveStatus({ id, name: name.value.trim(), hue: hue.value, stage: stage.value }) : await props.onSaveLabel({ id, name: name.value.trim(), hue: hue.value });
    if (r && typeof r === "object" && r.error) failure = r.error;
  } catch {
    failure = props.t.failed;
  }
  busy.value = false;
  if (failure) error.value = failure;
  else emit("close");
}
</script>

<template>
  <NqDialog open @update:open="(o: boolean) => !o && emit('close')">
    <NqDialogContent data-slot="status-label-edit">
      <NqDialogHeader>
        <NqDialogTitle>{{ isStatus ? props.t.editStatus : props.t.editLabel }}</NqDialogTitle>
        <NqDialogDescription>{{ isStatus ? props.t.statusesBody : props.t.labelsBody }}</NqDialogDescription>
      </NqDialogHeader>
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <NqField :invalid="touched && nameError !== null">
          <NqFieldLabel>{{ props.t.name }}</NqFieldLabel>
          <NqInput v-model="name" autofocus />
          <NqFieldError v-if="touched && message" match>{{ message }}</NqFieldError>
          <NqFieldDescription v-else>{{ props.t.nameHint(NAME_MAX) }}</NqFieldDescription>
        </NqField>
        <div class="flex flex-col gap-1.5">
          <span class="text-label text-foreground">{{ props.t.colour }}</span>
          <NqColorPicker :model-value="`--nq-tag-${hue}`" :swatches="swatches" :allow-hex="false" :allow-native="false" :aria-label="props.t.colour" @update:model-value="setHue" />
        </div>
        <NqField v-if="isStatus">
          <NqFieldLabel>{{ props.t.stageField }}</NqFieldLabel>
          <NqSelect :model-value="stage" @update:model-value="(v: string | number | null) => v && (stage = v as StatusStage)">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="o in stageItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
        <div class="flex items-center gap-2 text-caption text-muted-foreground">
          {{ props.t.preview }}
          <NqBadge variant="tag" :hue="hue">{{ name.trim() || "…" }}</NqBadge>
        </div>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="busy" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="busy">{{ props.item ? props.t.save : props.t.create }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
