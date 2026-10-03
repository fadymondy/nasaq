<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import type { BookingStatus } from "./booking-math";
import { STATUS_ICONS, STATUS_VARIANT, useBookingStatusLabel } from "./booking-status";

// A status chip: a distinct icon and the name, coloured by stage.
interface Props {
  status: BookingStatus;
  /** Hide the icon. Off by default: the icon keeps the status readable without colour. */
  hideIcon?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { hideIcon: false });
const label = useBookingStatusLabel();
</script>

<template>
  <NqBadge data-slot="booking-status-badge" :data-status="props.status" :variant="STATUS_VARIANT[props.status]" :class="cn('gap-1', props.class)">
    <component :is="STATUS_ICONS[props.status]" v-if="!props.hideIcon" aria-hidden="true" class="size-3" />
    {{ label(props.status) }}
  </NqBadge>
</template>
