<script setup lang="ts">
import { Globe2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCombobox, NqComboboxContent, NqComboboxEmpty, NqComboboxInput, NqComboboxItem, NqComboboxList } from "../combobox";
import { normalizeForSearch } from "../commands";
import NqTimeZoneClock from "./NqTimeZoneClock.vue";
import NqTimeZoneRow from "./NqTimeZoneRow.vue";
import { detectTimeZone, listTimeZones, matchTimeZone, timeZoneCity, timeZoneRegion } from "./time-fields-model";
import { useTimeFieldsLocale, useTimeFieldsNow, type TimeFieldsLabels } from "./time-fields-shared";

// A time zone picker with a live clock. Type a city ("riyadh"), a region ("asia"), the zone's own name or an offset ("utc+3",
// "+05:30") and the list narrows; every row shows the time there right now and its offset, or how far it is from `reference`.
interface Props {
  /** IANA zone name. Use `v-model`. */
  modelValue?: string | null;
  defaultValue?: string | null;
  /** The zones to choose from. Default: every zone the browser knows, from `Intl.supportedValuesOf`. */
  zones?: readonly string[];
  /** Compare every zone with this one: "+3h from Cairo". Default none. */
  reference?: string;
  /** Show the live clock of the chosen zone under the field. Default true. */
  showClock?: boolean;
  /** Offer a "Use my time zone" button. Default true. */
  showDetect?: boolean;
  seconds?: boolean;
  hourCycle?: 12 | 24;
  /** Most zones listed at once. Default 60; the list says when it is cut. */
  limit?: number;
  /** Freeze the clocks at a moment, for tests and stories. */
  now?: Date;
  placeholder?: string;
  disabled?: boolean;
  /** Form field name: a hidden input carries the zone. */
  name?: string;
  /** Id of the search input. */
  inputId?: string;
  ariaLabel?: string;
  labels?: Partial<TimeFieldsLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: null,
  zones: undefined,
  reference: undefined,
  showClock: true,
  showDetect: true,
  hourCycle: undefined,
  limit: 60,
  now: undefined,
  placeholder: undefined,
  name: undefined,
  inputId: undefined,
  ariaLabel: undefined,
  labels: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [timeZone: string];
  /** A zone was chosen. */
  valueChange: [timeZone: string];
}>();

const { t, locale, ar } = useTimeFieldsLocale(() => props.labels);
const inner = ref<string | null>(props.defaultValue);
const value = computed(() => (props.modelValue !== undefined ? props.modelValue : inner.value));
const list = computed(() => (props.zones ? [...props.zones] : listTimeZones()));
const now = useTimeFieldsNow(() => props.now, 1000);
const open = ref(false);
const mine = typeof Intl === "undefined" ? "UTC" : detectTimeZone();

function pick(zone: unknown) {
  if (typeof zone !== "string" || !zone) return;
  inner.value = zone;
  emit("update:modelValue", zone);
  emit("valueChange", zone);
}

const shownLimit = computed(() => Math.max(1, props.limit));
const query = ref("");
const matches = (zone: unknown, q: string) => matchTimeZone(zone as string, q, now.value, locale.value, normalizeForSearch);
const matchCount = computed(() => (query.value ? list.value.filter((zone) => matches(zone, query.value)).length : list.value.length));
const truncated = computed(() => matchCount.value > shownLimit.value);
const label = (zone: unknown) => {
  const z = zone as string | null;
  return z ? `${timeZoneCity(z)}${timeZoneRegion(z) ? `, ${timeZoneRegion(z)}` : ""}` : "";
};
function onOpen(next: boolean) {
  open.value = next;
  if (!next) query.value = "";
}
</script>

<template>
  <div data-slot="time-zone-field" :class="cn('flex min-w-0 flex-col gap-2', props.class)">
    <div class="flex min-w-0 items-start gap-2">
      <div class="min-w-0 flex-1">
        <NqCombobox
          :items="list"
          :model-value="value ?? undefined"
          :open="open"
          :item-to-string="label"
          :filter="matches"
          :disabled="props.disabled"
          @update:model-value="pick"
          @update:open="onOpen"
          @search="(q: string) => (query = q)"
        >
          <NqComboboxInput
            :id="props.inputId"
            :clearable="false"
            :placeholder="props.placeholder ?? t.zonePlaceholder"
            :aria-label="props.ariaLabel ?? t.zone"
            :trigger-label="t.open"
            :clear-label="t.clear"
            @focus="(e: FocusEvent) => (e.currentTarget as HTMLInputElement).select()"
          />
          <NqComboboxContent class="min-w-[min(24rem,90vw)]">
            <NqComboboxEmpty>{{ t.zoneEmpty }}</NqComboboxEmpty>
            <NqComboboxList v-slot="{ items }">
              <NqComboboxItem v-for="zone in (items as string[]).slice(0, shownLimit)" :key="zone" :value="zone" class="h-auto min-h-9 py-1.5">
                <NqTimeZoneRow :zone="zone" :now="now" :reference="props.reference" :locale="locale" :hour-cycle="props.hourCycle" :ar="ar" />
              </NqComboboxItem>
            </NqComboboxList>
            <p v-if="truncated" class="border-t border-border px-2.5 pt-2 pb-1 text-caption text-muted-foreground">{{ t.truncated(shownLimit) }}</p>
          </NqComboboxContent>
        </NqCombobox>
      </div>
      <NqButton v-if="props.showDetect" type="button" variant="secondary" size="md" :disabled="props.disabled || value === mine" class="shrink-0" @click="pick(mine)">
        <Globe2 aria-hidden="true" />
        <span class="max-sm:sr-only">{{ t.useMine }}</span>
      </NqButton>
    </div>
    <input v-if="props.name" type="hidden" :name="props.name" :value="value ?? ''" />
    <NqTimeZoneClock
      v-if="props.showClock && value"
      :time-zone="value"
      :now="props.now"
      :seconds="props.seconds"
      :hour-cycle="props.hourCycle"
      :reference="props.reference"
      size="sm"
      :labels="props.labels"
      class="rounded-control bg-nq-surface-soft px-3 py-2"
    />
    <p v-if="value && value === mine" class="text-caption text-muted-foreground">{{ t.yourZone }}</p>
  </div>
</template>
