<script setup lang="ts">
import { Ban, Bike, Check, CircleAlert, ClipboardList, MessageCircle, PackageCheck, Phone, UserCheck } from "lucide-vue-next";
import { computed, getCurrentInstance, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { deliveryDuration } from "../courier-card/delivery";
import { formatDate } from "../numeric";
import { DELIVERY_STEPS, deliveryProgress, type DeliveryOrderStatus, type DeliveryStep } from "./progress";
import { STRINGS, type DeliveryTrackerLabels } from "./strings";
import type { DeliveryCourier, DeliveryTrackerTimes } from "./types";

defineOptions({ inheritAttrs: false });

interface Props {
  status: DeliveryOrderStatus;
  /** For a cancelled or failed order: the last step it reached before it stopped. Default "placed". */
  reachedBefore?: DeliveryStep;
  /** When each step happened. Steps without a time show none. */
  times?: DeliveryTrackerTimes;
  /** Order reference shown in the header ("1042"). */
  orderNumber?: string;
  /** Seconds until arrival, from the routing service. Shown while the order is on its way. */
  etaSeconds?: number;
  /** The arrival time, if you have a fixed promise instead of a live ETA. */
  etaAt?: Date | string | number;
  courier?: DeliveryCourier;
  /** Why the order was cancelled or failed. Shown in the terminal notice. */
  reason?: string;
  reasonAr?: string;
  locale?: string;
  labels?: DeliveryTrackerLabels;
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();
/** Call and Message buttons show when a `@call` / `@message` listener is set. Without `@call`, a tel: link is used when `courier.phone` is set. */
defineEmits<{ call: []; message: [] }>();
defineSlots<{
  /** Slot for the live map: pass a `NqMapView` here. */
  map?: () => unknown;
}>();
const instance = getCurrentInstance();
const hasCall = computed(() => typeof instance?.vnode.props?.onCall !== "undefined");
const hasMessage = computed(() => typeof instance?.vnode.props?.onMessage !== "undefined");

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));
const progress = computed(() => deliveryProgress(props.status, props.reachedBefore));
const terminal = computed(() => progress.value.terminal);
const moving = computed(() => props.status === "on-the-way" || props.status === "picked-up");
const delivered = computed(() => props.status === "delivered");
const showCourier = computed(() => !!props.courier && (props.status === "assigned" || moving.value));
const stateWord = computed(() => ({ done: t.value.done, current: t.value.current, stopped: t.value.stopped, upcoming: t.value.pending }));
const time = (v: Date | string | number | undefined) => (v === undefined ? null : formatDate(v, locale.value, { hour: "numeric", minute: "2-digit" }));
const headline = computed(() => (terminal.value ? t.value[terminal.value] : delivered.value ? t.value.delivered : t.value[props.status as DeliveryStep]));
const tone = computed(() => (terminal.value ? "danger" : delivered.value ? "success" : "brand"));
const courierName = computed(() => (props.courier ? (ar.value ? props.courier.nameAr || props.courier.name : props.courier.name) : ""));
const tel = computed(() => (props.courier?.phone ? `tel:${props.courier.phone.replace(/[^\d+]/g, "")}` : undefined));
const STEP_ICON: Record<DeliveryStep, Component> = { placed: ClipboardList, assigned: UserCheck, "picked-up": PackageCheck, "on-the-way": Bike, delivered: Check };
</script>

<template>
  <section
    data-slot="delivery-tracker"
    :data-status="props.status"
    :aria-label="t.title"
    :class="cn('flex flex-col gap-4 rounded-card border border-border bg-card p-4 sm:p-5', props.class)"
    v-bind="$attrs"
  >
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-1">
        <span v-if="props.orderNumber" class="text-caption text-muted-foreground">
          {{ t.order }} <bdi dir="ltr" class="tabular-nums">{{ props.orderNumber }}</bdi>
        </span>
        <h2 class="text-h3 text-foreground">{{ headline }}</h2>
      </div>
      <div class="flex flex-col items-end gap-1">
        <NqBadge :variant="tone">{{ headline }}</NqBadge>
        <span v-if="moving && props.etaSeconds !== undefined" data-slot="delivery-eta" class="text-body-sm text-foreground">
          {{ t.arrivingIn }} <bdi class="tabular-nums font-medium">{{ deliveryDuration(props.etaSeconds, locale) }}</bdi>
        </span>
        <span v-else-if="moving && props.etaAt !== undefined" data-slot="delivery-eta" class="text-body-sm text-foreground">
          {{ t.eta }} <bdi class="tabular-nums font-medium">{{ time(props.etaAt) }}</bdi>
        </span>
      </div>
    </header>

    <div v-if="terminal" role="alert" data-slot="delivery-terminal" class="flex items-start gap-2 rounded-control border border-nq-danger/40 bg-nq-danger-soft p-3 text-body-sm text-nq-danger-text">
      <Ban v-if="terminal === 'cancelled'" aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
      <CircleAlert v-else aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
      <div class="flex min-w-0 flex-col gap-0.5">
        <span class="font-medium">{{ t[terminal] }}</span>
        <span v-if="props.reason || props.reasonAr">
          {{ t.reason }}: <bdi dir="auto">{{ ar ? props.reasonAr || props.reason : props.reason || props.reasonAr }}</bdi>
        </span>
      </div>
    </div>

    <ol role="list" :aria-label="t.steps" data-slot="delivery-steps" class="flex flex-col">
      <li
        v-for="(step, i) in progress.steps"
        :key="step.key"
        :data-step="step.key"
        :data-state="step.state"
        :aria-current="step.state === 'current' ? 'step' : undefined"
        class="flex gap-3"
      >
        <span class="flex flex-col items-center">
          <span
            :class="
              cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full border-2 [&_svg]:size-4',
                step.state === 'done' && 'border-primary bg-primary text-primary-foreground',
                step.state === 'current' && 'border-primary bg-card text-primary ring-4 ring-primary/20',
                step.state === 'upcoming' && 'border-nq-line-strong bg-card text-muted-foreground',
                step.state === 'stopped' && 'border-nq-danger bg-nq-danger-soft text-nq-danger-text',
              )
            "
          >
            <Check v-if="step.state === 'done'" aria-hidden="true" />
            <Ban v-else-if="step.state === 'stopped'" aria-hidden="true" />
            <component :is="STEP_ICON[step.key]" v-else aria-hidden="true" />
          </span>
          <span
            v-if="i !== DELIVERY_STEPS.length - 1"
            aria-hidden="true"
            :class="
              cn(
                'my-1 min-h-6 w-0.5 flex-1 rounded-full',
                (progress.steps[i + 1]?.state === 'done' || progress.steps[i + 1]?.state === 'current') && step.state === 'done' ? 'bg-primary' : 'bg-nq-line',
              )
            "
          />
        </span>
        <div :class="cn('flex min-w-0 flex-1 flex-col pb-4 pt-1', i === DELIVERY_STEPS.length - 1 && 'pb-0')">
          <span :class="cn('text-label', step.state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground')">
            {{ t[step.key] }}
            <span class="sr-only"> ({{ stateWord[step.state] }})</span>
          </span>
          <bdi v-if="time(props.times?.[step.key])" class="text-caption tabular-nums text-muted-foreground">{{ time(props.times?.[step.key]) }}</bdi>
        </div>
      </li>
    </ol>

    <div v-if="showCourier && props.courier" data-slot="delivery-courier" class="flex flex-wrap items-center gap-3 rounded-control border border-border bg-secondary p-3">
      <NqAvatar :name="courierName" :src="props.courier.avatarSrc" size="lg" />
      <div class="flex min-w-0 flex-1 flex-col">
        <span class="text-caption text-muted-foreground">{{ t.courier }}</span>
        <bdi dir="auto" class="truncate text-label text-foreground">{{ courierName }}</bdi>
        <bdi v-if="props.courier.vehicle" dir="auto" class="truncate text-body-sm text-muted-foreground">{{ props.courier.vehicle }}</bdi>
      </div>
      <div class="flex items-center gap-2">
        <NqButton v-if="hasMessage" type="button" variant="secondary" size="sm" @click="$emit('message')">
          <MessageCircle aria-hidden="true" />
          {{ t.message }}
        </NqButton>
        <NqButton v-if="hasCall" type="button" variant="secondary" size="sm" @click="$emit('call')">
          <Phone aria-hidden="true" />
          {{ t.call }}
        </NqButton>
        <NqButton v-else-if="tel" as-child variant="secondary" size="sm">
          <a :href="tel">
            <Phone aria-hidden="true" />
            {{ t.call }}
          </a>
        </NqButton>
      </div>
    </div>

    <div v-if="$slots.map" data-slot="delivery-map"><slot name="map" /></div>
  </section>
</template>
