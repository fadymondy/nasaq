<script setup lang="ts">
import { Plus, X } from "lucide-vue-next";
import { computed, ref, useId, watch } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqIcon } from "../icon";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import {
  boardSectionChanged,
  duplicateSectionSettingKeys,
  sectionSettingRows,
  sectionSettingsFromRows,
  type BoardSection,
  type BoardSectionModel,
  type BoardSettingRow,
} from "./section-board-logic";
import type { SectionBoardLabels } from "./section-board-strings";

// The editor dialog of NqSectionBoard: title, tag, prompt, model and key/value settings. Internal.
const props = defineProps<{
  section: BoardSection | null;
  models: readonly BoardSectionModel[];
  t: SectionBoardLabels;
}>();
const emit = defineEmits<{ close: []; save: [section: BoardSection] }>();

const DEFAULT_MODEL = "__default__";
const SETTING_ICON_BUTTON = "text-muted-foreground hover:text-nq-danger-text";

const draft = ref<BoardSection | null>(props.section ? { ...props.section } : null);
const rows = ref<BoardSettingRow[]>(sectionSettingRows(props.section?.settings));
const tried = ref(false);
const formId = useId();

// A fresh draft each time the dialog opens for a section.
watch(
  () => props.section,
  (section) => {
    draft.value = section ? { ...section } : null;
    rows.value = sectionSettingRows(section?.settings);
    tried.value = false;
  },
);

const dupes = computed(() => duplicateSectionSettingKeys(rows.value));
const next = computed<BoardSection | null>(() => (draft.value ? { ...draft.value, title: draft.value.title.trim(), settings: sectionSettingsFromRows(rows.value) } : null));
const missingTitle = computed(() => !next.value?.title);
const changed = computed(() => !!(props.section && next.value && boardSectionChanged(props.section, next.value)));
const items = computed(() => [{ value: DEFAULT_MODEL, label: props.t.defaultModel }, ...props.models.map((m) => ({ value: m.value, label: m.label ?? m.value }))]);

const patch = (change: Partial<BoardSection>) => {
  if (draft.value) draft.value = { ...draft.value, ...change };
};
const setRow = (i: number, change: Partial<BoardSettingRow>) => (rows.value = rows.value.map((r, j) => (j === i ? { ...r, ...change } : r)));

function submit() {
  tried.value = true;
  if (!next.value || missingTitle.value || dupes.value.size) return;
  emit("save", next.value);
}
</script>

<template>
  <NqDialog :open="!!props.section" @update:open="(o: boolean) => (!o ? emit('close') : null)">
    <NqDialogContent class="max-w-lg">
      <NqDialogHeader>
        <NqDialogTitle>{{ props.section?.title || props.t.editTitle }}</NqDialogTitle>
        <NqDialogDescription>{{ props.t.editDescription }}</NqDialogDescription>
      </NqDialogHeader>
      <form v-if="draft" :id="formId" class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="grid gap-3 sm:grid-cols-[1fr_10rem]">
          <NqField :invalid="tried && missingTitle">
            <NqFieldLabel>{{ props.t.name }}</NqFieldLabel>
            <NqInput :model-value="draft.title" @update:model-value="patch({ title: String($event ?? '') })" />
            <p v-if="tried && missingTitle" role="alert" class="text-caption text-nq-danger-text">{{ props.t.needTitle }}</p>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ props.t.badge }}</NqFieldLabel>
            <NqInput :model-value="draft.badge ?? ''" @update:model-value="patch({ badge: String($event ?? '') || undefined })" />
          </NqField>
        </div>
        <NqField>
          <NqFieldLabel>{{ props.t.prompt }}</NqFieldLabel>
          <NqTextarea dir="auto" rows="4" :placeholder="props.t.promptHint" :model-value="draft.prompt ?? ''" @update:model-value="patch({ prompt: $event || undefined })" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ props.t.model }}</NqFieldLabel>
          <NqSelect :model-value="draft.model ?? DEFAULT_MODEL" @update:model-value="(v) => patch({ model: !v || v === DEFAULT_MODEL ? undefined : String(v) })">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="m in items" :key="m.value" :value="m.value">{{ m.label }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
        <fieldset class="flex flex-col gap-2">
          <legend class="mb-1.5 text-label text-foreground">{{ props.t.settings }}</legend>
          <div v-for="(row, i) in rows" :key="i" data-slot="section-board-setting" class="flex items-center gap-2">
            <NqInput ltr :aria-label="props.t.key" :aria-invalid="dupes.has(row.key.trim()) || undefined" :placeholder="props.t.key" :model-value="row.key" @update:model-value="setRow(i, { key: String($event ?? '') })" />
            <NqInput :aria-label="props.t.value" :placeholder="props.t.value" :model-value="row.value" @update:model-value="setRow(i, { value: String($event ?? '') })" />
            <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="props.t.removeSetting(row.key.trim())" :class="SETTING_ICON_BUTTON" @click="rows = rows.filter((_, j) => j !== i)">
              <X aria-hidden="true" />
            </NqButton>
          </div>
          <p v-for="key in [...dupes]" :key="key" role="alert" class="text-caption text-nq-danger-text">{{ props.t.duplicateKey(key) }}</p>
          <NqButton type="button" variant="ghost" size="sm" class="w-fit" @click="rows = [...rows, { key: '', value: '' }]">
            <NqIcon :icon="Plus" />
            {{ props.t.addSetting }}
          </NqButton>
        </fieldset>
      </form>
      <NqDialogFooter>
        <NqButton type="button" variant="ghost" @click="emit('close')">{{ props.t.cancel }}</NqButton>
        <NqButton type="submit" :form="formId" variant="primary" :disabled="!changed || dupes.size > 0">{{ props.t.save }}</NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
