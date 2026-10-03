<script setup lang="ts">
import { ChevronRight, CircleAlert, Clock } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton, buttonVariants } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardFooter, NqCardHeader, NqCardTitle } from "../card";
import { NqDateTime } from "../numeric";
import { NqMeter } from "../progress";
import { NqStatus, type StatusTone } from "../status";
import { NqSkeleton } from "../states";
import NqEngineFact from "./NqEngineFact.vue";
import NqHealthMeasure from "./NqHealthMeasure.vue";
import {
  doseTone,
  engineStateKey,
  engineTone,
  secondsUntil,
  summariseMedication,
  type CaffeineSnapshot,
  type ContraceptiveSnapshot,
  type CycleSnapshot,
  type EngineAction,
  type EngineSnapshot,
  type GerdSnapshot,
  type HealthDateInput,
  type HydrationSnapshot,
  type MedicationSnapshot,
  type TriggersSnapshot,
} from "./health-engines";
import { formatDurationSeconds, formatHealthDate, formatMeasure, isolate, useHealthLabels, useNow, type HealthActionResult } from "./health-format";
import { DOSE_ICON, ENGINE_ICONS, TONE_ICON } from "./icons";
import { STRINGS, type EngineCardLabels } from "./strings";

// One protocol engine's live state: name, a state badge with icon and words, the engine-specific readout
// (units, countdown, window, doses, counts, prediction, schedule) and its log action. Seven engines, one card.
interface Props {
  /** The engine's current state, already decided by the server. The card renders it and computes no protocol state. */
  snapshot: EngineSnapshot;
  /** Fixed "now" for countdowns. Omit to follow the clock. */
  now?: HealthDateInput;
  /** Tick the countdown every second. Default true; only engines with a deadline tick. */
  live?: boolean;
  /**
   * Called when the person taps a log action. Resolve with nothing on success or `{ error }` with the server's own
   * message, which the card shows as it is. Without it the action buttons are not drawn.
   */
  onAction?: (action: EngineAction) => Promise<HealthActionResult>;
  /** Link to the engine's own page. Omit on that page itself. */
  detailHref?: string;
  /** Heading level of the title. Default "h3". */
  headingAs?: "h2" | "h3" | "h4";
  loading?: boolean;
  /** Hide the icon, title and subtitle and show only the state. */
  hideTitle?: boolean;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<EngineCardLabels>;
}
const props = withDefaults(defineProps<Props>(), { now: undefined, live: true, onAction: undefined, detailHref: undefined, headingAs: "h3", loading: false, hideTitle: false, labels: undefined });

const { t, locale } = useHealthLabels({ en: STRINGS.en, ar: STRINGS.ar }, () => props.labels);
const d = computed(() => formatHealthDate(locale.value));
const titleId = useId();
const clock = useNow(
  () => props.now,
  () => props.live,
);
const pending = ref<string | null>(null);
const error = ref<string | null>(null);

const engine = computed(() => props.snapshot.engine);
const meta = computed(() => t.value.engines[engine.value]);
const Icon = computed(() => ENGINE_ICONS[engine.value]);
const tone = computed<StatusTone>(() => engineTone(props.snapshot));
const stateKey = computed(() => engineStateKey(props.snapshot));
const StateIcon = computed(() => TONE_ICON[tone.value]);
const stateLabel = computed(() => t.value.states[`${engine.value}.${stateKey.value}`] ?? stateKey.value);

async function run(action: EngineAction) {
  if (!props.onAction) return;
  pending.value = `${action.kind}:${action.doseId ?? ""}`;
  error.value = null;
  try {
    const result = await props.onAction(action);
    if (result && result.error) error.value = result.error;
  } catch {
    error.value = t.value.noSnapshot;
  } finally {
    pending.value = null;
  }
}

const busy = computed(() => pending.value !== null);
const narrow = <S extends EngineSnapshot>(kind: S["engine"]) => computed(() => (props.snapshot.engine === kind ? (props.snapshot as S) : null));
const hydration = narrow<HydrationSnapshot>("hydration");
const caffeine = narrow<CaffeineSnapshot>("caffeine");
const gerd = narrow<GerdSnapshot>("gerd");
const medication = narrow<MedicationSnapshot>("medication");
const triggers = narrow<TriggersSnapshot>("triggers");
const cycle = narrow<CycleSnapshot>("cycle");
const contraceptive = narrow<ContraceptiveSnapshot>("contraceptive");

const m = (value: number, unit: Parameters<typeof formatMeasure>[1], options: Parameters<typeof formatMeasure>[3] = {}) =>
  isolate(formatMeasure(value, unit, locale.value, options, undefined));
const dur = (seconds: number) => isolate(formatDurationSeconds(seconds, locale.value));
const whole = { maximumFractionDigits: 0 };

const hydrationWait = computed(() => (hydration.value && hydration.value.state === "cooldown" ? secondsUntil(hydration.value.nextAllowedAt, clock.value) : 0));
const caffeineTotal = computed(() => (caffeine.value ? caffeine.value.blockMinutes * 60 : 0));
const caffeineLeft = computed(() => (caffeine.value && caffeine.value.state === "blocked" ? Math.min(caffeineTotal.value, secondsUntil(caffeine.value.blockEndsAt, clock.value)) : 0));
const gerdLeft = computed(() => (gerd.value && gerd.value.state === "window_active" ? secondsUntil(gerd.value.windowEndsAt, clock.value) : 0));
const summary = computed(() => (medication.value ? summariseMedication(medication.value.doses) : null));
const showFooter = computed(() => !!props.onAction || !!props.detailHref);
const showWake = computed(() => caffeine.value?.state === "awaiting_wake");
const showRecord = computed(() => !!contraceptive.value && contraceptive.value.state !== "unconfigured");
</script>

<template>
  <NqCard
    data-slot="engine-card"
    class="min-w-0"
    :data-engine="engine"
    :data-state="stateKey"
    :data-tone="tone"
    :aria-labelledby="props.hideTitle ? undefined : titleId"
    :aria-label="props.hideTitle ? meta.title : undefined"
    :aria-busy="props.loading || undefined"
  >
    <div v-if="props.loading" data-slot="engine-card-skeleton" class="flex flex-col gap-3 px-4">
      <NqSkeleton class="h-5 w-40" />
      <NqSkeleton class="h-3.5 w-56" />
      <NqSkeleton class="h-8 w-32" />
      <NqSkeleton class="h-2 w-full" />
    </div>
    <template v-else>
      <NqCardHeader :class="props.hideTitle ? 'grid-cols-[1fr_auto]' : undefined">
        <span v-if="props.hideTitle" class="text-label text-muted-foreground">{{ t.stateLabel }}</span>
        <div v-else class="flex min-w-0 items-start gap-3">
          <span aria-hidden="true" data-slot="engine-card-icon" class="grid size-9 shrink-0 place-items-center rounded-control bg-secondary text-muted-foreground [&_svg]:size-4.5">
            <component :is="Icon" />
          </span>
          <div class="flex min-w-0 flex-col gap-0.5">
            <NqCardTitle :as="props.headingAs" :id="titleId" class="text-h3 text-foreground">{{ meta.title }}</NqCardTitle>
            <NqCardDescription class="text-pretty text-body-sm">{{ meta.subtitle }}</NqCardDescription>
          </div>
        </div>
        <NqCardAction>
          <NqBadge :variant="tone" data-slot="engine-card-state" :title="t.stateLabel">
            <component :is="StateIcon" aria-hidden="true" />
            {{ stateLabel }}
          </NqBadge>
        </NqCardAction>
      </NqCardHeader>

      <NqCardContent class="flex flex-col gap-4">
        <!-- hydration -->
        <div v-if="hydration" class="flex flex-col gap-3">
          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span data-slot="engine-card-value" class="text-h2 leading-tight text-foreground"><NqHealthMeasure :value="hydration.totalMl" unit="milliliter" /></span>
            <span class="text-body-sm text-muted-foreground">{{ t.ofCap }} <NqHealthMeasure :value="hydration.dailyCapMl" unit="milliliter" /></span>
          </div>
          <NqMeter
            :label="t.unitsToday"
            :value="hydration.unitsLogged"
            :max="hydration.unitsTotal"
            :tone="hydration.state === 'capped' ? 'success' : 'default'"
            :value-text="`${m(hydration.unitsLogged, 'cups', whole)} / ${m(hydration.unitsTotal, 'cups', whole)}`"
          />
          <ol aria-hidden="true" data-slot="engine-card-units" class="m-0 flex list-none flex-wrap gap-1 p-0">
            <li v-for="i in hydration.unitsTotal" :key="i" :class="cn('size-3.5 rounded-full border', i <= hydration.unitsLogged ? 'border-primary bg-primary' : 'border-border bg-transparent')" />
          </ol>
        </div>

        <!-- caffeine -->
        <div v-else-if="caffeine" class="flex flex-col gap-3">
          <p v-if="caffeine.state === 'awaiting_wake'" class="text-body-sm text-muted-foreground">{{ t.blockWaiting }}</p>
          <NqMeter
            v-else
            :label="t.blockProgress"
            :value="caffeineTotal - caffeineLeft"
            :max="caffeineTotal"
            :tone="caffeine.state === 'blocked' ? 'warning' : 'success'"
            show-value
            :value-text="caffeineLeft > 0 ? t.blockLeft(dur(caffeineLeft)) : t.blockOver"
          />
          <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
            <NqEngineFact :label="t.cupsToday">
              <template v-if="caffeine.cupsAllowed">{{ t.cupsOf(String(caffeine.cupsToday), String(caffeine.cupsAllowed)) }}</template>
              <NqHealthMeasure v-else :value="caffeine.cupsToday" unit="cups" :format="whole" />
            </NqEngineFact>
            <NqEngineFact :label="t.violations"><NqHealthMeasure :value="caffeine.violationsToday" unit="level" :format="whole" class="[&]:font-medium" /></NqEngineFact>
          </dl>
        </div>

        <!-- gerd -->
        <div v-else-if="gerd" class="flex flex-col gap-3">
          <div v-if="gerd.windowStartsAt && gerd.windowEndsAt" class="flex flex-wrap items-baseline gap-x-2">
            <Clock aria-hidden="true" class="size-4 self-center text-muted-foreground" />
            <span data-slot="engine-card-value" class="text-h3 text-foreground">
              <bdi dir="ltr" class="tabular-nums">{{ t.windowRange(d.time(gerd.windowStartsAt), d.time(gerd.windowEndsAt)) }}</bdi>
            </span>
            <span v-if="gerdLeft > 0" class="text-body-sm text-muted-foreground">{{ t.windowLeft(dur(gerdLeft)) }}</span>
          </div>
          <p v-else class="text-body-sm text-muted-foreground">{{ t.windowNone }}</p>
          <div class="flex flex-col gap-1.5">
            <span class="text-caption text-muted-foreground">{{ t.allowedInside }}</span>
            <ul class="m-0 flex list-none flex-wrap gap-1.5 p-0">
              <li v-for="item in gerd.whitelist" :key="item"><NqBadge variant="outline">{{ t.whitelist[item] ?? item }}</NqBadge></li>
            </ul>
          </div>
          <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
            <NqEngineFact :label="t.gerdViolations"><NqHealthMeasure :value="gerd.violationsToday" unit="level" :format="whole" /></NqEngineFact>
            <NqEngineFact :label="t.needsReview"><NqHealthMeasure :value="gerd.needsReviewToday" unit="level" :format="whole" /></NqEngineFact>
          </dl>
        </div>

        <!-- medication -->
        <template v-else-if="medication && summary">
          <p v-if="medication.doses.length === 0" class="text-body-sm text-muted-foreground">{{ t.noDoses }}</p>
          <div v-else class="flex flex-col gap-3">
            <div class="flex flex-wrap items-baseline gap-x-2">
              <span data-slot="engine-card-value" class="text-h2 leading-tight text-foreground"><NqHealthMeasure :value="summary.logged + summary.lateLogged" unit="level" :format="whole" class="[&]:tabular-nums" /></span>
              <span class="text-body-sm text-muted-foreground">{{ t.ofCap }} <NqHealthMeasure :value="summary.total" unit="level" :format="whole" /> · {{ t.logged }}</span>
            </div>
            <ul class="m-0 flex list-none flex-col divide-y divide-border p-0" data-slot="engine-card-doses">
              <li v-for="dose in medication.doses" :key="dose.id" class="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div class="flex min-w-0 flex-col">
                  <span class="truncate text-body-sm font-medium text-foreground">{{ dose.name }}</span>
                  <span class="text-caption text-muted-foreground"><bdi dir="ltr" class="tabular-nums">{{ d.time(dose.scheduledFor) }}</bdi></span>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <NqStatus :tone="doseTone(dose.status)" :icon="DOSE_ICON[dose.status]">{{ t.doseStatus[dose.status] }}</NqStatus>
                  <NqButton
                    v-if="props.onAction && (dose.status === 'grace_open' || dose.status === 'missed')"
                    size="sm"
                    variant="secondary"
                    :disabled="busy"
                    :loading="pending === `log_dose:${dose.id}`"
                    @click="run({ engine: 'medication', kind: 'log_dose', doseId: dose.id })"
                  >{{ t.logDose }}</NqButton>
                </div>
              </li>
            </ul>
            <p class="text-caption text-muted-foreground">{{ t.graceNote(dur(medication.graceMinutes * 60)) }}</p>
            <p class="text-caption text-muted-foreground">{{ t.consult }}</p>
          </div>
        </template>

        <!-- triggers -->
        <div v-else-if="triggers" class="flex flex-col gap-3">
          <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
            <NqEngineFact :label="t.triggerBearing"><span class="text-h3"><NqHealthMeasure :value="triggers.triggerBearing" unit="level" :format="whole" /></span></NqEngineFact>
            <NqEngineFact :label="t.safe"><span class="text-h3"><NqHealthMeasure :value="triggers.safe" unit="level" :format="whole" /></span></NqEngineFact>
            <NqEngineFact :label="t.unclassified"><span class="text-h3"><NqHealthMeasure :value="triggers.unclassified" unit="level" :format="whole" /></span></NqEngineFact>
          </dl>
          <div v-if="triggers.families.length" class="flex flex-col gap-1.5">
            <span class="text-caption text-muted-foreground">{{ t.byFamily }}</span>
            <ul class="m-0 flex list-none flex-wrap gap-1.5 p-0">
              <li v-for="f in triggers.families" :key="f.id">
                <NqBadge variant="outline">{{ t.families[f.id] ?? f.id }} <NqHealthMeasure :value="f.count" unit="level" :format="whole" /></NqBadge>
              </li>
            </ul>
          </div>
          <p v-if="triggers.unclassified > 0" class="text-caption text-muted-foreground">{{ t.unclassifiedNote }}</p>
        </div>

        <!-- cycle -->
        <div v-else-if="cycle" class="flex flex-col gap-3">
          <NqMeter
            v-if="cycle.state !== 'calibrated'"
            :label="t.calibration"
            :value="Math.min(cycle.countableCycles, cycle.minCycles)"
            :max="cycle.minCycles"
            tone="default"
            :value-text="m(cycle.countableCycles, 'level', whole)"
          />
          <dl v-if="cycle.prediction" class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
            <NqEngineFact :label="t.nextStart"><NqDateTime :value="cycle.prediction.nextStart" :format="{ dateStyle: 'medium' }" /></NqEngineFact>
            <NqEngineFact :label="t.ovulation"><NqDateTime :value="cycle.prediction.ovulation" :format="{ dateStyle: 'medium' }" /></NqEngineFact>
            <NqEngineFact :label="t.fertile" class="col-span-2">
              <bdi class="tabular-nums">{{ t.fertileRange(d.date(cycle.prediction.fertileFrom, { day: "numeric", month: "short" }), d.date(cycle.prediction.fertileTo, { day: "numeric", month: "short" })) }}</bdi>
            </NqEngineFact>
          </dl>
          <div v-else class="flex flex-col gap-1">
            <span class="text-h3 text-foreground">{{ t.unavailable }}</span>
            <p v-if="cycle.reason" class="text-body-sm text-muted-foreground">{{ t.reasons[cycle.reason] }}</p>
          </div>
          <dl v-if="cycle.averageLengthDays" class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
            <NqEngineFact :label="t.average"><NqHealthMeasure :value="cycle.averageLengthDays" unit="day" :format="{ maximumFractionDigits: 1 }" /></NqEngineFact>
          </dl>
          <p class="text-caption text-muted-foreground">{{ cycle.prediction ? t.predictionNote : t.consult }}</p>
        </div>

        <!-- contraceptive -->
        <template v-else-if="contraceptive">
          <p v-if="contraceptive.state === 'unconfigured'" class="text-body-sm text-muted-foreground">{{ t.unconfiguredNote }}</p>
          <div v-else class="flex flex-col gap-3">
            <dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3">
              <NqEngineFact v-if="contraceptive.method" :label="t.method">{{ t.methods[contraceptive.method] }}</NqEngineFact>
              <NqEngineFact v-if="contraceptive.nextDueAt" :label="t.nextDue"><NqDateTime :value="contraceptive.nextDueAt" :format="{ dateStyle: 'medium' }" /></NqEngineFact>
              <NqEngineFact v-if="contraceptive.lastRecordedAt" :label="t.lastRecorded"><NqDateTime :value="contraceptive.lastRecordedAt" relative /></NqEngineFact>
              <NqEngineFact v-if="contraceptive.daysOverdue > 0" :label="t.daysOverdue"><NqHealthMeasure :value="contraceptive.daysOverdue" unit="day" :format="{ unitDisplay: 'long' }" /></NqEngineFact>
            </dl>
            <p v-if="contraceptive.state !== 'on_schedule'" class="text-body-sm text-foreground">{{ t.consult }}</p>
          </div>
        </template>

        <p v-if="error" role="alert" data-slot="engine-card-error" class="flex items-start gap-2 rounded-control border border-nq-warning/30 bg-nq-warning-soft px-3 py-2 text-body-sm text-foreground">
          <CircleAlert aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-warning-text" />
          {{ error }}
        </p>
      </NqCardContent>

      <NqCardFooter v-if="showFooter" class="flex flex-wrap items-center gap-2 px-4">
        <NqButton
          v-if="props.onAction && hydration"
          variant="primary"
          size="sm"
          :disabled="hydration.state === 'capped' || hydrationWait > 0"
          :loading="pending === 'log_unit:'"
          @click="run({ engine: 'hydration', kind: 'log_unit' })"
        >{{ hydrationWait > 0 ? t.wait(dur(hydrationWait)) : t.logUnit }}</NqButton>
        <NqButton v-else-if="props.onAction && showWake" variant="primary" size="sm" :disabled="busy" :loading="pending === 'log_wake:'" @click="run({ engine: 'caffeine', kind: 'log_wake' })">{{ t.logWake }}</NqButton>
        <NqButton
          v-else-if="props.onAction && showRecord && contraceptive"
          :variant="contraceptive.state === 'on_schedule' ? 'secondary' : 'primary'"
          size="sm"
          :disabled="busy"
          :loading="pending === 'record_dose:'"
          @click="run({ engine: 'contraceptive', kind: 'record_dose' })"
        >{{ t.recordDose }}</NqButton>
        <a v-if="props.detailHref" data-slot="engine-card-details" :href="props.detailHref" :aria-describedby="titleId" :class="cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'ms-auto')">
          {{ t.details }}
          <ChevronRight aria-hidden="true" class="rtl:-scale-x-100" />
        </a>
      </NqCardFooter>
    </template>
  </NqCard>
</template>
