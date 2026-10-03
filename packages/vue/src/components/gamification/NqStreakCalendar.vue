<script setup lang="ts">
import { Check, ChevronLeft, ChevronRight } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqButton from "../button/NqButton.vue";
import NqIcon from "../icon/NqIcon.vue";
import { formatDate } from "../numeric/format";
import { monthGrid } from "./gamification-logic";
import type { GamificationLabels } from "./strings";
import { useKit } from "./use-kit";

// A month of days with the active ones filled. Active is a check as well as a fill, so it does not depend on colour.
interface Props {
  /** Days with activity. `YYYY-MM-DD` strings, dates or timestamps. */
  activeDays: readonly (Date | string | number)[];
  /** The month shown, any date inside it. Default: the current month. */
  month?: Date;
  /** Override "today", for tests and demos. */
  today?: Date;
  /** First column: 0 Sunday, 1 Monday, 6 Saturday. Default 6 in Arabic and 0 otherwise. */
  weekStart?: number;
  labels?: Partial<GamificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { month: undefined, today: undefined, weekStart: undefined, labels: undefined });
const emit = defineEmits<{ monthChange: [month: Date] }>();
const { t, locale, ar } = useKit(() => props.labels);
const today = computed(() => props.today ?? new Date());
const local = ref<Date>(props.month ?? today.value);
const month = computed(() => props.month ?? local.value);
const start = computed(() => props.weekStart ?? (ar.value ? 6 : 0));
const weeks = computed(() => monthGrid(month.value.getFullYear(), month.value.getMonth(), props.activeDays, today.value, start.value));
const weekdays = computed(() => {
  const f = new Intl.DateTimeFormat(locale.value, { weekday: "short" });
  // 2026-08-30 is a Sunday.
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(2026, 7, 30 + ((i + start.value) % 7))));
});
const dayNum = (n: number) => new Intl.NumberFormat(locale.value).format(n);
function go(delta: number) {
  const next = new Date(month.value.getFullYear(), month.value.getMonth() + delta, 1);
  local.value = next;
  emit("monthChange", next);
}
</script>

<template>
  <div data-slot="streak-calendar" :class="cn('flex w-full max-w-sm flex-col gap-2', props.class)">
    <div class="flex items-center justify-between">
      <NqButton variant="ghost" size="icon-sm" :aria-label="t.prevMonth" @click="go(-1)"><NqIcon :icon="ChevronLeft" /></NqButton>
      <span aria-live="polite" class="text-label text-foreground">{{ formatDate(month, locale, { month: "long", year: "numeric" }) }}</span>
      <NqButton variant="ghost" size="icon-sm" :aria-label="t.nextMonth" @click="go(1)"><NqIcon :icon="ChevronRight" /></NqButton>
    </div>
    <table role="grid" class="w-full table-fixed border-separate border-spacing-1 text-center">
      <thead>
        <tr>
          <th v-for="(d, i) in weekdays" :key="i" scope="col" class="pb-1 text-caption font-normal text-muted-foreground">{{ d }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(w, wi) in weeks" :key="wi">
          <td v-for="(c, ci) in w" :key="ci" class="p-0">
            <span
              v-if="c"
              :data-active="c.active ? '' : undefined"
              :data-today="c.today ? '' : undefined"
              :title="c.today ? t.today : c.active ? t.activeDay : undefined"
              :class="
                cn(
                  'relative mx-auto grid aspect-square w-full max-w-9 place-items-center rounded-full text-caption tabular-nums',
                  c.active ? 'bg-nq-warning text-nq-bg' : c.future ? 'text-muted-foreground/60' : 'text-foreground',
                  c.today && 'outline-2 -outline-offset-2 outline-nq-focus',
                )
              "
            >
              {{ dayNum(c.day) }}
              <span v-if="c.active" class="sr-only">{{ t.activeDay }}</span>
              <Check v-if="c.active" aria-hidden="true" class="absolute -end-0.5 -top-0.5 size-3 rounded-full bg-card p-px text-nq-success-text" />
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
