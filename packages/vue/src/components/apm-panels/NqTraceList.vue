<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { formatMillis } from "../metric-tiles";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqDateTime } from "../numeric";
import { NqStatus, type StatusTone } from "../status";
import { statusClass } from "./apm-math";
import NqApmPanelBody from "./NqApmPanelBody.vue";
import NqTraceWaterfall from "./NqTraceWaterfall.vue";
import { STRINGS, type ApmPanelsLabels } from "./strings";

// Recent requests as rows: method, route, status (class word, not colour alone), duration with a bar sized against the
// slowest, and when it started. Choosing a trace that carries spans opens its waterfall under the list.
export interface TraceSpan {
  id: string;
  parentId?: string;
  name: string;
  /** Service that ran it: "api", "postgres", "redis". */
  service: string;
  /** Milliseconds from the start of the trace. */
  startMs: number;
  durationMs: number;
  error?: boolean;
}
export interface TraceSummary {
  id: string;
  method: string;
  /** Route or operation name: "/api/checkout". */
  name: string;
  /** HTTP status of the root request. */
  status: number;
  durationMs: number;
  startedAt: number | Date | string;
  service?: string;
  spans?: readonly TraceSpan[];
}
const props = withDefaults(
  defineProps<{
    traces: readonly TraceSummary[];
    /** Selected trace id (controlled). Selecting a trace with `spans` shows its waterfall. */
    selectedId?: string | null;
    defaultSelectedId?: string | null;
    onSelect?: (trace: TraceSummary | null) => void;
    /** Milliseconds above which a trace's bar is toned as slow. Default 1000. */
    slowMs?: number;
    title?: string;
    description?: string;
    loading?: boolean;
    error?: string | boolean;
    onRetry?: () => void;
    class?: HTMLAttributes["class"];
    labels?: Partial<ApmPanelsLabels>;
  }>(),
  { selectedId: undefined, defaultSelectedId: null, slowMs: 1000 },
);

const classTone: Record<ReturnType<typeof statusClass>, StatusTone> = { "2xx": "success", "3xx": "info", "4xx": "warning", "5xx": "danger", other: "neutral" };
const nq = useNasaq();
const t = useAnalyticsLabels(STRINGS, () => props.labels);
const ar = computed(() => nq.locale.value.startsWith("ar"));
const selectedState = ref<string | null>(props.defaultSelectedId);
const selectedId = computed(() => (props.selectedId === undefined ? selectedState.value : props.selectedId));
const selected = computed(() => props.traces.find((x) => x.id === selectedId.value) ?? null);
const sorted = computed(() => [...props.traces].sort((a, b) => b.durationMs - a.durationMs));
const max = computed(() => sorted.value[0]?.durationMs ?? 0);

function choose(trace: TraceSummary) {
  const next = trace.id === selectedId.value ? null : trace;
  if (props.selectedId === undefined) selectedState.value = next?.id ?? null;
  props.onSelect?.(next);
}
</script>

<template>
  <NqCard data-slot="trace-list" :aria-busy="loading || undefined" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3">{{ title ?? t.traces }}</NqCardTitle>
      <NqCardDescription>{{ description ?? t.tracesDescription }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqApmPanelBody :error="error" :loading="loading" :empty="traces.length === 0" :on-retry="onRetry" :t="t" height="h-40">
        <ul class="flex flex-col divide-y divide-border rounded-control border border-border">
          <li v-for="trace in sorted" :key="trace.id">
            <button
              type="button"
              :aria-pressed="trace.id === selectedId"
              :aria-label="t.selectTrace(`${trace.method} ${trace.name}`)"
              :class="cn('grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-3 py-2 text-start outline-none hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus sm:grid-cols-[minmax(0,1fr)_10rem_auto]', trace.id === selectedId && 'bg-muted')"
              @click="choose(trace)"
            >
              <span class="flex min-w-0 flex-col gap-1">
                <bdi dir="ltr" class="flex min-w-0 items-center gap-2">
                  <NqBadge variant="outline" class="font-mono">{{ trace.method }}</NqBadge>
                  <span class="truncate font-mono text-code text-foreground">{{ trace.name }}</span>
                </bdi>
                <span class="flex flex-wrap items-center gap-x-3 text-caption text-muted-foreground">
                  <NqStatus :tone="classTone[statusClass(trace.status)]" class="text-caption"><bdi dir="ltr">{{ trace.status }}</bdi></NqStatus>
                  <NqDateTime :value="trace.startedAt" relative />
                  <span v-if="trace.spans">{{ t.spans(trace.spans.length) }}</span>
                  <bdi v-if="trace.service" dir="ltr">{{ trace.service }}</bdi>
                </span>
              </span>
              <span class="hidden sm:block" aria-hidden="true">
                <span class="block h-2 rounded-full bg-nq-surface-soft">
                  <span
                    :class="cn('block h-full rounded-full', statusClass(trace.status) === '5xx' ? 'bg-nq-danger' : trace.durationMs > slowMs ? 'bg-nq-warning' : 'bg-primary')"
                    :style="{ width: `${max > 0 ? Math.max(3, (trace.durationMs / max) * 100) : 0}%` }"
                  />
                </span>
              </span>
              <span :class="cn('text-label tabular-nums', trace.durationMs > slowMs ? 'text-nq-warning-text' : 'text-foreground')" dir="ltr">{{ formatMillis(trace.durationMs, ar) }}</span>
            </button>
          </li>
        </ul>
      </NqApmPanelBody>
      <NqTraceWaterfall v-if="selected?.spans?.length" :trace="selected" :t="t" :ar="ar" />
    </NqCardContent>
  </NqCard>
</template>
