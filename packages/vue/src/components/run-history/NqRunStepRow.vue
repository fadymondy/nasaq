<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next";
import { computed, useId } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqCodeBlock } from "../code-block";
import { NqWorkflowStatusGlyph } from "../workflow-canvas";
import NqRunScreenshots from "./NqRunScreenshots.vue";
import type { RunHistoryLabels } from "./labels";
import { formatRunDuration, type RunStep } from "./run-model";

// One step of a run: a button row with status, name, its bar on the shared time axis and duration; open it for the
// error, input, output, logs and screenshots.
const props = defineProps<{ step: RunStep; bar: { left: number; width: number }; open: boolean; failing: boolean; t: RunHistoryLabels; ar: boolean; status: string }>();
const emit = defineEmits<{ toggle: [] }>();
const id = useId();
const json = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));
const has = computed(() => props.step.input !== undefined || props.step.output !== undefined || !!props.step.error || !!props.step.logs?.length || !!props.step.screenshots?.length);
const depth = computed(() => props.step.depth ?? 0);
</script>

<template>
  <li :data-step="props.step.id" :data-failing="props.failing || undefined" :class="cn('scroll-mt-4', props.failing && 'bg-nq-danger-soft/40')">
    <button
      type="button"
      :aria-expanded="props.open"
      :aria-controls="`${id}-body`"
      :aria-label="props.open ? props.t.collapse(props.step.name) : props.t.expand(props.step.name)"
      class="grid w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-3 py-2.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus sm:grid-cols-[auto_auto_minmax(0,14rem)_minmax(0,1fr)_auto]"
      :style="{ paddingInlineStart: `calc(0.75rem + ${depth * 1}rem)` }"
      @click="emit('toggle')"
    >
      <ChevronRight aria-hidden="true" :class="cn('size-4 text-muted-foreground transition-transform rtl:-scale-x-100', props.open && 'rotate-90 rtl:rotate-90')" />
      <NqWorkflowStatusGlyph :status="props.step.status" :label="props.status" class="size-5" />
      <span class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span class="truncate text-label text-foreground">{{ props.step.name }}</span>
        <NqBadge v-if="props.failing" variant="danger">{{ props.t.failedHere }}</NqBadge>
        <NqBadge v-if="props.step.status === 'skipped'" variant="outline">{{ props.t.skippedNote }}</NqBadge>
        <NqBadge v-if="props.step.attempt && props.step.attempt > 1" variant="warning">{{ props.t.attempt(String(props.step.attempt)) }}</NqBadge>
      </span>
      <span aria-hidden="true" class="col-span-full hidden h-2 rounded-full bg-nq-surface-soft sm:col-span-1 sm:block">
        <span
          :class="cn('relative block h-full rounded-full', props.step.status === 'error' ? 'bg-nq-danger' : props.step.status === 'skipped' ? 'bg-nq-line-strong' : 'bg-primary')"
          :style="{ marginInlineStart: `${props.bar.left}%`, width: `${props.bar.width}%` }"
        />
      </span>
      <span class="hidden text-caption text-muted-foreground tabular-nums sm:block" dir="ltr">{{ props.step.durationMs !== undefined ? formatRunDuration(props.step.durationMs, props.ar) : "" }}</span>
    </button>
    <div v-if="props.open" :id="`${id}-body`" class="flex flex-col gap-3 border-t border-border px-4 py-3" :style="{ paddingInlineStart: `calc(1rem + ${depth * 1}rem)` }">
      <div v-if="props.step.error" role="alert" class="rounded-control border border-nq-danger/40 bg-nq-danger-soft p-3 text-body-sm text-nq-danger-text">
        <p class="font-medium">{{ props.t.error }}</p>
        <p dir="auto">{{ props.step.error }}</p>
      </div>
      <NqCodeBlock v-if="props.step.input !== undefined" :code="json(props.step.input)" language="json" :label="props.t.input" :filename="props.t.input" pre-class-name="max-h-64" />
      <NqCodeBlock v-if="props.step.output !== undefined" :code="json(props.step.output)" language="json" :label="props.t.output" :filename="props.t.output" pre-class-name="max-h-64" />
      <NqCodeBlock v-if="props.step.logs?.length" :code="props.step.logs.join('\n')" language="text" :label="props.t.logs" :filename="props.t.logs" pre-class-name="max-h-48" />
      <NqRunScreenshots v-if="props.step.screenshots?.length" :shots="props.step.screenshots" :t="props.t" />
      <p v-if="!has" class="text-body-sm text-muted-foreground">{{ props.t.noDetail }}</p>
    </div>
  </li>
</template>
