<script setup lang="ts">
import { EyeOff, ListChecks, Play, Square } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqDateTime } from "../numeric";
import { NqEmptyState } from "../states";
import NqWorkflowPanelHeader from "./NqWorkflowPanelHeader.vue";
import NqWorkflowStatusGlyph from "./NqWorkflowStatusGlyph.vue";
import { useCanvasLabels, type WorkflowCanvasLabels } from "./labels";
import type { WorkflowRun } from "./workflow-model";

// The executions list: newest first, pick one to draw it on the canvas as it ran, and replay it step by step.
interface Props {
  runs: WorkflowRun[];
  /** The execution drawn on the canvas, if any. */
  selectedId?: string | null;
  /** Whether a replay is playing. */
  replaying?: boolean;
  formatDuration: (ms: number) => string;
  labels?: Partial<WorkflowCanvasLabels>;
}
const props = withDefaults(defineProps<Props>(), { selectedId: null, replaying: false, labels: undefined });
const emit = defineEmits<{ select: [id: string | null]; replay: []; stopReplay: []; close: [] }>();

const { t } = useCanvasLabels(() => props.labels);
const sorted = computed(() => [...props.runs].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
</script>

<template>
  <div data-slot="workflow-runs-panel" class="flex h-full min-h-0 flex-col">
    <NqWorkflowPanelHeader :title="t.runsTitle" :hint="t.runsHint" :close-label="t.close" @close="emit('close')">
      <template #icon><ListChecks aria-hidden="true" /></template>
    </NqWorkflowPanelHeader>
    <div v-if="props.selectedId" class="flex items-center gap-2 border-b border-border px-4 py-2">
      <NqButton variant="secondary" size="sm" @click="props.replaying ? emit('stopReplay') : emit('replay')">
        <Square v-if="props.replaying" aria-hidden="true" />
        <Play v-else aria-hidden="true" />
        {{ props.replaying ? t.stopReplay : t.replay }}
      </NqButton>
      <NqButton variant="ghost" size="sm" @click="emit('select', null)">
        <EyeOff aria-hidden="true" />
        {{ t.clearOverlay }}
      </NqButton>
    </div>
    <div v-if="sorted.length === 0" class="p-4"><NqEmptyState :title="t.runsNone" /></div>
    <ol v-else class="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
      <li v-for="r in sorted" :key="r.id" :data-run-row="r.id" :class="cn(r.id === props.selectedId && 'bg-nq-selected')">
        <button
          type="button"
          :aria-pressed="r.id === props.selectedId"
          class="flex w-full items-center gap-3 px-4 py-3 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
          @click="emit('select', r.id === props.selectedId ? null : r.id)"
        >
          <NqWorkflowStatusGlyph :status="r.status" :label="t.status[r.status]" class="size-5" />
          <span class="min-w-0 flex-1">
            <span class="block text-label text-foreground">{{ t.status[r.status] }}</span>
            <span class="block truncate text-caption text-muted-foreground">
              <NqDateTime :value="r.startedAt" relative />
              <template v-if="r.trigger"> · {{ r.trigger }}</template>
            </span>
          </span>
          <span v-if="r.durationMs !== undefined" class="shrink-0 text-caption text-muted-foreground tabular-nums"><bdi>{{ props.formatDuration(r.durationMs) }}</bdi></span>
        </button>
      </li>
    </ol>
  </div>
</template>
