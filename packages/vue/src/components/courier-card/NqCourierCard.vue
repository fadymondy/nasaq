<script setup lang="ts">
import { Bike, Car, Footprints, HandCoins, Motorbike, PackageCheck, Truck } from "lucide-vue-next";
import { computed, getCurrentInstance, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { deliveryCurrency, deliveryDistance, deliveryDuration, deliveryMoney } from "./delivery";
import { STRINGS, type CourierCardLabels, type CourierStatus, type CourierVehicle } from "./strings";

defineOptions({ inheritAttrs: false });

interface Props {
  name: string;
  nameAr?: string;
  avatarSrc?: string;
  status: CourierStatus;
  vehicle?: CourierVehicle;
  /** Plate number or model, shown after the vehicle word. */
  vehicleDetail?: string;
  /** Straight-line or road distance from the pickup, in metres. */
  distanceMeters?: number;
  /** Estimated time to the pickup, in seconds. */
  etaSeconds?: number;
  /** Cash the courier is carrying or has been given as float, in minor units. */
  cashFloatMinor?: number;
  /** Orders the courier is carrying now. */
  activeOrders?: number;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Makes the card a button (select a courier on the map or to assign). Also on when a `@select` listener is set. */
  selectable?: boolean;
  selected?: boolean;
  /** Hide the vehicle, distance and float lines for a one-line row. */
  compact?: boolean;
  locale?: string;
  labels?: CourierCardLabels;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { selected: false, compact: false, selectable: false });
const emit = defineEmits<{ select: [] }>();
const instance = getCurrentInstance();
const isButton = computed(() => props.selectable || typeof instance?.vnode.props?.onSelect !== "undefined");

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const currency = computed(() => props.currency ?? deliveryCurrency(locale.value));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));
const shownName = computed(() => (ar.value ? props.nameAr || props.name : props.name || props.nameAr || ""));
const VEHICLE_ICON: Record<CourierVehicle, Component> = { bike: Bike, motorbike: Motorbike, car: Car, van: Truck, walk: Footprints };
const VehicleIcon = computed(() => (props.vehicle ? VEHICLE_ICON[props.vehicle] : null));

/** Each status has its own dot shape and a word, so presence never depends on colour. */
const DOT: Record<CourierStatus, string> = {
  available: "bg-nq-success",
  busy: "bg-nq-warning",
  offline: "border-2 border-nq-line-strong bg-transparent",
};
const STATUS_TEXT: Record<CourierStatus, string> = {
  available: "text-nq-success-text",
  busy: "text-nq-warning-text",
  offline: "text-muted-foreground",
};
const ariaLabel = computed(() => [shownName.value, t.value[props.status], props.selected ? t.value.selected : ""].filter(Boolean).join(", "));
</script>

<template>
  <div
    data-slot="courier-card"
    :data-status="props.status"
    :data-selected="props.selected ? '' : undefined"
    :class="
      cn(
        'flex items-center gap-2 rounded-card border border-border bg-card p-3 transition-colors duration-150 ease-nq',
        props.selected && 'border-primary ring-2 ring-primary/30',
        props.status === 'offline' && 'opacity-80',
        props.class,
      )
    "
    v-bind="$attrs"
  >
    <component
      :is="isButton ? 'button' : 'div'"
      :type="isButton ? 'button' : undefined"
      :aria-pressed="isButton ? props.selected : undefined"
      :aria-label="isButton ? ariaLabel : undefined"
      :class="
        isButton
          ? 'flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus'
          : 'flex min-w-0 flex-1 items-center gap-3'
      "
      @click="isButton ? emit('select') : undefined"
    >
      <span class="relative shrink-0">
        <NqAvatar :name="shownName" :src="props.avatarSrc" size="lg" />
        <span data-slot="courier-dot" aria-hidden="true" :class="cn('absolute -bottom-0.5 -end-0.5 size-3 rounded-full ring-2 ring-card', DOT[props.status])" />
      </span>
      <span class="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
        <span class="flex min-w-0 items-center gap-2">
          <bdi dir="auto" class="truncate text-label text-foreground">{{ shownName }}</bdi>
          <span data-slot="courier-status" :class="cn('shrink-0 text-caption', STATUS_TEXT[props.status])">{{ t[props.status] }}</span>
        </span>
        <span v-if="!props.compact" class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-sm text-muted-foreground">
          <span v-if="VehicleIcon" class="inline-flex items-center gap-1">
            <component :is="VehicleIcon" aria-hidden="true" class="size-3.5" />
            <span>{{ props.vehicle ? t[props.vehicle] : "" }}</span>
            <bdi v-if="props.vehicleDetail" dir="auto">{{ props.vehicleDetail }}</bdi>
          </span>
          <span v-if="props.distanceMeters !== undefined"><bdi class="tabular-nums">{{ deliveryDistance(props.distanceMeters, locale) }}</bdi> {{ t.away }}</span>
          <span v-if="props.etaSeconds !== undefined">{{ t.eta }} <bdi class="tabular-nums">{{ deliveryDuration(props.etaSeconds, locale) }}</bdi></span>
        </span>
        <span
          v-if="!props.compact && (props.cashFloatMinor !== undefined || props.activeOrders !== undefined)"
          class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-muted-foreground"
        >
          <span v-if="props.cashFloatMinor !== undefined" class="inline-flex items-center gap-1">
            <HandCoins aria-hidden="true" class="size-3.5" />
            <span>{{ t.float }}</span>
            <bdi class="tabular-nums text-foreground">{{ deliveryMoney(props.cashFloatMinor, currency, locale) }}</bdi>
          </span>
          <span v-if="props.activeOrders !== undefined" class="inline-flex items-center gap-1">
            <PackageCheck aria-hidden="true" class="size-3.5" />
            {{ t.orders(props.activeOrders) }}
          </span>
        </span>
      </span>
    </component>
    <!-- Trailing actions, for example an Assign button. Kept outside the select button. -->
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2"><slot name="actions" /></div>
  </div>
</template>
