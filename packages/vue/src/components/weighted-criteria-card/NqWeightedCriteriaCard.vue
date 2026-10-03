<script setup lang="ts">
import { Check, Plus, X } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardFooter, NqCardHeader, NqCardTitle } from "../card";
import { NqInput } from "../field";
import { NqSwitch } from "../switch";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { STRINGS, type WeightedCriteriaCardLabels } from "./strings";
import { CRITERION_WEIGHTS, addCriterion, criteriaShares, type CriterionWeight, type WeightedCriterion } from "./weighted-criteria-logic";

// A human-in-the-loop step for an assistant: the agent suggests the criteria for a comparison or a decision, the person
// switches each on or off, sets how much it matters and adds their own, then confirms.
interface Props {
  /** The suggested criteria, uncontrolled. */
  defaultCriteria?: readonly WeightedCriterion[];
  /** Controlled list (`v-model:criteria`). */
  criteria?: readonly WeightedCriterion[];
  /** Confirm. Return `{ error }` or reject to show a failure; otherwise the card locks and shows Sent. */
  onAccept?: (criteria: WeightedCriterion[]) => void | { error?: string } | Promise<void | { error?: string }>;
  title?: string;
  description?: string;
  /** Let the person add their own criteria. Default true. */
  allowCustom?: boolean;
  /** Show each enabled criterion's share of the decision as a bar. Default true. */
  showShares?: boolean;
  disabled?: boolean;
  labels?: WeightedCriteriaCardLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  defaultCriteria: () => [],
  criteria: undefined,
  onAccept: undefined,
  title: undefined,
  description: undefined,
  allowCustom: true,
  showShares: true,
  disabled: false,
  labels: undefined,
});
const emit = defineEmits<{ "update:criteria": [criteria: WeightedCriterion[]] }>();

const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));
const uid = useId();
const own = ref<WeightedCriterion[]>([...props.defaultCriteria]);
const list = computed<WeightedCriterion[]>(() => (props.criteria ? [...props.criteria] : own.value));
const draft = ref("");
const busy = ref(false);
const sent = ref(false);
const error = ref<string | null>(null);
const shares = computed(() => criteriaShares(list.value));
const locked = computed(() => props.disabled || busy.value || sent.value);
const on = computed(() => list.value.filter((c) => c.enabled).length);

function update(next: WeightedCriterion[]) {
  if (!props.criteria) own.value = next;
  emit("update:criteria", next);
}
const patch = (id: string, change: Partial<WeightedCriterion>) => update(list.value.map((c) => (c.id === id ? { ...c, ...change } : c)));

function add() {
  const next = addCriterion(list.value, draft.value, `custom-${Date.now().toString(36)}`);
  if (next.length !== list.value.length) update(next);
  draft.value = "";
}

async function accept() {
  busy.value = true;
  error.value = null;
  try {
    const r = await props.onAccept?.(list.value);
    if (r && r.error) error.value = r.error;
    else sent.value = true;
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : t.value.failed;
  }
  busy.value = false;
}
defineOptions({ inheritAttrs: false });
</script>

<template>
  <NqCard data-slot="weighted-criteria-card" :data-sent="sent || undefined" :class="cn('min-w-0', props.class)" v-bind="$attrs">
    <NqCardHeader>
      <NqCardTitle :id="`${uid}-title`">{{ props.title ?? t.title }}</NqCardTitle>
      <NqCardDescription v-if="props.description">{{ props.description }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <ul :aria-labelledby="`${uid}-title`" class="flex flex-col divide-y divide-border rounded-control border border-border">
        <li v-for="c in list" :key="c.id" data-slot="weighted-criterion" :data-enabled="c.enabled || undefined" class="flex flex-col gap-2 p-3">
          <div class="flex flex-wrap items-center gap-3">
            <NqSwitch :model-value="c.enabled" :disabled="locked" :aria-label="t.include(c.label)" @update:model-value="(enabled: boolean) => patch(c.id, { enabled })" />
            <span :class="cn('flex min-w-0 flex-1 flex-col', !c.enabled && 'opacity-60')">
              <span dir="auto" class="text-body-sm font-medium text-foreground">{{ c.label }}</span>
              <span v-if="c.description" dir="auto" class="text-caption text-muted-foreground">{{ c.description }}</span>
            </span>
            <NqToggleGroup
              :aria-label="t.weight(c.label)"
              :model-value="[c.weight]"
              :disabled="locked || !c.enabled"
              @update:model-value="(v: string[]) => v[0] && patch(c.id, { weight: v[0] as CriterionWeight })"
            >
              <NqToggle v-for="w in CRITERION_WEIGHTS" :key="w" :value="w" class="h-6 px-2 text-caption">{{ t[w] }}</NqToggle>
            </NqToggleGroup>
            <NqButton v-if="c.custom" variant="ghost" size="icon-sm" :aria-label="t.remove(c.label)" :disabled="locked" @click="update(list.filter((x) => x.id !== c.id))">
              <X aria-hidden="true" />
            </NqButton>
          </div>
          <span v-if="props.showShares && c.enabled" aria-hidden="true" class="h-1 overflow-hidden rounded-full bg-secondary">
            <span class="block h-full rounded-full bg-primary transition-[width] duration-200 ease-nq" :style="{ width: `${Math.round((shares.get(c.id) ?? 0) * 100)}%` }" />
          </span>
        </li>
      </ul>
      <form v-if="props.allowCustom" class="flex items-center gap-2" @submit.prevent="add">
        <NqInput v-model="draft" :placeholder="t.addPlaceholder" :aria-label="t.addPlaceholder" maxlength="120" :disabled="locked" class="flex-1" />
        <NqButton type="submit" variant="secondary" :disabled="locked || !draft.trim()">
          <Plus aria-hidden="true" />
          {{ t.add }}
        </NqButton>
      </form>
      <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
    </NqCardContent>
    <NqCardFooter class="flex items-center justify-between gap-3">
      <span aria-live="polite" class="text-caption text-muted-foreground tabular-nums">{{ t.count(on, list.length) }}</span>
      <NqButton variant="primary" :loading="busy" :disabled="props.disabled || sent || on === 0" @click="accept()">
        <template v-if="sent">
          <Check aria-hidden="true" />
          {{ t.accepted }}
        </template>
        <template v-else>{{ t.accept }}</template>
      </NqButton>
    </NqCardFooter>
  </NqCard>
</template>
