<script setup lang="ts">
import { CircleHelp, ShieldCheck, TriangleAlert } from "lucide-vue-next";
import { computed, reactive, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqCheckbox } from "../checkbox";
import { NqTimerRing } from "../countdown";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { formatNumber } from "../numeric";
import { NqUserText } from "../text-utilities";
import { foodDraftCompleteness, foodDraftValid, type FoodDraft, type FoodDraftStep, type FoodKind, type FoodVerdict } from "./health-trackers-logic";
import { healthFill, healthStrings, type FoodFamily, type HealthTrackerResult, type HealthTrackersLabels } from "./health-trackers-strings";

// Builds a catalogue item. The ring shows how complete the entry is (name, Arabic name, verdict, families, note) and
// lists what is still missing. It measures the entry, never the food, and there is no calorie or portion field.
const props = withDefaults(
  defineProps<{
    /** Start values, for editing an existing item. Blank when omitted. */
    initial?: Partial<FoodDraft>;
    families: readonly FoodFamily[];
    /** Saves the item. Resolve with `{ error }` to keep the form open and show it. */
    onSave: (draft: FoodDraft) => Promise<HealthTrackerResult>;
    onCancel?: () => void;
    /** Heading. Default "New item" or "Edit item". */
    title?: string;
    editing?: boolean;
    labels?: HealthTrackersLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { initial: undefined, onCancel: undefined, title: undefined, editing: false, labels: undefined },
);

const STEP_LABEL: Record<FoodDraftStep, "stepName" | "stepNameAr" | "stepVerdict" | "stepFamilies" | "stepNote"> = {
  name: "stepName",
  nameAr: "stepNameAr",
  verdict: "stepVerdict",
  families: "stepFamilies",
  note: "stepNote",
};
const VERDICT_ICON = { safe: ShieldCheck, trigger: TriangleAlert, unreviewed: CircleHelp } as const;

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const t = computed(() => healthStrings(locale.value, props.labels));
const id = useId();
const draft = reactive({ kind: "food" as FoodKind, name: "", nameAr: "", verdict: "unreviewed" as FoodVerdict, triggerFamilies: [] as string[], note: "", ...props.initial } as FoodDraft & { triggerFamilies: string[] });
const touched = ref(false);
const saving = ref(false);
const error = ref<string>();

const progress = computed(() => foodDraftCompleteness(draft));
const nameMissing = computed(() => touched.value && !draft.name.trim());
const familiesMissing = computed(() => touched.value && draft.verdict === "trigger" && draft.triggerFamilies.length === 0);
const tone = computed(() => (progress.value.score >= 1 ? "success" : progress.value.score >= 0.5 ? "info" : "neutral"));
const verdicts = computed<[FoodVerdict, string][]>(() => [
  ["unreviewed", t.value.verdictUnreviewed],
  ["safe", t.value.verdictSafe],
  ["trigger", t.value.verdictTrigger],
]);
const missingText = computed(() =>
  progress.value.missing.length ? `${t.value.builderMissingIntro}: ${progress.value.missing.map((s) => t.value[STEP_LABEL[s]]).join(ar.value ? "، " : ", ")}` : t.value.builderCompletenessLabel,
);
const ringLabel = computed(
  () => `${t.value.builderCompletenessLabel}: ${healthFill(t.value.builderCompleteness, { done: formatNumber(progress.value.done, locale.value), total: formatNumber(progress.value.total, locale.value) })}`,
);

function toggleFamily(familyId: string, on: boolean) {
  draft.triggerFamilies = on ? [...draft.triggerFamilies, familyId] : draft.triggerFamilies.filter((f) => f !== familyId);
}

async function submit() {
  touched.value = true;
  if (!foodDraftValid(draft)) return;
  saving.value = true;
  error.value = undefined;
  try {
    const result = await props.onSave({ ...draft, triggerFamilies: [...draft.triggerFamilies], name: draft.name.trim() });
    if (result && typeof result === "object" && result.error) error.value = result.error;
  } catch {
    error.value = t.value.actionFailed;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <NqCard data-slot="food-item-builder" :class="props.class">
    <form novalidate class="flex flex-col gap-5" @submit.prevent="submit">
      <NqCardHeader class="flex-row items-center justify-between gap-4">
        <div class="flex min-w-0 flex-col gap-1">
          <NqCardTitle>{{ props.title ?? (props.editing ? t.builderEdit : t.builderNew) }}</NqCardTitle>
          <NqCardDescription>{{ missingText }}</NqCardDescription>
        </div>
        <NqTimerRing :fraction="progress.score" :tone="tone" :size="72" :thickness="7" role="img" :aria-label="ringLabel">
          <span class="text-label tabular-nums text-foreground">{{ formatNumber(progress.score, locale, { style: "percent" }) }}</span>
        </NqTimerRing>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-4">
        <fieldset class="flex gap-2" :aria-label="t.kind">
          <NqButton v-for="k in (['food', 'drink'] as const)" :key="k" type="button" size="sm" :variant="draft.kind === k ? 'primary' : 'secondary'" :aria-pressed="draft.kind === k" @click="draft.kind = k">
            {{ k === "food" ? t.kindFood : t.kindDrink }}
          </NqButton>
        </fieldset>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="nameMissing">
            <NqFieldLabel>{{ t.name }}</NqFieldLabel>
            <NqInput v-model="draft.name" dir="auto" />
            <NqFieldError v-if="nameMissing" :match="true">{{ t.builderNameRequired }}</NqFieldError>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.builderNameAr }}</NqFieldLabel>
            <NqInput :model-value="draft.nameAr ?? ''" dir="rtl" lang="ar" @update:model-value="(v?: string | number) => (draft.nameAr = String(v ?? ''))" />
            <NqFieldDescription>{{ t.builderNameArHint }}</NqFieldDescription>
          </NqField>
        </div>
        <div role="radiogroup" :aria-label="t.builderVerdict" class="flex flex-col gap-2">
          <span class="text-label text-foreground">{{ t.builderVerdict }}</span>
          <div class="flex flex-wrap gap-2">
            <NqButton v-for="[v, text] in verdicts" :key="v" type="button" role="radio" :aria-checked="draft.verdict === v" :variant="draft.verdict === v ? 'primary' : 'secondary'" size="sm" @click="draft.verdict = v">
              <component :is="VERDICT_ICON[v]" aria-hidden="true" />
              {{ text }}
            </NqButton>
          </div>
          <p v-if="draft.verdict === 'unreviewed'" class="text-caption text-muted-foreground">{{ t.unreviewedHint }}</p>
        </div>
        <fieldset v-if="draft.verdict === 'trigger'" class="flex flex-col gap-2" :aria-describedby="`${id}-fam`">
          <legend class="text-label text-foreground">{{ t.builderFamilies }}</legend>
          <p :id="`${id}-fam`" :class="cn('text-caption', familiesMissing ? 'text-nq-danger-text' : 'text-muted-foreground')" :role="familiesMissing ? 'alert' : undefined">
            {{ familiesMissing ? t.builderFamiliesRequired : t.builderFamiliesHint }}
          </p>
          <div class="flex flex-wrap gap-x-4 gap-y-2">
            <label v-for="f in props.families" :key="f.id" class="inline-flex items-center gap-2 text-body-sm text-foreground">
              <NqCheckbox :model-value="draft.triggerFamilies.includes(f.id)" @update:model-value="(on: boolean) => toggleFamily(f.id, on)" />
              <NqUserText>{{ ar && f.nameAr ? f.nameAr : f.name }}</NqUserText>
            </label>
          </div>
        </fieldset>
        <NqField>
          <NqFieldLabel>{{ t.builderNote }}</NqFieldLabel>
          <NqTextarea :model-value="draft.note ?? ''" :rows="3" dir="auto" @update:model-value="(v?: string | number) => (draft.note = String(v ?? ''))" />
          <NqFieldDescription>{{ t.builderNoteHint }}</NqFieldDescription>
        </NqField>
        <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
        <div class="flex flex-wrap justify-end gap-2">
          <NqButton v-if="props.onCancel" type="button" variant="ghost" :disabled="saving" @click="props.onCancel">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="saving">{{ saving ? t.builderSaving : t.builderSave }}</NqButton>
        </div>
      </NqCardContent>
    </form>
  </NqCard>
</template>
