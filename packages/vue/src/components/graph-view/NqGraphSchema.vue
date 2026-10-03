<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { useSize, useWheel } from "./graph-gestures";
import { pinchTransform, zoomAbout, type Point, type Transform } from "./graph-layout";
import { orderByNeighbours, schemaColumns, schemaConnector, schemaFit, type SchemaBox } from "./graph-schema";
import { arrowPoints, dashFor } from "./graph-shapes";
import NqGraphZoom from "./NqGraphZoom.vue";
import { hueVar, type GraphViewKind, type GraphViewLabels, type GraphViewLink, type GraphViewLinkKind, type GraphViewNode } from "./types";

// The schema view: a column per type, a card per node, and connectors between related cards measured from the rendered cards.
interface Props {
  nodes: GraphViewNode[];
  links: GraphViewLink[];
  kinds: GraphViewKind[];
  around: Map<string, Set<string>>;
  kindOf: (id: string) => GraphViewKind | undefined;
  linkKindOf: (id: string | undefined) => GraphViewLinkKind | undefined;
  arrows: boolean;
  selected: string | null;
  t: GraphViewLabels;
  num: (n: number) => string;
  rtl: boolean;
}
const props = defineProps<Props>();
const emit = defineEmits<{ select: [id: string | null] }>();

const view = ref<HTMLDivElement | null>(null);
const content = ref<HTMLDivElement | null>(null);
const size = useSize(view);
const tf = ref<Transform>({ x: 0, y: 0, k: 1 });
let userMoved = false;
const boxes = ref(new Map<string, SchemaBox>());
const extent = ref({ w: 0, h: 0 });
const hover = ref<string | null>(null);

const columns = computed(() => orderByNeighbours(schemaColumns(props.nodes, props.kinds.map((k) => k.id)), props.links));

function measure() {
  const c = content.value;
  if (!c) return;
  const origin = c.getBoundingClientRect();
  const k = tf.value.k || 1;
  const next = new Map<string, SchemaBox>();
  for (const el of c.querySelectorAll<HTMLElement>("[data-node]")) {
    const r = el.getBoundingClientRect();
    const id = el.dataset.node;
    if (id) next.set(id, { x: (r.left - origin.left) / k, y: (r.top - origin.top) / k, w: r.width / k, h: r.height / k });
  }
  boxes.value = next;
  extent.value = { w: c.offsetWidth, h: c.offsetHeight };
}
let ro: ResizeObserver | undefined;
onMounted(() => {
  measure();
  if (typeof ResizeObserver !== "undefined" && content.value) {
    ro = new ResizeObserver(measure);
    ro.observe(content.value);
  }
  void document.fonts?.ready.then(measure).catch(() => undefined);
});
onBeforeUnmount(() => ro?.disconnect());
watch([columns, () => props.rtl], () => void nextTick(measure));

const fit = (height: boolean) => (tf.value = schemaFit(extent.value, size.value, props.rtl, { height }));
watch([() => extent.value.w, () => extent.value.h, () => size.value.w, () => size.value.h, () => props.rtl], () => {
  if (!userMoved && extent.value.w > 0 && size.value.w > 0) fit(false);
});

function applyTf(fn: (p: Transform) => Transform) {
  userMoved = true;
  tf.value = fn(tf.value);
}
useWheel(view, applyTf, true);

const pointers = new Map<number, Point>();
type Gesture = { kind: "pan"; pointer: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | { kind: "pinch"; start: Transform; a: Point; b: Point };
let gesture: Gesture | null = null;
const local = (e: { clientX: number; clientY: number }): Point => {
  const r = (view.value as HTMLDivElement).getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};
function onPointerDown(e: PointerEvent) {
  if (e.button !== 0 || (e.target as Element).closest("button")) return;
  pointers.set(e.pointerId, local(e));
  try {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  } catch {
    /* synthetic pointers cannot be captured */
  }
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()] as [Point, Point];
    userMoved = true;
    gesture = { kind: "pinch", start: tf.value, a, b };
  } else {
    gesture = { kind: "pan", pointer: e.pointerId, sx: e.clientX, sy: e.clientY, ox: tf.value.x, oy: tf.value.y, moved: false };
  }
}
function onPointerMove(e: PointerEvent) {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, local(e));
  const g = gesture;
  if (!g) return;
  if (g.kind === "pinch") {
    const pts = [...pointers.values()];
    if (pts.length >= 2) tf.value = pinchTransform(g.start, { a: g.a, b: g.b }, { a: pts[0] as Point, b: pts[1] as Point });
    return;
  }
  if (g.pointer !== e.pointerId) return;
  if (!g.moved && Math.abs(e.clientX - g.sx) + Math.abs(e.clientY - g.sy) < 4) return;
  g.moved = true;
  userMoved = true;
  tf.value = { ...tf.value, x: g.ox + e.clientX - g.sx, y: g.oy + e.clientY - g.sy };
}
function onPointerUp(e: PointerEvent) {
  pointers.delete(e.pointerId);
  const g = gesture;
  if (g?.kind === "pinch" ? pointers.size < 2 : g?.pointer === e.pointerId) {
    gesture = null;
    if (g?.kind === "pan" && !g.moved && !(e.target as Element).closest("[data-node]")) emit("select", null);
  }
}
function onPointerCancel(e: PointerEvent) {
  pointers.delete(e.pointerId);
  gesture = null;
}
const refit = () => {
  userMoved = false;
  fit(true);
};

const active = computed(() => hover.value ?? props.selected);
const activeNear = computed(() => (active.value ? (props.around.get(active.value) ?? new Set<string>()) : null));
const side = computed(() => (props.rtl ? "left" : "right"));
const drawn = computed(() => {
  const out: { key: number; kind: string | undefined; hot: boolean; d: string; width: number; dash: string | undefined; colour: string | undefined; flow: boolean; arrow: string | null; label?: string; mid: Point }[] = [];
  props.links.forEach((l, i) => {
    const a = boxes.value.get(l.source);
    const b = boxes.value.get(l.target);
    if (!a || !b) return;
    const lk = props.linkKindOf(l.kind);
    const hot = active.value !== null && (l.source === active.value || l.target === active.value);
    const c = schemaConnector(a, b, side.value);
    const arrow = props.arrows || lk?.arrow === true;
    out.push({ key: i, kind: lk?.id, hot, d: c.d, width: hot ? 2 : 1.25, dash: dashFor(lk?.style), colour: hot ? undefined : lk?.hue ? hueVar(lk.hue) : undefined, flow: lk?.style === "flow", arrow: arrow ? arrowPoints(c.end, c.angle) : null, label: l.label, mid: c.mid });
  });
  return out;
});
const stroked = { paintOrder: "stroke", stroke: "var(--nq-bg)", strokeWidth: 3 };
</script>

<template>
  <div
    ref="view"
    data-slot="graph-schema"
    class="relative h-full min-h-72 touch-none select-none overflow-hidden bg-[radial-gradient(var(--nq-line)_1px,transparent_1px)] [background-size:20px_20px]"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <div ref="content" class="absolute top-0 w-max origin-top-left p-6" :style="{ left: 0, transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.k})` }">
      <svg aria-hidden="true" class="pointer-events-none absolute inset-0 z-0 size-full overflow-visible" :width="extent.w" :height="extent.h">
        <g v-for="l in drawn" :key="l.key" :data-link-kind="l.kind" :data-hot="l.hot ? 'true' : undefined" :class="cn('transition-opacity', active && !l.hot && 'opacity-15')">
          <path :d="l.d" fill="none" :stroke-width="l.width" :stroke-dasharray="l.dash" :style="l.colour ? { stroke: l.colour } : undefined" :class="l.colour ? undefined : l.hot ? 'stroke-nq-brand' : 'stroke-nq-line-strong'">
            <animate v-if="l.flow" attributeName="stroke-dashoffset" from="11" to="0" dur="0.8s" repeatCount="indefinite" />
          </path>
          <polygon v-if="l.arrow" :points="l.arrow" :style="l.colour ? { fill: l.colour } : undefined" :class="l.colour ? undefined : l.hot ? 'fill-nq-brand' : 'fill-nq-line-strong'" />
          <text v-if="l.hot && l.label" :x="l.mid.x" :y="l.mid.y - 4" text-anchor="middle" :font-size="11" class="fill-muted-foreground" :style="stroked">{{ l.label }}</text>
        </g>
      </svg>
      <div class="relative z-10 flex items-start gap-x-20">
        <section v-for="col in columns" :key="col.kind" :data-column="col.kind" :aria-label="kindOf(col.kind)?.label ?? col.kind" class="flex w-56 shrink-0 flex-col gap-2.5">
          <header class="flex items-center gap-2 rounded-control border border-border bg-card px-3 py-2">
            <span aria-hidden="true" class="flex size-6 shrink-0 items-center justify-center rounded-control text-white [&_svg]:size-3.5" :style="{ backgroundColor: hueVar(kindOf(col.kind)?.hue) }">
              <component :is="kindOf(col.kind)!.icon" v-if="kindOf(col.kind)?.icon" />
            </span>
            <h3 class="min-w-0 flex-1 truncate text-label text-foreground">{{ kindOf(col.kind)?.label ?? col.kind }}</h3>
            <NqBadge variant="outline"><bdi>{{ num(col.nodes.length) }}</bdi></NqBadge>
          </header>
          <ul class="flex flex-col gap-2.5">
            <li v-for="n in col.nodes" :key="n.id">
              <button
                type="button"
                :aria-pressed="n.id === selected"
                :data-node="n.id"
                :style="{ borderInlineStartColor: kindOf(col.kind) ? hueVar(kindOf(col.kind)!.hue) : undefined }"
                :class="cn(
                  'flex w-full flex-col gap-1 rounded-card border border-s-4 bg-card px-3 py-2 text-start shadow-xs outline-none transition-[opacity,background-color] hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
                  n.id === selected ? 'border-primary bg-nq-selected' : 'border-border',
                  active !== null && n.id !== active && !activeNear?.has(n.id) && 'opacity-40',
                )"
                @click="emit('select', n.id === selected ? null : n.id)"
                @pointerenter="hover = n.id"
                @pointerleave="hover = null"
                @focus="hover = n.id"
                @blur="hover = null"
              >
                <span class="truncate text-label text-foreground">{{ n.label }}</span>
                <span v-if="n.description" class="line-clamp-2 text-caption text-muted-foreground">{{ n.description }}</span>
                <span class="text-caption text-muted-foreground"><bdi>{{ t.connections(num(around.get(n.id)?.size ?? 0)) }}</bdi></span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
    <NqGraphZoom :t="t" @zoom="(factor: number) => applyTf((p) => zoomAbout(p, factor, { x: size.w / 2, y: size.h / 2 }, 0.3, 2))" @fit="refit" />
    <p class="pointer-events-none absolute end-3 bottom-3 hidden max-w-72 text-end text-caption text-muted-foreground md:block">{{ t.schemaHint }}</p>
  </div>
</template>
