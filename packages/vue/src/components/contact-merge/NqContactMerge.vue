<script setup lang="ts">
import { ArrowRight, GitMerge, Info } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { mergeContactConsent, type ContactChannel } from "../contact-identities";
import { NqDateTime, NqNum } from "../numeric";
import { NqRadioCard, NqRadioGroup } from "../radio-group";
import {
  CONTACT_MERGE_ALL,
  contactMergeConflict,
  defaultContactMergeChoices,
  isEmptyMergeValue,
  rebaseContactMergeChoices,
  resolveContactMerge,
  type ContactMergeChoices,
  type ContactMergeField,
  type ContactMergeOutcome,
} from "./contact-merge-logic";
import NqContactMergeValue from "./NqContactMergeValue.vue";
import { CONTACT_MERGE_STRINGS, type ContactMergeLabelOverrides, type ContactMergeLabels } from "./strings";
import type { ContactMergeRecord, ContactMergeResult } from "./types";

// Fold duplicate contacts into one. The user keeps one record as the survivor, and for every field where the
// records disagree picks whose value stays; lists (tags) are combined by default. A live "After the merge" panel
// shows the result, what moves over and the consent that survives (an opt-out always wins). Confirming asks once,
// then calls `onMerge`.
interface Props {
  /** Two or more records believed to be the same person. */
  records: ContactMergeRecord[];
  /** The fields to compare. Default: name, email, phone, company, job title, owner and tags. */
  fields?: ContactMergeField[];
  /** The record that starts as the survivor. Default the first. */
  defaultSurvivorId?: string;
  /** Runs when the user confirms. Return `{ error }` to keep the dialog and show the message. */
  onMerge: (outcome: ContactMergeOutcome) => Promise<ContactMergeResult>;
  onCancel?: () => void;
  labels?: ContactMergeLabelOverrides;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { fields: undefined, defaultSurvivorId: undefined, onCancel: undefined, labels: undefined });

const DEFAULT_FIELD_IDS: { id: string; multi?: boolean; ltr?: boolean }[] = [
  { id: "name" },
  { id: "email", ltr: true },
  { id: "phone", ltr: true },
  { id: "company" },
  { id: "jobTitle" },
  { id: "owner" },
  { id: "tags", multi: true },
];
const CONSENT_CHANNELS: ContactChannel[] = ["email", "whatsapp", "phone"];

const nq = useNasaq();
const uid = useId();
const t = computed<ContactMergeLabels>(() => {
  const base = CONTACT_MERGE_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...props.labels, fields: { ...base.fields, ...props.labels?.fields }, channels: { ...base.channels, ...props.labels?.channels } };
});

const fieldList = computed<ContactMergeField[]>(() => props.fields ?? DEFAULT_FIELD_IDS.map((f) => ({ ...f, label: t.value.fields[f.id] ?? f.id })));
const survivorId = ref(props.defaultSurvivorId && props.records.some((r) => r.id === props.defaultSurvivorId) ? props.defaultSurvivorId : (props.records[0]?.id ?? ""));
const choices = ref<ContactMergeChoices>(defaultContactMergeChoices(fieldList.value, props.records, survivorId.value));
const confirming = ref(false);
const busy = ref(false);
const error = ref<string | null>(null);

const survivor = computed(() => props.records.find((r) => r.id === survivorId.value) ?? props.records[0]);
const conflicts = computed(() => fieldList.value.filter((f) => contactMergeConflict(f, props.records)));
const identical = computed(() => fieldList.value.filter((f) => !contactMergeConflict(f, props.records) && props.records.some((r) => !isEmptyMergeValue(r.values[f.id]))));
const outcome = computed(() => resolveContactMerge(fieldList.value, props.records, survivorId.value, choices.value));
const others = computed(() => props.records.filter((r) => r.id !== survivorId.value));

function pickSurvivor(next: string) {
  choices.value = rebaseContactMergeChoices(fieldList.value, props.records, choices.value, survivorId.value, next);
  survivorId.value = next;
}

const totals = computed(() => {
  const map = new Map<string, number>();
  for (const r of props.records) for (const s of r.stats ?? []) map.set(s.label, (map.get(s.label) ?? 0) + s.value);
  return [...map];
});
const accountCount = computed(() => new Set(props.records.flatMap((r) => (r.identities ?? []).map((i) => `${i.channel}:${i.value.toLowerCase()}`))).size);
const consentRows = computed(() =>
  CONSENT_CHANNELS.filter((c) => props.records.some((r) => r.consent?.[c])).map((c) => ({ channel: c, merged: mergeContactConsent(props.records.map((r) => r.consent?.[c])) })),
);
const firstFilled = (id: string) => props.records.map((r) => r.values[id]).find((v) => !isEmptyMergeValue(v));

async function submit() {
  busy.value = true;
  error.value = null;
  try {
    const result = await props.onMerge(outcome.value);
    if (result && result.error) error.value = result.error;
    else confirming.value = false;
  } catch {
    error.value = t.value.failed;
  } finally {
    busy.value = false;
  }
}
function setConfirming(open: boolean) {
  if (!busy.value) confirming.value = open;
}
</script>

<template>
  <NqAlert v-if="props.records.length < 2 || !survivor" tone="info" data-slot="contact-merge">{{ t.needTwo }}</NqAlert>
  <section v-else data-slot="contact-merge" :aria-labelledby="`${uid}-title`" :class="cn('grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]', props.class)">
    <div class="flex min-w-0 flex-col gap-6">
      <header class="flex flex-col gap-1">
        <h2 :id="`${uid}-title`" class="text-title-md text-foreground">{{ t.title }}</h2>
        <p class="text-body text-muted-foreground">{{ t.description }}</p>
      </header>

      <fieldset class="flex min-w-0 flex-col gap-2">
        <legend class="text-label text-foreground">{{ t.survivor }}</legend>
        <p class="text-body-sm text-muted-foreground">{{ t.survivorHint }}</p>
        <NqRadioGroup :model-value="survivorId" :aria-label="t.survivor" class="grid gap-2 sm:grid-cols-2" @update:model-value="pickSurvivor(String($event))">
          <NqRadioCard v-for="r in props.records" :key="r.id" :value="r.id">
            <span class="flex items-center gap-2">
              <NqAvatar :name="r.name" :src="r.avatar" size="sm" />
              <span dir="auto" class="truncate">{{ r.name }}</span>
            </span>
            <template #description>
              <span class="flex flex-wrap gap-x-3">
                <span v-if="r.createdAt">{{ t.created }} <NqDateTime :value="r.createdAt" /></span>
                <span v-for="s in r.stats ?? []" :key="s.label">{{ s.label }} <NqNum :value="s.value" /></span>
              </span>
            </template>
          </NqRadioCard>
        </NqRadioGroup>
      </fieldset>

      <div class="flex min-w-0 flex-col gap-4">
        <h3 class="flex items-center gap-2 text-title-sm text-foreground">{{ conflicts.length ? t.differ(conflicts.length) : t.noneDiffer }}</h3>
        <fieldset v-for="field in conflicts" :key="field.id" data-slot="contact-merge-field" class="flex min-w-0 flex-col gap-2">
          <legend class="mb-2 text-label text-foreground">{{ field.label }}</legend>
          <NqRadioGroup
            :model-value="choices[field.id]"
            :aria-label="field.label"
            class="grid gap-2 sm:grid-cols-2"
            @update:model-value="choices = { ...choices, [field.id]: String($event) }"
          >
            <NqRadioCard v-if="field.multi" :value="CONTACT_MERGE_ALL" :title="t.combineAll" :description="t.combined" />
            <template v-for="r in props.records" :key="r.id">
              <NqRadioCard v-if="!isEmptyMergeValue(r.values[field.id])" :value="r.id" :description="`${t.from} ${r.name}`">
                <NqContactMergeValue :value="r.values[field.id]" :ltr="field.ltr" :empty="t.empty" />
              </NqRadioCard>
            </template>
          </NqRadioGroup>
        </fieldset>
        <details v-if="identical.length" class="rounded-card border border-border bg-card px-3 py-2 text-body-sm">
          <summary class="cursor-pointer text-muted-foreground">{{ t.same }}</summary>
          <dl class="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[8rem_1fr]">
            <div v-for="f in identical" :key="f.id" class="contents">
              <dt class="text-muted-foreground">{{ f.label }}</dt>
              <dd><NqContactMergeValue :value="firstFilled(f.id)" :ltr="f.ltr" :empty="t.empty" /></dd>
            </div>
          </dl>
        </details>
      </div>
    </div>

    <aside :aria-label="t.result" class="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
      <NqCard class="gap-3 p-4">
        <div class="flex flex-col gap-0.5">
          <h3 class="text-title-sm text-foreground">{{ t.result }}</h3>
          <p class="text-caption text-muted-foreground">{{ t.resultHint }}</p>
        </div>
        <dl data-slot="contact-merge-result" class="flex flex-col gap-2 text-body-sm">
          <template v-for="f in fieldList" :key="f.id">
            <div v-if="!isEmptyMergeValue(outcome.values[f.id])" class="flex flex-col">
              <dt class="text-caption text-muted-foreground">{{ f.label }}</dt>
              <dd class="min-w-0 break-words text-foreground">
                <span v-if="f.multi && Array.isArray(outcome.values[f.id])" class="flex flex-wrap gap-1">
                  <NqBadge v-for="tag in outcome.values[f.id] as string[]" :key="tag" variant="neutral">{{ tag }}</NqBadge>
                </span>
                <NqContactMergeValue v-else :value="outcome.values[f.id]" :ltr="f.ltr" :empty="t.empty" />
              </dd>
            </div>
          </template>
        </dl>
        <div v-if="totals.length || accountCount" class="flex flex-col gap-1 border-t border-border pt-3">
          <span class="text-label text-foreground">{{ t.moves }}</span>
          <ul class="flex flex-col gap-0.5 text-body-sm text-muted-foreground">
            <li v-if="accountCount">{{ t.identities }}: <NqNum :value="accountCount" /></li>
            <li v-for="[label, n] in totals" :key="label">{{ label }}: <NqNum :value="n" /></li>
          </ul>
        </div>
        <div v-if="consentRows.length" class="flex flex-col gap-1 border-t border-border pt-3">
          <span class="text-label text-foreground">{{ t.consent }}</span>
          <ul class="flex flex-col gap-1 text-body-sm">
            <li v-for="row in consentRows" :key="row.channel" class="flex items-center justify-between gap-2">
              <span>{{ t.channels[row.channel] ?? row.channel }}</span>
              <NqBadge :variant="row.merged === 'granted' ? 'success' : row.merged === 'denied' ? 'danger' : 'outline'">
                {{ row.merged === "granted" ? t.consentGranted : row.merged === "denied" ? t.consentDenied : t.consentUnknown }}
              </NqBadge>
            </li>
          </ul>
          <p class="flex items-start gap-1.5 text-caption text-muted-foreground">
            <Info aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" />
            {{ t.consentNote }}
          </p>
        </div>
      </NqCard>
      <div class="flex flex-wrap gap-2">
        <NqButton variant="primary" class="flex-1" @click="confirming = true">
          <GitMerge aria-hidden="true" />
          {{ t.merge(props.records.length) }}
        </NqButton>
        <NqButton v-if="props.onCancel" variant="ghost" @click="props.onCancel()">{{ t.cancel }}</NqButton>
      </div>
    </aside>

    <NqAlertDialog :open="confirming" @update:open="setConfirming">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ t.confirmTitle(survivor.name) }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.confirmBody(others.length) }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel :disabled="busy">{{ t.cancel }}</NqAlertDialogCancel>
          <NqButton variant="primary" :loading="busy" @click="submit()">
            {{ t.confirm }}
            <ArrowRight aria-hidden="true" class="rtl:rotate-180" />
          </NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </section>
</template>
