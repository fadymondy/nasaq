<script setup lang="ts">
import { AlertTriangle, CalendarPlus, CheckCheck, Plus, Timer, Trash2 } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDatePicker } from "../date-picker";
import { NqField, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { formatDate } from "../numeric";
import { NqTimeline, NqTimelineItem } from "../timeline";
import { useQueueNow } from "../waiting-screen";
import { STRINGS, type CurrentVisitLabels } from "./strings";
import type { VisitHistoryItem, VisitPatient, VisitResult } from "./types";
import { canFinishVisit, followUpDate, formatVisitElapsed, validatePrescription, visitElapsedSeconds, withoutBlankPrescriptions, type VisitPrescription } from "./visit-math";

// The visit in progress: the patient card with allergies up front, earlier visits, a running timer, notes, a prescription list
// and a follow-up choice. Finishing is blocked until there is a note or a valid prescription, and a half-filled medicine is never dropped silently.
interface Props {
  patient: VisitPatient;
  /** What the visit is for. */
  service: string;
  /** When the visit started (epoch ms). */
  startedAt: number;
  room?: string;
  history?: readonly VisitHistoryItem[];
  defaultNotes?: string;
  defaultPrescriptions?: readonly VisitPrescription[];
  /** Quick follow-up choices in days. Default 7, 14 and 30. */
  followUpOptions?: readonly number[];
  /** Working weekdays (0 = Sunday) so a follow-up never lands on a day off. */
  workingWeekdays?: readonly number[];
  /** Save the visit. Return `{ error }` (or throw) to keep the panel open with a message. */
  onFinish: (result: VisitResult) => Promise<void | { error?: string }>;
  /** Overrides the clock (epoch ms) for stories and tests. */
  now?: number;
  labels?: Partial<CurrentVisitLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { room: undefined, history: () => [], defaultNotes: "", defaultPrescriptions: () => [], followUpOptions: () => [7, 14, 30], workingWeekdays: undefined, now: undefined, labels: undefined });

const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }) as CurrentVisitLabels);
const clock = useQueueNow(() => props.now);
const id = `nq-visit-${useId()}`;

let counter = 0;
const blankRx = (): VisitPrescription => ({ id: `rx-new-${++counter}`, drug: "", dose: "", frequency: "", days: 5 });

const notes = ref(props.defaultNotes);
const rx = ref<VisitPrescription[]>([...props.defaultPrescriptions]);
const followUp = ref<Date | null>(null);
const attempted = ref(false);
const busy = ref(false);
const done = ref(false);
const error = ref<string | null>(null);

const verdict = computed(() => canFinishVisit({ notes: notes.value, prescriptions: rx.value }));
const isBlank = (r: VisitPrescription) => !r.drug.trim() && !r.dose.trim() && !r.frequency.trim();
const patch = (rid: string, p: Partial<VisitPrescription>) => (rx.value = rx.value.map((r) => (r.id === rid ? { ...r, ...p } : r)));
const errorsOf = (r: VisitPrescription) => (attempted.value && !isBlank(r) ? validatePrescription(r) : {});
const errText = (e?: "required" | "invalid") => (e === "invalid" ? t.value.invalid : e === "required" ? t.value.required : undefined);

async function finish() {
  attempted.value = true;
  error.value = null;
  if (!verdict.value.ok) return;
  busy.value = true;
  try {
    const r = await props.onFinish({ notes: notes.value.trim(), prescriptions: withoutBlankPrescriptions(rx.value), followUp: followUp.value });
    if (r && r.error) error.value = r.error;
    else done.value = true;
  } catch {
    error.value = t.value.failed;
  } finally {
    busy.value = false;
  }
}

const today = computed(() => new Date(clock.value));
const chosenDays = computed(() => (followUp.value ? props.followUpOptions.find((n) => followUpDate(today.value, n, props.workingWeekdays).getTime() === followUp.value!.getTime()) : undefined));
const locked = computed(() => busy.value || done.value);
const sortedHistory = computed(() => [...props.history].sort((a, b) => b.date.getTime() - a.date.getTime()));
const daysText = (r: VisitPrescription) => (Number.isFinite(r.days) ? String(r.days) : "");
const setDays = (rid: string, v: string | number | undefined) => patch(rid, { days: String(v ?? "").trim() === "" ? Number.NaN : Number(String(v).replace(/[^\d.]/g, "")) });
const text = (v: string | number | undefined) => String(v ?? "");
</script>

<template>
  <div data-slot="current-visit" :class="cn('grid gap-4 lg:grid-cols-[18rem_1fr] lg:items-start', props.class)">
    <div class="flex flex-col gap-4">
      <NqCard data-slot="current-visit-patient">
        <NqCardHeader class="flex-row items-center gap-3">
          <NqAvatar :name="props.patient.name" :src="props.patient.avatar" size="lg" />
          <div class="min-w-0">
            <NqCardTitle as="h2" class="truncate">{{ props.patient.name }}</NqCardTitle>
            <NqCardDescription>
              {{ props.patient.age !== undefined ? t.years(props.patient.age) : null }}{{ props.patient.age !== undefined && props.patient.gender ? " · " : null }}{{ props.patient.gender }}
            </NqCardDescription>
          </div>
        </NqCardHeader>
        <NqCardContent class="flex flex-col gap-3">
          <bdi v-if="props.patient.phone" dir="ltr" class="text-body-sm tabular-nums text-muted-foreground">{{ props.patient.phone }}</bdi>
          <div>
            <p class="text-caption text-muted-foreground">{{ t.allergies }}</p>
            <ul v-if="props.patient.allergies && props.patient.allergies.length > 0" class="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
              <li v-for="a in props.patient.allergies" :key="a">
                <NqBadge variant="danger">
                  <AlertTriangle aria-hidden="true" class="size-3" />
                  {{ a }}
                </NqBadge>
              </li>
            </ul>
            <p v-else class="text-body-sm">{{ t.none }}</p>
          </div>
          <div>
            <p class="text-caption text-muted-foreground">{{ t.conditions }}</p>
            <ul v-if="props.patient.conditions && props.patient.conditions.length > 0" class="m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0">
              <li v-for="c in props.patient.conditions" :key="c">
                <NqBadge variant="outline">{{ c }}</NqBadge>
              </li>
            </ul>
            <p v-else class="text-body-sm">{{ t.none }}</p>
          </div>
        </NqCardContent>
      </NqCard>

      <NqCard data-slot="current-visit-history">
        <NqCardHeader>
          <NqCardTitle as="h3">{{ t.history }}</NqCardTitle>
        </NqCardHeader>
        <NqCardContent>
          <p v-if="props.history.length === 0" class="text-body-sm text-muted-foreground">{{ t.noHistory }}</p>
          <NqTimeline v-else>
            <NqTimelineItem v-for="h in sortedHistory" :key="h.id" :title="h.title" :description="h.summary" :time="h.date" />
          </NqTimeline>
        </NqCardContent>
      </NqCard>
    </div>

    <NqCard data-slot="current-visit-panel">
      <NqCardHeader class="flex-row items-start justify-between gap-3">
        <div class="min-w-0">
          <NqCardTitle as="h2">{{ t.visit }}</NqCardTitle>
          <NqCardDescription>{{ props.service }}{{ props.room ? ` · ${t.room(props.room)}` : "" }}</NqCardDescription>
        </div>
        <div class="text-end">
          <p class="text-caption text-muted-foreground">{{ t.timer }}</p>
          <p class="inline-flex items-center gap-1.5 text-h3 tabular-nums" role="timer" :aria-label="t.timer">
            <Timer aria-hidden="true" class="size-4 text-muted-foreground" />
            <bdi dir="ltr">{{ formatVisitElapsed(visitElapsedSeconds(props.startedAt, clock)) }}</bdi>
          </p>
        </div>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-5">
        <NqField>
          <NqFieldLabel>{{ t.notes }}</NqFieldLabel>
          <NqTextarea v-model="notes" :rows="5" :placeholder="t.notesHint" :disabled="locked" />
        </NqField>

        <section :aria-labelledby="`${id}-rx`" class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2">
            <h3 :id="`${id}-rx`" class="text-label">{{ t.prescriptions }}</h3>
            <NqButton size="sm" variant="secondary" :disabled="locked" @click="rx = [...rx, blankRx()]">
              <Plus aria-hidden="true" />
              {{ t.addRx }}
            </NqButton>
          </div>
          <div
            v-for="(r, i) in rx"
            :key="r.id"
            data-slot="current-visit-rx"
            class="grid grid-cols-2 gap-2 rounded-card border border-border p-3 sm:grid-cols-[2fr_1fr_1.5fr_5rem_auto] sm:items-start"
          >
            <NqField class="col-span-2 sm:col-span-1" :invalid="!!errorsOf(r).drug">
              <NqFieldLabel>{{ t.drug }}</NqFieldLabel>
              <NqInput :model-value="r.drug" :disabled="locked" @update:model-value="(v) => patch(r.id, { drug: text(v) })" />
              <NqFieldError :match="!!errorsOf(r).drug">{{ errText(errorsOf(r).drug) }}</NqFieldError>
            </NqField>
            <NqField :invalid="!!errorsOf(r).dose">
              <NqFieldLabel>{{ t.dose }}</NqFieldLabel>
              <NqInput ltr :model-value="r.dose" :disabled="locked" @update:model-value="(v) => patch(r.id, { dose: text(v) })" />
              <NqFieldError :match="!!errorsOf(r).dose">{{ errText(errorsOf(r).dose) }}</NqFieldError>
            </NqField>
            <NqField :invalid="!!errorsOf(r).frequency">
              <NqFieldLabel>{{ t.frequency }}</NqFieldLabel>
              <NqInput :model-value="r.frequency" :placeholder="t.frequencyHint" :disabled="locked" @update:model-value="(v) => patch(r.id, { frequency: text(v) })" />
              <NqFieldError :match="!!errorsOf(r).frequency">{{ errText(errorsOf(r).frequency) }}</NqFieldError>
            </NqField>
            <NqField :invalid="!!errorsOf(r).days">
              <NqFieldLabel>{{ t.days }}</NqFieldLabel>
              <NqInput ltr inputmode="numeric" :model-value="daysText(r)" :disabled="locked" @update:model-value="(v) => setDays(r.id, v)" />
              <NqFieldError :match="!!errorsOf(r).days">{{ errText(errorsOf(r).days) }}</NqFieldError>
            </NqField>
            <NqButton size="icon" variant="ghost" class="self-end" :aria-label="t.removeRx(i + 1)" :disabled="locked" @click="rx = rx.filter((x) => x.id !== r.id)">
              <Trash2 aria-hidden="true" />
            </NqButton>
          </div>
        </section>

        <section :aria-label="t.followUp" class="flex flex-col gap-2">
          <h3 class="text-label">{{ t.followUp }}</h3>
          <div class="flex flex-wrap items-center gap-2">
            <NqButton size="sm" :variant="followUp === null ? 'primary' : 'secondary'" :aria-pressed="followUp === null" :disabled="locked" @click="followUp = null">
              {{ t.noFollowUp }}
            </NqButton>
            <NqButton
              v-for="n in props.followUpOptions"
              :key="n"
              size="sm"
              :variant="chosenDays === n ? 'primary' : 'secondary'"
              :aria-pressed="chosenDays === n"
              :disabled="locked"
              @click="followUp = followUpDate(today, n, props.workingWeekdays)"
            >
              {{ t.inDays(n) }}
            </NqButton>
            <NqDatePicker v-model="followUp" :min="today" :placeholder="t.orPick" :aria-label="t.orPick" :disabled="locked" class="w-auto min-w-40" />
          </div>
          <p v-if="followUp" class="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
            <CalendarPlus aria-hidden="true" class="size-4" />
            {{ t.followUpOn(formatDate(followUp, nq.locale.value, { weekday: "long", day: "numeric", month: "long" })) }}
          </p>
        </section>

        <NqAlert v-if="attempted && !verdict.ok" tone="warning">{{ verdict.reason === "invalid-prescription" ? t.fixRx : t.needSomething }}</NqAlert>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <NqAlert v-if="done" tone="success">{{ t.saved }}</NqAlert>

        <div class="flex justify-end">
          <NqButton size="lg" :disabled="locked" @click="finish">
            <CheckCheck aria-hidden="true" />
            {{ busy ? t.finishing : t.finish }}
          </NqButton>
        </div>
      </NqCardContent>
    </NqCard>
  </div>
</template>
