<script setup lang="ts">
import { Bell, CircleAlert, Info, OctagonAlert, TriangleAlert } from "lucide-vue-next";
import { computed, ref, useAttrs, useId, watch, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqMapView } from "../map-view";
import type { MapView as MapViewState } from "../map-view/map-geo";
import type { MapPin, MapTone } from "../map-view/types";
import { formatNumber, formatRelativeTime } from "../numeric";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { MAP_MONITOR_STRINGS, type MapMonitorLabels } from "./labels";
import {
  countMapAlerts,
  DEFAULT_MAP_TIME_RANGES,
  filterMapAlerts,
  isMapRegionView,
  MAP_ALERT_SEVERITIES,
  mapAlertSeverity,
  type MapAlert,
  type MapAlertSeverity,
  type MapRegionPreset,
  type MapTimeRange,
} from "./map-monitor-logic";

// A map for watching what is happening: region presets to jump between places, a time-range filter, and a list of alerts by
// severity that stays in step with the pins. Props of NqMapView (routes, areas, layers, tile-url, ...) and its listeners
// pass through to the map; everything else lands on the section.
type Labels = Partial<Omit<MapMonitorLabels, "ranges" | "severity">> & {
  ranges?: Record<string, string>;
  severity?: Partial<Record<MapAlertSeverity, string>>;
};
interface Props {
  /** Shown as pins (tone and icon by severity) and listed in the alerts panel. Ids must not clash with `pins`. */
  alerts?: readonly MapAlert[];
  /** Pins besides the alerts. */
  pins?: readonly MapPin[];
  /** Places to jump to. The first is not applied on its own: the map fits its content until one is chosen. */
  regions?: readonly MapRegionPreset[];
  defaultRegion?: string;
  /** Default 24 hours, 7 days, 30 days and All. Name custom ids through `labels.ranges`. */
  timeRanges?: readonly MapTimeRange[];
  /** The time range id (`v-model:range`). */
  range?: string;
  /** Default `"all"`, or the last range. */
  defaultRange?: string;
  /** The alerts panel (`v-model:alertsOpen`). Default open. */
  alertsOpen?: boolean;
  defaultAlertsOpen?: boolean;
  /** Selected pin or alert id (`v-model:selectedId`). */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  /** "Now" for the time filter and relative times. Default the current time. */
  now?: number;
  /** `null` hides the heading. */
  title?: string | null;
  headingAs?: string;
  /** Classes for the map itself, mainly its height. Default `h-[30rem]`. */
  mapClassName?: HTMLAttributes["class"];
  labels?: Labels;
  locale?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  alerts: () => [],
  pins: () => [],
  regions: () => [],
  defaultRegion: undefined,
  timeRanges: () => DEFAULT_MAP_TIME_RANGES,
  range: undefined,
  defaultRange: undefined,
  alertsOpen: undefined,
  defaultAlertsOpen: true,
  selectedId: undefined,
  defaultSelectedId: null,
  now: undefined,
  title: undefined,
  headingAs: "h2",
  mapClassName: undefined,
  labels: undefined,
  locale: undefined,
});
const emit = defineEmits<{
  "update:range": [id: string];
  rangeChange: [id: string];
  regionChange: [id: string];
  "update:alertsOpen": [open: boolean];
  "update:selectedId": [id: string | null];
  select: [id: string | null];
  viewChange: [view: MapViewState];
  /** The alerts left after the time filter, e.g. for a count elsewhere. */
  visibleAlertsChange: [alerts: MapAlert[]];
}>();
defineOptions({ inheritAttrs: false });

const MAP_PROPS = new Set([
  "routes", "areas", "layers", "visibleLayers", "visible-layers", "tileUrl", "tile-url", "attribution", "pinActions", "pin-actions", "minZoom", "min-zoom",
  "maxZoom", "max-zoom", "cluster", "clusterRadius", "cluster-radius", "legend", "layersPanel", "layers-panel", "pickedPoint", "picked-point",
  "defaultPickedPoint", "default-picked-point", "editing", "editPoints", "edit-points", "defaultEditPoints", "default-edit-points", "editTone", "edit-tone",
]);
const attrs = useAttrs();
const isMapAttr = (k: string) => MAP_PROPS.has(k) || /^on(Update:|PinClick|MapClick|AreaClick|AreaChange|AreaDone)/.test(k);
const mapAttrs = computed(() => Object.fromEntries(Object.entries(attrs).filter(([k]) => isMapAttr(k))));
const rootAttrs = computed(() => Object.fromEntries(Object.entries(attrs).filter(([k]) => !isMapAttr(k))));

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const t = computed<MapMonitorLabels>(() => {
  const base = MAP_MONITOR_STRINGS[ar.value ? "ar" : "en"];
  return {
    ...base,
    ...props.labels,
    ranges: { ...base.ranges, ...props.labels?.ranges },
    severity: { ...base.severity, ...props.labels?.severity },
  } as MapMonitorLabels;
});
const n = (v: number) => formatNumber(v, locale.value);
const id = useId();

const ownRange = ref(props.defaultRange ?? props.timeRanges.find((r) => r.ms === null)?.id ?? props.timeRanges.at(-1)?.id ?? "all");
const rangeId = computed(() => props.range ?? ownRange.value);
const range = computed(() => props.timeRanges.find((r) => r.id === rangeId.value) ?? null);

const ownOpen = ref(props.defaultAlertsOpen);
const open = computed(() => props.alertsOpen ?? ownOpen.value);
function setOpen(next: boolean) {
  ownOpen.value = next;
  emit("update:alertsOpen", next);
}

const ownSelected = ref<string | null>(props.defaultSelectedId);
const selected = computed(() => (props.selectedId !== undefined ? props.selectedId : ownSelected.value));
function select(next: string | null) {
  ownSelected.value = next;
  emit("update:selectedId", next);
  emit("select", next);
}

const initialRegion = props.regions.find((r) => r.id === props.defaultRegion);
const view = ref<MapViewState | null>(initialRegion ? { center: initialRegion.center, zoom: initialRegion.zoom } : null);
const activeRegion = computed(() => props.regions.find((r) => isMapRegionView(view.value, r))?.id);

const now = computed(() => props.now ?? Date.now());
const visible = computed(() => filterMapAlerts(props.alerts, range.value?.ms ?? null, now.value));
watch(
  () => visible.value.map((a) => a.id).join("|"),
  () => emit("visibleAlertsChange", visible.value),
  { immediate: true },
);
const counts = computed(() => countMapAlerts(visible.value));

const SEVERITY_TONE: Record<MapAlertSeverity, MapTone> = { critical: "danger", high: "warning", medium: "info", low: "neutral" };
const SEVERITY_ICON: Record<MapAlertSeverity, Component> = { critical: OctagonAlert, high: TriangleAlert, medium: CircleAlert, low: Info };
const SEVERITY_BADGE: Record<MapAlertSeverity, "danger" | "warning" | "info" | "neutral"> = { critical: "danger", high: "warning", medium: "info", low: "neutral" };
const SEVERITY_RULE: Record<MapAlertSeverity, string> = {
  critical: "border-s-nq-danger",
  high: "border-s-nq-warning",
  medium: "border-s-nq-info",
  low: "border-s-border",
};
const SEVERITY_TEXT: Record<MapAlertSeverity, string> = {
  critical: "text-nq-danger-text",
  high: "text-nq-warning-text",
  medium: "text-nq-info-text",
  low: "text-muted-foreground",
};

const titleOf = (a: MapAlert) => (ar.value && a.titleAr ? a.titleAr : a.title);
const detailOf = (a: MapAlert) => (ar.value && a.detailAr ? a.detailAr : a.detail);
const when = (a: MapAlert) => {
  try {
    return formatRelativeTime(a.at, locale.value, { now: now.value });
  } catch {
    return "";
  }
};

const alertPins = computed<MapPin[]>(() =>
  visible.value.map((a) => {
    const severity = mapAlertSeverity(a);
    return {
      id: a.id,
      lat: a.lat,
      lng: a.lng,
      label: a.title,
      labelAr: a.titleAr,
      detail: a.detail,
      detailAr: a.detailAr,
      layer: a.layer,
      tone: SEVERITY_TONE[severity],
      icon: SEVERITY_ICON[severity],
      status: MAP_MONITOR_STRINGS.en.severity[severity],
      statusAr: MAP_MONITOR_STRINGS.ar.severity[severity],
      meta: [{ label: MAP_MONITOR_STRINGS.en.when, labelAr: MAP_MONITOR_STRINGS.ar.when, value: when(a) }],
    };
  }),
);

function goTo(region: MapRegionPreset) {
  view.value = { center: region.center, zoom: region.zoom };
  emit("regionChange", region.id);
}
function onRegions(v: string[]) {
  const region = props.regions.find((r) => r.id === v[0]);
  if (region) goTo(region);
}
function onRanges(v: string[]) {
  if (!v[0]) return;
  ownRange.value = v[0];
  emit("update:range", v[0]);
  emit("rangeChange", v[0]);
}
function onView(v: MapViewState) {
  view.value = v;
  emit("viewChange", v);
}
function focusAlert(a: MapAlert) {
  select(a.id);
  view.value = { center: { lat: a.lat, lng: a.lng }, zoom: Math.max(view.value?.zoom ?? 0, 10) };
}

const heading = computed(() => (props.title === undefined ? t.value.title : props.title));
</script>

<template>
  <section
    v-bind="rootAttrs"
    data-slot="map-monitor"
    :aria-labelledby="heading ? `${id}-title` : undefined"
    :class="cn('flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card', props.class)"
  >
    <header class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3">
      <component :is="props.headingAs" v-if="heading" :id="`${id}-title`" class="me-auto text-h4 text-foreground">{{ heading }}</component>
      <NqToggleGroup v-if="props.regions.length" :aria-label="t.regions" :model-value="activeRegion ? [activeRegion] : []" @update:model-value="onRegions">
        <NqToggle v-for="r in props.regions" :key="r.id" :value="r.id" :data-region="r.id">{{ ar && r.labelAr ? r.labelAr : r.label }}</NqToggle>
      </NqToggleGroup>
      <NqToggleGroup v-if="props.timeRanges.length > 1" :aria-label="t.timeRange" :model-value="range ? [range.id] : []" @update:model-value="onRanges">
        <NqToggle v-for="r in props.timeRanges" :key="r.id" :value="r.id" :data-range="r.id">{{ t.ranges[r.id] ?? r.id }}</NqToggle>
      </NqToggleGroup>
      <NqButton
        type="button"
        variant="secondary"
        :aria-expanded="open"
        :aria-controls="`${id}-alerts`"
        :aria-label="`${open ? t.hideAlerts : t.showAlerts}, ${t.summary(n(visible.length))}`"
        @click="setOpen(!open)"
      >
        <Bell aria-hidden="true" />
        {{ t.alerts }}
        <NqBadge :variant="counts.critical ? 'danger' : visible.length ? 'warning' : 'neutral'">{{ n(visible.length) }}</NqBadge>
      </NqButton>
      <slot name="actions" />
    </header>

    <div class="flex min-w-0 flex-col lg:flex-row">
      <NqMapView
        v-bind="mapAttrs"
        :label="heading ?? t.title"
        :class="cn('h-[30rem] min-w-0 flex-1 rounded-none border-0', props.mapClassName)"
        :pins="[...props.pins, ...alertPins]"
        :view="view ?? undefined"
        :selected-id="selected"
        :locale="locale"
        @update:view="onView"
        @update:selected-id="select"
      >
        <template v-if="$slots.card" #card="slotProps"><slot name="card" v-bind="slotProps" /></template>
        <template v-if="$slots.cluster" #cluster="slotProps"><slot name="cluster" v-bind="slotProps" /></template>
      </NqMapView>
      <aside
        :id="`${id}-alerts`"
        data-slot="map-monitor-alerts"
        :hidden="!open"
        :aria-labelledby="`${id}-alerts-title`"
        class="flex max-h-[30rem] min-w-0 flex-col border-t border-border lg:w-80 lg:border-s lg:border-t-0"
      >
        <div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <h3 :id="`${id}-alerts-title`" class="me-auto text-label text-foreground">{{ t.alertsList }}</h3>
          <template v-for="s in MAP_ALERT_SEVERITIES" :key="s">
            <NqBadge v-if="counts[s]" :variant="SEVERITY_BADGE[s]" :title="t.severity[s]">
              <span class="sr-only">{{ t.severity[s] }}: </span>
              {{ n(counts[s]) }}
            </NqBadge>
          </template>
        </div>
        <ul v-if="visible.length" class="flex flex-col overflow-y-auto">
          <li v-for="a in visible" :key="a.id" data-slot="map-monitor-alert" :data-alert="a.id" :data-severity="mapAlertSeverity(a)">
            <button
              type="button"
              :aria-current="a.id === selected ? 'true' : undefined"
              :class="
                cn(
                  'flex w-full items-start gap-2.5 border-b border-s-2 border-b-border px-4 py-3 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
                  SEVERITY_RULE[mapAlertSeverity(a)],
                  a.id === selected && 'bg-nq-selected',
                )
              "
              @click="focusAlert(a)"
            >
              <component :is="SEVERITY_ICON[mapAlertSeverity(a)]" aria-hidden="true" :class="cn('mt-0.5 size-4 shrink-0', SEVERITY_TEXT[mapAlertSeverity(a)])" />
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span dir="auto" class="line-clamp-2 text-label text-foreground">{{ titleOf(a) }}</span>
                <span v-if="detailOf(a)" dir="auto" class="truncate text-caption text-muted-foreground">{{ detailOf(a) }}</span>
                <span class="text-caption text-muted-foreground">{{ t.severity[mapAlertSeverity(a)] }} · {{ when(a) }}</span>
              </span>
            </button>
          </li>
        </ul>
        <p v-else class="px-4 py-8 text-center text-body-sm text-muted-foreground">{{ t.noAlerts }}</p>
      </aside>
    </div>
  </section>
</template>
