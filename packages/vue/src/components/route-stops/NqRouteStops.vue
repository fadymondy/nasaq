<script setup lang="ts">
import { Ban, Check, HandCoins, MapPin, Navigation, SkipForward, Store } from "lucide-vue-next";
import { computed, getCurrentInstance, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { deliveryCurrency, deliveryMoney, routeSummary, type StopStatus } from "../courier-card/delivery";
import { formatDate } from "../numeric";
import { STRINGS, type RouteStop, type RouteStopsLabels } from "./strings";

defineOptions({ inheritAttrs: false });

// A multi-stop trip as an ordered list: pickups and drop-offs, each done, current or pending, with the cash to
// collect at every drop-off and a total of what is still owed. The first pending stop is marked as the next one.
interface Props {
  stops: readonly RouteStop[];
  currency?: string;
  /** Show the `actions` slot (Navigate, Mark delivered) under every stop instead of the current one only. */
  actionsForAll?: boolean;
  /** Hide the progress and cash summary above the list. */
  hideSummary?: boolean;
  /** Makes each row a button. Also on when a `@select-stop` listener is set. */
  selectable?: boolean;
  locale?: string;
  labels?: RouteStopsLabels;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { actionsForAll: false, hideSummary: false, selectable: false });
const emit = defineEmits<{ selectStop: [stop: RouteStop] }>();
const instance = getCurrentInstance();
const isButton = computed(() => props.selectable || typeof instance?.vnode.props?.onSelectStop !== "undefined");

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const currency = computed(() => props.currency ?? deliveryCurrency(locale.value));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));
const summary = computed(() => routeSummary(props.stops));
const statusWord = computed<Record<StopStatus, string>>(() => ({ done: t.value.done, pending: t.value.pending, failed: t.value.failed, skipped: t.value.skipped }));

const pick = (en: string | undefined, arabic: string | undefined) => (ar.value ? arabic || en : en || arabic) ?? "";

const rows = computed(() =>
  props.stops.map((stop, i) => {
    const status = stop.status ?? "pending";
    const current = stop.id === summary.value.currentId;
    const KindIcon = stop.kind === "pickup" ? Store : MapPin;
    const StateIcon: Component = status === "done" ? Check : status === "failed" ? Ban : status === "skipped" ? SkipForward : current ? Navigation : KindIcon;
    return {
      stop,
      status,
      current,
      StateIcon,
      last: i === props.stops.length - 1,
      address: pick(stop.address, stop.addressAr),
      note: pick(stop.note, stop.noteAr),
      name: pick(stop.name, stop.nameAr),
    };
  }),
);
</script>

<template>
  <section data-slot="route-stops" :aria-label="t.stops" :class="cn('flex flex-col gap-3', props.class)" v-bind="$attrs">
    <header v-if="!props.hideSummary" data-slot="route-summary" class="flex flex-wrap items-center justify-between gap-2 text-body-sm">
      <span class="text-foreground">{{ t.progress(summary.done, summary.total) }}</span>
      <span class="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
        <span v-if="summary.cashPendingMinor > 0" class="inline-flex items-center gap-1">
          <HandCoins aria-hidden="true" class="size-4" />
          {{ t.cashPending }}
          <bdi data-slot="route-cash-pending" class="font-medium tabular-nums text-foreground">{{ deliveryMoney(summary.cashPendingMinor, currency, locale) }}</bdi>
        </span>
        <span v-if="summary.cashCollectedMinor > 0" class="inline-flex items-center gap-1">
          {{ t.cashCollected }}
          <bdi class="tabular-nums text-foreground">{{ deliveryMoney(summary.cashCollectedMinor, currency, locale) }}</bdi>
        </span>
      </span>
    </header>

    <ol role="list" class="flex flex-col">
      <li
        v-for="row in rows"
        :key="row.stop.id"
        :data-stop="row.stop.id"
        :data-kind="row.stop.kind"
        :data-status="row.status"
        :data-current="row.current ? '' : undefined"
        :aria-current="row.current ? 'step' : undefined"
        class="flex gap-3"
      >
        <span class="flex flex-col items-center">
          <span
            :class="
              cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full border-2 [&_svg]:size-4',
                row.status === 'done' && 'border-primary bg-primary text-primary-foreground',
                row.current && 'border-primary bg-card text-primary ring-4 ring-primary/20',
                !row.current && row.status === 'pending' && 'border-nq-line-strong bg-card text-muted-foreground',
                row.status === 'failed' && 'border-nq-danger bg-nq-danger-soft text-nq-danger-text',
                row.status === 'skipped' && 'border-nq-line-strong bg-secondary text-muted-foreground',
              )
            "
          >
            <component :is="row.StateIcon" aria-hidden="true" />
          </span>
          <span v-if="!row.last" aria-hidden="true" :class="cn('my-1 min-h-4 w-0.5 flex-1 rounded-full', row.status === 'done' ? 'bg-primary' : 'bg-nq-line')" />
        </span>
        <div :class="cn('flex min-w-0 flex-1 flex-col gap-2 pt-0.5', !row.last && 'pb-4')">
          <component
            :is="isButton ? 'button' : 'div'"
            :type="isButton ? 'button' : undefined"
            :class="
              isButton
                ? 'flex w-full cursor-pointer items-start gap-3 rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus'
                : 'flex items-start gap-3'
            "
            @click="isButton ? emit('selectStop', row.stop) : undefined"
          >
            <span class="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
              <span class="flex flex-wrap items-center gap-2">
                <span class="text-caption text-muted-foreground">{{ row.stop.kind === "pickup" ? t.pickup : t.dropoff }}</span>
                <bdi v-if="row.stop.orderRef" dir="ltr" class="text-caption tabular-nums text-muted-foreground">{{ row.stop.orderRef }}</bdi>
                <NqBadge v-if="row.current" variant="brand">{{ t.next }}</NqBadge>
                <NqBadge v-else-if="row.status !== 'pending'" :variant="row.status === 'done' ? 'success' : row.status === 'failed' ? 'danger' : 'neutral'">{{ statusWord[row.status] }}</NqBadge>
              </span>
              <bdi dir="auto" :class="cn('truncate text-label', row.status === 'done' || row.status === 'skipped' ? 'text-muted-foreground' : 'text-foreground')">{{ row.name }}</bdi>
              <bdi v-if="row.address" dir="auto" class="text-body-sm text-muted-foreground">{{ row.address }}</bdi>
              <bdi v-if="row.note" dir="auto" class="text-caption text-muted-foreground">{{ row.note }}</bdi>
              <span v-if="row.stop.eta !== undefined && row.status === 'pending'" class="text-caption text-muted-foreground">
                {{ t.arrive }} <bdi class="tabular-nums">{{ formatDate(row.stop.eta, locale, { hour: "numeric", minute: "2-digit" }) }}</bdi>
              </span>
            </span>
            <span v-if="row.stop.cashMinor" data-slot="stop-cash" class="flex shrink-0 flex-col items-end">
              <span class="text-caption text-muted-foreground">{{ t.cash }}</span>
              <bdi :class="cn('text-label tabular-nums', row.status === 'done' ? 'text-muted-foreground' : 'text-foreground')">{{ deliveryMoney(row.stop.cashMinor, currency, locale) }}</bdi>
            </span>
          </component>
          <!-- Actions under a stop, for example Navigate and Mark delivered. Current stop only unless `actionsForAll`. -->
          <div v-if="$slots.actions && (row.current || props.actionsForAll)" class="flex flex-wrap gap-2">
            <slot name="actions" :stop="row.stop" :current="row.current" />
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>
