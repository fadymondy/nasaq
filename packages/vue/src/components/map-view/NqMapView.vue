<script setup lang="ts">
import { Check, Crosshair, Layers, MapPin as MapPinIcon, Minus, Plus, Undo2, X } from "lucide-vue-next";
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqCopyButton } from "../copy-button";
import {
  MAP_CLUSTER_MAX_ZOOM,
  MAP_CLUSTER_RADIUS,
  MAP_CLUSTER_THRESHOLD,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  mapCluster,
  mapClusterExpand,
  mapFit,
  mapFormatCoordinates,
  mapFromScreen,
  mapGraticuleStep,
  mapPanBy,
  mapPointInPolygon,
  mapRouteLength,
  mapScaleBar,
  mapTileUrl,
  mapToScreen,
  mapVisibleTiles,
  mapZoomAt,
  type MapLatLng,
  type MapSize,
  type MapView as MapViewState,
} from "./map-geo";
import NqMapHandle from "./NqMapHandle.vue";
import { STRINGS, type MapViewLabels } from "./strings";
import type { MapArea, MapClusterInfo, MapLayer, MapPin, MapRoute, MapTone } from "./types";

// A map of places and routes without a map library: pins, route lines, zones, layer toggles, zoom and pan by drag, wheel,
// buttons or keyboard, pin clustering and a location card. Tiles come from a URL template you provide; without one it
// draws a latitude and longitude grid, so it works offline. The canvas is always left to right.
interface Props {
  pins?: readonly MapPin[];
  routes?: readonly MapRoute[];
  /** Filled polygons drawn under the routes and pins, for zones. */
  areas?: readonly MapArea[];
  layers?: readonly MapLayer[];
  /** Visible layer ids (`v-model:visibleLayers`). Default: every layer that is not `defaultHidden`. */
  visibleLayers?: readonly string[];
  /** Tile URL template with `{z}`, `{x}` and `{y}`. Nasaq ships no tile service. Without it a coordinate grid is drawn. */
  tileUrl?: string;
  /** Credit for the tile provider: show it when you set `tileUrl`. */
  attribution?: string;
  /** Selected pin id (`v-model:selectedId`). */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  /** Actions of a pin. They fill the card and open as a context menu on the pin. */
  pinActions?: (pin: MapPin) => ContextMenuAction[];
  /** Centre and zoom (`v-model:view`). Without one the map fits every visible pin and route until someone moves it. */
  view?: MapViewState;
  defaultView?: MapViewState;
  minZoom?: number;
  maxZoom?: number;
  /** Group nearby pins into count bubbles. Default: on when more than 30 pins are visible. */
  cluster?: boolean;
  /** Distance in px under which pins share a bubble. Default 60. */
  clusterRadius?: number;
  /** Legacy switch: `false` is the same as `layersPanel="hidden"`. */
  legend?: boolean;
  layersPanel?: "collapsed" | "expanded" | "hidden";
  /** A draggable pin for choosing a location (`v-model:pickedPoint`); `null` shows none. */
  pickedPoint?: MapLatLng | null;
  defaultPickedPoint?: MapLatLng | null;
  /** Area editing mode: a tap adds a vertex, vertices drag, a toolbar removes the last point or finishes. */
  editing?: boolean;
  /** The ring being edited (`v-model:editPoints`). */
  editPoints?: readonly MapLatLng[];
  defaultEditPoints?: readonly MapLatLng[];
  /** Tone of the shape being edited. Default brand. */
  editTone?: MapTone;
  /** Accessible name of the map. */
  label?: string;
  locale?: string;
  labels?: MapViewLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  pins: () => [],
  routes: () => [],
  areas: () => [],
  layers: () => [],
  visibleLayers: undefined,
  tileUrl: undefined,
  attribution: undefined,
  selectedId: undefined,
  defaultSelectedId: null,
  pinActions: undefined,
  view: undefined,
  defaultView: undefined,
  minZoom: MAP_MIN_ZOOM,
  maxZoom: MAP_MAX_ZOOM,
  cluster: undefined,
  clusterRadius: MAP_CLUSTER_RADIUS,
  legend: true,
  layersPanel: "collapsed",
  pickedPoint: undefined,
  defaultPickedPoint: null,
  editing: false,
  editPoints: undefined,
  defaultEditPoints: undefined,
  editTone: "brand",
  label: undefined,
  locale: undefined,
  labels: undefined,
});
const emit = defineEmits<{
  "update:view": [view: MapViewState];
  "update:visibleLayers": [ids: string[]];
  "update:selectedId": [id: string | null];
  "update:pickedPoint": [point: MapLatLng];
  "update:editPoints": [points: MapLatLng[]];
  select: [id: string | null];
  /** A pin was activated, besides `select`. */
  pinClick: [pin: MapPin];
  /** A tap on empty map (not a drag, pin, area or control). */
  mapClick: [point: MapLatLng];
  /** A tap inside a zone (topmost first), or a zone row of the legend. */
  areaClick: [area: MapArea];
  /** The ring changed after an add, move or removal. */
  areaChange: [points: MapLatLng[]];
  /** Finish shape was pressed with three or more points. */
  areaDone: [points: MapLatLng[]];
}>();
defineSlots<{
  /** Replaces the body of the location card for the selected pin. */
  card?: (p: { pin: MapPin }) => unknown;
  /** Replaces what is inside a cluster bubble (the count by default). */
  cluster?: (p: { cluster: MapClusterInfo }) => unknown;
}>();

const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));
const hasAreaClick = !!getCurrentInstance()?.vnode.props?.onAreaClick;

const canvas = ref<HTMLElement | null>(null);
const size = ref<MapSize>({ width: 0, height: 0 });
const own = ref<MapViewState | null>(props.defaultView ?? null);
const innerSelected = ref<string | null>(props.defaultSelectedId);
const innerLayers = ref<string[]>(props.layers.filter((l) => !l.defaultHidden).map((l) => l.id));
const legendOpen = ref<boolean | null>(null);
const innerPicked = ref<MapLatLng | null>(props.defaultPickedPoint);
const innerEdit = ref<MapLatLng[]>([...(props.defaultEditPoints ?? [])]);
const drag = ref(false);
const clusterList = ref<string[] | null>(null);
let last: { x: number; y: number } | null = null;
let moved = false;

const picked = computed(() => (props.pickedPoint === undefined ? innerPicked.value : props.pickedPoint));
const editRing = computed<readonly MapLatLng[]>(() => props.editPoints ?? innerEdit.value);
const selectedId = computed(() => (props.selectedId === undefined ? innerSelected.value : props.selectedId));
const shown = computed<readonly string[]>(() => props.visibleLayers ?? innerLayers.value);
const isShown = (layer?: string) => !layer || !props.layers.some((l) => l.id === layer) || shown.value.includes(layer);
const visiblePins = computed(() => props.pins.filter((p) => isShown(p.layer)));
const visibleRoutes = computed(() => props.routes.filter((r) => isShown(r.layer)));
const visibleAreas = computed(() => props.areas.filter((a) => isShown(a.layer)));

let observer: ResizeObserver | undefined;
function read() {
  const el = canvas.value;
  if (el) size.value = { width: el.clientWidth, height: el.clientHeight };
}
function onWheel(event: WheelEvent) {
  const el = canvas.value;
  if (!el) return;
  event.preventDefault();
  const rect = el.getBoundingClientRect();
  zoomBy(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0025), { x: event.clientX - rect.left, y: event.clientY - rect.top });
}
onMounted(() => {
  const el = canvas.value;
  if (!el) return;
  read();
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(read);
    observer.observe(el);
  }
  // Wheel zoom needs a non-passive listener to stop the page from scrolling.
  el.addEventListener("wheel", onWheel, { passive: false });
});
onBeforeUnmount(() => {
  observer?.disconnect();
  canvas.value?.removeEventListener("wheel", onWheel);
});

const fitted = computed(() => {
  const points: MapLatLng[] = [...visiblePins.value, ...visibleRoutes.value.flatMap((r) => r.points), ...visibleAreas.value.flatMap((a) => a.points)];
  return mapFit(points, size.value, { minZoom: props.minZoom, maxZoom: props.maxZoom });
});
const view = computed(() => props.view ?? own.value ?? fitted.value);
const ready = computed(() => size.value.width > 0 && size.value.height > 0);

function setView(next: MapViewState) {
  if (props.view === undefined) own.value = next;
  emit("update:view", next);
}
function select(id: string | null) {
  if (props.selectedId === undefined) innerSelected.value = id;
  clusterList.value = null;
  emit("update:selectedId", id);
  emit("select", id);
}

const clustering = computed(() => props.cluster ?? visiblePins.value.length > MAP_CLUSTER_THRESHOLD);
const clusterMax = computed(() => Math.min(MAP_CLUSTER_MAX_ZOOM, props.maxZoom));
const items = computed(() =>
  clustering.value
    ? mapCluster(visiblePins.value, view.value.zoom, { radius: props.clusterRadius, maxZoom: clusterMax.value, selectedId: selectedId.value })
    : visiblePins.value.map((pin) => ({ type: "pin" as const, pin })),
);
function expandCluster(pins: readonly MapPin[]) {
  const next = mapClusterExpand(pins, view.value, size.value, { radius: props.clusterRadius, maxZoom: clusterMax.value, minZoom: props.minZoom, limit: props.maxZoom });
  setView(next.view);
  clusterList.value = next.list ? pins.map((p) => p.id) : null;
  // The bubble unmounts as it splits: keep keyboard focus on the map instead of losing it to the page.
  canvas.value?.focus({ preventScroll: true });
}

function zoomBy(delta: number, anchor?: { x: number; y: number }) {
  setView(mapZoomAt(view.value, delta, anchor ?? { x: size.value.width / 2, y: size.value.height / 2 }, size.value, { min: props.minZoom, max: props.maxZoom }));
}

const isControl = (event: Event) => !!(event.target as HTMLElement).closest("[data-map-control]");
function pointerDown(event: PointerEvent) {
  if (event.button !== 0 || isControl(event)) return;
  last = { x: event.clientX, y: event.clientY };
  moved = false;
  drag.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}
function pointerMove(event: PointerEvent) {
  if (!last) return;
  const dx = event.clientX - last.x;
  const dy = event.clientY - last.y;
  if (!moved && Math.hypot(dx, dy) < 3) return;
  moved = true;
  last = { x: event.clientX, y: event.clientY };
  setView(mapPanBy(view.value, dx, dy));
}
function endDrag(event: PointerEvent) {
  if (!last) return;
  last = null;
  drag.value = false;
  const el = event.currentTarget as HTMLElement;
  if (el.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId);
  // A tap on empty ground clears the selection and reports the place.
  if (!moved && event.type === "pointerup" && !isControl(event)) {
    const rect = el.getBoundingClientRect();
    const at = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const point = mapFromScreen(at, view.value, size.value);
    if (props.editing) {
      changeRing([...editRing.value, point]);
      return;
    }
    select(null);
    if (hasAreaClick) {
      const hit = [...visibleAreas.value].reverse().find((a) => mapPointInPolygon(at, a.points.map((pt) => mapToScreen(pt, view.value, size.value))));
      if (hit) emit("areaClick", hit);
    }
    emit("mapClick", point);
  }
}

function changeRing(next: MapLatLng[]) {
  if (props.editPoints === undefined) innerEdit.value = next;
  emit("update:editPoints", next);
  emit("areaChange", next);
}
function movePicked(screen: { x: number; y: number }) {
  const next = mapFromScreen(screen, view.value, size.value);
  if (props.pickedPoint === undefined) innerPicked.value = next;
  emit("update:pickedPoint", next);
}
const moveVertex = (index: number, screen: { x: number; y: number }) => changeRing(editRing.value.map((pt, i) => (i === index ? mapFromScreen(screen, view.value, size.value) : pt)));

function fit() {
  if (props.view === undefined) own.value = null;
  emit("update:view", fitted.value);
}

function keyDown(event: KeyboardEvent) {
  if (event.target !== event.currentTarget) {
    if (event.key === "Escape" && selectedId.value) {
      select(null);
      canvas.value?.focus();
    }
    return;
  }
  const step = 80;
  switch (event.key) {
    case "ArrowLeft":
      setView(mapPanBy(view.value, step, 0));
      break;
    case "ArrowRight":
      setView(mapPanBy(view.value, -step, 0));
      break;
    case "ArrowUp":
      setView(mapPanBy(view.value, 0, step));
      break;
    case "ArrowDown":
      setView(mapPanBy(view.value, 0, -step));
      break;
    case "+":
    case "=":
      zoomBy(1);
      break;
    case "-":
    case "_":
      zoomBy(-1);
      break;
    case "Home":
    case "0":
      fit();
      break;
    case "Escape":
      select(null);
      break;
    case "Enter":
      if (!props.editing) return;
      changeRing([...editRing.value, view.value.center]);
      break;
    default:
      return;
  }
  event.preventDefault();
}
function dblClick(event: MouseEvent) {
  if (isControl(event)) return;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  zoomBy(1, { x: event.clientX - rect.left, y: event.clientY - rect.top });
}

function toggleLayer(id: string, on: boolean) {
  const next = on ? [...shown.value, id] : shown.value.filter((x) => x !== id);
  if (props.visibleLayers === undefined) innerLayers.value = next;
  emit("update:visibleLayers", next);
}

// A cluster list only makes sense at the zoom it was opened at: zooming out closes it.
const listed = computed(() => (clusterList.value && view.value.zoom >= clusterMax.value ? visiblePins.value.filter((p) => clusterList.value!.includes(p.id)) : []));
const selected = computed(() => (selectedId.value ? props.pins.find((p) => p.id === selectedId.value) : undefined));
const legendVisible = computed(() => legendOpen.value ?? props.layersPanel === "expanded");
const fmtKm = (m: number) => new Intl.NumberFormat(ar.value ? "ar-u-nu-latn" : "en", { maximumFractionDigits: 1 }).format(m / 1000);

const tiles = computed(() => (ready.value && props.tileUrl ? mapVisibleTiles(view.value, size.value) : []));
const tileSrc = (tile: { x: number; y: number; z: number }) => (props.tileUrl ? mapTileUrl(props.tileUrl, tile.x, tile.y, tile.z) : null);
const grid = computed(() => {
  if (!ready.value || props.tileUrl) return null;
  const v = view.value;
  const s = size.value;
  const step = mapGraticuleStep(v.zoom);
  const nw = mapFromScreen({ x: 0, y: 0 }, v, s);
  const se = mapFromScreen({ x: s.width, y: s.height }, v, s);
  const lngs: number[] = [];
  const lats: number[] = [];
  const west = Math.min(nw.lng, se.lng);
  const east = Math.max(nw.lng, se.lng);
  if (east - west < 360) for (let x = Math.ceil(west / step) * step; x <= east && lngs.length < 60; x += step) lngs.push(x);
  for (let y = Math.ceil(Math.min(nw.lat, se.lat) / step) * step; y <= Math.max(nw.lat, se.lat) && lats.length < 60; y += step) lats.push(y);
  return {
    x: lngs.map((lng) => mapToScreen({ lat: v.center.lat, lng }, v, s).x),
    y: lats.map((lat) => mapToScreen({ lat, lng: v.center.lng }, v, s).y),
  };
});
const scale = computed(() => mapScaleBar(view.value));
const scaleText = computed(() => (scale.value.meters >= 1000 ? `${scale.value.meters / 1000} km` : `${scale.value.meters} m`));
const layerCount = (id: string) => props.pins.filter((p) => p.layer === id).length;
const cardActions = computed(() => (selected.value ? (props.pinActions?.(selected.value) ?? []) : []));

const pick = (en: string | undefined, arabic: string | undefined) => (ar.value ? arabic || en : en || arabic) ?? "";
const at = (pt: MapLatLng) => mapToScreen(pt, view.value, size.value);
const ring = (points: readonly MapLatLng[]) => points.map((pt) => at(pt)).map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");
const diameter = (count: number) => Math.round(Math.min(64, 36 + Math.log2(count) * 6));

const PIN_TONE: Record<MapTone, string> = {
  brand: "border-primary bg-primary text-primary-foreground",
  info: "border-nq-info bg-nq-info-soft text-nq-info-text",
  success: "border-nq-success bg-nq-success-soft text-nq-success-text",
  warning: "border-nq-warning bg-nq-warning-soft text-nq-warning-text",
  danger: "border-nq-danger bg-nq-danger-soft text-nq-danger-text",
  neutral: "border-nq-line-strong bg-secondary text-foreground",
};
const STROKE: Record<MapTone, string> = {
  brand: "stroke-primary",
  info: "stroke-nq-info",
  success: "stroke-nq-success",
  warning: "stroke-nq-warning",
  danger: "stroke-nq-danger",
  neutral: "stroke-muted-foreground",
};
const FILL: Record<MapTone, string> = {
  brand: "fill-primary/15",
  info: "fill-nq-info/15",
  success: "fill-nq-success/15",
  warning: "fill-nq-warning/15",
  danger: "fill-nq-danger/15",
  neutral: "fill-muted-foreground/15",
};
const SWATCH: Record<MapTone, string> = {
  brand: "bg-primary",
  info: "bg-nq-info",
  success: "bg-nq-success",
  warning: "bg-nq-warning",
  danger: "bg-nq-danger",
  neutral: "bg-muted-foreground",
};
const cardClass =
  "absolute inset-x-3 bottom-8 z-30 flex max-h-[70%] cursor-default flex-col overflow-auto rounded-card border border-border bg-card p-4 shadow-lg sm:inset-x-auto sm:bottom-8 sm:start-3 sm:w-80";
</script>

<template>
  <div
    ref="canvas"
    dir="ltr"
    role="group"
    aria-roledescription="map"
    :aria-label="props.label ?? t.map"
    tabindex="0"
    data-slot="map-view"
    :data-dragging="drag ? '' : undefined"
    :title="t.hint"
    :class="
      cn(
        'relative isolate h-[28rem] min-h-64 w-full touch-none select-none overflow-hidden rounded-card border border-border bg-secondary outline-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        drag ? 'cursor-grabbing' : 'cursor-grab',
        props.class,
      )
    "
    @keydown="keyDown"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @dblclick="dblClick"
  >
    <template v-if="ready">
      <div v-if="tiles.length > 0 && props.tileUrl" aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-hidden">
        <template v-for="tile in tiles" :key="tile.key">
          <img
            v-if="tileSrc(tile)"
            :src="tileSrc(tile)!"
            alt=""
            draggable="false"
            referrerpolicy="no-referrer"
            class="absolute max-w-none"
            :style="{ left: `${tile.left}px`, top: `${tile.top}px`, width: `${tile.size + 0.5}px`, height: `${tile.size + 0.5}px` }"
            @error="(e) => ((e.target as HTMLElement).style.visibility = 'hidden')"
          />
        </template>
      </div>
      <svg v-if="grid" aria-hidden="true" class="pointer-events-none absolute inset-0 size-full stroke-border" data-slot="map-grid">
        <line v-for="x in grid.x" :key="`x${x}`" :x1="x" :x2="x" :y1="0" :y2="size.height" stroke-width="1" />
        <line v-for="y in grid.y" :key="`y${y}`" :x1="0" :x2="size.width" :y1="y" :y2="y" stroke-width="1" />
      </svg>
      <svg v-if="visibleAreas.length > 0" aria-hidden="true" class="pointer-events-none absolute inset-0 size-full" data-slot="map-areas">
        <template v-for="area in visibleAreas" :key="area.id">
          <polygon
            v-if="area.points.length >= 3"
            :data-area="area.id"
            :points="ring(area.points)"
            stroke-width="2"
            stroke-linejoin="round"
            :stroke-dasharray="area.dashed ? '6 6' : undefined"
            :class="cn(FILL[area.tone ?? 'brand'], STROKE[area.tone ?? 'brand'])"
          />
        </template>
      </svg>
      <svg aria-hidden="true" class="pointer-events-none absolute inset-0 size-full" data-slot="map-routes">
        <template v-for="route in visibleRoutes" :key="route.id">
          <g v-if="route.points.length >= 2" :data-route="route.id">
            <polyline :points="ring(route.points)" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="7" class="stroke-card" opacity="0.85" />
            <polyline
              :points="ring(route.points)"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="4"
              :stroke-dasharray="route.dashed ? '2 9' : undefined"
              :class="STROKE[route.tone ?? 'info']"
            />
            <circle :cx="at(route.points[0]!).x" :cy="at(route.points[0]!).y" r="4.5" stroke-width="2" :class="cn('fill-card', STROKE[route.tone ?? 'info'])" />
            <circle :cx="at(route.points[route.points.length - 1]!).x" :cy="at(route.points[route.points.length - 1]!).y" r="4.5" stroke-width="2" class="fill-primary stroke-card" />
          </g>
        </template>
      </svg>
      <svg v-if="props.editing && editRing.length > 0" aria-hidden="true" class="pointer-events-none absolute inset-0 size-full" data-slot="map-edit-shape">
        <polygon v-if="editRing.length >= 3" :points="ring(editRing)" stroke-width="2" stroke-linejoin="round" stroke-dasharray="6 6" :class="cn(FILL[props.editTone], STROKE[props.editTone])" />
        <polyline v-else :points="ring(editRing)" fill="none" stroke-width="2" stroke-dasharray="6 6" :class="STROKE[props.editTone]" />
      </svg>

      <template v-for="item in items" :key="item.type === 'cluster' ? item.id : item.pin.id">
        <template v-if="item.type === 'cluster'">
          <button
            v-if="at(item).x >= -64 && at(item).y >= -64 && at(item).x <= size.width + 64 && at(item).y <= size.height + 64"
            type="button"
            data-map-control=""
            :data-cluster="item.id"
            :data-count="item.count"
            :aria-label="view.zoom >= clusterMax ? t.clusterList(item.count) : t.clusterZoom(item.count)"
            class="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-card bg-primary text-label tabular-nums text-primary-foreground shadow-md ring-4 ring-primary/25 outline-none transition-transform duration-150 ease-nq hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
            :style="{ left: `${at(item).x}px`, top: `${at(item).y}px`, width: `${diameter(item.count)}px`, height: `${diameter(item.count)}px` }"
            @click="expandCluster(item.pins)"
          >
            <slot name="cluster" :cluster="{ count: item.count, pins: item.pins, lat: item.lat, lng: item.lng, size: diameter(item.count) }">
              <bdi>{{ item.count }}</bdi>
            </slot>
          </button>
        </template>
        <template v-else-if="at(item.pin).x >= -48 && at(item.pin).y >= -48 && at(item.pin).x <= size.width + 48 && at(item.pin).y <= size.height + 96">
          <NqContextMenuActions :actions="props.pinActions?.(item.pin) ?? []" class="contents">
            <button
              type="button"
              data-map-control=""
              :data-pin="item.pin.id"
              :data-selected="item.pin.id === selectedId ? '' : undefined"
              :data-live="item.pin.live ? '' : undefined"
              :aria-label="item.pin.id === selectedId ? t.selected(pick(item.pin.label, item.pin.labelAr)) : pick(item.pin.label, item.pin.labelAr)"
              :aria-pressed="item.pin.id === selectedId"
              :class="
                cn(
                  'absolute flex -translate-x-1/2 -translate-y-full cursor-pointer flex-col items-center outline-none',
                  'focus-visible:[&>span:first-child]:outline-2 focus-visible:[&>span:first-child]:outline-offset-2 focus-visible:[&>span:first-child]:outline-nq-focus',
                  item.pin.id === selectedId ? 'z-20' : 'z-10',
                  item.pin.live && !drag && 'motion-safe:transition-[left,top] motion-safe:duration-1000 motion-safe:ease-linear',
                )
              "
              :style="{ left: `${at(item.pin).x}px`, top: `${at(item.pin).y}px` }"
              @click="
                select(item.pin.id === selectedId ? null : item.pin.id);
                emit('pinClick', item.pin);
              "
            >
              <span
                :class="
                  cn(
                    'flex items-center justify-center rounded-full border-2 shadow-sm transition-transform duration-150 ease-nq [&_svg]:size-4',
                    item.pin.id === selectedId ? 'size-10 scale-110 ring-4 ring-nq-focus/30' : 'size-8',
                    PIN_TONE[item.pin.tone ?? 'brand'],
                  )
                "
              >
                <component :is="item.pin.icon ?? MapPinIcon" aria-hidden="true" />
              </span>
              <span
                v-if="item.pin.live"
                aria-hidden="true"
                :class="cn('pointer-events-none absolute top-0 rounded-full motion-safe:animate-ping', item.pin.id === selectedId ? 'size-10' : 'size-8', SWATCH[item.pin.tone ?? 'brand'], 'opacity-25')"
              />
              <span aria-hidden="true" :class="cn('-mt-0.5 h-2 w-0.5', SWATCH[item.pin.tone ?? 'brand'])" />
              <bdi v-if="item.pin.id === selectedId" dir="auto" class="pointer-events-none absolute top-full mt-0.5 max-w-40 truncate rounded-[4px] border border-border bg-card px-1.5 text-caption text-foreground shadow-sm">
                {{ pick(item.pin.label, item.pin.labelAr) }}
              </bdi>
            </button>
          </NqContextMenuActions>
        </template>
      </template>

      <template v-if="props.editing">
        <NqMapHandle
          v-for="(pt, i) in editRing"
          :key="i"
          :canvas="canvas"
          :x="at(pt).x"
          :y="at(pt).y"
          :label="t.vertex(i + 1)"
          :hint="t.vertexHint"
          :data-vertex="String(i)"
          removable
          :class="cn('size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-sm', SWATCH[props.editTone])"
          @move="(s) => moveVertex(i, s)"
          @remove="changeRing(editRing.filter((_, k) => k !== i))"
        />
      </template>
      <NqMapHandle v-if="picked" :canvas="canvas" :x="at(picked).x" :y="at(picked).y" :label="t.pickedPoint" :hint="t.pickedHint" data-picked-point="" class="-translate-x-1/2 -translate-y-full flex-col" @move="movePicked">
        <span class="flex size-10 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-md ring-4 ring-nq-focus/30 [&_svg]:size-5">
          <MapPinIcon aria-hidden="true" />
        </span>
        <span aria-hidden="true" class="-mt-0.5 h-2 w-0.5 bg-primary" />
      </NqMapHandle>
      <p v-if="props.pins.length === 0 && props.routes.length === 0 && props.areas.length === 0 && !props.editing && !picked" class="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-body-sm text-muted-foreground">{{ t.noPins }}</p>
    </template>

    <div
      v-if="props.legend && props.layersPanel !== 'hidden' && (props.layers.length > 0 || visibleRoutes.length > 0 || visibleAreas.length > 0)"
      data-map-control=""
      data-slot="map-legend"
      class="absolute start-3 top-3 z-30 flex max-w-[calc(100%-6rem)] cursor-default flex-col items-start gap-1.5"
      :dir="ar ? 'rtl' : 'ltr'"
    >
      <NqButton type="button" variant="secondary" size="sm" :aria-expanded="legendVisible" class="shadow-sm" @click="legendOpen = !legendVisible">
        <Layers aria-hidden="true" />
        {{ t.layers }}
      </NqButton>
      <div v-if="legendVisible" class="flex w-56 max-w-full flex-col gap-2 rounded-card border border-border bg-card p-3 text-body-sm shadow-md">
        <ul v-if="props.layers.length > 0" role="list" class="flex flex-col gap-1.5">
          <li v-for="layer in props.layers" :key="layer.id">
            <label class="flex cursor-pointer items-center gap-2">
              <NqCheckbox :model-value="shown.includes(layer.id)" :aria-label="t.showLayer(pick(layer.label, layer.labelAr))" @update:model-value="(on: boolean) => toggleLayer(layer.id, on)" />
              <component :is="layer.icon" v-if="layer.icon" aria-hidden="true" class="size-3.5 text-muted-foreground" />
              <span v-else aria-hidden="true" :class="cn('size-2.5 shrink-0 rounded-full', SWATCH[layer.tone ?? 'brand'])" />
              <span class="min-w-0 flex-1 truncate text-foreground">{{ pick(layer.label, layer.labelAr) }}</span>
              <span class="text-caption tabular-nums text-muted-foreground">{{ layerCount(layer.id) }}</span>
            </label>
          </li>
        </ul>
        <div v-if="visibleAreas.length > 0" :class="cn('flex flex-col gap-1.5', props.layers.length > 0 && 'border-t border-border pt-2')">
          <span class="text-caption text-muted-foreground">{{ t.areas }}</span>
          <ul role="list" class="flex flex-col gap-1.5">
            <li v-for="area in visibleAreas" :key="area.id">
              <button v-if="hasAreaClick" type="button" :data-area-item="area.id" class="flex w-full cursor-pointer items-center gap-2 rounded-control text-start outline-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-nq-focus" @click="emit('areaClick', area)">
                <span aria-hidden="true" :class="cn('size-3 shrink-0 rounded-[3px] opacity-70', SWATCH[area.tone ?? 'brand'])" />
                <span class="min-w-0 flex-1 truncate text-foreground">{{ pick(area.label, area.labelAr) }}</span>
              </button>
              <span v-else class="flex items-center gap-2">
                <span aria-hidden="true" :class="cn('size-3 shrink-0 rounded-[3px] opacity-70', SWATCH[area.tone ?? 'brand'])" />
                <span class="min-w-0 flex-1 truncate text-foreground">{{ pick(area.label, area.labelAr) }}</span>
              </span>
            </li>
          </ul>
        </div>
        <div v-if="visibleRoutes.length > 0" :class="cn('flex flex-col gap-1.5', (props.layers.length > 0 || visibleAreas.length > 0) && 'border-t border-border pt-2')">
          <span class="text-caption text-muted-foreground">{{ t.routes }}</span>
          <ul role="list" class="flex flex-col gap-1.5">
            <li v-for="route in visibleRoutes" :key="route.id" class="flex items-center gap-2">
              <span aria-hidden="true" :class="cn('h-0.5 w-4 shrink-0 rounded-full', SWATCH[route.tone ?? 'info'], route.dashed && 'opacity-60')" />
              <span class="min-w-0 flex-1 truncate text-foreground">{{ pick(route.label, route.labelAr) }}</span>
              <bdi class="text-caption tabular-nums text-muted-foreground">{{ t.routeLength(fmtKm(mapRouteLength(route.points))) }}</bdi>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div data-map-control="" :dir="ar ? 'rtl' : 'ltr'" class="absolute end-3 top-3 z-30 flex cursor-default flex-col gap-1.5">
      <NqButton type="button" variant="secondary" size="icon" :aria-label="t.zoomIn" :title="t.zoomIn" :disabled="view.zoom >= props.maxZoom" class="shadow-sm" @click="zoomBy(1)">
        <Plus aria-hidden="true" />
      </NqButton>
      <NqButton type="button" variant="secondary" size="icon" :aria-label="t.zoomOut" :title="t.zoomOut" :disabled="view.zoom <= props.minZoom" class="shadow-sm" @click="zoomBy(-1)">
        <Minus aria-hidden="true" />
      </NqButton>
      <NqButton type="button" variant="secondary" size="icon" :aria-label="t.fit" :title="t.fit" class="shadow-sm" @click="fit">
        <Crosshair aria-hidden="true" />
      </NqButton>
    </div>

    <div
      v-if="props.editing"
      data-map-control=""
      data-slot="map-edit-toolbar"
      role="toolbar"
      :aria-label="t.shape"
      :dir="ar ? 'rtl' : 'ltr'"
      class="absolute inset-x-0 top-3 z-30 mx-auto flex w-fit max-w-[calc(100%-9rem)] cursor-default flex-wrap items-center justify-center gap-1.5 rounded-card border border-border bg-card p-1.5 shadow-md"
    >
      <span class="px-1.5 text-caption text-muted-foreground">{{ t.editHint }}</span>
      <NqButton type="button" size="sm" variant="secondary" :disabled="editRing.length === 0" @click="changeRing(editRing.slice(0, -1))">
        <Undo2 aria-hidden="true" />
        {{ t.removeLast }}
      </NqButton>
      <NqButton type="button" size="sm" :disabled="editRing.length < 3" @click="emit('areaDone', [...editRing])">
        <Check aria-hidden="true" />
        {{ t.finishShape }}
      </NqButton>
    </div>

    <div class="pointer-events-none absolute inset-x-3 bottom-2 z-10 flex items-end justify-between gap-3 text-caption text-muted-foreground">
      <span aria-hidden="true" :class="cn('flex flex-col items-start gap-0.5', selected && 'max-sm:invisible')">
        <span class="h-1.5 border-x border-b border-foreground/60" :style="{ width: `${scale.px}px` }" />
        <span class="tabular-nums">{{ scaleText }}</span>
      </span>
      <span v-if="props.attribution" class="pointer-events-auto max-w-[70%] rounded-[4px] bg-card/80 px-1.5 text-end">{{ props.attribution }}</span>
    </div>

    <section v-if="listed.length > 0 && !selected" data-map-control="" data-slot="map-cluster-card" :aria-label="t.clusterPins(listed.length)" :dir="ar ? 'rtl' : 'ltr'" :class="cn(cardClass, 'gap-2')">
      <header class="flex items-start gap-2">
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <span class="text-label text-foreground">{{ t.clusterPins(listed.length) }}</span>
          <span class="text-body-sm text-muted-foreground">{{ t.clusterHint }}</span>
        </div>
        <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.close" @click="clusterList = null">
          <X aria-hidden="true" />
        </NqButton>
      </header>
      <ul role="list" class="flex flex-col gap-1">
        <li v-for="pin in listed" :key="pin.id">
          <button type="button" :data-cluster-pin="pin.id" class="flex w-full cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-start text-body-sm text-foreground outline-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-nq-focus" @click="select(pin.id)">
            <span aria-hidden="true" :class="cn('flex size-6 shrink-0 items-center justify-center rounded-full border [&_svg]:size-3.5', PIN_TONE[pin.tone ?? 'brand'])">
              <component :is="pin.icon ?? MapPinIcon" aria-hidden="true" />
            </span>
            <bdi dir="auto" class="min-w-0 flex-1 truncate">{{ pick(pin.label, pin.labelAr) }}</bdi>
          </button>
        </li>
      </ul>
    </section>

    <section v-if="selected" data-map-control="" data-slot="map-card" :aria-label="pick(selected.label, selected.labelAr)" :dir="ar ? 'rtl' : 'ltr'" :class="cn(cardClass, 'gap-3')">
      <header class="flex items-start gap-2">
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <bdi dir="auto" class="truncate text-label text-foreground">{{ pick(selected.label, selected.labelAr) }}</bdi>
          <bdi v-if="selected.detail || selected.detailAr" dir="auto" class="text-body-sm text-muted-foreground">{{ pick(selected.detail, selected.detailAr) }}</bdi>
        </div>
        <NqBadge v-if="selected.status || selected.statusAr" :variant="selected.tone ?? 'neutral'">{{ pick(selected.status, selected.statusAr) }}</NqBadge>
        <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.close" @click="select(null)">
          <X aria-hidden="true" />
        </NqButton>
      </header>
      <slot name="card" :pin="selected">
        <dl v-if="selected.meta?.length" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
          <div v-for="(m, i) in selected.meta" :key="i" class="contents">
            <dt class="text-muted-foreground">{{ pick(m.label, m.labelAr) }}</dt>
            <dd class="min-w-0 text-foreground">
              <bdi dir="auto">{{ m.value }}</bdi>
            </dd>
          </div>
        </dl>
      </slot>
      <div class="flex items-center gap-1 text-caption text-muted-foreground">
        <span class="sr-only">{{ t.coordinates }}</span>
        <bdi dir="ltr" class="tabular-nums">{{ mapFormatCoordinates(selected) }}</bdi>
        <NqCopyButton :value="mapFormatCoordinates(selected, 6)" :label="t.copyCoordinates" size="icon-sm" />
      </div>
      <div v-if="cardActions.length" class="flex flex-wrap gap-2">
        <NqButton v-for="action in cardActions" :key="action.id" type="button" size="sm" :variant="action.danger ? 'danger' : 'secondary'" :disabled="action.disabled" @click="action.onSelect()">
          <component :is="action.icon" v-if="action.icon" aria-hidden="true" />
          {{ action.label }}
        </NqButton>
      </div>
    </section>
  </div>
</template>
