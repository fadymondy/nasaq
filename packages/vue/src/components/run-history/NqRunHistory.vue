<script setup lang="ts">
import { ArrowLeft, ListChecks, Search } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqInput } from "../field";
import { NqDateTime } from "../numeric";
import { NqEmptyState, NqSkeleton } from "../states";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { NqWorkflowStatusGlyph } from "../workflow-canvas";
import { useCanvasLabels } from "../workflow-canvas/labels";
import NqRunDetail from "./NqRunDetail.vue";
import { useRunLabels, type RunHistoryLabels } from "./labels";
import { countRuns, filterRuns, formatRunDuration, RUN_FILTERS, runLength, type RunFilter, type RunRecord } from "./run-model";

// Runs newest first with a status filter and search, and the chosen run's detail beside it (below on a phone, with a
// back button): steps with timings, input, output, logs and screenshots, the failing step called out, the span trace
// with attributes, and the raw payload. It has no backend: pass `runs` and handle `onRetry` and `onCancel`.
interface Props {
  runs: readonly RunRecord[];
  /** Selected run id (`v-model:selected-id`). */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  /** Shows "Run again" on finished runs. Resolve `{ error }` to show a message. */
  onRetry?: (run: RunRecord) => Promise<void | { error?: string }>;
  /** Shows "Cancel run" on running ones. */
  onCancel?: (run: RunRecord) => Promise<void | { error?: string }>;
  /** Skeleton list. */
  loading?: boolean;
  labels?: Partial<RunHistoryLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { selectedId: undefined, defaultSelectedId: null, onRetry: undefined, onCancel: undefined, loading: false, labels: undefined });
const emit = defineEmits<{ "update:selectedId": [id: string | null]; select: [run: RunRecord | null] }>();

const { t, ar } = useRunLabels(() => props.labels);
const { t: c } = useCanvasLabels();
const selectedState = ref<string | null>(props.defaultSelectedId);
const selectedId = computed(() => (props.selectedId === undefined ? selectedState.value : props.selectedId));
const filter = ref<RunFilter>("all");
const query = ref("");
const counts = computed(() => countRuns(props.runs));
const shown = computed(() => filterRuns(props.runs, filter.value, query.value));
const selected = computed(() => props.runs.find((r) => r.id === selectedId.value) ?? null);

function choose(r: RunRecord | null) {
  if (props.selectedId === undefined) selectedState.value = r?.id ?? null;
  emit("update:selectedId", r?.id ?? null);
  emit("select", r);
}
</script>

<template>
  <div data-slot="run-history" :aria-busy="props.loading || undefined" :class="cn('grid min-w-0 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start', props.class)">
    <section :aria-label="t.runs" :class="cn('flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-3', selected && 'hidden lg:flex')">
      <div class="relative">
        <Search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <NqInput v-model="query" type="search" :placeholder="t.search" :aria-label="t.search" class="ps-9" />
      </div>
      <NqToggleGroup :model-value="[filter]" :aria-label="t.filters" class="flex-wrap" @update:model-value="(v) => v[0] && (filter = v[0] as RunFilter)">
        <NqToggle v-for="f in RUN_FILTERS" :key="f" :value="f">
          {{ t.filterNames[f] }}
          <span class="ms-1 text-caption text-muted-foreground tabular-nums">{{ counts[f] }}</span>
        </NqToggle>
      </NqToggleGroup>
      <div v-if="props.loading" class="flex flex-col gap-2">
        <NqSkeleton v-for="i in 4" :key="i" class="h-14" />
      </div>
      <NqEmptyState v-else-if="shown.length === 0" :icon="ListChecks" :title="t.none" :description="t.noneBody" />
      <ol v-else class="flex max-h-[40rem] flex-col divide-y divide-border overflow-y-auto rounded-control border border-border">
        <li v-for="r in shown" :key="r.id" :data-run-row="r.id" :class="cn(r.id === selectedId && 'bg-nq-selected')">
          <button
            type="button"
            :aria-pressed="r.id === selectedId"
            class="flex w-full items-center gap-3 px-3 py-2.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
            @click="choose(r.id === selectedId ? null : r)"
          >
            <NqWorkflowStatusGlyph :status="r.status" :label="c.status[r.status]" class="size-5" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-label text-foreground">{{ r.name ?? t.unnamed }}</span>
              <span class="block truncate text-caption text-muted-foreground">
                <NqDateTime :value="r.startedAt" relative />
                <template v-if="r.trigger"> · {{ r.trigger }}</template>
              </span>
            </span>
            <span class="shrink-0 text-caption text-muted-foreground tabular-nums" dir="ltr">{{ formatRunDuration(runLength(r), ar) }}</span>
          </button>
        </li>
      </ol>
    </section>
    <section :aria-label="selected ? (selected.name ?? t.unnamed) : t.pick" :class="cn('min-w-0 rounded-card border border-border bg-card p-4', !selected && 'hidden lg:block')">
      <NqRunDetail v-if="selected" :run="selected" :on-retry="props.onRetry" :on-cancel="props.onCancel" :labels="props.labels">
        <template #leading>
          <NqButton variant="ghost" size="icon-sm" class="lg:hidden" :aria-label="t.back" :title="t.back" @click="choose(null)">
            <ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />
          </NqButton>
        </template>
      </NqRunDetail>
      <NqEmptyState v-else :icon="ListChecks" :title="t.pick" :description="t.pickBody" />
    </section>
  </div>
</template>
