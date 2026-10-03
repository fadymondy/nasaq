<script setup lang="ts">
import { Check, HandCoins, MapPin, Package, Send, Store, X } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqTimerRing, timerToneText } from "../countdown";
import { deliveryCurrency, deliveryDistance, deliveryDuration, deliveryMoney, offerFraction, offerSecondsLeft, offerTone } from "./delivery";
import { STRINGS, type DispatchOfferLabels, type OfferPlace } from "./strings";

defineOptions({ inheritAttrs: false });

/**
 * An incoming job offer for a courier: a countdown ring, the pickup and drop-off, the fee and any cash to collect,
 * and Accept and Decline. The ring is also a number in text, and screen readers hear the time left only at the
 * start and in the last ten seconds, so the page is not read every second. When time runs out Accept is disabled.
 */
interface Props {
  pickup: OfferPlace;
  dropoff: OfferPlace;
  /** What the courier earns for the trip, in minor units. */
  feeMinor: number;
  /** Cash the courier must collect from the customer, in minor units. Hidden when 0 or missing. */
  cashToCollectMinor?: number;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Trip length in metres, from the routing service. */
  distanceMeters?: number;
  /** Time to the pickup in seconds, from the routing service. */
  etaSeconds?: number;
  /** Orders in this offer when it is a multi-order trip. */
  orderCount?: number;
  /**
   * When the offer lapses, in ms since epoch. The ring drains to it. Optional: without it (or with
   * `mode="dispatcher"`) there is no countdown and the offer never expires.
   */
  expiresAt?: number;
  /**
   * `"courier"` (default): the courier's card with a countdown, Accept and Decline. `"dispatcher"`: the dispatcher's
   * view of an offer about to be sent, with no countdown, an "Offer to driver" action (`@offer`) and Cancel (`@decline`).
   */
  mode?: "courier" | "dispatcher";
  /** Length of the offer window in seconds, for the ring. Default 30. */
  windowSeconds?: number;
  /** Clock for stories and tests. Default `Date.now`. */
  now?: () => number;
  locale?: string;
  labels?: DispatchOfferLabels;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { mode: "courier", windowSeconds: 30, now: () => Date.now() });
const emit = defineEmits<{ accept: []; decline: []; offer: []; expire: [] }>();

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const currency = computed(() => props.currency ?? deliveryCurrency(locale.value));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));

const tick = ref(props.now());
let expiredFired = false;
let timer: ReturnType<typeof setInterval> | undefined;
const timed = computed(() => props.mode === "courier" && props.expiresAt !== undefined);

function stop() {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
}
watch(
  [timed, () => props.expiresAt],
  () => {
    stop();
    if (!timed.value || props.expiresAt === undefined) return;
    const expiresAt = props.expiresAt;
    expiredFired = false;
    tick.value = props.now();
    timer = setInterval(() => {
      const current = props.now();
      tick.value = current;
      if (current >= expiresAt) {
        stop();
        if (!expiredFired) {
          expiredFired = true;
          emit("expire");
        }
      }
    }, 250);
  },
  { immediate: true },
);
onBeforeUnmount(stop);

const dispatcher = computed(() => props.mode === "dispatcher");
const left = computed(() => (timed.value ? offerSecondsLeft(props.expiresAt!, tick.value) : props.windowSeconds));
const expired = computed(() => timed.value && left.value === 0);
const fraction = computed(() => (timed.value ? offerFraction(props.expiresAt!, tick.value, props.windowSeconds) : 1));
const tone = computed(() => (expired.value ? "neutral" : offerTone(left.value, props.windowSeconds)));
const ringTone = computed(() => (tone.value === "danger" ? "warning" : tone.value));
// Announce at the start and at 10..1; stay silent in between.
const announce = computed(() => (timed.value && !expired.value && (left.value <= 10 || left.value >= props.windowSeconds - 1) ? t.value.secondsLeft(left.value) : ""));

const pick = (en: string | undefined, arabic: string | undefined) => (ar.value ? arabic || en : en || arabic) ?? "";
const places = computed(() => [
  { kind: "pickup" as const, place: props.pickup, icon: Store },
  { kind: "dropoff" as const, place: props.dropoff, icon: MapPin },
]);
</script>

<template>
  <section
    data-slot="dispatch-offer"
    :data-expired="expired ? '' : undefined"
    :data-mode="props.mode"
    :aria-label="dispatcher ? t.dispatcherTitle : t.title"
    :class="cn('flex flex-col gap-4 rounded-card border border-border bg-card p-4 shadow-md sm:p-5', expired && 'opacity-80', props.class)"
    v-bind="$attrs"
  >
    <header class="flex items-center gap-4">
      <NqTimerRing v-if="timed" :fraction="fraction" :tone="ringTone" :size="64" :thickness="6" aria-hidden="true">
        <span :class="cn('text-label tabular-nums', timerToneText[ringTone])">
          <bdi>{{ left }}</bdi>
          <span class="text-caption">{{ t.seconds }}</span>
        </span>
      </NqTimerRing>
      <span v-else aria-hidden="true" class="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-foreground [&_svg]:size-5">
        <Package />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 class="text-h3 text-foreground">{{ expired ? t.expired : dispatcher ? t.dispatcherTitle : t.title }}</h2>
        <div class="flex flex-wrap items-center gap-x-3 text-body-sm text-muted-foreground">
          <span v-if="props.orderCount && props.orderCount > 1" class="inline-flex items-center gap-1">
            <Package aria-hidden="true" class="size-3.5" />
            {{ t.stops(props.orderCount) }}
          </span>
          <span v-if="props.distanceMeters !== undefined">{{ t.distance }} <bdi class="tabular-nums">{{ deliveryDistance(props.distanceMeters, locale) }}</bdi></span>
          <span v-if="props.etaSeconds !== undefined">{{ t.eta }} <bdi class="tabular-nums">{{ deliveryDuration(props.etaSeconds, locale) }}</bdi></span>
        </div>
      </div>
      <div class="flex flex-col items-end">
        <span class="text-caption text-muted-foreground">{{ dispatcher ? t.dispatcherFee : t.fee }}</span>
        <bdi data-slot="offer-fee" class="text-h3 tabular-nums text-foreground">{{ deliveryMoney(props.feeMinor, currency, locale) }}</bdi>
      </div>
    </header>

    <span role="status" aria-live="polite" class="sr-only">{{ announce }}</span>

    <ol role="list" class="flex flex-col gap-3">
      <li v-for="s in places" :key="s.kind" :data-stop="s.kind" class="flex items-start gap-3">
        <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-foreground [&_svg]:size-4">
          <component :is="s.icon" aria-hidden="true" />
        </span>
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="text-caption text-muted-foreground">{{ s.kind === "pickup" ? t.pickup : t.dropoff }}</span>
          <bdi dir="auto" class="truncate text-label text-foreground">{{ pick(s.place.name, s.place.nameAr) }}</bdi>
          <bdi v-if="pick(s.place.address, s.place.addressAr)" dir="auto" class="text-body-sm text-muted-foreground">{{ pick(s.place.address, s.place.addressAr) }}</bdi>
        </div>
      </li>
    </ol>

    <p
      v-if="props.cashToCollectMinor"
      data-slot="offer-cash"
      class="flex items-center gap-2 rounded-control border border-nq-warning/40 bg-nq-warning-soft px-3 py-2 text-body-sm text-nq-warning-text"
    >
      <HandCoins aria-hidden="true" class="size-4 shrink-0" />
      <span>{{ t.cash }}</span>
      <bdi class="ms-auto font-medium tabular-nums">{{ deliveryMoney(props.cashToCollectMinor, currency, locale) }}</bdi>
    </p>

    <slot />

    <footer class="grid grid-cols-2 gap-2">
      <NqButton type="button" variant="secondary" size="lg" @click="emit('decline')">
        <X aria-hidden="true" />
        {{ dispatcher ? t.cancel : t.decline }}
      </NqButton>
      <NqButton v-if="dispatcher" type="button" variant="primary" size="lg" @click="emit('offer')">
        <Send aria-hidden="true" />
        {{ t.offerToDriver }}
      </NqButton>
      <NqButton v-else type="button" variant="primary" size="lg" :disabled="expired" @click="emit('accept')">
        <Check aria-hidden="true" />
        {{ t.accept }}
      </NqButton>
    </footer>
  </section>
</template>
