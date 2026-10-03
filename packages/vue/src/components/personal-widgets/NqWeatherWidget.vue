<script setup lang="ts">
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun, Wind } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqIcon } from "../icon";
import { formatNumber } from "../numeric";
import { fill, usePersonalStrings, type PersonalWidgetLabels } from "./strings";
import type { WeatherCondition } from "./types";

// Presentational weather for the owner's city. Pass the values from your own weather source; nothing is fetched here.
interface Props {
  city: string;
  /** Current temperature in degrees Celsius. */
  temperature: number;
  condition: WeatherCondition;
  high?: number;
  low?: number;
  /** `f` converts the values to Fahrenheit for display. Default `c`. */
  unit?: "c" | "f";
  labels?: PersonalWidgetLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { unit: "c" });
const { t, locale } = usePersonalStrings(() => props.labels);
const ICON = { clear: Sun, "partly-cloudy": CloudSun, cloudy: Cloud, rain: CloudRain, storm: CloudLightning, snow: Snowflake, fog: CloudFog, wind: Wind } as const;
const show = (c: number) => formatNumber(Math.round(props.unit === "f" ? (c * 9) / 5 + 32 : c), locale.value, { style: "unit", unit: props.unit === "f" ? "fahrenheit" : "celsius" });
</script>

<template>
  <NqCard data-slot="weather-widget" :data-condition="props.condition" :class="cn('gap-2', props.class)">
    <NqCardHeader><NqCardTitle>{{ t.weather }}</NqCardTitle></NqCardHeader>
    <NqCardContent class="flex items-center gap-3">
      <NqIcon :icon="ICON[props.condition]" class="size-9 shrink-0 text-nq-accent-text" />
      <div class="flex min-w-0 flex-col">
        <p class="text-h1 text-foreground" dir="ltr">{{ show(props.temperature) }}</p>
        <p class="text-body-sm text-muted-foreground">{{ t.condition[props.condition] }}, <bdi>{{ props.city }}</bdi></p>
        <p v-if="props.high !== undefined && props.low !== undefined" class="text-caption text-muted-foreground">{{ fill(t.highLow, { high: show(props.high), low: show(props.low) }) }}</p>
      </div>
    </NqCardContent>
  </NqCard>
</template>
