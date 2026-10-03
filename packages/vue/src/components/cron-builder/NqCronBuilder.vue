<script lang="ts">
/** Time zones offered when `timeZones` is not given. The current `timeZone` is always added. */
export const DEFAULT_TIME_ZONES = ["UTC", "Asia/Riyadh", "Asia/Dubai", "Africa/Cairo", "Europe/London", "Europe/Paris", "America/New_York", "America/Los_Angeles", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"];
</script>

<script setup lang="ts">
import { CalendarClock, CircleAlert, Globe } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import { NqDateTime, type FormatDateOptions } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import {
  cronToSimple,
  DEFAULT_CRON_PRESETS,
  DEFAULT_SIMPLE,
  describeCron,
  isValidTimeZone,
  nextRuns,
  parseCron,
  simpleToCron,
  type CronError,
  type CronFrequency,
  type CronPreset,
  type CronSimple,
} from "./cron";
import { BUILDER_STRINGS, type CronBuilderLabels } from "./strings";

// A schedule anyone can fill in: pick "every weekday at 09:00" from simple settings, or type the cron expression itself.
// Either way it shows the schedule in words, checks it (naming the field that is wrong), and lists the next runs in the
// chosen time zone, so nobody has to trust their own reading of `0 9 * * 1-5`. The value is always the cron string.
export interface Props {
  /** The cron expression: five fields (`0 9 * * 1-5`) or a macro such as `@daily`. Use `v-model`. */
  modelValue?: string;
  defaultValue?: string;
  /** IANA time zone the schedule is read in, such as `Asia/Riyadh`. Use `v-model:timeZone`. Default `UTC`. */
  timeZone?: string;
  defaultTimeZone?: string;
  /** Zones in the picker. Default a short list of common ones. */
  timeZones?: readonly string[];
  /** Hide the zone picker and read the schedule in `timeZone`. */
  hideTimeZone?: boolean;
  /** Quick picks. `false` hides them. Default: every 5 minutes, hourly, daily, weekdays, weekly, monthly. */
  presets?: readonly CronPreset[] | false;
  /** How many upcoming runs to list. Default 5. */
  previewCount?: number;
  /** The moment the preview counts from. Default: now (read when the value or zone changes). */
  now?: Date | number;
  disabled?: boolean;
  /** Accessible name of the group. Default "Schedule". */
  label?: string;
  /** Override any English or Arabic string. */
  labels?: Partial<CronBuilderLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: "0 9 * * 1-5",
  timeZone: undefined,
  defaultTimeZone: "UTC",
  timeZones: () => DEFAULT_TIME_ZONES,
  presets: () => DEFAULT_CRON_PRESETS,
  previewCount: 5,
  now: undefined,
  label: undefined,
  labels: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [value: string];
  /** Every change, with whether the expression parses. The value can be invalid while someone types. */
  valueChange: [value: string, valid: boolean];
  "update:timeZone": [timeZone: string];
}>();

const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const lang = computed(() => (ar.value ? "ar" : "en"));
const t = computed(() => ({ ...BUILDER_STRINGS[lang.value], ...props.labels }));
const id = useId();
const valueState = ref(props.defaultValue);
const value = computed(() => props.modelValue ?? valueState.value);
const zoneState = ref(props.defaultTimeZone);
const zoneRaw = computed(() => props.timeZone ?? zoneState.value);
const zone = computed(() => (isValidTimeZone(zoneRaw.value) ? zoneRaw.value : "UTC"));
const parsed = computed(() => parseCron(value.value));
const simple = computed(() => cronToSimple(value.value));
const tab = ref<string | number>(cronToSimple(props.modelValue ?? props.defaultValue) ? "simple" : "cron");

function setValue(next: string) {
  if (props.modelValue === undefined) valueState.value = next;
  emit("update:modelValue", next);
  emit("valueChange", next, parseCron(next).ok);
}
function setZone(next: string) {
  if (props.timeZone === undefined) zoneState.value = next;
  emit("update:timeZone", next);
}

const summary = computed(() => (parsed.value.ok ? (describeCron(value.value, lang.value) ?? t.value.custom) : null));
const runs = computed(() => (parsed.value.ok ? nextRuns(value.value, { from: props.now ?? Date.now(), count: props.previewCount, timeZone: zone.value }) : []));
const zoneList = computed(() => [...new Set([zone.value, ...props.timeZones])].filter(isValidTimeZone));
const presetList = computed(() => (props.presets === false ? [] : props.presets));
const s = computed(() => simple.value ?? DEFAULT_SIMPLE);
const frequencies = computed(() => Object.keys(t.value.frequencies) as CronFrequency[]);

const patch = (change: Partial<CronSimple>) => setValue(simpleToCron({ ...(simple.value ?? DEFAULT_SIMPLE), ...change }));
function errorText(e: CronError) {
  const field = e.field >= 0 ? (t.value.fieldNames[e.field] as string) : "";
  const tok = e.token ?? "";
  return e.code === "empty" ? t.value.errors.empty() : e.code === "fields" ? t.value.errors.fields() : t.value.errors[e.code](field, tok);
}
const num = (v: string | number | undefined, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(v) || lo)));
const presetLabel = (p: CronPreset) => p.label ?? t.value.presetLabels[p.id] ?? describeCron(p.value, lang.value) ?? p.value;
const runFormat = computed<FormatDateOptions>(() => ({ weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zone.value }));
</script>

<template>
  <div data-slot="cron-builder" role="group" :aria-label="props.label ?? t.label" :class="cn('flex flex-col gap-4 rounded-card border border-border bg-card p-4', props.class)">
    <div v-if="presetList.length" role="group" :aria-label="t.presets" class="flex flex-wrap gap-2">
      <NqButton
        v-for="p in presetList"
        :key="p.id"
        :variant="value.trim() === p.value ? 'primary' : 'secondary'"
        size="sm"
        :aria-pressed="value.trim() === p.value"
        :disabled="props.disabled"
        @click="setValue(p.value)"
      >
        {{ presetLabel(p) }}
      </NqButton>
    </div>

    <NqTabs v-model="tab" class="gap-4">
      <NqTabsList variant="underline">
        <NqTabsTab value="simple">{{ t.simple }}</NqTabsTab>
        <NqTabsTab value="cron">{{ t.cron }}</NqTabsTab>
      </NqTabsList>

      <NqTabsPanel value="simple" class="flex flex-col gap-4">
        <div v-if="!simple" role="status" class="flex flex-wrap items-center gap-3 rounded-control border border-border bg-nq-surface-soft p-3 text-body-sm text-muted-foreground">
          <CircleAlert aria-hidden="true" class="size-4 shrink-0" />
          <span class="min-w-0 flex-1">{{ t.notSimple }}</span>
          <NqButton variant="secondary" size="sm" :disabled="props.disabled" @click="setValue(simpleToCron(DEFAULT_SIMPLE))">{{ t.startOver }}</NqButton>
        </div>
        <div v-else class="grid gap-4 sm:grid-cols-2">
          <NqField :disabled="props.disabled">
            <NqFieldLabel>{{ t.frequency }}</NqFieldLabel>
            <NqSelect :model-value="s.frequency" :disabled="props.disabled" @update:model-value="(v) => patch({ frequency: v as CronFrequency })">
              <NqSelectTrigger :aria-label="t.frequency">
                <NqSelectValue />
              </NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="k in frequencies" :key="k" :value="k">{{ t.frequencies[k] }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <NqField v-if="s.frequency === 'minutes' || s.frequency === 'hours'" :disabled="props.disabled">
            <NqFieldLabel>{{ t.every }} ({{ s.frequency === "minutes" ? t.minutesUnit : t.hoursUnit }})</NqFieldLabel>
            <NqInput
              type="number"
              inputmode="numeric"
              ltr
              :min="1"
              :max="s.frequency === 'minutes' ? 59 : 23"
              :model-value="s.every"
              @update:model-value="(v) => patch({ every: num(v, 1, s.frequency === 'minutes' ? 59 : 23) })"
            />
          </NqField>
          <NqField v-if="s.frequency === 'hours'" :disabled="props.disabled">
            <NqFieldLabel>{{ t.atMinute }}</NqFieldLabel>
            <NqInput type="number" inputmode="numeric" ltr :min="0" :max="59" :model-value="s.minute" @update:model-value="(v) => patch({ minute: num(v, 0, 59) })" />
          </NqField>
          <NqField v-if="s.frequency === 'daily' || s.frequency === 'weekly' || s.frequency === 'monthly'" :disabled="props.disabled">
            <NqFieldLabel>{{ t.atTime }}</NqFieldLabel>
            <NqInput type="time" ltr :model-value="s.time" @update:model-value="(v) => v && patch({ time: String(v) })" />
          </NqField>
          <NqField v-if="s.frequency === 'monthly'" :disabled="props.disabled">
            <NqFieldLabel>{{ t.dayOfMonth }}</NqFieldLabel>
            <NqInput type="number" inputmode="numeric" ltr :min="1" :max="31" :model-value="s.dayOfMonth" @update:model-value="(v) => patch({ dayOfMonth: num(v, 1, 31) })" />
          </NqField>
          <div v-if="s.frequency === 'weekly'" class="flex flex-col gap-1.5 sm:col-span-2">
            <span :id="`${id}-days`" class="text-label text-foreground">{{ t.onDays }}</span>
            <NqToggleGroup
              multiple
              variant="outline"
              :aria-labelledby="`${id}-days`"
              :disabled="props.disabled"
              :model-value="s.days.map(String)"
              class="flex-wrap"
              @update:model-value="(v) => v.length && patch({ days: v.map(Number) })"
            >
              <NqToggle v-for="(d, i) in t.days" :key="d" :value="String(i)" :aria-label="t.daysLong[i]">{{ d }}</NqToggle>
            </NqToggleGroup>
          </div>
        </div>
      </NqTabsPanel>

      <NqTabsPanel value="cron">
        <NqField :invalid="!parsed.ok" :disabled="props.disabled">
          <NqFieldLabel>{{ t.expression }}</NqFieldLabel>
          <NqInput ltr spellcheck="false" autocomplete="off" :model-value="value" class="font-mono" placeholder="0 9 * * 1-5" @update:model-value="(v) => setValue(String(v ?? ''))" />
          <NqFieldDescription>{{ t.expressionHelp }}</NqFieldDescription>
          <p v-if="!parsed.ok" role="alert" class="flex items-start gap-2 text-body-sm text-nq-danger-text">
            <CircleAlert aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
            {{ errorText(parsed.error) }}
          </p>
        </NqField>
      </NqTabsPanel>
    </NqTabs>

    <div data-slot="cron-summary" aria-live="polite" class="flex items-start gap-3 rounded-control bg-nq-surface-soft p-3">
      <CalendarClock aria-hidden="true" class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div class="min-w-0">
        <p class="text-caption text-muted-foreground">{{ t.summary }}</p>
        <p :class="cn('text-body', parsed.ok ? 'text-foreground' : 'text-nq-danger-text')">{{ parsed.ok ? summary : t.invalid }}</p>
        <bdi v-if="parsed.ok" dir="ltr" class="mt-0.5 block font-mono text-code text-muted-foreground">{{ value.trim() }}</bdi>
      </div>
    </div>

    <NqField v-if="!props.hideTimeZone" :disabled="props.disabled">
      <NqFieldLabel>
        <span class="inline-flex items-center gap-1.5">
          <Globe aria-hidden="true" class="size-4" />
          {{ t.timeZone }}
        </span>
      </NqFieldLabel>
      <NqSelect :model-value="zone" :disabled="props.disabled" @update:model-value="(v) => setZone(String(v))">
        <NqSelectTrigger :aria-label="t.timeZone" dir="ltr">
          <NqSelectValue />
        </NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="z in zoneList" :key="z" :value="z"><bdi dir="ltr">{{ z }}</bdi></NqSelectItem>
        </NqSelectContent>
      </NqSelect>
      <NqFieldDescription>{{ t.timeZoneHelp }}</NqFieldDescription>
    </NqField>

    <section v-if="parsed.ok" data-slot="cron-next-runs" :aria-label="t.nextRuns" class="flex flex-col gap-2">
      <h3 class="text-label text-foreground">{{ t.nextRuns }}</h3>
      <p v-if="runs.length === 0" class="text-body-sm text-muted-foreground">{{ t.nextNone }}</p>
      <ol v-else class="flex flex-col divide-y divide-border rounded-control border border-border">
        <li v-for="r in runs" :key="r.getTime()" class="flex flex-wrap items-baseline justify-between gap-x-4 px-3 py-2 text-body-sm">
          <NqDateTime :value="r" :format="runFormat" class="text-foreground" />
          <NqDateTime :value="r" relative class="text-caption text-muted-foreground" />
        </li>
      </ol>
    </section>
  </div>
</template>
