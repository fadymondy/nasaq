<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqTextarea } from "../field";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { KEYWORD_STRINGS, type KeywordTrackerLabels } from "./keyword-labels";
import type { AddKeywordsInput, KeywordDevice, KeywordLocation, KeywordResult } from "./keyword-types";
import { parseKeywordList } from "./rank-math";

// Add keywords to track: one per line or comma separated, with the location and device to check. Duplicates are dropped and counted.
const props = withDefaults(
  defineProps<{
    open: boolean;
    locations: readonly KeywordLocation[];
    defaultLocation?: string;
    defaultDevice?: KeywordDevice;
    onAdd: (input: AddKeywordsInput) => Promise<KeywordResult>;
    labels?: Partial<KeywordTrackerLabels>;
  }>(),
  { defaultLocation: undefined, defaultDevice: "desktop", labels: undefined },
);
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const t = useAnalyticsLabels(KEYWORD_STRINGS, () => props.labels);
const text = ref("");
const location = ref(props.defaultLocation ?? props.locations[0]?.value ?? "");
const device = ref<KeywordDevice>(props.defaultDevice);
const touched = ref(false);
const pending = ref(false);
const error = ref<string | null>(null);
const keywords = computed(() => parseKeywordList(text.value));
const invalid = computed(() => touched.value && keywords.value.length === 0);

watch(
  () => props.open,
  (o) => {
    if (o) error.value = null;
  },
);

async function submit() {
  touched.value = true;
  if (keywords.value.length === 0) return;
  pending.value = true;
  error.value = null;
  try {
    const out = await props.onAdd({ keywords: keywords.value, location: location.value, device: device.value });
    if (out && out.error) error.value = out.error;
    else {
      text.value = "";
      touched.value = false;
      emit("update:open", false);
    }
  } catch {
    error.value = t.value.actionFailed;
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(next: boolean) => !pending && emit('update:open', next)">
    <NqDialogContent data-slot="add-keywords-dialog" class="max-w-lg">
      <form novalidate class="flex flex-col gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.addTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.addBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <NqField :invalid="invalid">
          <NqFieldLabel>{{ t.keywordsLabel }}</NqFieldLabel>
          <NqTextarea v-model="text" dir="auto" :rows="5" :placeholder="t.keywordsPlaceholder" />
          <NqFieldError v-if="invalid" :match="true">{{ t.keywordsRequired }}</NqFieldError>
          <span class="text-caption text-muted-foreground" aria-live="polite">{{ t.keywordCount(keywords.length) }}</span>
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField>
            <NqFieldLabel>{{ t.locationLabel }}</NqFieldLabel>
            <NqSelect :model-value="location" @update:model-value="(v: string | number | null) => v && (location = String(v))">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="l in props.locations" :key="l.value" :value="l.value">{{ l.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <div class="flex flex-col gap-1.5">
            <span class="text-label text-foreground">{{ t.deviceLabel }}</span>
            <NqToggleGroup :model-value="[device]" :aria-label="t.deviceLabel" @update:model-value="(v: string[]) => v[0] && (device = v[0] as KeywordDevice)">
              <NqToggle value="desktop">{{ t.desktop }}</NqToggle>
              <NqToggle value="mobile">{{ t.mobile }}</NqToggle>
            </NqToggleGroup>
          </div>
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('update:open', false)">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending">{{ t.addSubmit(keywords.length) }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
