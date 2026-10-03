<script setup lang="ts">
import { CircleX, Pause, Play, Plus, Repeat, Trash2 } from "lucide-vue-next";
import { ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { describeCron } from "../cron-builder";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqEmptyState, NqSkeleton } from "../states";
import { NqStatus, type StatusTone } from "../status";
import NqRatesDay from "./NqRatesDay.vue";
import NqRatesMoney from "./NqRatesMoney.vue";
import NqSubscriptionEditor from "./NqSubscriptionEditor.vue";
import { failMessage, todayKey, useRatesStrings, type RatesResult, type RatesSubscriptionsLabels } from "./strings";
import { subscriptionCharges, subscriptionMonthly, type Subscription, type SubscriptionInput, type SubscriptionStatus } from "./subscriptions";

// Recurring subscriptions, per project or for the whole organisation: price and quantity, a weekly, monthly or yearly cycle or a
// custom cron schedule, the next charge and the monthly equivalent. Pause, resume, edit and cancel are in each row's context menu
// (context-click, long-press or the Menu key).
interface Props {
  subscriptions: readonly Subscription[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Projects a subscription can belong to. Omit to hide the project field. */
  projects?: readonly { id: string; name: string }[];
  today?: string;
  /** Creates (no `id`) or updates a subscription. Resolve `{ error }` to keep the dialog open. */
  onSave?: (input: SubscriptionInput, id?: string) => Promise<RatesResult>;
  onStatusChange?: (subscription: Subscription, status: SubscriptionStatus) => Promise<RatesResult>;
  loading?: boolean;
  labels?: RatesSubscriptionsLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, projects: undefined, today: undefined, onSave: undefined, onStatusChange: undefined, loading: false, labels: undefined });
const currency = useCurrency(() => props.currency);
const { t, n, locale } = useRatesStrings(() => props.labels);
const titleId = `nq-subs-${useId()}`;
const editing = ref<Subscription | "new" | null>(null);
const cancelling = ref<Subscription | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);
const day = () => props.today ?? todayKey();
const SUB_TONE: Record<SubscriptionStatus, StatusTone> = { active: "success", paused: "warning", cancelled: "neutral" };

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

const scheduleText = (s: Subscription) =>
  s.schedule.kind === "cycle" ? t.value.cycleText(s.schedule.every, (s.schedule.every === 1 ? t.value.units : t.value.unitsPlural)[s.schedule.unit]) : (describeCron(s.schedule.expr, locale.value.startsWith("ar") ? "ar" : "en") ?? s.schedule.expr);
const nextOf = (s: Subscription) => (s.status === "active" ? subscriptionCharges(s, day(), 1)[0] : undefined);

function actions(s: Subscription): ContextMenuAction[] {
  const { onSave, onStatusChange } = props;
  return [
    ...(onSave ? [{ id: "edit", label: t.value.edit, onSelect: () => ((error.value = null), (editing.value = s)) }] : []),
    ...(onStatusChange && s.status === "active" ? [{ id: "pause", label: t.value.pause, icon: Pause, group: "state", onSelect: () => void run(() => onStatusChange(s, "paused")) }] : []),
    ...(onStatusChange && s.status === "paused" ? [{ id: "resume", label: t.value.resume, icon: Play, group: "state", onSelect: () => void run(() => onStatusChange(s, "active")) }] : []),
    ...(onStatusChange && s.status !== "cancelled" ? [{ id: "cancel", label: t.value.cancelSub, icon: Trash2, danger: true, group: "danger", onSelect: () => ((error.value = null), (cancelling.value = s)) }] : []),
  ];
}
const openNew = () => {
  error.value = null;
  editing.value = "new";
};
async function save(input: SubscriptionInput) {
  const target = editing.value;
  if (!props.onSave || !target) return;
  if (await run(() => props.onSave!(input, target === "new" ? undefined : target.id))) editing.value = null;
}
async function confirmCancel() {
  const sub = cancelling.value;
  if (sub && props.onStatusChange && (await run(() => props.onStatusChange!(sub, "cancelled")))) cancelling.value = null;
}
</script>

<template>
  <section data-slot="recurring-subscriptions" :aria-labelledby="titleId" :class="cn('flex flex-col gap-3', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 :id="titleId" class="text-h3 text-foreground">{{ t.subscriptions }}</h2>
      <NqButton v-if="props.onSave" size="sm" @click="openNew">
        <Plus aria-hidden="true" />
        {{ t.newSubscription }}
      </NqButton>
    </div>
    <p v-if="error && !editing && !cancelling" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
      <CircleX aria-hidden="true" class="size-4" />
      {{ error }}
    </p>
    <div v-if="props.loading" aria-busy="true" class="flex flex-col gap-2">
      <NqSkeleton class="h-16 w-full" />
      <NqSkeleton class="h-16 w-full" />
    </div>
    <NqEmptyState v-else-if="props.subscriptions.length === 0" :icon="Repeat" :title="t.noSubs" :description="t.noSubsHint" />
    <ul v-else :aria-label="t.listLabel" class="flex flex-col divide-y divide-border rounded-card border border-border">
      <NqContextMenuActions
        v-for="s in props.subscriptions"
        :key="s.id"
        as="li"
        :actions="actions(s)"
        :data-status="s.status"
        :class="cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3', s.status === 'cancelled' && 'opacity-60')"
      >
        <div class="flex min-w-0 flex-col gap-0.5">
          <span class="flex flex-wrap items-center gap-2 text-body-sm font-medium text-foreground">
            {{ s.name }}
            <span v-if="s.quantity && s.quantity > 1" class="text-caption font-normal text-muted-foreground">{{ t.quantityShort(n(s.quantity)) }}</span>
            <NqStatus :tone="SUB_TONE[s.status]">{{ t.statuses[s.status] }}</NqStatus>
          </span>
          <span class="text-caption text-muted-foreground">
            {{ s.projectName ?? t.orgLevel }} · {{ scheduleText(s) }}
            <template v-if="nextOf(s)">
              {{ " · " }}{{ t.nextCharge }} <NqRatesDay :day="nextOf(s)!" />
            </template>
          </span>
        </div>
        <div class="flex flex-col items-end">
          <span class="text-body-sm font-medium text-foreground"><NqRatesMoney :minor="s.amount * (s.quantity ?? 1)" :currency="currency" /></span>
          <span class="text-caption text-muted-foreground"><NqRatesMoney :minor="subscriptionMonthly(s, day())" :currency="currency" /> {{ t.perMonth }}</span>
        </div>
      </NqContextMenuActions>
    </ul>
    <NqSubscriptionEditor
      v-if="editing && props.onSave"
      :key="editing === 'new' ? 'new' : editing.id"
      :sub="editing === 'new' ? null : editing"
      :currency="currency"
      :projects="props.projects"
      :today="day()"
      :busy="busy"
      :error="error"
      :t="t"
      @cancel="editing = null"
      @submit="save"
    />
    <NqDialog :open="cancelling !== null" @update:open="(o: boolean) => !o && !busy && (cancelling = null)">
      <NqDialogContent>
        <NqDialogHeader>
          <NqDialogTitle>{{ t.cancelTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.cancelDescription(cancelling?.name ?? "") }}</NqDialogDescription>
        </NqDialogHeader>
        <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
        <NqDialogFooter>
          <NqButton variant="ghost" @click="cancelling = null">{{ t.keep }}</NqButton>
          <NqButton variant="danger" :loading="busy" @click="confirmCancel">{{ t.cancelSub }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>
  </section>
</template>
