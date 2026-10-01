<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { groupByMonth, parseCivilDate, type HistoryDay } from "../engine-card/health-engines";
import { formatHealthDate, useHealthLabels } from "../engine-card/health-format";
import { CELL } from "./cell";
import { STRIP_STRINGS, type HistoryStripLabels } from "./strings";

// The day strip: one cell per day, grouped by month. Every cell carries a full sentence for pointer and screen reader.
interface Props {
  /** One element per calendar day, oldest first. A window that skips quiet days would splice streaks together. */
  days: readonly HistoryDay[];
  labels?: Partial<HistoryStripLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { labels: undefined });
const { t, locale } = useHealthLabels(STRIP_STRINGS, () => props.labels);
const groups = computed(() => groupByMonth(props.days));
const monthName = (month: string) => formatHealthDate(locale.value).date(parseCivilDate(`${month}-01`), { month: "long", year: "numeric" });
const sentence = (day: HistoryDay) => t.value.dayLabel(formatHealthDate(locale.value).date(parseCivilDate(day.date), { dateStyle: "medium" }), t.value.verdicts[day.verdict] ?? day.verdict, t.value.entries(day.entries));
</script>

<template>
  <div data-slot="engine-history-strip" :class="cn('flex flex-col gap-3', props.class)">
    <section v-for="g in groups" :key="g.month" :aria-label="monthName(g.month)" class="flex flex-col gap-1.5">
      <h4 class="text-caption text-muted-foreground">{{ monthName(g.month) }}</h4>
      <ol class="m-0 flex list-none flex-wrap gap-1 p-0">
        <li v-for="day in g.days" :key="day.date" :data-date="day.date" :data-verdict="day.verdict" :title="sentence(day)" :class="cn('size-4 shrink-0', CELL[day.verdict])">
          <span class="sr-only">{{ sentence(day) }}</span>
        </li>
      </ol>
    </section>
  </div>
</template>
