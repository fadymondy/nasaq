<script setup lang="ts">
import { CalendarClock, CalendarPlus, Download, MapPin, Phone, Stethoscope, User, Wallet } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { defaultCurrency } from "../../lib/money";
import { useNasaq } from "../../provider";
import { NqBookingStatusBadge } from "../booking-pipeline";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardFooter, NqCardHeader, NqCardTitle } from "../card";
import { formatDate, useFormatNumber } from "../numeric";
import { NqQrCode } from "../qr-code";
import { bookingTicketValue, buildIcs, googleCalendarUrl } from "./booking-math";
import { STRINGS, type BookingManageLabels } from "./strings";
import type { BookingRecord } from "./types";
import NqBookingTicketRow from "./NqBookingTicketRow.vue";

// The confirmed booking as a ticket: what, when, who and where, a QR code that the kiosk and reception can scan
// (it holds `booking:<code>`), the code in text for people without a camera, and add-to-calendar
// (an .ics file, or Google Calendar in a new tab).
interface Props {
  booking: BookingRecord;
  /** Hide the add-to-calendar buttons. */
  hideCalendar?: boolean;
  labels?: Partial<BookingManageLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { hideCalendar: false, labels: undefined });

const nq = useNasaq();
const fmt = useFormatNumber();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as BookingManageLabels);
const b = computed(() => props.booking);
const day = computed(() => formatDate(b.value.start, locale.value, { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
const time = computed(() => `${formatDate(b.value.start, locale.value, { hour: "numeric", minute: "2-digit" })} – ${formatDate(b.value.end, locale.value, { hour: "numeric", minute: "2-digit" })}`);
const event = computed(() => ({
  uid: `${b.value.id}@nasaq`,
  title: `${b.value.service} – ${b.value.provider}`,
  start: b.value.start,
  end: b.value.end,
  location: [b.value.location, b.value.address].filter(Boolean).join(", ") || undefined,
  description: b.value.code,
}));
const price = computed(() =>
  b.value.price > 0
    ? fmt(b.value.price, { style: "currency", currency: b.value.currency ?? defaultCurrency(locale.value), maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(b.value.price) ? 0 : 2 })
    : null,
);
const payLabel = computed(() => (b.value.payment === "visit" ? t.value.payVisit : b.value.paid ? t.value.payOnline : t.value.payOnlinePending));

function saveText(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>

<template>
  <NqCard data-slot="booking-ticket" :data-status="b.status" :class="cn('w-full', props.class)">
    <NqCardHeader>
      <NqCardTitle as="h3">{{ b.service }}</NqCardTitle>
      <NqCardDescription>
        <NqBookingStatusBadge :status="b.status" />
      </NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="grid gap-5 sm:grid-cols-[1fr_auto]">
      <dl class="m-0 grid gap-3">
        <NqBookingTicketRow :label="t.when">
          <template #icon><CalendarClock /></template>
          <bdi>{{ day }}</bdi>
          <br />
          <bdi class="tabular-nums">{{ time }}</bdi>
        </NqBookingTicketRow>
        <NqBookingTicketRow :label="t.provider">
          <template #icon><Stethoscope /></template>
          {{ b.provider }}
        </NqBookingTicketRow>
        <NqBookingTicketRow v-if="b.location" :label="t.where">
          <template #icon><MapPin /></template>
          {{ b.location }}
          <span v-if="b.address" class="block text-muted-foreground">{{ b.address }}</span>
        </NqBookingTicketRow>
        <NqBookingTicketRow :label="t.who">
          <template #icon><User /></template>
          {{ b.patient }}
        </NqBookingTicketRow>
        <NqBookingTicketRow v-if="b.phone" :label="t.phone">
          <template #icon><Phone /></template>
          <bdi dir="ltr">{{ b.phone }}</bdi>
        </NqBookingTicketRow>
        <NqBookingTicketRow :label="t.payment">
          <template #icon><Wallet /></template>
          {{ payLabel }}
          <template v-if="price">
            {{ " · " }}
            <bdi>{{ price }}</bdi>
          </template>
        </NqBookingTicketRow>
      </dl>
      <div class="flex flex-col items-center gap-2 rounded-card border border-nq-line p-3">
        <NqQrCode :value="bookingTicketValue(b.code)" :size="132" :label="t.qrLabel(b.code)" />
        <div class="flex flex-col items-center">
          <span class="text-caption text-muted-foreground">{{ t.code }}</span>
          <bdi dir="ltr" class="font-mono text-label tracking-wider">{{ b.code }}</bdi>
        </div>
        <p class="max-w-40 text-center text-caption text-muted-foreground">{{ t.scan }}</p>
      </div>
    </NqCardContent>
    <NqCardFooter v-if="!(props.hideCalendar && !$slots.default)" class="flex-wrap">
      <template v-if="!props.hideCalendar">
        <NqButton variant="secondary" size="sm" @click="saveText(`${b.code}.ics`, 'text/calendar', buildIcs(event))">
          <Download aria-hidden="true" />
          {{ t.downloadIcs }}
        </NqButton>
        <NqButton variant="secondary" size="sm" as="a" :href="googleCalendarUrl(event)" target="_blank" rel="noreferrer">
          <CalendarPlus aria-hidden="true" />
          {{ t.google }}
        </NqButton>
      </template>
      <slot />
    </NqCardFooter>
  </NqCard>
</template>
