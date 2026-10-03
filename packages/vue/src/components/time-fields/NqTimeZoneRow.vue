<script setup lang="ts">
import { computed } from "vue";
import { formatUtcOffset, formatZoneClock, formatZoneDifference, timeZoneCity, timeZoneLongName, timeZoneOffsetMinutes, timeZoneRegion } from "./time-fields-model";

// One row of the time zone list: city, region and long name, the time there now and its offset (or the gap from `reference`).
// Internal to NqTimeZoneField.
const props = defineProps<{ zone: string; now: Date; reference?: string; locale: string; hourCycle?: 12 | 24; ar: boolean }>();
const offset = computed(() => timeZoneOffsetMinutes(props.now, props.zone));
const sub = computed(() => [timeZoneRegion(props.zone), timeZoneLongName(props.now, props.zone, props.locale)].filter(Boolean).join(" · ") || (props.ar ? "التوقيت العالمي" : "Universal time"));
</script>

<template>
  <span class="flex min-w-0 flex-1 items-center justify-between gap-3">
    <span class="flex min-w-0 flex-col">
      <span class="truncate text-body-sm text-foreground">{{ timeZoneCity(props.zone) }}</span>
      <span class="truncate text-caption text-muted-foreground">{{ sub }}</span>
    </span>
    <span class="flex shrink-0 flex-col items-end">
      <bdi dir="ltr" class="text-body-sm font-medium tabular-nums text-foreground">{{ formatZoneClock(props.now, props.zone, { locale: props.locale, hourCycle: props.hourCycle }) }}</bdi>
      <bdi dir="ltr" class="font-mono text-caption text-muted-foreground">{{
        props.reference ? formatZoneDifference(offset - timeZoneOffsetMinutes(props.now, props.reference), props.locale) : formatUtcOffset(offset)
      }}</bdi>
    </span>
  </span>
</template>
