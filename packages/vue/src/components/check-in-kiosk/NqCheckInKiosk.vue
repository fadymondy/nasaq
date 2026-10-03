<script setup lang="ts">
import { CheckCircle2, Delete, Hourglass, Phone, QrCode as QrIcon, Search, UserRoundPlus } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqInput } from "../field";
import { formatDate } from "../numeric";
import { NqQrCode } from "../qr-code";
import { findBookingForCheckIn, phoneDigits, type KioskBooking } from "../waiting-screen";
import { useCheckInKioskLabels, type CheckInKioskLabels, type CheckInRequest, type CheckInResult } from "./strings";

// A self-service check-in screen for the waiting room. A person scans the QR on their booking ticket (a handheld scanner types the code and
// presses Enter, so the field is always focused) or types a phone number on a big number pad. A match becomes a queue ticket. It handles
// more than one booking, no booking, and coming too early, and resets itself after each person.
const props = withDefaults(
  defineProps<{
    /** Today's bookings for this desk, for the lookup. */
    bookings: readonly KioskBooking[];
    /** Put the person in the queue. Resolve with the ticket, or `{ error }` to show a message. The kiosk never fetches by itself. */
    onCheckIn: (request: CheckInRequest) => Promise<CheckInResult | { error: string }>;
    /** Let people without a booking join the line. Default true. */
    allowWalkIn?: boolean;
    /** How early before the booking someone may check in, in minutes. Default 60. */
    earlyMinutes?: number;
    /** Bookings further than this from now are ignored, in minutes. Default 240. */
    windowMinutes?: number;
    /** Seconds the ticket stays before the kiosk resets for the next person. 0 keeps it. Default 20. */
    resetSeconds?: number;
    /** Overrides the clock (epoch ms) for examples and tests. */
    now?: number;
    /** Start on the phone tab instead of the scan tab. */
    defaultMode?: "scan" | "phone";
    labels?: Partial<CheckInKioskLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { allowWalkIn: true, earlyMinutes: 60, windowMinutes: 240, resetSeconds: 20, now: undefined, defaultMode: "scan", labels: undefined },
);

type View =
  | { kind: "input" }
  | { kind: "busy"; text: "finding" | "checkingIn" }
  | { kind: "choose"; bookings: KioskBooking[] }
  | { kind: "message"; text: string; walkIn?: boolean }
  | { kind: "ticket"; result: CheckInResult };

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const nq = useNasaq();
const t = useCheckInKioskLabels(() => props.labels);
const mode = ref<"scan" | "phone">(props.defaultMode);
const code = ref("");
const phone = ref("");
const view = ref<View>({ kind: "input" });
const left = ref(0);
const codeEl = ref<{ $el: HTMLInputElement } | null>(null);
const busy = computed(() => view.value.kind === "busy");
const phoneReady = computed(() => phoneDigits(phone.value).length >= 9);

function reset() {
  code.value = "";
  phone.value = "";
  view.value = { kind: "input" };
}

// A ticket resets the kiosk after a countdown so the next person starts clean.
let timer: ReturnType<typeof setInterval> | undefined;
watch(
  () => view.value.kind,
  (kind) => {
    if (timer) clearInterval(timer);
    timer = undefined;
    if (kind === "ticket" && props.resetSeconds > 0) {
      let s = props.resetSeconds;
      left.value = s;
      timer = setInterval(() => {
        s -= 1;
        left.value = s;
        if (s <= 0) {
          clearInterval(timer);
          timer = undefined;
          reset();
        }
      }, 1000);
    }
  },
);
onBeforeUnmount(() => timer && clearInterval(timer));
watch(
  [view, mode],
  async () => {
    if (view.value.kind !== "input" || mode.value !== "scan") return;
    await nextTick();
    codeEl.value?.$el?.focus();
  },
  { immediate: true, flush: "post" },
);

async function checkIn(request: CheckInRequest) {
  view.value = { kind: "busy", text: "checkingIn" };
  try {
    const result = await props.onCheckIn(request);
    view.value = "error" in result ? { kind: "message", text: result.error } : { kind: "ticket", result };
  } catch {
    view.value = { kind: "message", text: t.value.failed };
  }
}

async function lookup(input: string) {
  const now = props.now ?? Date.now();
  const match = findBookingForCheckIn(props.bookings, input, { now, earlyMinutes: props.earlyMinutes, windowMinutes: props.windowMinutes });
  if (match.kind === "found") return checkIn({ booking: match.booking });
  if (match.kind === "multiple") {
    view.value = { kind: "choose", bookings: match.bookings };
    return;
  }
  if (match.kind === "too-early") {
    const fmt = (ms: number) => formatDate(ms, nq.locale.value, { hour: "numeric", minute: "2-digit" });
    view.value = { kind: "message", text: t.value.tooEarly(fmt(match.booking.startsAt), fmt(match.booking.startsAt - props.earlyMinutes * 60000)) };
    return;
  }
  view.value = { kind: "message", text: t.value.none, walkIn: mode.value === "phone" && props.allowWalkIn && phoneDigits(input).length >= 9 };
}

function submitScan() {
  if (code.value.trim()) void lookup(code.value);
}
const time = (ms: number) => formatDate(ms, nq.locale.value, { hour: "numeric", minute: "2-digit" });
const press = (k: string) => {
  if (phone.value.length < 15) phone.value += k;
};
</script>

<template>
  <div data-slot="check-in-kiosk" :data-view="view.kind" :class="cn('mx-auto flex w-full max-w-xl flex-col gap-4', props.class)">
    <div class="flex flex-col gap-1 text-center">
      <h2 class="text-h1">{{ view.kind === "ticket" ? t.ticketTitle : t.title }}</h2>
      <p v-if="view.kind !== 'ticket'" class="text-body text-muted-foreground">{{ t.subtitle }}</p>
    </div>

    <NqCard v-if="view.kind === 'input' || view.kind === 'busy'" :aria-busy="busy || undefined">
      <NqCardHeader>
        <div role="group" :aria-label="t.title" class="col-span-full grid grid-cols-2 gap-2">
          <NqButton :variant="mode === 'scan' ? 'primary' : 'secondary'" :aria-pressed="mode === 'scan'" :disabled="busy" @click="mode = 'scan'">
            <QrIcon aria-hidden="true" />
            {{ t.modeScan }}
          </NqButton>
          <NqButton :variant="mode === 'phone' ? 'primary' : 'secondary'" :aria-pressed="mode === 'phone'" :disabled="busy" @click="mode = 'phone'">
            <Phone aria-hidden="true" />
            {{ t.modePhone }}
          </NqButton>
        </div>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-4">
        <form v-if="mode === 'scan'" class="flex flex-col gap-3" @submit.prevent="submitScan">
          <label for="kiosk-code" class="text-label">{{ t.scanLabel }}</label>
          <NqInput id="kiosk-code" ref="codeEl" v-model="code" ltr autocomplete="off" :spellcheck="false" :placeholder="t.scanPlaceholder" class="h-14 text-center font-mono text-h3" :disabled="busy" />
          <p class="text-caption text-muted-foreground">{{ t.scanHint }}</p>
          <NqButton type="submit" size="lg" :disabled="!code.trim() || busy">
            <Search aria-hidden="true" />
            {{ view.kind === "busy" ? t[view.text] : t.find }}
          </NqButton>
        </form>
        <div v-else class="flex flex-col gap-3">
          <span id="kiosk-phone-label" class="text-label">{{ t.phoneLabel }}</span>
          <output aria-labelledby="kiosk-phone-label" dir="ltr" class="flex h-14 items-center justify-center rounded-control border border-border bg-background font-mono text-h2 tabular-nums">
            <template v-if="phone">{{ phone }}</template>
            <span v-else class="text-muted-foreground">01X XXXX XXXX</span>
          </output>
          <div role="group" :aria-label="t.keypad" class="grid grid-cols-3 gap-2" dir="ltr">
            <NqButton v-for="k in KEYS" :key="k" variant="secondary" size="lg" class="h-16 text-h2" :disabled="busy" @click="press(k)">{{ k }}</NqButton>
            <NqButton variant="ghost" size="lg" class="h-16" :disabled="!phone || busy" @click="phone = ''">{{ t.clear }}</NqButton>
            <NqButton variant="secondary" size="lg" class="h-16 text-h2" :disabled="busy" @click="press('0')">0</NqButton>
            <NqButton variant="ghost" size="lg" class="h-16" :aria-label="t.backspace" :disabled="!phone || busy" @click="phone = phone.slice(0, -1)">
              <Delete aria-hidden="true" class="rtl:rotate-180" />
            </NqButton>
          </div>
          <NqButton size="lg" :disabled="!phoneReady || busy" @click="lookup(phone)">
            <Search aria-hidden="true" />
            {{ view.kind === "busy" ? t[view.text] : t.find }}
          </NqButton>
          <p v-if="phone && !phoneReady" class="text-caption text-muted-foreground">{{ t.invalidPhone }}</p>
        </div>
      </NqCardContent>
    </NqCard>

    <NqCard v-if="view.kind === 'choose'">
      <NqCardHeader>
        <NqCardTitle as="h3">{{ t.multiple }}</NqCardTitle>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-2">
        <NqButton v-for="b in view.bookings" :key="b.id" variant="secondary" size="lg" class="h-auto justify-between py-3" @click="checkIn({ booking: b })">
          <span>{{ t.bookingLine(b.name, time(b.startsAt)) }}</span>
          <bdi dir="ltr" class="font-mono text-caption text-muted-foreground">{{ b.code }}</bdi>
        </NqButton>
        <NqButton variant="ghost" @click="reset">{{ t.back }}</NqButton>
      </NqCardContent>
    </NqCard>

    <div v-if="view.kind === 'message'" class="flex flex-col gap-3">
      <NqAlert tone="warning">{{ view.text }}{{ view.walkIn ? ` ${t.noneWalkIn}` : "" }}</NqAlert>
      <NqButton v-if="view.walkIn" size="lg" @click="checkIn({ phone })">
        <UserRoundPlus aria-hidden="true" />
        {{ t.walkIn }}
      </NqButton>
      <NqButton variant="secondary" size="lg" @click="reset">{{ t.back }}</NqButton>
    </div>

    <NqCard v-if="view.kind === 'ticket'">
      <NqCardHeader>
        <NqCardDescription class="flex items-center gap-2 text-nq-success-text">
          <CheckCircle2 aria-hidden="true" class="size-4" />
          {{ t.ticketNumber }}
        </NqCardDescription>
      </NqCardHeader>
      <NqCardContent class="flex flex-col items-center gap-4" role="status">
        <bdi dir="ltr" data-slot="kiosk-ticket" class="font-mono text-[5rem] font-semibold leading-none tracking-wider tabular-nums">{{ view.result.entry.ticket }}</bdi>
        <div class="flex flex-col items-center gap-1 text-center text-body">
          <p v-if="view.result.position !== undefined">{{ t.ahead(view.result.position - 1) }}</p>
          <p v-if="view.result.waitMinutes !== undefined" class="inline-flex items-center gap-1.5">
            <Hourglass aria-hidden="true" class="size-4" />
            {{ t.wait(view.result.waitMinutes) }}
          </p>
          <p class="text-muted-foreground">{{ t.watch }}</p>
        </div>
        <NqQrCode :value="`queue:${view.result.entry.ticket}`" :size="120" :label="t.qrLabel" />
        <NqButton size="lg" class="self-stretch" @click="reset">{{ t.done }}</NqButton>
        <p v-if="resetSeconds > 0" class="text-caption text-muted-foreground">{{ t.autoReset(Math.max(0, left)) }}</p>
      </NqCardContent>
    </NqCard>
  </div>
</template>
