<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import {
  formatUtcOffset,
  formatZoneClock,
  formatZoneDate,
  formatZoneDifference,
  isIanaTimeZone,
  timeZoneCity,
  timeZoneOffsetMinutes,
  zoneDayDifference,
} from "./time-fields-model";
import { useTimeFieldsLocale, useTimeFieldsNow, type TimeFieldsLabels } from "./time-fields-shared";

// A live clock for one time zone: the city, the time ticking, the date and the UTC offset, optionally compared with a reference
// zone. It uses Intl only, so daylight saving is right without a table. The digits are Latin in Arabic too.
interface Props {
  /** IANA zone name, "Asia/Riyadh". */
  timeZone: string;
  /** Overrides the city shown ("Head office"). */
  label?: string;
  /** Show seconds and tick every second. Default false (the minute still updates on time). */
  seconds?: boolean;
  /** 12 or 24 hour clock. Default: what the language uses. */
  hourCycle?: 12 | 24;
  /** Another zone to compare with: shows "+2h from Cairo" and "Tomorrow" when the day differs. */
  reference?: string;
  /** Show the date under the clock. Default true. */
  showDate?: boolean;
  /** Show the UTC offset. Default true. */
  showOffset?: boolean;
  /** Freeze the clock at a moment, for tests and stories. */
  now?: Date;
  size?: "sm" | "md" | "lg";
  labels?: Partial<TimeFieldsLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  hourCycle: undefined,
  reference: undefined,
  showDate: true,
  showOffset: true,
  now: undefined,
  size: "md",
  labels: undefined,
});

const clockSize = { sm: "text-h3", md: "text-h2", lg: "text-display" } as const;
const { t, locale, ar } = useTimeFieldsLocale(() => props.labels);
const now = useTimeFieldsNow(() => props.now, 1000);
const known = computed(() => isIanaTimeZone(props.timeZone));
const hasReference = computed(() => Boolean(props.reference && isIanaTimeZone(props.reference)));
const offset = computed(() => (known.value ? timeZoneOffsetMinutes(now.value, props.timeZone) : 0));
const diff = computed(() => (hasReference.value ? offset.value - timeZoneOffsetMinutes(now.value, props.reference as string) : null));
const dayShift = computed(() => (known.value && hasReference.value ? zoneDayDifference(now.value, props.timeZone, props.reference as string) : 0));
const clock = computed(() => (known.value ? formatZoneClock(now.value, props.timeZone, { locale: locale.value, seconds: props.seconds, hourCycle: props.hourCycle }) : ""));
</script>

<template>
  <div v-if="!known" data-slot="time-zone-clock" :class="cn('text-body-sm text-muted-foreground', props.class)">
    {{ t.unknownZone }}: <bdi dir="ltr">{{ props.timeZone }}</bdi>
  </div>
  <div v-else data-slot="time-zone-clock" :class="cn('flex min-w-0 flex-col gap-0.5', props.class)">
    <div class="flex items-baseline justify-between gap-3">
      <span class="min-w-0 truncate text-label text-foreground">{{ props.label ?? timeZoneCity(props.timeZone) }}</span>
      <bdi v-if="props.showOffset" dir="ltr" class="shrink-0 font-mono text-caption text-muted-foreground">{{ formatUtcOffset(offset) }}</bdi>
    </div>
    <time :datetime="now.toISOString()" dir="ltr" :class="cn('font-semibold tabular-nums text-foreground', clockSize[props.size], ar && 'text-start')">{{ clock }}</time>
    <div v-if="props.showDate || diff !== null" class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
      <span v-if="props.showDate">{{ formatZoneDate(now, props.timeZone, locale) }}</span>
      <NqBadge v-if="dayShift !== 0" variant="neutral">{{ dayShift > 0 ? t.tomorrow : t.yesterday }}</NqBadge>
      <span v-if="diff !== null && diff !== 0"><bdi dir="ltr">{{ formatZoneDifference(diff, locale) }}</bdi> {{ t.ahead }} {{ timeZoneCity(props.reference as string) }}</span>
    </div>
  </div>
</template>
