<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import type { ContextMenuAction } from "../context-menu";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { formatDate, NqNum } from "../numeric";
import { NqEmptyState, NqErrorState, NqLoadingState } from "../states";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { ACTION_ICONS } from "./icons";
import NqTrendTopicCard from "./NqTrendTopicCard.vue";
import { TRENDS_STRINGS, type TrendsFeedLabels } from "./strings";
import { actionsFor, countByState, groupTopicsByDay, TREND_STATES, type TrendAction, type TrendState } from "./trends-feed-math";
import type { TrendTopic } from "./types";

// Trending topics found in the news, grouped by the day they were detected and split into New, Saved, Reviewed and
// Dismissed tabs with counts. Save, review, dismiss and restore work from buttons and from the topic's context menu.
interface Props {
  topics: readonly TrendTopic[];
  /** Selected tab (controlled, v-model:state). */
  state?: TrendState;
  defaultState?: TrendState;
  /** Apply an action. Async: the buttons wait, and a rejection shows an error on the topic. Update `topics` when it resolves. */
  onAction?: (topic: TrendTopic, action: TrendAction) => void | Promise<void>;
  /** Extra items for a topic's menu (open in editor, share). */
  extraActions?: (topic: TrendTopic) => ContextMenuAction[];
  /** Zone for the day headings. Default: the browser's. */
  timeZone?: string;
  /** "Now" for Today, Yesterday and relative times. Default: the current time. */
  now?: Date;
  /** Scores at or above this get the Hot badge. Default 80. */
  hotAt?: number;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  labels?: Partial<TrendsFeedLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  state: undefined,
  defaultState: "new",
  onAction: undefined,
  extraActions: undefined,
  timeZone: undefined,
  now: undefined,
  hotAt: 80,
  error: undefined,
  onRetry: undefined,
  labels: undefined,
});
const emit = defineEmits<{ "update:state": [state: TrendState] }>();

const t = useAnalyticsLabels(TRENDS_STRINGS, () => props.labels);
const nq = useNasaq();
const inner = ref<TrendState>(props.defaultState);
const current = computed(() => props.state ?? inner.value);
const busy = ref<ReadonlySet<string>>(new Set());
const failed = ref<Record<string, string>>({});
const counts = computed(() => countByState(props.topics));
const groups = computed(() =>
  groupTopicsByDay(
    props.topics.filter((x) => x.state === current.value),
    props.timeZone,
  ),
);
const today = computed(() => new Date(props.now ?? Date.now()));

function dayLabel(day: string) {
  const base = today.value.getTime();
  const key = (d: number) => new Intl.DateTimeFormat("en-CA", { timeZone: props.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(base - d * 86400000));
  if (day === key(0)) return t.value.today;
  if (day === key(1)) return t.value.yesterday;
  return formatDate(`${day}T12:00:00Z`, nq.locale.value, { dateStyle: "full", timeZone: "UTC" });
}

function pick(value: string | number) {
  const next = value as TrendState;
  if (props.state === undefined) inner.value = next;
  emit("update:state", next);
}

async function run(topic: TrendTopic, action: TrendAction) {
  if (!props.onAction || busy.value.has(topic.id)) return;
  busy.value = new Set(busy.value).add(topic.id);
  const { [topic.id]: _drop, ...rest } = failed.value;
  failed.value = rest;
  try {
    await props.onAction(topic, action);
  } catch {
    failed.value = { ...failed.value, [topic.id]: t.value.failed(t.value.actions[action]) };
  } finally {
    const next = new Set(busy.value);
    next.delete(topic.id);
    busy.value = next;
  }
}

function menuFor(topic: TrendTopic): ContextMenuAction[] {
  return [
    ...actionsFor(topic.state).map((a) => ({ id: a, label: t.value.actions[a], icon: ACTION_ICONS[a], danger: a === "dismiss", disabled: busy.value.has(topic.id), onSelect: () => void run(topic, a) })),
    ...(props.extraActions?.(topic) ?? []).map((a) => ({ ...a, group: a.group ?? "more" })),
  ];
}
</script>

<template>
  <section data-slot="trends-feed" :class="cn('flex flex-col gap-4', props.class)">
    <NqTabs :model-value="current" @update:model-value="pick">
      <NqTabsList :aria-label="t.tabs" class="max-w-full overflow-x-auto">
        <NqTabsTab v-for="s in TREND_STATES" :key="s" :value="s">
          {{ t.states[s] }}
          <NqBadge variant="neutral" class="ms-1.5"><NqNum :value="counts[s]" /></NqBadge>
        </NqTabsTab>
      </NqTabsList>
      <NqTabsPanel v-for="s in TREND_STATES" :key="s" :value="s" class="mt-4">
        <template v-if="s === current">
          <NqErrorState v-if="props.error" :title="props.error">
            <template v-if="props.onRetry" #actions><NqButton @click="props.onRetry()">{{ t.retry }}</NqButton></template>
          </NqErrorState>
          <NqLoadingState v-else-if="props.loading" :rows="3" />
          <NqEmptyState v-else-if="groups.length === 0" :title="t.emptyTitle(t.states[s])" :description="t.emptyBody" />
          <div v-else class="flex flex-col gap-6">
            <div v-for="g in groups" :key="g.day" class="flex flex-col gap-3">
              <h3 class="text-label font-medium text-muted-foreground">{{ dayLabel(g.day) }}</h3>
              <ul class="flex flex-col gap-3">
                <NqTrendTopicCard
                  v-for="topic in g.topics"
                  :key="topic.id"
                  :topic="topic"
                  :t="t"
                  :now="today"
                  :hot="topic.score >= props.hotAt"
                  :pending="busy.has(topic.id)"
                  :error="failed[topic.id]"
                  :menu="menuFor(topic)"
                  :can-act="!!props.onAction"
                  @run="(a) => run(topic, a)"
                />
              </ul>
            </div>
          </div>
        </template>
      </NqTabsPanel>
    </NqTabs>
  </section>
</template>
