<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { addDays, dayKey, endOfWeek, getWeekStartsOn, startOfDay, startOfWeek, type WeekDay } from "../calendar/calendar-math";
import { formatDate, NqDateTime } from "../numeric";
import { NqTooltip } from "../tooltip";
import { defaultCount, heatmapLevel, heatmapStrings, LEVEL_CLASS, parseHeatmapDay, type HeatmapDatum } from "./heatmap-math";

// A contribution grid: one cell per day, one column per week, five intensity levels of one colour. The time axis follows the reading
// direction, so it runs right to left in Arabic. Cells are tooltip triggers and the grid is a single tab stop with arrow-key navigation.
const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

interface Props {
  data: readonly HeatmapDatum[];
  /** First day of the range. Default: 52 weeks before `to`. */
  from?: Date | string;
  /** Last day of the range. Default: today. */
  to?: Date | string;
  /** Any CSS colour, normally a token: `var(--nq-tag-teal)`. Default `var(--primary)`. */
  color?: string;
  /** Smallest counts of levels 1 to 4, ascending. Default: quarters of the largest count. */
  thresholds?: readonly [number, number, number, number];
  /** Cell size in px. Default 12. */
  cellSize?: number;
  /** Gap in px. Default 3. */
  gap?: number;
  weekStartsOn?: WeekDay;
  /** Show the "Less ... More" legend. Default true. */
  legend?: boolean;
  /** Text for a count in the tooltip and accessible name. Default is English or Arabic. */
  formatCount?: (count: number) => string;
  locale?: string;
  dir?: "ltr" | "rtl";
  /** Accessible name of the grid. Localise it. */
  label?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  from: undefined,
  to: undefined,
  color: "var(--primary)",
  thresholds: undefined,
  cellSize: 12,
  gap: 3,
  weekStartsOn: undefined,
  legend: true,
  formatCount: undefined,
  locale: undefined,
  dir: undefined,
  label: undefined,
});

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const rtl = computed(() => (props.dir ? props.dir === "rtl" : props.locale ? RTL_LANGS.has(locale.value.split("-")[0] ?? "en") : nq.isRtl.value));
const t = computed(() => heatmapStrings(locale.value));
const weekStartsOn = computed<WeekDay>(() => props.weekStartsOn ?? getWeekStartsOn(locale.value));
const to = computed(() => (props.to ? parseHeatmapDay(props.to) : startOfDay(new Date())));
const from = computed(() => (props.from ? parseHeatmapDay(props.from) : addDays(to.value, -52 * 7 + 1)));
const count = (n: number) => (props.formatCount ? props.formatCount(n) : defaultCount(n, locale.value));

const grid = computed(() => {
  const counts = new Map<string, number>();
  for (const d of props.data) {
    const key = dayKey(parseHeatmapDay(d.date));
    counts.set(key, (counts.get(key) ?? 0) + d.count);
  }
  const weeks: Date[][] = [];
  let cursor = startOfWeek(from.value, weekStartsOn.value);
  const last = endOfWeek(to.value, weekStartsOn.value);
  while (cursor <= last) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  }
  let max = 0;
  for (let d = from.value; d <= to.value; d = addDays(d, 1)) max = Math.max(max, counts.get(dayKey(d)) ?? 0);
  return { weeks, counts, max };
});

const inRange = (d: Date) => d >= from.value && d <= to.value;
const monthName = computed(() => new Intl.DateTimeFormat(locale.value, { month: "short" }));
const weekdayName = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: "short" }));

// Month labels sit on the first week that contains the 1st of a month, skipping one that would touch the previous label.
const monthLabels = computed(() => {
  const labels = new Map<number, string>();
  let lastIndex = -10;
  grid.value.weeks.forEach((week, i) => {
    const first = week.find((d) => d.getDate() === 1 && inRange(d)) ?? (i === 0 ? week.find(inRange) : undefined);
    if (!first || i - lastIndex < 3) return;
    labels.set(i, monthName.value.format(first));
    lastIndex = i;
  });
  return labels;
});

const focusKey = ref<string | null>(null);
const root = ref<HTMLElement | null>(null);
const activeKey = computed(() => focusKey.value ?? dayKey(to.value));

function move(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  let next = addDays(new Date(y, m - 1, d), days);
  if (next < from.value) next = from.value;
  if (next > to.value) next = to.value;
  const nextKey = dayKey(next);
  focusKey.value = nextKey;
  requestAnimationFrame(() => root.value?.querySelector<HTMLElement>(`[data-date="${nextKey}"]`)?.focus());
}

function onKeyDown(e: KeyboardEvent) {
  const key = (e.target as HTMLElement).getAttribute("data-date");
  if (!key) return;
  // Time runs against the inline-start edge in RTL, so "toward the end of time" is Left there.
  const forward = rtl.value ? "ArrowLeft" : "ArrowRight";
  const back = rtl.value ? "ArrowRight" : "ArrowLeft";
  const step: Record<string, number> = { [forward]: 7, [back]: -7, ArrowDown: 1, ArrowUp: -1 };
  const days = step[e.key];
  if (days === undefined) return;
  e.preventDefault();
  move(key, days);
}

const style = computed(() => ({ "--heat": props.color, "--cell": `${props.cellSize}px`, "--gap": `${props.gap}px` }));
const cell = "size-[var(--cell)] shrink-0 rounded-[3px]";
</script>

<template>
  <div ref="root" :dir="rtl ? 'rtl' : 'ltr'" :lang="locale" data-slot="heatmap" :style="style" :class="cn('inline-flex max-w-full flex-col gap-2 text-caption text-muted-foreground', props.class)">
    <div class="overflow-x-auto pb-1">
      <div class="flex gap-[var(--gap)]">
        <div aria-hidden="true" class="flex flex-col gap-[var(--gap)] pe-1">
          <span class="h-4" />
          <span v-for="(d, i) in grid.weeks[0] ?? []" :key="i" class="flex h-[var(--cell)] items-center whitespace-nowrap leading-none">{{ i % 2 === 1 ? weekdayName.format(d) : "" }}</span>
        </div>
        <div role="grid" :aria-label="label ?? t.grid" class="flex gap-[var(--gap)]" @keydown="onKeyDown">
          <div v-for="(week, w) in grid.weeks" :key="dayKey(week[0]!)" class="flex flex-col gap-[var(--gap)]">
            <span aria-hidden="true" class="h-4 w-[var(--cell)] overflow-visible whitespace-nowrap leading-4">{{ monthLabels.get(w) }}</span>
            <div role="row" class="flex flex-col gap-[var(--gap)]">
              <template v-for="day in week" :key="dayKey(day)">
                <span v-if="!inRange(day)" role="presentation" :class="cell" />
                <NqTooltip v-else>
                  <div
                    role="gridcell"
                    :tabindex="dayKey(day) === activeKey ? 0 : -1"
                    :aria-label="`${formatDate(day, locale, { dateStyle: 'medium' })}: ${count(grid.counts.get(dayKey(day)) ?? 0)}`"
                    :data-date="dayKey(day)"
                    :data-level="heatmapLevel(grid.counts.get(dayKey(day)) ?? 0, grid.max, thresholds)"
                    :class="
                      cn(
                        cell,
                        LEVEL_CLASS[heatmapLevel(grid.counts.get(dayKey(day)) ?? 0, grid.max, thresholds)],
                        'outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus',
                        'hover:outline hover:outline-1 hover:outline-nq-line-strong',
                      )
                    "
                    @focus="focusKey = dayKey(day)"
                  />
                  <template #content>
                    <strong class="font-semibold">{{ count(grid.counts.get(dayKey(day)) ?? 0) }}</strong>
                    <span class="block opacity-80"><NqDateTime :value="day" :format="{ dateStyle: 'medium' }" /></span>
                  </template>
                </NqTooltip>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="legend" data-slot="heatmap-legend" class="flex items-center gap-1.5 self-end">
      <span>{{ t.less }}</span>
      <span aria-hidden="true" class="flex gap-[var(--gap)]">
        <span v-for="(cls, i) in LEVEL_CLASS" :key="i" :data-level="i" :class="cn(cell, cls)" />
      </span>
      <span>{{ t.more }}</span>
    </div>
  </div>
</template>
