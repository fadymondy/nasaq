<script setup lang="ts">
import { CalendarClock, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqEmptyState, NqSkeleton } from "../states";
import { NqStatus } from "../status";
import NqRateEditor from "./NqRateEditor.vue";
import NqRatesDay from "./NqRatesDay.vue";
import NqRatesMoney from "./NqRatesMoney.vue";
import { marginBps, rateAt, rateSegments, sortRates } from "./rates-logic";
import { failMessage, todayKey, useRatesStrings, type RatesResult, type RatesSubscriptionsLabels } from "./strings";
import type { Rate } from "./subscriptions";

// A rate that changes over time: the current rate up front, a history that shows when each rate started and ended and how much
// it changed, and an Add rate dialog. A new rate applies from its start date and never reprices earlier work. Rows have
// remove in their context menu (context-click, long-press or the Menu key).
interface Props {
  /** Which schedule this is, shown as the heading. Default "Bill rate". */
  title?: string;
  rates: readonly Rate[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Day key treated as today. Default the real today. */
  today?: string;
  /** A second schedule, such as cost rates: the margin over it today is shown. */
  marginAgainst?: readonly Rate[];
  /** Adds a rate. Resolve `{ error }` to keep the dialog open. Omit it to make the schedule read only. */
  onAdd?: (input: { amount: number; from: string }) => Promise<RatesResult>;
  onRemove?: (rate: Rate) => Promise<RatesResult>;
  loading?: boolean;
  labels?: RatesSubscriptionsLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { title: undefined, currency: undefined, today: undefined, marginAgainst: undefined, onAdd: undefined, onRemove: undefined, loading: false, labels: undefined });
const currency = useCurrency(() => props.currency);
const { t, n } = useRatesStrings(() => props.labels);
const titleId = `nq-rates-${useId()}`;
const adding = ref(false);
const removing = ref<Rate | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);

const day = computed(() => props.today ?? todayKey());
const segments = computed(() => rateSegments(props.rates).reverse());
const current = computed(() => rateAt(props.rates, day.value));
const upcoming = computed(() => sortRates(props.rates).find((r) => r.from > day.value));
const costNow = computed(() => (props.marginAgainst ? rateAt(props.marginAgainst, day.value) : undefined));
const margin = computed(() => (current.value && costNow.value ? marginBps(current.value.amount, costNow.value.amount) : null));

async function run(job: () => Promise<RatesResult>): Promise<boolean> {
  busy.value = true;
  error.value = null;
  try {
    const r = await job();
    if (r?.error) {
      error.value = r.error;
      return false;
    }
    return true;
  } catch (e) {
    error.value = failMessage(e, t.value.failed);
    return false;
  } finally {
    busy.value = false;
  }
}
const openAdd = () => {
  error.value = null;
  adding.value = true;
};
async function add(input: { amount: number; from: string }) {
  if (!props.onAdd) return;
  if (await run(() => props.onAdd!(input))) adding.value = false;
}
async function confirmRemove() {
  const rate = removing.value;
  if (rate && props.onRemove && (await run(() => props.onRemove!(rate)))) removing.value = null;
}
const actionsFor = (rate: Rate): ContextMenuAction[] => [{ id: "remove", label: t.value.removeRate, icon: Trash2, danger: true, onSelect: () => ((error.value = null), (removing.value = rate)) }];
const sign = (bps: number) => (bps >= 0 ? "+" : "−");
</script>

<template>
  <NqCard data-slot="rate-schedule" :aria-labelledby="titleId" :class="cn('gap-4 px-0', props.class)">
    <NqCardHeader>
      <NqCardTitle :id="titleId" as="h2">{{ props.title ?? t.billRate }}</NqCardTitle>
      <NqButton v-if="props.onAdd" size="sm" variant="secondary" @click="openAdd">
        <Plus aria-hidden="true" />
        {{ t.addRate }}
      </NqButton>
    </NqCardHeader>
    <NqCardContent v-if="props.loading" aria-busy="true" class="flex flex-col gap-2">
      <NqSkeleton class="h-8 w-1/3" />
      <NqSkeleton class="h-12 w-full" />
    </NqCardContent>
    <NqCardContent v-else-if="segments.length === 0">
      <NqEmptyState :icon="CalendarClock" :title="t.noRates" :description="t.noRatesHint" class="border-0" />
    </NqCardContent>
    <template v-else>
      <NqCardContent class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p v-if="current" class="flex items-baseline gap-1.5">
          <span class="text-h2 font-semibold text-foreground"><NqRatesMoney :minor="current.amount" :currency="currency" /></span>
          <span class="text-body-sm text-muted-foreground">{{ t.perHour }}</span>
        </p>
        <NqBadge v-if="margin !== null" variant="neutral">{{ t.marginNow(`${n(Math.round(margin / 100))}%`) }}</NqBadge>
        <span v-if="upcoming" class="text-caption text-muted-foreground">{{ t.futureRate("") }}<NqRatesDay :day="upcoming.from" /></span>
      </NqCardContent>
      <NqCardContent>
        <ol class="flex flex-col divide-y divide-border rounded-card border border-border" :aria-label="props.title ?? t.billRate">
          <NqContextMenuActions
            v-for="s in segments"
            :key="s.rate.id"
            as="li"
            :actions="props.onRemove ? actionsFor(s.rate) : []"
            :data-current="current?.id === s.rate.id ? '' : undefined"
            class="flex items-center justify-between gap-3 px-3 py-2.5 data-[current]:bg-nq-surface"
          >
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="flex flex-wrap items-center gap-2 text-body-sm text-foreground">
                <NqRatesMoney :minor="s.rate.amount" :currency="currency" class="font-medium" />
                <NqStatus v-if="current?.id === s.rate.id" tone="success">{{ t.current }}</NqStatus>
              </span>
              <span class="text-caption text-muted-foreground">
                <NqRatesDay :day="s.from" /> – <NqRatesDay v-if="s.to" :day="s.to" /><template v-else>{{ t.ongoing }}</template>
              </span>
            </div>
            <span
              v-if="s.changeBps !== null"
              :class="cn('inline-flex items-center gap-1 text-caption', s.changeBps >= 0 ? 'text-nq-success-text' : 'text-nq-danger-text')"
              :title="t.changeFrom(`${sign(s.changeBps)}${n(Math.abs(s.changeBps) / 100)}%`)"
            >
              <TrendingUp v-if="s.changeBps >= 0" aria-hidden="true" class="size-3.5" />
              <TrendingDown v-else aria-hidden="true" class="size-3.5" />
              <bdi dir="ltr">{{ sign(s.changeBps) }}{{ n(Math.abs(s.changeBps) / 100) }}%</bdi>
              <span class="sr-only">{{ t.changeFrom("") }}</span>
            </span>
          </NqContextMenuActions>
        </ol>
      </NqCardContent>
    </template>
    <NqRateEditor v-if="adding" :existing="props.rates" :currency="currency" :busy="busy" :error="error" :t="t" @cancel="adding = false" @submit="add" />
    <NqDialog :open="removing !== null" @update:open="(o: boolean) => !o && !busy && (removing = null)">
      <NqDialogContent>
        <NqDialogHeader>
          <NqDialogTitle>{{ t.removeTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.removeDescription }}</NqDialogDescription>
        </NqDialogHeader>
        <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
        <NqDialogFooter>
          <NqButton variant="ghost" @click="removing = null">{{ t.cancel }}</NqButton>
          <NqButton variant="danger" :loading="busy" @click="confirmRemove">{{ t.removeRate }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>
  </NqCard>
</template>
