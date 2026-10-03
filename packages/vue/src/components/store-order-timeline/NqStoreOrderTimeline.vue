<script setup lang="ts">
import { Ban, Check, CircleDollarSign, ExternalLink, PackageCheck, PackageOpen, ShoppingBag, StickyNote, Truck, Undo2, Wallet } from "lucide-vue-next";
import { computed, getCurrentInstance, ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton, buttonVariants } from "../button";
import { NqTextarea } from "../field";
import { NqDateTime } from "../numeric";
import { NqTimeline, NqTimelineItem } from "../timeline";
import type { CommerceOrderEvent, CommerceOrderStatus, CommercePaymentStatus } from "./order-labels";
import type { StoreOrderTimelineLabels } from "./strings";
import {
  activityKind,
  sortEventsNewestFirst,
  trackingModel,
  trackingUrl,
  type StoreActivityKind,
  type TrackingStepKey,
  type TrackingStepState,
} from "./timeline-model";
import { useStoreTimelineStrings } from "./use-strings";

interface Props {
  /** "tracking" is the customer's five-step progress. "activity" is the admin's event log with notes. */
  variant?: "tracking" | "activity";
  status: CommerceOrderStatus;
  payment?: CommercePaymentStatus;
  placedAt?: string;
  events?: readonly CommerceOrderEvent[];
  tracking?: { carrier: string; number: string; url?: string };
  /** Carrier link template with `{number}`, used when the tracking has no `url` of its own. */
  trackingTemplate?: string;
  labels?: StoreOrderTimelineLabels;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { variant: "tracking" });
/** Activity variant: the note composer shows when an `@add-note` listener is set; it is called with the note text. */
const emit = defineEmits<{ addNote: [note: string] }>();
const instance = getCurrentInstance();
const canAddNote = computed(() => typeof instance?.vnode.props?.onAddNote !== "undefined");

const { t } = useStoreTimelineStrings(() => props.labels);

const STEP_ICON: Record<TrackingStepKey, Component> = {
  placed: ShoppingBag,
  paid: CircleDollarSign,
  shipped: PackageOpen,
  "out-for-delivery": Truck,
  delivered: PackageCheck,
};
const BAR: Record<TrackingStepState, string> = {
  done: "border-primary",
  current: "border-primary/50",
  upcoming: "border-border",
  skipped: "border-dashed border-border",
};
const KIND_ICON: Record<StoreActivityKind, Component> = {
  placed: ShoppingBag,
  payment: CircleDollarSign,
  shipment: Truck,
  delivery: PackageCheck,
  refund: Undo2,
  cancel: Ban,
  note: StickyNote,
  other: Check,
};

const model = computed(() => trackingModel({ status: props.status, payment: props.payment, placedAt: props.placedAt, events: props.events, hasTracking: !!props.tracking }));
const url = computed(() => trackingUrl(props.tracking, props.trackingTemplate));
const cod = computed(() => props.payment === "cod");
const sorted = computed(() => sortEventsNewestFirst(props.events ?? []));

const note = ref("");
function submit() {
  const text = note.value.trim();
  if (!text) return;
  emit("addNote", text);
  note.value = "";
}
</script>

<template>
  <section
    v-if="props.variant === 'tracking'"
    data-slot="store-order-timeline"
    data-variant="tracking"
    :aria-label="t.tracking"
    :class="cn('flex flex-col gap-4', props.class)"
  >
    <div v-if="model.terminal" class="flex flex-wrap items-center gap-2 rounded-card border border-border bg-secondary px-3 py-2 text-body-sm text-foreground">
      <Ban v-if="model.terminal.kind === 'cancelled'" aria-hidden="true" class="size-4 text-muted-foreground" />
      <Undo2 v-else aria-hidden="true" class="size-4 text-muted-foreground" />
      <span class="font-medium">{{ t[model.terminal.kind] }}</span>
      <NqDateTime v-if="model.terminal.at" :value="model.terminal.at" :format="{ dateStyle: 'medium' }" class="text-muted-foreground" />
    </div>
    <NqBadge v-if="model.partial" variant="info" class="w-fit">{{ t.partlyShipped }}</NqBadge>
    <ol class="m-0 grid list-none gap-3 p-0 sm:grid-cols-5" :aria-label="t.tracking" :data-percent="model.percent">
      <li
        v-for="step in model.steps"
        :key="step.key"
        :data-state="step.state"
        :aria-current="step.state === 'current' ? 'step' : undefined"
        :class="cn('flex min-w-0 flex-col gap-1 border-s-4 ps-3 sm:border-s-0 sm:border-t-4 sm:ps-0 sm:pt-3', BAR[step.state])"
      >
        <span :class="cn('flex items-center gap-1.5 text-body-sm font-medium', step.state === 'upcoming' || step.state === 'skipped' ? 'text-muted-foreground' : 'text-foreground')">
          <Check v-if="step.state === 'done'" aria-hidden="true" class="size-4 text-primary" />
          <component :is="step.key === 'paid' && cod ? Wallet : STEP_ICON[step.key]" v-else aria-hidden="true" class="size-4" />
          <span class="min-w-0">{{ step.key === "paid" && cod ? t.confirmed : t[step.key] }}</span>
        </span>
        <span class="text-caption text-muted-foreground">
          <NqDateTime v-if="step.at" :value="step.at" :format="{ dateStyle: 'medium', timeStyle: 'short' }" />
          <template v-else>{{ t[step.state] }}</template>
        </span>
      </li>
    </ol>
    <p v-if="cod && model.reached < 4 && !model.terminal" class="text-body-sm text-muted-foreground">{{ t.cod }}</p>
    <div v-if="props.tracking" class="flex flex-wrap items-center gap-x-4 gap-y-2 text-body-sm">
      <span class="text-muted-foreground">{{ t.carrier }}: <span class="text-foreground">{{ props.tracking.carrier }}</span></span>
      <span class="text-muted-foreground">{{ t.trackingNumber }}: <bdi dir="ltr" class="font-mono text-foreground">{{ props.tracking.number }}</bdi></span>
      <a v-if="url" :href="url" target="_blank" rel="noreferrer" :class="cn(buttonVariants({ variant: 'secondary', size: 'sm' }))">
        {{ t.trackShipment }}
        <ExternalLink aria-hidden="true" class="rtl:-scale-x-100" />
      </a>
    </div>
  </section>

  <section v-else data-slot="store-order-timeline" data-variant="activity" :aria-label="t.activity" :class="cn('flex flex-col gap-4', props.class)">
    <form v-if="canAddNote" class="flex flex-col gap-2" @submit.prevent="submit">
      <NqTextarea v-model="note" :aria-label="t.addNote" :placeholder="t.notePlaceholder" :rows="2" />
      <NqButton type="submit" size="sm" variant="secondary" :disabled="!note.trim()" class="self-end">{{ t.saveNote }}</NqButton>
    </form>
    <p v-if="sorted.length === 0" class="text-body-sm text-muted-foreground">{{ t.noActivity }}</p>
    <NqTimeline v-else>
      <NqTimelineItem
        v-for="(event, i) in sorted"
        :key="`${event.at}-${event.kind}-${i}`"
        :description="event.note ?? (event.by ? `${t.by} ${event.by}` : undefined)"
        :time="event.at"
      >
        <template #icon><component :is="KIND_ICON[activityKind(event.kind)]" aria-hidden="true" /></template>
        <template #title>
          <span class="inline-flex flex-wrap items-center gap-2">
            {{ event.label }}
            <NqBadge v-if="event.kind === 'note'" variant="neutral">{{ t.internal }}</NqBadge>
          </span>
        </template>
      </NqTimelineItem>
    </NqTimeline>
  </section>
</template>
