<script lang="ts">
import type { FunnelWindow } from "../funnel-chart";

const STRINGS = {
  en: {
    title: "Funnel builder",
    description: "Pick the steps people take, in order, and how long they have to finish them.",
    nameLabel: "Funnel name",
    namePlaceholder: "Signup to first order",
    nameRequired: "Give the funnel a name.",
    stepsTitle: "Steps",
    noSteps: "No steps yet. Add the first event or page below.",
    addTitle: "Add a step",
    kindEvent: "Event",
    kindPage: "Page view",
    pick: "Choose…",
    add: "Add step",
    moveUp: (label: string) => `Move ${label} up`,
    moveDown: (label: string) => `Move ${label} down`,
    remove: (label: string) => `Remove ${label}`,
    stepNumber: (n: number) => `Step ${n}`,
    windowLabel: "Conversion window",
    windowHint: "People must finish all steps within this time of the first one.",
    hours: "hours",
    days: "days",
    weeks: "weeks",
    needTwo: "A funnel needs at least two steps.",
    save: "Save funnel",
    reset: "Reset",
    saved: "Funnel saved.",
    failed: "Could not save the funnel. Try again.",
    noSources: "Nothing of this kind to add.",
    unit: "Unit",
  },
  ar: {
    title: "منشئ القمع",
    description: "اختر الخطوات التي يمرّ بها الناس بالترتيب، والمدة المتاحة لإتمامها.",
    nameLabel: "اسم القمع",
    namePlaceholder: "من التسجيل إلى أول طلب",
    nameRequired: "أعطِ القمع اسمًا.",
    stepsTitle: "الخطوات",
    noSteps: "لا خطوات بعد. أضف أول حدث أو صفحة أدناه.",
    addTitle: "إضافة خطوة",
    kindEvent: "حدث",
    kindPage: "زيارة صفحة",
    pick: "اختر…",
    add: "إضافة الخطوة",
    moveUp: (label: string) => `نقل ${label} للأعلى`,
    moveDown: (label: string) => `نقل ${label} للأسفل`,
    remove: (label: string) => `إزالة ${label}`,
    stepNumber: (n: number) => `الخطوة ${n}`,
    windowLabel: "نافذة التحويل",
    windowHint: "يجب أن يُتمّ الناس كل الخطوات خلال هذه المدة من الخطوة الأولى.",
    hours: "ساعات",
    days: "أيام",
    weeks: "أسابيع",
    needTwo: "يحتاج القمع إلى خطوتين على الأقل.",
    save: "حفظ القمع",
    reset: "إعادة التعيين",
    saved: "تم حفظ القمع.",
    failed: "تعذّر حفظ القمع. حاول مرة أخرى.",
    noSources: "لا شيء من هذا النوع للإضافة.",
    unit: "الوحدة",
  },
};

export type FunnelBuilderLabels = typeof STRINGS.en;
export type FunnelSourceKind = "event" | "page";

/** An event or a page the funnel can use as a step. */
export interface FunnelSource {
  id: string;
  kind: FunnelSourceKind;
  label: string;
  /** The event name or page path. Kept left-to-right. */
  detail?: string;
}

export interface FunnelBuilderStep {
  /** Unique within the funnel, so the same event can appear twice. */
  id: string;
  sourceId: string;
  kind: FunnelSourceKind;
  label: string;
  detail?: string;
}

export interface FunnelDefinition {
  name: string;
  steps: FunnelBuilderStep[];
  window: FunnelWindow;
}

export const EMPTY_FUNNEL: FunnelDefinition = { name: "", steps: [], window: { amount: 7, unit: "day" } };
</script>

<script setup lang="ts">
import { ArrowDown, ArrowUp, FileText, MousePointerClick, Plus, X } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardFooter, NqCardHeader, NqCardTitle } from "../card";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { funnelInsertStep, funnelMoveStep, funnelRemoveStep, funnelWindowKey, type FunnelWindowUnit } from "../funnel-chart";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqToggle, NqToggleGroup } from "../toggle-group";

type Result = void | { error?: string };

// Builds a funnel: a name, an ordered list of steps taken from events or page views (reorder with the up and down
// buttons, remove with the cross) and the time window to finish in. Save stays honest: a funnel needs a name and two steps.
const props = defineProps<{
  /** Events and pages the funnel can be made of. */
  sources: readonly FunnelSource[];
  defaultValue?: FunnelDefinition;
  onChange?: (value: FunnelDefinition) => void;
  /** Saves the funnel. Return `{ error }` to keep the form open with a message. */
  onSave: (value: FunnelDefinition) => Promise<Result> | Result;
  title?: string;
  description?: string;
  class?: HTMLAttributes["class"];
  labels?: Partial<FunnelBuilderLabels>;
}>();

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const uid = useId();
const initial = (): FunnelDefinition => JSON.parse(JSON.stringify(props.defaultValue ?? EMPTY_FUNNEL));
const value = ref<FunnelDefinition>(initial());
const kind = ref<FunnelSourceKind>("event");
const pick = ref("");
const counter = ref(0);
const submitted = ref(false);
const pending = ref(false);
const message = ref<{ tone: "success" | "danger"; text: string } | null>(null);

function commit(next: FunnelDefinition) {
  value.value = next;
  message.value = null;
  props.onChange?.(next);
}

const options = computed(() => props.sources.filter((s) => s.kind === kind.value));
const nameInvalid = computed(() => submitted.value && value.value.name.trim() === "");
const stepsInvalid = computed(() => submitted.value && value.value.steps.length < 2);
const unitItems = computed<{ value: FunnelWindowUnit; label: string }[]>(() => [
  { value: "hour", label: t.value.hours },
  { value: "day", label: t.value.days },
  { value: "week", label: t.value.weeks },
]);

function addStep() {
  const src = props.sources.find((s) => s.id === pick.value);
  if (!src) return;
  counter.value += 1;
  commit({ ...value.value, steps: funnelInsertStep(value.value.steps, { id: `${src.id}#${counter.value}`, sourceId: src.id, kind: src.kind, label: src.label, detail: src.detail }) });
  pick.value = "";
}

function onKind(v: string[]) {
  if (v[0]) {
    kind.value = v[0] as FunnelSourceKind;
    pick.value = "";
  }
}

async function submit() {
  submitted.value = true;
  if (value.value.name.trim() === "" || value.value.steps.length < 2) return;
  pending.value = true;
  message.value = null;
  try {
    const out = await props.onSave({ ...value.value, name: value.value.name.trim() });
    message.value = out && out.error ? { tone: "danger", text: out.error } : { tone: "success", text: t.value.saved };
  } catch {
    message.value = { tone: "danger", text: t.value.failed };
  } finally {
    pending.value = false;
  }
}

function reset() {
  submitted.value = false;
  commit(initial());
}
</script>

<template>
  <NqCard data-slot="funnel-builder" :class="props.class">
    <form novalidate class="flex flex-col gap-4" @submit.prevent="submit">
      <NqCardHeader>
        <NqCardTitle as="h3">{{ props.title ?? t.title }}</NqCardTitle>
        <NqCardDescription>{{ props.description ?? t.description }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-5">
        <NqAlert v-if="message" :tone="message.tone">{{ message.text }}</NqAlert>
        <NqField :invalid="nameInvalid">
          <NqFieldLabel>{{ t.nameLabel }}</NqFieldLabel>
          <NqInput dir="auto" :model-value="value.name" :placeholder="t.namePlaceholder" @update:model-value="(v) => commit({ ...value, name: String(v ?? '') })" />
          <NqFieldError v-if="nameInvalid" match>{{ t.nameRequired }}</NqFieldError>
        </NqField>

        <section :aria-labelledby="`${uid}-steps`" class="flex flex-col gap-2">
          <h4 :id="`${uid}-steps`" class="text-label text-foreground">{{ t.stepsTitle }}</h4>
          <p v-if="value.steps.length === 0" class="rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground">{{ t.noSteps }}</p>
          <ol v-else class="flex flex-col gap-2">
            <li v-for="(s, i) in value.steps" :key="s.id" data-slot="funnel-builder-step" class="flex items-center gap-3 rounded-card border border-border p-2 ps-3">
              <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-caption text-muted-foreground">
                <bdi>{{ i + 1 }}</bdi>
              </span>
              <span class="flex min-w-0 flex-1 flex-col">
                <span dir="auto" class="truncate text-label text-foreground">{{ s.label }}</span>
                <span class="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <NqBadge variant="outline">
                    <MousePointerClick v-if="s.kind === 'event'" aria-hidden="true" />
                    <FileText v-else aria-hidden="true" />
                    {{ s.kind === "event" ? t.kindEvent : t.kindPage }}
                  </NqBadge>
                  <bdi v-if="s.detail" dir="ltr" class="truncate">{{ s.detail }}</bdi>
                </span>
              </span>
              <span class="flex shrink-0 items-center">
                <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="t.moveUp(s.label)" :disabled="i === 0" @click="commit({ ...value, steps: funnelMoveStep(value.steps, i, i - 1) })">
                  <ArrowUp aria-hidden="true" />
                </NqButton>
                <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="t.moveDown(s.label)" :disabled="i === value.steps.length - 1" @click="commit({ ...value, steps: funnelMoveStep(value.steps, i, i + 1) })">
                  <ArrowDown aria-hidden="true" />
                </NqButton>
                <NqButton type="button" size="icon-sm" variant="ghost" :aria-label="t.remove(s.label)" @click="commit({ ...value, steps: funnelRemoveStep(value.steps, i) })">
                  <X aria-hidden="true" />
                </NqButton>
              </span>
            </li>
          </ol>
          <p v-if="stepsInvalid" role="alert" class="text-body-sm text-danger">{{ t.needTwo }}</p>
        </section>

        <section :aria-label="t.addTitle" class="flex flex-col gap-2 rounded-card bg-muted/40 p-3">
          <span class="text-label text-foreground">{{ t.addTitle }}</span>
          <div class="flex flex-wrap items-end gap-2">
            <NqToggleGroup :model-value="[kind]" :aria-label="t.addTitle" @update:model-value="onKind">
              <NqToggle value="event">{{ t.kindEvent }}</NqToggle>
              <NqToggle value="page">{{ t.kindPage }}</NqToggle>
            </NqToggleGroup>
            <div class="min-w-48 flex-1">
              <NqSelect :model-value="pick || null" @update:model-value="(v) => (pick = v ? String(v) : '')">
                <NqSelectTrigger :aria-label="t.addTitle">
                  <NqSelectValue :placeholder="options.length === 0 ? t.noSources : t.pick" />
                </NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="o in options" :key="o.id" :value="o.id">{{ o.label }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </div>
            <NqButton type="button" variant="secondary" :disabled="!pick" @click="addStep">
              <Plus aria-hidden="true" />
              {{ t.add }}
            </NqButton>
          </div>
        </section>

        <div class="flex flex-col gap-1.5">
          <span :id="`${uid}-window`" class="text-label text-foreground">{{ t.windowLabel }}</span>
          <div class="flex items-center gap-2" role="group" :aria-labelledby="`${uid}-window`">
            <NqInput
              type="number"
              min="1"
              inputmode="numeric"
              ltr
              class="w-24"
              :aria-label="t.windowLabel"
              :model-value="value.window.amount"
              @update:model-value="(v) => commit({ ...value, window: { ...value.window, amount: Math.max(1, Math.floor(Number(v)) || 1) } })"
            />
            <NqSelect :model-value="value.window.unit" @update:model-value="(v) => v && commit({ ...value, window: { ...value.window, unit: v as FunnelWindowUnit } })">
              <NqSelectTrigger class="w-32" :aria-label="t.unit">
                <NqSelectValue />
              </NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="u in unitItems" :key="u.value" :value="u.value">{{ u.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
            <bdi dir="ltr" class="text-caption text-muted-foreground">{{ funnelWindowKey(value.window) }}</bdi>
          </div>
          <span class="text-caption text-muted-foreground">{{ t.windowHint }}</span>
        </div>
      </NqCardContent>
      <NqCardFooter class="justify-end gap-2">
        <NqButton type="button" variant="ghost" :disabled="pending" @click="reset">{{ t.reset }}</NqButton>
        <NqButton type="submit" variant="primary" :loading="pending">{{ t.save }}</NqButton>
      </NqCardFooter>
    </form>
  </NqCard>
</template>
