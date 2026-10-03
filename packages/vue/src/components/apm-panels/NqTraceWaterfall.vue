<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { formatMillis } from "../metric-tiles";
import { spanDepths, traceExtent } from "./apm-math";
import type { ApmPanelsLabels } from "./strings";
import type { TraceSummary } from "./NqTraceList.vue";

// Internal: the waterfall of one trace. Each span is a bar placed by start time and sized by duration, indented under its parent.
const props = defineProps<{ trace: TraceSummary; t: ApmPanelsLabels; ar: boolean }>();

const spans = computed(() => [...(props.trace.spans ?? [])].sort((a, b) => a.startMs - b.startMs));
const depths = computed(() => spanDepths(spans.value));
const origin = computed(() => (spans.value.length ? Math.min(...spans.value.map((s) => s.startMs)) : 0));
const extent = computed(() => Math.max(1, traceExtent(spans.value)));
const bars = computed(() =>
  spans.value.map((s) => {
    const left = ((s.startMs - origin.value) / extent.value) * 100;
    const width = Math.max(0.8, (s.durationMs / extent.value) * 100);
    return { s, left, width, depth: depths.value.get(s.id) ?? 0 };
  }),
);
</script>

<template>
  <section data-slot="trace-waterfall" :aria-label="t.waterfallOf(trace.name)" class="flex flex-col gap-2 rounded-control border border-border p-3">
    <h4 class="text-label text-foreground">{{ t.waterfall }}</h4>
    <ul class="flex flex-col gap-1.5">
      <li v-for="b in bars" :key="b.s.id" class="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]" :style="{ '--depth': b.depth }">
        <div class="min-w-0 ps-[calc(var(--depth)*0.75rem)]">
          <bdi dir="ltr" class="block truncate font-mono text-code text-foreground">{{ b.s.name }}</bdi>
          <span class="block truncate text-caption text-muted-foreground" dir="ltr">{{ b.s.service }}</span>
        </div>
        <div class="relative h-5 rounded-control bg-nq-surface-soft" role="img" :aria-label="`${b.s.name}, ${formatMillis(b.s.durationMs, ar)}${b.s.error ? `, ${t.failed}` : ''}`">
          <span
            :class="cn('absolute inset-y-0.5 flex items-center rounded-[3px] px-1 text-caption', b.s.error ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground')"
            :style="{ insetInlineStart: `${b.left}%`, width: `${Math.min(b.width, 100 - b.left)}%` }"
          />
          <span class="absolute inset-y-0 flex items-center text-caption text-foreground tabular-nums" :style="{ insetInlineStart: `${Math.min(b.left + b.width + 1, 82)}%` }" dir="ltr">{{ formatMillis(b.s.durationMs, ar) }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>
