<script setup lang="ts">
import { ArrowLeft, ArrowRight, CalendarClock, Check, CheckCircle2, CreditCard, Landmark, Loader2, MapPin, Stethoscope, UserRound } from "lucide-vue-next";
import { computed, nextTick, reactive, ref, watch, type Component } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency, useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAvatar } from "../avatar";
import { NqBookingSlots } from "../booking-slots";
import { NqBookingTicket } from "../booking-manage";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardFooter, NqCardHeader, NqCardTitle } from "../card";
import { NqField, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqFileUpload, type UploadFile } from "../file-upload";
import { formatDate, useFormatNumber } from "../numeric";
import { NqProgress } from "../progress";
import { NqRadioCard, NqRadioGroup } from "../radio-group";
import { NqRating } from "../rating";
import { NqStepper, NqStepperItem } from "../stepper";
import { NqSwitch } from "../switch";
import { bookingCode, bookingTotals, validateDetails, type BookingSlot } from "./booking-math";
import type { BookingDetailsValue, BookingFlowProps } from "./flow-types";
import NqBookingFlowReviewRow from "./NqBookingFlowReviewRow.vue";
import NqBookingFlowTotals from "./NqBookingFlowTotals.vue";
import { STRINGS, type BookingFlowLabels, type BookingStepId } from "./strings";
import type { BookingPayment, BookingRecord } from "./types";

// The online booking flow: branch, service, doctor (with ratings), day and time, details (guest or signed in),
// notes and attachments, payment or pay at the visit, then a review and the confirmation ticket.
// A branch step is skipped when there is only one. It holds all the choices in state and calls `onSubmit` once, at the end;
// it never fetches by itself. Finished steps are clickable to go back.
const props = withDefaults(defineProps<BookingFlowProps>(), { locations: () => [], signedIn: undefined, allowOnlinePayment: true, currency: undefined, taxRate: 0, now: undefined, labels: undefined });
const emit = defineEmits<{
  /** After each step change, for analytics or routing. */
  "step-change": [step: BookingStepId];
  /** The patient pressed "Book another visit" on the confirmation. */
  reset: [];
}>();
defineOptions({ inheritAttrs: false });

const nq = useNasaq();
const currency = useCurrency(() => props.currency);
const ar = computed(() => nq.locale.value.startsWith("ar"));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }) as BookingFlowLabels);
const fmt = useFormatNumber();
const now = computed(() => props.now ?? new Date());
const money = (n: number) => fmt(n, { style: "currency", currency: currency.value, minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

const stepIds = computed<BookingStepId[]>(() => {
  const all: BookingStepId[] = ["location", "service", "provider", "time", "details", "notes", "payment", "review"];
  return all.filter((s) => (s === "location" ? props.locations.length > 1 : true));
});

const emptyDetails = (): BookingDetailsValue => ({ name: props.signedIn?.name ?? "", phone: props.signedIn?.phone ?? "", email: props.signedIn?.email ?? "", forOther: false, otherName: "" });
const initialLocation = () => (props.locations.length === 1 ? props.locations[0]!.id : null);

const index = ref(0);
const locationId = ref<string | null>(initialLocation());
const serviceId = ref<string | null>(null);
const providerId = ref<string | null>(null);
const start = ref<Date | null>(null);
const details = reactive<BookingDetailsValue>(emptyDetails());
const touched = ref(false);
const notes = ref("");
const files = ref<UploadFile[]>([]);
const payment = ref<BookingPayment>("visit");
const submitting = ref(false);
const submitError = ref<string | null>(null);
const record = ref<BookingRecord | null>(null);

const step = computed(() => stepIds.value[Math.min(index.value, stepIds.value.length - 1)]!);
const service = computed(() => props.services.find((s) => s.id === serviceId.value) ?? null);
const location = computed(() => props.locations.find((l) => l.id === locationId.value) ?? null);
const eligible = computed(() =>
  props.providers.filter((p) => (!serviceId.value || !p.serviceIds || p.serviceIds.includes(serviceId.value)) && (!locationId.value || !p.locationIds || p.locationIds.includes(locationId.value))),
);
const provider = computed(() => (providerId.value && providerId.value !== "any" ? (props.providers.find((p) => p.id === providerId.value) ?? null) : null));
const totals = computed(() => bookingTotals(service.value ? [{ id: service.value.id, price: service.value.price }] : [], { taxRate: props.taxRate }));

// Slots for the time step.
const slotState = ref<{ status: "idle" | "loading" | "ready" | "error"; slots: readonly BookingSlot[] }>({ status: "idle", slots: [] });
let slotRun = 0;
function loadSlots() {
  if (!serviceId.value || !providerId.value) return;
  const run = ++slotRun;
  slotState.value = { status: "loading", slots: slotState.value.slots };
  props.getSlots({ locationId: locationId.value, serviceId: serviceId.value, providerId: providerId.value }).then(
    (slots) => {
      if (run === slotRun) slotState.value = { status: "ready", slots };
    },
    () => {
      if (run === slotRun) slotState.value = { status: "error", slots: [] };
    },
  );
}
const slotKey = computed(() => `${locationId.value}|${serviceId.value}|${providerId.value}`);
watch(
  [step, slotKey],
  () => {
    if (step.value === "time") loadSlots();
  },
  { immediate: true },
);

const headingEl = ref<HTMLElement | null>(null);
const confirmEl = ref<HTMLElement | null>(null);
watch(step, async (s) => {
  await nextTick();
  headingEl.value?.focus();
  emit("step-change", s);
});
watch(record, async (r) => {
  if (!r) return;
  await nextTick();
  confirmEl.value?.focus();
});

const detailErrors = computed(() => validateDetails(details));
const valid = computed<Record<BookingStepId, boolean>>(() => ({
  location: locationId.value !== null,
  service: serviceId.value !== null,
  provider: providerId.value !== null && (providerId.value === "any" || eligible.value.some((p) => p.id === providerId.value)),
  time: start.value !== null,
  details: Object.keys(detailErrors.value).length === 0,
  notes: !files.value.some((f) => f.status === "error" || f.status === "uploading"),
  payment: true,
  review: true,
}));

function go(to: number) {
  index.value = Math.max(0, Math.min(stepIds.value.length - 1, to));
  submitError.value = null;
}
function next() {
  if (step.value === "details" && !valid.value.details) {
    touched.value = true;
    return;
  }
  if (valid.value[step.value]) go(index.value + 1);
}

async function submit() {
  const svc = service.value;
  if (!svc || !providerId.value || !start.value) return;
  const when = start.value;
  submitting.value = true;
  submitError.value = null;
  try {
    const result = await props.onSubmit({ locationId: locationId.value, serviceId: svc.id, providerId: providerId.value, start: when, details: { ...details }, notes: notes.value, files: files.value.map((f) => f.file), payment: payment.value, total: totals.value.total });
    if (result && result.error) {
      submitError.value = result.error;
      return;
    }
    const code = (result && result.code) || bookingCode(`${svc.id}-${when.getTime()}-${details.phone}`);
    record.value = {
      id: code,
      code,
      status: payment.value === "online" ? "confirmed" : "requested",
      start: when,
      end: new Date(when.getTime() + svc.durationMinutes * 60000),
      service: svc.name,
      provider: provider.value?.name ?? t.value.anyProvider,
      location: location.value?.name,
      address: location.value?.address,
      patient: details.forOther ? details.otherName : details.name,
      phone: details.phone,
      price: totals.value.total,
      currency: currency.value,
      payment: payment.value,
      paid: payment.value === "online",
    };
  } catch {
    submitError.value = t.value.submitFailed;
  } finally {
    submitting.value = false;
  }
}

function reset() {
  index.value = 0;
  locationId.value = initialLocation();
  serviceId.value = null;
  providerId.value = null;
  start.value = null;
  Object.assign(details, emptyDetails());
  touched.value = false;
  notes.value = "";
  files.value = [];
  payment.value = "visit";
  record.value = null;
  emit("reset");
}

function pickLocation(v: string) {
  locationId.value = v;
  providerId.value = null;
  start.value = null;
}
function pickService(v: string) {
  serviceId.value = v;
  start.value = null;
  if (providerId.value && providerId.value !== "any") {
    const p = props.providers.find((x) => x.id === providerId.value);
    if (p?.serviceIds && !p.serviceIds.includes(v)) providerId.value = null;
  }
}
function pickProvider(v: string) {
  providerId.value = v;
  start.value = null;
}
function pickPayment(v: string) {
  payment.value = v as BookingPayment;
}
function onFiles(added: UploadFile[], controls: { update: (id: string, patch: Partial<Omit<UploadFile, "id" | "file">>) => void }) {
  added.forEach((f) => controls.update(f.id, { status: "done", progress: 100 }));
}

const dateLine = computed(() =>
  start.value ? `${formatDate(start.value, nq.locale.value, { weekday: "short", day: "numeric", month: "short" })}, ${formatDate(start.value, nq.locale.value, { hour: "numeric", minute: "2-digit" })}` : null,
);
const err = (code?: "required" | "invalid") => (code === "required" ? t.value.required : code === "invalid" ? t.value.invalid : undefined);

const rows = computed<{ id: BookingStepId; icon: Component; label: string; value: string | null | undefined; bdi?: boolean }[]>(() => [
  ...(props.locations.length > 1 ? [{ id: "location" as const, icon: MapPin, label: t.value.location, value: location.value?.name }] : []),
  { id: "service", icon: Stethoscope, label: t.value.steps.service, value: service.value ? service.value.name : null },
  { id: "provider", icon: UserRound, label: t.value.provider, value: providerId.value === "any" ? t.value.anyProvider : provider.value?.name },
  { id: "time", icon: CalendarClock, label: t.value.when, value: dateLine.value, bdi: true },
]);
const Forward = computed(() => (ar.value ? ArrowLeft : ArrowRight));
const Backward = computed(() => (ar.value ? ArrowRight : ArrowLeft));
</script>

<template>
  <div v-if="record" data-slot="booking-flow" data-state="confirmed" v-bind="$attrs" :class="cn('mx-auto flex w-full max-w-2xl flex-col gap-4', props.class)">
    <div class="flex items-start gap-3" role="status">
      <CheckCircle2 aria-hidden="true" class="mt-1 size-6 shrink-0 text-nq-success-text" />
      <div>
        <h2 ref="confirmEl" tabindex="-1" class="text-h2 outline-none">{{ t.confirmedTitle }}</h2>
        <p class="text-body-sm text-muted-foreground">{{ t.confirmedText }}</p>
      </div>
    </div>
    <NqBookingTicket :booking="record">
      <NqButton variant="ghost" size="sm" @click="reset">{{ t.another }}</NqButton>
    </NqBookingTicket>
  </div>

  <div v-else data-slot="booking-flow" :data-step="step" v-bind="$attrs" :class="cn('flex w-full flex-col gap-5', props.class)">
    <div>
      <div class="hidden md:block">
        <NqStepper :current="index" :aria-label="t.progress">
          <NqStepperItem v-for="(s, i) in stepIds" :key="s" :title="t.steps[s]" v-bind="i < index ? { onClick: () => go(i) } : {}" />
        </NqStepper>
      </div>
      <div class="flex flex-col gap-2 md:hidden">
        <p class="text-label">{{ t.stepOf(index + 1, stepIds.length, t.steps[step]) }}</p>
        <NqProgress :value="((index + 1) / stepIds.length) * 100" :aria-label="t.progress" />
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-[1fr_17rem] lg:items-start">
      <NqCard>
        <NqCardHeader>
          <NqCardTitle as="h2" class="text-h3">
            <span ref="headingEl" tabindex="-1" class="outline-none">{{ t.heading[step] }}</span>
          </NqCardTitle>
        </NqCardHeader>
        <NqCardContent class="flex flex-col gap-4">
          <NqRadioGroup v-if="step === 'location'" :aria-label="t.heading.location" :model-value="locationId ?? undefined" @update:model-value="pickLocation">
            <NqRadioCard v-for="l in locations" :key="l.id" :value="l.id" :title="l.name" :description="[l.address, l.city].filter(Boolean).join(', ')" />
          </NqRadioGroup>

          <NqRadioGroup v-if="step === 'service'" :aria-label="t.heading.service" :model-value="serviceId ?? undefined" @update:model-value="pickService">
            <NqRadioCard v-for="s in services" :key="s.id" :value="s.id" :title="s.name" :description="[s.category, s.description].filter(Boolean).join(' · ') || undefined">
              <template #meta>
                <span class="flex flex-col items-end text-caption">
                  <bdi class="text-label">{{ s.price > 0 ? money(s.price) : "" }}</bdi>
                  <bdi class="text-muted-foreground">{{ t.minutes(s.durationMinutes) }}</bdi>
                </span>
              </template>
            </NqRadioCard>
          </NqRadioGroup>

          <template v-if="step === 'provider'">
            <NqAlert v-if="eligible.length === 0" tone="warning">{{ t.noProviders }}</NqAlert>
            <NqRadioGroup v-else :aria-label="t.heading.provider" :model-value="providerId ?? undefined" @update:model-value="pickProvider">
              <NqRadioCard v-if="eligible.length > 1" value="any" :title="t.anyProvider" :description="t.anyProviderText" />
              <NqRadioCard v-for="p in eligible" :key="p.id" :value="p.id" :description="p.specialty">
                <span class="flex items-center gap-2">
                  <NqAvatar :name="p.name" :src="p.avatar" size="sm" />
                  <span>{{ p.name }}</span>
                </span>
                <template #meta>
                  <NqRating v-if="p.rating !== undefined" :value="p.rating" :count="p.reviews" :count-label="t.reviews" />
                  <span v-else class="text-caption text-muted-foreground">{{ t.noRating }}</span>
                </template>
              </NqRadioCard>
            </NqRadioGroup>
          </template>

          <template v-if="step === 'time'">
            <NqAlert v-if="slotState.status === 'error'" tone="danger">
              {{ t.slotsFailed }}
              <template #action>
                <NqButton size="sm" variant="secondary" @click="loadSlots">{{ t.retry }}</NqButton>
              </template>
            </NqAlert>
            <NqBookingSlots v-else v-model="start" :slots="slotState.slots" :loading="slotState.status !== 'ready'" :now="now" />
          </template>

          <div v-if="step === 'details'" class="flex flex-col gap-4">
            <p v-if="signedIn" class="text-body-sm text-muted-foreground">{{ t.bookingAs(signedIn.name) }}</p>
            <p v-else class="text-body-sm text-muted-foreground">{{ t.guestNote }}</p>
            <NqField :invalid="touched && !!detailErrors.name">
              <NqFieldLabel>{{ t.name }}</NqFieldLabel>
              <NqInput v-model="details.name" autocomplete="name" />
              <NqFieldError v-if="touched && detailErrors.name" match>{{ err(detailErrors.name) }}</NqFieldError>
            </NqField>
            <NqField :invalid="touched && !!detailErrors.phone">
              <NqFieldLabel>{{ t.phone }}</NqFieldLabel>
              <NqInput v-model="details.phone" ltr type="tel" inputmode="tel" autocomplete="tel" />
              <p class="text-caption text-muted-foreground">{{ t.phoneHint }}</p>
              <NqFieldError v-if="touched && detailErrors.phone" match>{{ err(detailErrors.phone) }}</NqFieldError>
            </NqField>
            <NqField :invalid="touched && !!detailErrors.email">
              <NqFieldLabel>{{ t.email }}</NqFieldLabel>
              <NqInput v-model="details.email" ltr type="email" autocomplete="email" />
              <NqFieldError v-if="touched && detailErrors.email" match>{{ err(detailErrors.email) }}</NqFieldError>
            </NqField>
            <label class="flex items-center gap-2 text-body-sm">
              <NqSwitch v-model="details.forOther" />
              {{ t.forOther }}
            </label>
            <NqField v-if="details.forOther" :invalid="touched && !!detailErrors.otherName">
              <NqFieldLabel>{{ t.otherName }}</NqFieldLabel>
              <NqInput v-model="details.otherName" />
              <NqFieldError v-if="touched && detailErrors.otherName" match>{{ err(detailErrors.otherName) }}</NqFieldError>
            </NqField>
          </div>

          <div v-if="step === 'notes'" class="flex flex-col gap-4">
            <NqField>
              <NqFieldLabel>{{ t.notesLabel }}</NqFieldLabel>
              <NqTextarea v-model="notes" :rows="4" :maxlength="600" />
              <p class="text-caption text-muted-foreground">{{ t.notesHint }}</p>
            </NqField>
            <div class="flex flex-col gap-1.5">
              <span class="text-label">{{ t.attachments }}</span>
              <NqFileUpload v-model="files" multiple accept="image/*,.pdf" :max-size="5 * 1024 * 1024" :max-files="4" @files="onFiles" />
              <p class="text-caption text-muted-foreground">{{ t.attachmentsHint }}</p>
            </div>
          </div>

          <div v-if="step === 'payment'" class="flex flex-col gap-4">
            <NqRadioGroup :aria-label="t.heading.payment" :model-value="payment" @update:model-value="pickPayment">
              <NqRadioCard v-if="allowOnlinePayment" value="online" :description="t.payOnlineText">
                <span class="flex items-center gap-2"><CreditCard aria-hidden="true" class="size-4" />{{ t.payOnline }}</span>
              </NqRadioCard>
              <NqRadioCard value="visit" :description="t.payVisitText">
                <span class="flex items-center gap-2"><Landmark aria-hidden="true" class="size-4" />{{ t.payVisit }}</span>
              </NqRadioCard>
            </NqRadioGroup>
            <NqBookingFlowTotals :t="t" :money="money" :subtotal="totals.subtotal" :tax="totals.tax" :total="totals.total" :show-tax="taxRate > 0" />
          </div>

          <div v-if="step === 'review'" class="flex flex-col gap-4">
            <dl class="m-0 grid gap-3">
              <NqBookingFlowReviewRow v-for="r in rows" :key="r.id" :label="r.label" :edit="t.edit" @edit="go(stepIds.indexOf(r.id))">
                <bdi v-if="r.bdi && r.value">{{ r.value }}</bdi>
                <template v-else>{{ r.value }}</template>
              </NqBookingFlowReviewRow>
              <NqBookingFlowReviewRow :label="t.patient" :edit="t.edit" @edit="go(stepIds.indexOf('details'))">
                {{ details.forOther ? details.otherName : details.name }}
                <span class="block text-muted-foreground"><bdi dir="ltr">{{ details.phone }}</bdi></span>
              </NqBookingFlowReviewRow>
              <NqBookingFlowReviewRow v-if="notes || files.length" :label="t.steps.notes" :edit="t.edit" @edit="go(stepIds.indexOf('notes'))">
                <span v-if="notes" class="block whitespace-pre-line">{{ notes }}</span>
                <span v-if="files.length" class="block text-muted-foreground">{{ t.attachedCount(files.length) }}</span>
              </NqBookingFlowReviewRow>
              <NqBookingFlowReviewRow :label="t.payment" :edit="t.edit" @edit="go(stepIds.indexOf('payment'))">
                {{ payment === "online" ? t.payNow : t.payLater }}
              </NqBookingFlowReviewRow>
            </dl>
            <NqBookingFlowTotals :t="t" :money="money" :subtotal="totals.subtotal" :tax="totals.tax" :total="totals.total" :show-tax="taxRate > 0" />
            <p class="text-caption text-muted-foreground">{{ t.cancelPolicy }}</p>
            <NqAlert v-if="submitError" tone="danger">{{ submitError }}</NqAlert>
          </div>
        </NqCardContent>
        <NqCardFooter class="justify-between">
          <NqButton variant="ghost" :disabled="index === 0 || submitting" @click="go(index - 1)">
            <component :is="Backward" aria-hidden="true" />
            {{ t.back }}
          </NqButton>
          <NqButton v-if="step === 'review'" :disabled="submitting" @click="submit">
            <Loader2 v-if="submitting" aria-hidden="true" class="animate-spin" />
            <Check v-else aria-hidden="true" />
            {{ submitting ? t.confirming : t.confirm }}
          </NqButton>
          <NqButton v-else :disabled="!valid[step] && step !== 'details'" @click="next">
            {{ t.next }}
            <component :is="Forward" aria-hidden="true" />
          </NqButton>
        </NqCardFooter>
      </NqCard>

      <aside :aria-label="t.summary" class="order-last rounded-card border border-border bg-card p-4 lg:sticky lg:top-4">
        <h3 class="mb-3 text-label font-semibold">{{ t.summary }}</h3>
        <dl v-if="service" class="m-0 grid gap-3 text-body-sm">
          <div v-for="r in rows" :key="r.id" class="flex items-start gap-2.5">
            <span aria-hidden="true" class="mt-0.5 text-muted-foreground [&_svg]:size-4"><component :is="r.icon" /></span>
            <div class="min-w-0">
              <dt class="text-caption text-muted-foreground">{{ r.label }}</dt>
              <dd class="m-0">
                <template v-if="r.value"><bdi v-if="r.bdi">{{ r.value }}</bdi><template v-else>{{ r.value }}</template></template>
                <span v-else class="text-muted-foreground">-</span>
              </dd>
            </div>
          </div>
          <div class="mt-1 flex items-baseline justify-between border-t border-nq-line pt-3">
            <dt class="text-label">{{ t.total }}</dt>
            <dd class="m-0 text-label"><bdi>{{ totals.total > 0 ? money(totals.total) : "-" }}</bdi></dd>
          </div>
        </dl>
        <p v-else class="text-body-sm text-muted-foreground">{{ t.empty }}</p>
      </aside>
    </div>
  </div>
</template>
