<script lang="ts">
export interface ProjectOverviewText {
  open: string;
  done: string;
  overdue: string;
  progress: string;
  byStatus: string;
  byStatusHint: string;
  burndown: string;
  burndownHint: string;
  remaining: string;
  ideal: string;
  recent: string;
  noActivity: string;
  budget: string;
  budgetHint: string;
  spent: string;
  left: string;
  over: string;
  noBudget: string;
  issues: string;
}
</script>

<script setup lang="ts">
import { CircleCheck, CircleDot, Clock, TriangleAlert } from "lucide-vue-next";
import { computed } from "vue";
import { defaultCurrency } from "../../lib/money";
import { useNasaq } from "../../provider";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import type { Issue } from "../issue-view/issue-logic";
import { formatDate, formatNumber, NqNum } from "../numeric";
import { NqMeter } from "../progress";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqEmptyState } from "../states";
import type { WorkStatus } from "../status-label-manager/status-label-logic";
import { NqTimeline, NqTimelineItem } from "../timeline";
import { addDays, budgetState, burndown, projectTotals, statusCounts } from "./project-logic";
import type { ProjectActivityItem, ProjectBudget } from "./types";

// Overview tab: counts, open issues by status, burndown, recent activity and budget against spend.
// The two charts are drawn by hand (flex bars and one SVG), so there is no chart library.
const props = withDefaults(defineProps<{
  issues: readonly Issue[];
  statuses: readonly WorkStatus[];
  activity?: readonly ProjectActivityItem[];
  budget?: ProjectBudget | null;
  /** Burndown range, civil dates. Default: 14 days back to the latest due date, or a week ahead. */
  start?: string;
  end?: string;
  /** Civil "today" for overdue and the burndown edge. */
  today: string;
  t: ProjectOverviewText;
}>(), { activity: () => [], budget: undefined, start: undefined, end: undefined });

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const totals = computed(() => projectTotals(props.issues as Issue[], props.statuses, props.today));
const counts = computed(() => statusCounts(props.issues, props.statuses));
const range = computed(() => {
  if (props.start && props.end) return { start: props.start, end: props.end };
  const dues = props.issues.map((i) => i.dueDate).filter((d): d is string => Boolean(d)).sort();
  const s = props.start ?? addDays(props.today, -13);
  const last = dues[dues.length - 1];
  const e = props.end ?? (last && last > props.today ? last : addDays(props.today, 7));
  return { start: s, end: e };
});
const points = computed(() => burndown(props.issues, range.value.start, range.value.end, props.today));
const day = (key: string) => formatDate(new Date(`${key}T00:00:00`), locale.value, { day: "numeric", month: "short" });
const statusData = computed(() =>
  counts.value
    .filter((c) => {
      const g = props.statuses.find((x) => x.id === c.statusId)?.stage;
      return g !== "done" && g !== "canceled";
    })
    .map((c) => {
      const s = props.statuses.find((x) => x.id === c.statusId);
      return { name: s?.name ?? c.statusId, count: c.count, fill: `var(--nq-tag-${s?.hue ?? "gray"})` };
    }),
);
const maxCount = computed(() => Math.max(1, ...statusData.value.map((d) => d.count)));
const burnMax = computed(() => Math.max(1, ...points.value.map((p) => Math.max(p.remaining ?? 0, p.ideal))));
const xy = (i: number, v: number) => `${points.value.length > 1 ? (i / (points.value.length - 1)) * 100 : 0},${100 - (v / burnMax.value) * 96 - 2}`;
const remainingLine = computed(() => points.value.flatMap((p, i) => (p.remaining === null ? [] : [xy(i, p.remaining)])).join(" "));
const idealLine = computed(() => points.value.map((p, i) => xy(i, p.ideal)).join(" "));
const money = (n: number) => formatNumber(n, locale.value, { style: "currency", currency: props.budget?.currency ?? defaultCurrency(locale.value), maximumFractionDigits: 0 });
const b = computed(() => (props.budget ? budgetState(props.budget.total, props.budget.spent) : null));
</script>

<template>
  <div data-slot="project-overview" class="@container flex min-w-0 flex-col gap-4">
    <NqStatGrid>
      <NqStatCard :label="props.t.open" :value="totals.open"><template #icon><CircleDot /></template></NqStatCard>
      <NqStatCard :label="props.t.done" :value="totals.done"><template #icon><CircleCheck /></template></NqStatCard>
      <NqStatCard :label="props.t.overdue" :value="totals.overdue" invert><template #icon><TriangleAlert /></template></NqStatCard>
      <NqStatCard :label="props.t.progress" :value="totals.percent / 100" :format="{ style: 'percent', maximumFractionDigits: 0 }"><template #icon><Clock /></template></NqStatCard>
    </NqStatGrid>

    <div class="grid min-w-0 gap-4 @3xl:grid-cols-2">
      <NqCard>
        <NqCardHeader>
          <NqCardTitle as="h3" class="text-h3">{{ props.t.byStatus }}</NqCardTitle>
          <NqCardDescription>{{ props.t.byStatusHint }}</NqCardDescription>
        </NqCardHeader>
        <NqCardContent>
          <div data-slot="project-status-chart" role="img" :aria-label="`${props.t.byStatus}. ${statusData.map((d) => `${d.name} ${d.count}`).join(', ')}`" class="flex h-56 items-stretch gap-2">
            <div v-for="d in statusData" :key="d.name" class="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div class="flex min-h-0 w-full flex-1 items-end border-b border-border">
                <div class="w-full rounded-t-[3px]" :style="{ height: `${(d.count / maxCount) * 100}%`, background: d.fill }" />
              </div>
              <span class="text-caption tabular-nums text-foreground"><NqNum :value="d.count" /></span>
              <span class="w-full truncate text-center text-[11px] text-muted-foreground">{{ d.name }}</span>
            </div>
          </div>
        </NqCardContent>
      </NqCard>

      <NqCard>
        <NqCardHeader>
          <NqCardTitle as="h3" class="text-h3">{{ props.t.burndown }}</NqCardTitle>
          <NqCardDescription>{{ props.t.burndownHint }}</NqCardDescription>
        </NqCardHeader>
        <NqCardContent>
          <div data-slot="project-burndown" role="img" :aria-label="`${props.t.burndown}. ${range.start} - ${range.end}`" class="flex flex-col gap-1">
            <div class="relative h-56">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-0 size-full overflow-visible rtl:-scale-x-100">
                <line v-for="n in [0, 25, 50, 75, 100]" :key="n" x1="0" x2="100" :y1="n" :y2="n" stroke="var(--border)" stroke-width="1" vector-effect="non-scaling-stroke" />
                <polyline :points="idealLine" fill="none" stroke="var(--muted-foreground)" stroke-width="1.5" stroke-dasharray="4 4" vector-effect="non-scaling-stroke" />
                <polyline :points="remainingLine" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
              </svg>
              <span class="absolute start-0 top-0 text-caption tabular-nums text-muted-foreground"><NqNum :value="burnMax" /></span>
            </div>
            <div class="flex justify-between text-caption text-muted-foreground"><span>{{ day(range.start) }}</span><span>{{ day(range.end) }}</span></div>
          </div>
          <ul class="m-0 mt-2 flex list-none justify-center gap-4 p-0 text-caption text-muted-foreground">
            <li class="flex items-center gap-1.5"><span aria-hidden="true" class="h-0.5 w-4 bg-primary" />{{ props.t.remaining }}</li>
            <li class="flex items-center gap-1.5"><span aria-hidden="true" class="w-4 border-t-2 border-dashed border-muted-foreground" />{{ props.t.ideal }}</li>
          </ul>
        </NqCardContent>
      </NqCard>

      <NqCard>
        <NqCardHeader>
          <NqCardTitle as="h3" class="text-h3">{{ props.t.recent }}</NqCardTitle>
        </NqCardHeader>
        <NqCardContent>
          <NqEmptyState v-if="props.activity.length === 0" :title="props.t.noActivity" />
          <NqTimeline v-else :aria-label="props.t.recent">
            <NqTimelineItem v-for="a in props.activity.slice(0, 6)" :key="a.id" :actor="a.actor" :title="a.title" :description="a.description" :time="a.at" />
          </NqTimeline>
        </NqCardContent>
      </NqCard>

      <NqCard>
        <NqCardHeader>
          <NqCardTitle as="h3" class="text-h3">{{ props.t.budget }}</NqCardTitle>
          <NqCardDescription>{{ props.t.budgetHint }}</NqCardDescription>
        </NqCardHeader>
        <NqCardContent class="flex flex-col gap-3">
          <template v-if="props.budget && b">
            <NqMeter :aria-label="props.t.budget" :value="Math.min(props.budget.spent, props.budget.total)" :max="props.budget.total" size="md" :show-value="false" />
            <dl class="m-0 grid grid-cols-3 gap-3">
              <div>
                <dt class="text-caption text-muted-foreground">{{ props.t.spent }}</dt>
                <dd class="m-0 text-body font-semibold"><bdi>{{ money(props.budget.spent) }}</bdi></dd>
              </div>
              <div>
                <dt class="text-caption text-muted-foreground">{{ b.over ? props.t.over : props.t.left }}</dt>
                <dd :class="b.over ? 'm-0 text-body font-semibold text-nq-danger-text' : 'm-0 text-body font-semibold'"><bdi>{{ money(Math.abs(b.remaining)) }}</bdi></dd>
              </div>
              <div>
                <dt class="text-caption text-muted-foreground">{{ props.t.budget }}</dt>
                <dd class="m-0 text-body font-semibold"><bdi>{{ money(props.budget.total) }}</bdi></dd>
              </div>
            </dl>
          </template>
          <p v-else class="m-0 text-body-sm text-muted-foreground">{{ props.t.noBudget }}</p>
        </NqCardContent>
      </NqCard>
    </div>
  </div>
</template>
