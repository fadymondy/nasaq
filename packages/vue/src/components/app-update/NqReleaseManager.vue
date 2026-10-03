<script lang="ts">
import type { AppRelease } from "./app-update-format";

export type ReleaseStatus = "draft" | "live" | "rolled-back";

export interface ManagedRelease extends AppRelease {
  id: string;
  status: ReleaseStatus;
  /** Percent of people who can receive it, 0 to 100. */
  rollout?: number;
}
</script>

<script setup lang="ts">
import { Wrench } from "lucide-vue-next";
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqAlert from "../alert/NqAlert.vue";
import NqBadge from "../badge/NqBadge.vue";
import NqButton from "../button/NqButton.vue";
import { NqInput } from "../field";
import NqDateTime from "../numeric/NqDateTime.vue";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import { countBelow, minBuildProblem } from "./app-update-format";
import type { AppUpdateLabels } from "./strings";
import { fill, useAppUpdateLabels } from "./use-labels";

// The admin view of releases: the list with channel, rollout and status, publish and roll back per row, and the
// minimum supported build that drives NqForcedUpdateGate. Raising the minimum warns how many people it will block.
type Outcome = Promise<void | { error?: string }>;
const props = withDefaults(defineProps<{
  releases: readonly ManagedRelease[];
  minSupportedBuild: number;
  /** Optional: how many people run each build, to warn before raising the minimum. */
  usage?: readonly { build: number; users: number }[];
  onSetMinSupportedBuild: (build: number) => Outcome;
  onPublish?: (id: string) => Outcome;
  onRollback?: (id: string) => Outcome;
  labels?: Partial<AppUpdateLabels>;
  class?: HTMLAttributes["class"];
}>(), { usage: undefined, onPublish: undefined, onRollback: undefined, labels: undefined });
defineOptions({ inheritAttrs: false });
const { t, locale } = useAppUpdateLabels(() => props.labels);

const draft = ref(String(props.minSupportedBuild));
const saving = ref(false);
const notice = ref<string | null>(null);
const pending = ref<string | null>(null);
const inputId = useId();
// A new minimum from the parent (after a save) becomes the field's value.
watch(
  () => props.minSupportedBuild,
  (v) => (draft.value = String(v)),
);

const latest = computed(() => props.releases.reduce((m, r) => Math.max(m, r.build), 0));
const value = computed(() => (draft.value.trim() === "" ? Number.NaN : Number(draft.value)));
const problem = computed(() => minBuildProblem(value.value, latest.value));
const blocked = computed(() => (props.usage && !problem.value ? countBelow(props.usage, value.value) : 0));
const changed = computed(() => value.value !== props.minSupportedBuild);

async function save() {
  if (problem.value) return;
  saving.value = true;
  notice.value = null;
  try {
    const result = await props.onSetMinSupportedBuild(value.value);
    notice.value = result && "error" in result && result.error ? result.error : t.value.saved;
  } finally {
    saving.value = false;
  }
}
async function act(key: string, fn: ((id: string) => Outcome) | undefined, id: string) {
  if (!fn) return;
  pending.value = key;
  try {
    await fn(id);
  } finally {
    pending.value = null;
  }
}
</script>

<template>
  <section data-slot="release-manager" v-bind="$attrs" :class="cn('flex w-full flex-col gap-5 rounded-card border border-border bg-card p-4', props.class)">
    <header class="flex flex-col gap-1">
      <h2 class="text-h3">{{ t.managerTitle }}</h2>
      <p class="text-body-sm text-muted-foreground">{{ t.managerDescription }}</p>
    </header>
    <div class="flex flex-col gap-2">
      <label :for="inputId" class="text-label">{{ t.minBuild }}</label>
      <div class="flex items-start gap-2">
        <NqInput :id="inputId" v-model="draft" ltr inputmode="numeric" :aria-invalid="problem ? true : undefined" class="w-32" />
        <NqButton variant="primary" :loading="saving" :disabled="Boolean(problem) || !changed" @click="save">{{ t.save }}</NqButton>
      </div>
      <p :class="cn('text-caption', problem ? 'text-nq-danger-text' : 'text-muted-foreground')">
        {{ problem === "invalid" ? t.invalid : problem === "too-high" ? t.tooHigh : t.minBuildHint }}
      </p>
      <NqAlert v-if="blocked > 0 && changed" tone="warning" :icon="Wrench">
        {{ fill(t.blocked, { count: new Intl.NumberFormat(locale, { numberingSystem: "latn" }).format(blocked) }) }}
      </NqAlert>
      <p v-if="notice" role="status" class="text-caption text-nq-success-text">{{ notice }}</p>
    </div>
    <NqTable :label="t.releasesLabel">
      <NqTableHeader>
        <NqTableRow>
          <NqTableHead>{{ t.version }}</NqTableHead>
          <NqTableHead>{{ t.build }}</NqTableHead>
          <NqTableHead>{{ t.channel }}</NqTableHead>
          <NqTableHead>{{ t.released }}</NqTableHead>
          <NqTableHead>{{ t.rollout }}</NqTableHead>
          <NqTableHead>{{ t.status }}</NqTableHead>
          <NqTableHead class="text-end">{{ t.actions }}</NqTableHead>
        </NqTableRow>
      </NqTableHeader>
      <NqTableBody>
        <NqTableRow v-if="props.releases.length === 0">
          <NqTableCell colspan="7" class="py-6 text-center text-muted-foreground">{{ t.empty }}</NqTableCell>
        </NqTableRow>
        <NqTableRow v-for="r in props.releases" v-else :key="r.id">
          <NqTableCell dir="ltr" class="text-start font-mono">{{ r.version }}</NqTableCell>
          <NqTableCell dir="ltr" class="text-start font-mono">
            {{ r.build }}
            <NqBadge v-if="r.build === props.minSupportedBuild" variant="outline" class="ms-2">{{ t.minTag }}</NqBadge>
          </NqTableCell>
          <NqTableCell>
            <NqBadge v-if="r.channel === 'beta'" variant="warning">{{ t.beta }}</NqBadge>
            <NqBadge v-else variant="neutral">{{ t.stable }}</NqBadge>
          </NqTableCell>
          <NqTableCell><NqDateTime v-if="r.date !== undefined" :value="r.date" :format="{ dateStyle: 'medium' }" /></NqTableCell>
          <NqTableCell dir="ltr" class="text-start tabular-nums">{{ r.rollout !== undefined ? `${r.rollout}%` : "—" }}</NqTableCell>
          <NqTableCell>
            <NqBadge v-if="r.status === 'live'" variant="success">{{ t.live }}</NqBadge>
            <NqBadge v-else-if="r.status === 'draft'" variant="neutral">{{ t.draft }}</NqBadge>
            <NqBadge v-else variant="warning">{{ t.rolledBack }}</NqBadge>
          </NqTableCell>
          <NqTableCell class="text-end">
            <NqButton v-if="r.status === 'live' && props.onRollback" size="sm" variant="ghost" :loading="pending === `rb-${r.id}`" @click="act(`rb-${r.id}`, props.onRollback, r.id)">
              {{ t.rollback }}
            </NqButton>
            <NqButton v-if="r.status !== 'live' && props.onPublish" size="sm" variant="secondary" :loading="pending === `pub-${r.id}`" @click="act(`pub-${r.id}`, props.onPublish, r.id)">
              {{ t.publish }}
            </NqButton>
          </NqTableCell>
        </NqTableRow>
      </NqTableBody>
    </NqTable>
  </section>
</template>
