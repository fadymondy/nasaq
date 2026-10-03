<script setup lang="ts">
import { CircleCheck, Ellipsis, TriangleAlert } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqProgressRing, NqTrendCell } from "../chart-extras";
import { NqContextMenuActions, openContextMenuAt, type ContextMenuAction } from "../context-menu";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum, type FormatNumberOptions } from "../numeric";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { attainment, kpiStatus } from "./business-reports-math";
import { statusTone, statusVariant, WHOLE } from "./shared";
import { STRINGS, type BusinessReportsLabels } from "./strings";

// One card per person: a ring for how much of the target is reached, the figures, a trend and a status word (Ahead,
// On track, Behind), with a team summary above. Cards fill the width and reflow to one column on a phone.
export interface EmployeeKpi {
  id: string;
  name: string;
  role?: string;
  avatarSrc?: string;
  target: number;
  actual: number;
  /** Extra figures on the card: tasks done, hours, calls. */
  metrics?: readonly { id: string; label: string; value: number; format?: FormatNumberOptions }[];
  /** Actual per period, oldest first. */
  trend?: readonly number[];
  /** Change against the last period as a fraction. */
  delta?: number;
}

const props = withDefaults(
  defineProps<{
    employees: readonly EmployeeKpi[];
    /** Intl options for `target` and `actual` (hours, deals, currency). */
    format?: FormatNumberOptions;
    /** What the target measures: "Billable hours". Shown in the summary. */
    measure?: string;
    /** Fraction of the target at which someone counts as on track. Default 0.8. */
    onTrackAt?: number;
    /** Menu for an employee card: context-click, long press, Shift+F10 or the ⋯ button. */
    actions?: (employee: EmployeeKpi) => ContextMenuAction[];
    loading?: boolean;
    labels?: Partial<BusinessReportsLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { format: undefined, measure: undefined, onTrackAt: 0.8, actions: undefined, loading: false, labels: undefined },
);

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const rows = computed(() =>
  props.employees.map((e) => {
    const fraction = attainment(e.actual, e.target);
    return { e, fraction, status: kpiStatus(fraction, props.onTrackAt), list: props.actions?.(e) ?? [] };
  }),
);
const target = computed(() => props.employees.reduce((a, e) => a + e.target, 0));
const actual = computed(() => props.employees.reduce((a, e) => a + e.actual, 0));
const ahead = computed(() => rows.value.filter((r) => r.status === "ahead").length);
const behind = computed(() => rows.value.filter((r) => r.status === "behind").length);
const pct = (f: number) => `${Math.round(f * 100)}%`;
</script>

<template>
  <section data-slot="employee-kpi-dashboard" :class="cn('flex flex-col gap-4', props.class)">
    <NqStatGrid>
      <NqStatCard :label="measure ? `${t.kpiTeam}: ${measure}` : t.kpiTeam" :value="attainment(actual, target)" :format="WHOLE" :loading="loading" />
      <NqStatCard :label="t.kpiAhead" :value="ahead" :loading="loading" />
      <NqStatCard :label="t.kpiBehind" :value="behind" :loading="loading" />
    </NqStatGrid>
    <p v-if="!loading && !employees.length" class="text-body text-muted-foreground">{{ t.empty }}</p>
    <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <NqContextMenuActions v-for="{ e, fraction, status, list } in rows" :key="e.id" :actions="list" as="li" class="min-w-0">
        <NqCard class="h-full w-full">
          <NqCardHeader class="flex flex-row items-center gap-3">
            <NqAvatar :name="e.name" :src="e.avatarSrc" size="lg" />
            <div class="min-w-0 flex-1">
              <NqCardTitle class="truncate">{{ e.name }}</NqCardTitle>
              <p v-if="e.role" class="truncate text-caption text-muted-foreground">{{ e.role }}</p>
            </div>
            <NqButton v-if="list.length" variant="ghost" size="icon-sm" :aria-label="t.moreFor(e.name)" @click="(ev: MouseEvent) => openContextMenuAt((ev.currentTarget as HTMLElement).closest('li') as HTMLElement)">
              <Ellipsis aria-hidden="true" />
            </NqButton>
          </NqCardHeader>
          <NqCardContent class="flex flex-col gap-3">
            <div class="flex items-center gap-4">
              <NqProgressRing :value="Math.min(fraction, 1) * 100" :tone="statusTone[status]" :size="84" :label="t.attainment(e.name, pct(fraction))" :value-text="pct(fraction)" />
              <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                <NqBadge :variant="statusVariant[status]" class="w-fit">
                  <TriangleAlert v-if="status === 'behind'" aria-hidden="true" />
                  <CircleCheck v-else aria-hidden="true" />
                  {{ t.kpiStatus[status] }}
                </NqBadge>
                <p class="text-body">
                  <NqNum :value="e.actual" :format="format" />
                  <span class="text-muted-foreground"> / </span>
                  <NqNum :value="e.target" :format="format" />
                </p>
                <NqTrendCell v-if="e.trend?.length" :data="e.trend" variant="bar" :highlight="e.trend.length - 1" :delta="e.delta" :chart-label="`${t.trend}: ${e.name}`" />
              </div>
            </div>
            <dl v-if="e.metrics?.length" class="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3 text-caption">
              <div v-for="m in e.metrics" :key="m.id" class="flex items-baseline justify-between gap-2">
                <dt class="truncate text-muted-foreground">{{ m.label }}</dt>
                <dd class="font-medium"><NqNum :value="m.value" :format="m.format" /></dd>
              </div>
            </dl>
          </NqCardContent>
        </NqCard>
      </NqContextMenuActions>
    </ul>
  </section>
</template>
