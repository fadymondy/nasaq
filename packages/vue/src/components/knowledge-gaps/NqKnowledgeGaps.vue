<script setup lang="ts">
import { Check, CircleDashed, RotateCcw, X } from "lucide-vue-next";
import { computed, ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqDateTime, formatNumber } from "../numeric";
import { NqEmptyState, NqErrorState, NqLoadingState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { KNOWLEDGE_GAP_ORDER, gapCounts, gapTransitions, groupGaps, hitShare, type KnowledgeGapStatus } from "./knowledge-gaps-math";
import { STRINGS, type KnowledgeGapsLabelOverrides, type KnowledgeGapsLabels } from "./strings";
import type { KnowledgeGap, KnowledgeGapResult } from "./types";

// Questions the brain could not answer, grouped as open, indexed and dismissed, most asked first. Each row can be marked
// indexed once the missing knowledge is added, dismissed, or reopened, from buttons or the context menu.
interface Props {
  gaps: readonly KnowledgeGap[];
  /** Status filter (`v-model:status`): a status, or "" for all. */
  status?: KnowledgeGapStatus | "";
  defaultStatus?: KnowledgeGapStatus | "";
  /** Move a gap to a new status. Return `{ error }` (or throw) to keep it where it is and show the message. */
  onResolve?: (gap: KnowledgeGap, status: KnowledgeGapStatus) => Promise<KnowledgeGapResult> | KnowledgeGapResult;
  loading?: boolean;
  error?: string;
  /** Turn the row context menu off. Default on. */
  contextMenu?: boolean;
  labels?: KnowledgeGapsLabelOverrides;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { status: undefined, defaultStatus: "", onResolve: undefined, loading: false, error: undefined, contextMenu: true, labels: undefined });
const emit = defineEmits<{
  "update:status": [status: KnowledgeGapStatus | ""];
  /** The retry button of the error state. */
  retry: [];
}>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed<KnowledgeGapsLabels>(() => {
  const base = STRINGS[locale.value.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...props.labels, statuses: { ...base.statuses, ...props.labels?.statuses }, resolved: { ...base.resolved, ...props.labels?.resolved } };
});
const inner = ref<KnowledgeGapStatus | "">(props.defaultStatus);
const status = computed(() => props.status ?? inner.value);
const busy = ref<string | null>(null);
const message = ref<{ tone: "ok" | "error"; text: string } | null>(null);

const grouped = computed(() => groupGaps(props.gaps));
const counts = computed(() => gapCounts(props.gaps));
const max = computed(() => Math.max(0, ...props.gaps.map((g) => g.hits)));
const visible = computed(() => (status.value ? [status.value] : KNOWLEDGE_GAP_ORDER));
const shown = computed(() => visible.value.reduce((n, s) => n + grouped.value[s].length, 0));
const num = (n: number) => formatNumber(n, locale.value);

const TONE: Record<KnowledgeGapStatus, StatusTone> = { open: "warning", indexed: "success", dismissed: "neutral" };
const ACTION_ICON: Record<KnowledgeGapStatus, Component> = { open: RotateCcw, indexed: Check, dismissed: X };

function setStatus(next: KnowledgeGapStatus | "") {
  inner.value = next;
  emit("update:status", next);
}

async function resolve(gap: KnowledgeGap, next: KnowledgeGapStatus) {
  if (busy.value || !props.onResolve) return;
  busy.value = `${gap.id}:${next}`;
  message.value = null;
  try {
    const result = await props.onResolve(gap, next);
    message.value = result && result.error ? { tone: "error", text: result.error } : { tone: "ok", text: t.value.resolved[next] };
  } catch (e) {
    message.value = { tone: "error", text: e instanceof Error && e.message ? e.message : t.value.failed };
  } finally {
    busy.value = null;
  }
}

const actionLabel = (s: KnowledgeGapStatus) => (s === "indexed" ? t.value.markIndexed : s === "dismissed" ? t.value.dismiss : t.value.reopen);
const actionsFor = (gap: KnowledgeGap): ContextMenuAction[] =>
  gapTransitions(gap.status).map((s) => ({ id: s, label: actionLabel(s), icon: ACTION_ICON[s], disabled: busy.value !== null, onSelect: () => void resolve(gap, s) }));

function onFilter(v: string[]) {
  const next = v[0];
  if (next) setStatus(next === "all" ? "" : (next as KnowledgeGapStatus));
}
defineOptions({ inheritAttrs: false });
</script>

<template>
  <section data-slot="knowledge-gaps" :aria-label="t.label" :class="cn('flex min-w-0 flex-col gap-4', props.class)" v-bind="$attrs">
    <div class="flex flex-wrap items-center gap-2">
      <NqToggleGroup :aria-label="t.filter" :model-value="[status || 'all']" @update:model-value="onFilter">
        <NqToggle value="all">{{ t.all }}</NqToggle>
        <NqToggle v-for="s in KNOWLEDGE_GAP_ORDER" :key="s" :value="s">
          {{ t.statuses[s] }}
          <span class="ms-1.5 tabular-nums text-muted-foreground">{{ num(counts[s]) }}</span>
        </NqToggle>
      </NqToggleGroup>
      <span v-if="counts.open > 0" class="ms-auto text-caption text-muted-foreground">{{ t.count(num(counts.open)) }}</span>
    </div>

    <p role="status" aria-live="polite" :class="cn('min-h-5 text-body-sm', message?.tone === 'error' ? 'text-nq-danger-text' : 'text-muted-foreground')">{{ message?.text ?? "" }}</p>

    <NqErrorState v-if="props.error" :title="props.error">
      <template v-if="$attrs.onRetry" #actions><NqButton @click="emit('retry')">{{ t.retry }}</NqButton></template>
    </NqErrorState>
    <NqLoadingState v-else-if="props.loading" :label="t.loading" :rows="4" />
    <NqEmptyState v-else-if="props.gaps.length === 0" :icon="CircleDashed" :title="t.empty" :description="t.emptyHint" />
    <NqEmptyState v-else-if="shown === 0" :icon="CircleDashed" :title="t.emptyFiltered" />
    <template v-else>
      <template v-for="s in visible" :key="s">
        <div v-if="grouped[s].length" :data-status="s" class="flex flex-col gap-2">
          <h3 class="flex items-center gap-2 text-label text-foreground">
            <NqStatus :tone="TONE[s]">{{ t.statuses[s] }}</NqStatus>
            <span class="text-caption tabular-nums text-muted-foreground">{{ num(grouped[s].length) }}</span>
          </h3>
          <ul :aria-label="t.statuses[s]" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            <NqContextMenuActions
              v-for="gap in grouped[s]"
              :key="gap.id"
              as="li"
              :actions="props.contextMenu && props.onResolve ? actionsFor(gap) : []"
              class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
            >
              <div class="min-w-0 flex-1">
                <p dir="auto" :title="gap.query" class="truncate text-label text-foreground">{{ gap.query }}</p>
                <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                  <span class="inline-flex items-center gap-2">
                    <span aria-hidden="true" class="block h-1 w-10 overflow-hidden rounded-full bg-nq-surface-soft">
                      <span class="block h-full rounded-full bg-nq-accent" :style="{ width: `${Math.max(8, hitShare(gap.hits, max) * 100)}%` }" />
                    </span>
                    {{ t.asked(num(gap.hits), gap.hits) }}
                  </span>
                  <span>{{ t.firstSeen }} <NqDateTime :value="gap.firstSeen" /></span>
                  <span>{{ t.lastSeen }} <NqDateTime :value="gap.lastSeen" relative /></span>
                </p>
                <p v-if="gap.resolution" dir="auto" class="mt-1 text-body-sm italic text-muted-foreground">“{{ gap.resolution }}”</p>
              </div>
              <div v-if="props.onResolve" class="flex shrink-0 flex-wrap gap-1.5">
                <NqButton
                  v-for="next in gapTransitions(gap.status)"
                  :key="next"
                  size="sm"
                  :variant="next === 'dismissed' ? 'ghost' : 'secondary'"
                  :disabled="busy !== null && busy !== `${gap.id}:${next}`"
                  :loading="busy === `${gap.id}:${next}`"
                  @click="resolve(gap, next)"
                >
                  <component :is="ACTION_ICON[next]" aria-hidden="true" />
                  {{ actionLabel(next) }}
                </NqButton>
              </div>
            </NqContextMenuActions>
          </ul>
        </div>
      </template>
    </template>
  </section>
</template>
