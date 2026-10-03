<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useSlots, watch } from "vue";
import { adjacency, boundsOf, fitTransform, forceLayout, nodeRadius, pinchTransform, toGraphPoint, zoomAbout, type Point, type Transform } from "./graph-layout";
import { useSize, useWheel } from "./graph-gestures";
import { arrowPoints, dashFor, linkEnds, shapeExtent, shapePath, type GraphNodeShape } from "./graph-shapes";
import { createSimulation, type SimInput } from "./graph-sim";
import NqGraphZoom from "./NqGraphZoom.vue";
import { cn } from "../../lib/cn";
import { fitText, hueVar, type GraphLabelPosition, type GraphViewKind, type GraphViewLabels, type GraphViewLink, type GraphViewLinkKind, type GraphViewNode } from "./types";

// The live graph: a force simulation (one tick per frame, paused offscreen and when the tab is hidden, stopped once
// settled), drag a node to pin it, double-click to release, drag the background to pan, wheel or pinch to zoom.
interface Props {
  nodes: GraphViewNode[];
  links: GraphViewLink[];
  /** Adjacency over every link, not only the visible ones. */
  around: Map<string, Set<string>>;
  kindOf: (id: string) => GraphViewKind | undefined;
  linkKindOf: (id: string | undefined) => GraphViewLinkKind | undefined;
  selected: string | null;
  t: GraphViewLabels;
  animate: boolean;
  labelPosition: GraphLabelPosition;
  arrows: boolean;
}
const props = defineProps<Props>();
const emit = defineEmits<{ select: [id: string | null]; pinned: [ids: string[]] }>();
const slots = useSlots();

interface Look {
  shape: GraphNodeShape;
  r: number;
  label: GraphLabelPosition;
  icon: GraphViewNode["icon"];
}

const box = ref<HTMLDivElement | null>(null);
const size = useSize(box);
const tf = ref<Transform>({ x: 0, y: 0, k: 1 });
let userMoved = false;
const hover = ref<string | null>(null);
const frame = shallowRef(0);
const bump = () => frame.value++;
const reduced = ref(typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)").matches : false);
const live = computed(() => props.animate && !reduced.value);

const looks = computed(() => {
  const map = new Map<string, Look>();
  for (const n of props.nodes) {
    const kind = props.kindOf(n.kind);
    map.set(n.id, { shape: n.shape ?? kind?.shape ?? "circle", r: nodeRadius(props.around.get(n.id)?.size ?? 0, n.weight), label: n.labelPosition ?? kind?.labelPosition ?? props.labelPosition, icon: n.icon ?? kind?.icon });
  }
  return map;
});
const inputs = computed<SimInput[]>(() =>
  props.nodes.map((n) => {
    const look = looks.value.get(n.id) as Look;
    const e = shapeExtent(look.shape, look.r);
    return { id: n.id, r: Math.max(e.hw, e.hh) };
  }),
);
// The deterministic layout: what reduced motion (and the server) show.
const still = computed(() => forceLayout(props.nodes.map((n) => ({ id: n.id })), props.links, { iterations: props.nodes.length > 250 ? 120 : 260 }));
const sim = createSimulation(inputs.value, props.links);

const pos = computed(() => {
  void frame.value;
  if (live.value) return sim.positions();
  const map = new Map(still.value);
  for (const p of sim.nodes) if (p.fx !== null && p.fy !== null) map.set(p.id, { x: p.fx, y: p.fy });
  return map;
});
const at = (id: string): Point => pos.value.get(id) ?? { x: 0, y: 0 };

/* the loop */
let raf = 0;
const gate = { visible: true, onscreen: true };
const mayRun = () => live.value && gate.visible && gate.onscreen;
function kick() {
  if (raf || !mayRun() || typeof requestAnimationFrame === "undefined") return;
  raf = requestAnimationFrame(loop);
}
function loop() {
  raf = 0;
  if (!mayRun()) return;
  const moving = sim.tick();
  const s = size.value;
  if (!userMoved && s.w > 0) {
    const b = boundsOf(sim.positions().values(), 48);
    if (b) {
      const target = fitTransform(b, s.w, s.h);
      const p = tf.value;
      tf.value = moving ? { x: p.x + (target.x - p.x) * 0.12, y: p.y + (target.y - p.y) * 0.12, k: p.k + (target.k - p.k) * 0.12 } : target;
    }
  }
  bump();
  if (moving) kick();
}
const stopLoop = () => {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
};
const sync = () => (gate.visible && gate.onscreen ? kick() : stopLoop());
const onVisibility = () => {
  gate.visible = document.visibilityState !== "hidden";
  sync();
};
let io: IntersectionObserver | undefined;
let mq: MediaQueryList | undefined;
const onMotion = () => (reduced.value = !!mq?.matches);
onMounted(() => {
  gate.visible = document.visibilityState !== "hidden";
  document.addEventListener("visibilitychange", onVisibility);
  if (typeof IntersectionObserver !== "undefined" && box.value) {
    io = new IntersectionObserver((entries) => {
      gate.onscreen = entries[entries.length - 1]?.isIntersecting ?? true;
      sync();
    });
    io.observe(box.value);
  }
  if (typeof matchMedia === "function") {
    mq = matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", onMotion);
  }
  if (live.value) kick();
  else sim.cool();
});
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibility);
  io?.disconnect();
  mq?.removeEventListener("change", onMotion);
  stopLoop();
});
watch(live, (on) => {
  if (on) kick();
  else {
    stopLoop();
    sim.cool();
  }
  bump();
});

// New data (a filter, an edit): keep what stays, reheat, and start the loop again.
watch([inputs, () => props.links], () => {
  sim.update(inputs.value, props.links);
  if (live.value) kick();
  else sim.cool();
  bump();
});

function fitNow() {
  const s = size.value;
  const b = boundsOf(pos.value.values(), 48);
  if (b && s.w > 0) tf.value = fitTransform(b, s.w, s.h);
}
watch([() => size.value.w, () => size.value.h, still, live], () => {
  if (!userMoved) fitNow();
});
function applyTf(fn: (p: Transform) => Transform) {
  userMoved = true;
  tf.value = fn(tf.value);
}
useWheel(box, applyTf, false);

/* pointer gestures: drag a node, pan the background, pinch with two fingers */
const pointers = new Map<number, Point>();
type Gesture =
  | { kind: "node"; id: string; pointer: number; sx: number; sy: number; moved: boolean }
  | { kind: "pan"; pointer: number; sx: number; sy: number; ox: number; oy: number; moved: boolean }
  | { kind: "pinch"; start: Transform; a: Point; b: Point };
let gesture: Gesture | null = null;
let handled = 0;
let lastTap: { id: string; at: number } | null = null;
const local = (e: { clientX: number; clientY: number }): Point => {
  const r = (box.value as HTMLDivElement).getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};
const pinnedIds = () => sim.nodes.filter((n) => n.fx !== null).map((n) => n.id);
function unpin(id: string) {
  if (!sim.isPinned(id)) return;
  sim.unpin(id);
  if (live.value) {
    sim.reheat(0.3);
    kick();
  }
  bump();
  emit("pinned", pinnedIds());
}
const toggle = (id: string) => emit("select", id === props.selected ? null : id);

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
    return;
  }
  const id = (e.target as Element).closest("[data-node]")?.getAttribute("data-node");
  gesture = id
    ? { kind: "node", id, pointer: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false }
    : { kind: "pan", pointer: e.pointerId, sx: e.clientX, sy: e.clientY, ox: tf.value.x, oy: tf.value.y, moved: false };
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
  if (g.kind === "pan") {
    userMoved = true;
    tf.value = { ...tf.value, x: g.ox + e.clientX - g.sx, y: g.oy + e.clientY - g.sy };
    return;
  }
  const p = toGraphPoint(local(e), tf.value);
  sim.pin(g.id, p.x, p.y, live.value);
  if (live.value) {
    sim.reheat(0.35);
    kick();
  }
  bump();
}
function finish(e: PointerEvent, cancelled: boolean) {
  pointers.delete(e.pointerId);
  const g = gesture;
  if (g?.kind === "pinch") {
    if (pointers.size < 2) gesture = null;
    return;
  }
  if (!g || g.pointer !== e.pointerId) return;
  gesture = null;
  try {
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
  } catch {
    /* not captured */
  }
  if (g.kind === "node") {
    if (g.moved) {
      sim.drop();
      if (live.value) kick();
      handled = Date.now();
      emit("pinned", pinnedIds());
      bump();
    } else if (!cancelled) {
      handled = Date.now();
      const prev = lastTap;
      if (prev && prev.id === g.id && Date.now() - prev.at < 400) {
        lastTap = null;
        unpin(g.id);
      } else {
        lastTap = { id: g.id, at: Date.now() };
        toggle(g.id);
      }
    }
  } else if (!g.moved && !cancelled) {
    emit("select", null);
  }
}
function nudge(id: string, dx: number, dy: number) {
  const p = at(id);
  sim.pin(id, p.x + dx, p.y + dy);
  if (live.value) {
    sim.reheat(0.3);
    kick();
  }
  bump();
  emit("pinned", pinnedIds());
}
function onNodeKey(e: KeyboardEvent, id: string) {
  const step = e.shiftKey ? 48 : 12;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggle(id);
  } else if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    nudge(id, e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0, e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0);
  } else if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    unpin(id);
  }
}

const focus = computed(() => hover.value ?? props.selected);
const near = computed(() => (focus.value ? (props.around.get(focus.value) ?? new Set<string>()) : null));

// Everything the template draws for a link or a node, worked out once per frame.
const drawnLinks = computed(() => {
  const out: { key: number; kind: string | undefined; hot: boolean; dim: boolean; x1: number; y1: number; x2: number; y2: number; width: number; dash: string | undefined; colour: string | undefined; flow: boolean; arrow: string | null; label?: string; mx: number; my: number }[] = [];
  props.links.forEach((l, i) => {
    const la = looks.value.get(l.source);
    const lb = looks.value.get(l.target);
    if (!la || !lb) return;
    const a = at(l.source);
    const b = at(l.target);
    const lk = props.linkKindOf(l.kind);
    const hot = focus.value !== null && (l.source === focus.value || l.target === focus.value);
    const ends = linkEnds(a, la.shape, la.r, b, lb.shape, lb.r);
    const arrow = props.arrows || lk?.arrow === true;
    const lineEnd = arrow ? { x: ends.b.x - Math.cos(ends.angle) * 6, y: ends.b.y - Math.sin(ends.angle) * 6 } : ends.b;
    out.push({
      key: i, kind: lk?.id, hot, dim: focus.value !== null && !hot, x1: ends.a.x, y1: ends.a.y, x2: lineEnd.x, y2: lineEnd.y, width: hot ? 2 : 1.25, dash: dashFor(lk?.style),
      colour: hot ? undefined : lk?.hue ? hueVar(lk.hue) : undefined, flow: lk?.style === "flow" && live.value, arrow: arrow ? arrowPoints(ends.b, ends.angle) : null, label: l.label, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2,
    });
  });
  return out;
});
const drawnNodes = computed(() =>
  props.nodes.map((n) => {
    const p = at(n.id);
    const kind = props.kindOf(n.kind);
    const look = looks.value.get(n.id) as Look;
    const ext = shapeExtent(look.shape, look.r);
    const dim = focus.value !== null && n.id !== focus.value && !near.value?.has(n.id);
    const on = n.id === props.selected;
    const pin = (void frame.value, sim.isPinned(n.id));
    return {
      node: n, kind, look, ext, dim, on, pin, p,
      showLabel: look.label !== "none" && (tf.value.k >= 0.55 || !dim || on),
      fill: hueVar(kind?.hue),
      name: kind ? `${n.label}, ${kind.label}` : n.label,
    };
  }),
);

const stroked = { paintOrder: "stroke", stroke: "var(--nq-bg)", strokeWidth: 3 };
const lineClass = (hot: boolean, coloured: boolean, stroke: boolean) => (coloured ? undefined : hot ? (stroke ? "stroke-nq-brand" : "fill-nq-brand") : stroke ? "stroke-nq-line-strong" : "fill-nq-line-strong");

const refit = () => {
  userMoved = false;
  fitNow();
};
const onNodeClick = (id: string) => {
  // Assistive tech and keyboards click without a pointer; real clicks are handled on pointer up.
  if (Date.now() - handled > 400) toggle(id);
};

defineExpose({ fitNow });
</script>

<template>
  <div
    ref="box"
    data-slot="graph-canvas"
    :data-live="live ? 'true' : 'false'"
    :data-settled="sim.settled ? 'true' : 'false'"
    dir="ltr"
    class="relative h-full min-h-72 touch-none select-none overflow-hidden bg-[radial-gradient(var(--nq-line)_1px,transparent_1px)] [background-size:20px_20px]"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="finish($event, false)"
    @pointercancel="finish($event, true)"
  >
    <svg :width="size.w" :height="size.h" role="group" :aria-label="t.graph" class="block">
      <g :transform="`translate(${tf.x} ${tf.y}) scale(${tf.k})`">
        <g v-for="l in drawnLinks" :key="l.key" :data-link-kind="l.kind" :class="cn('transition-opacity', l.dim && 'opacity-20')">
          <line :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2" :stroke-width="l.width" :stroke-dasharray="l.dash" :style="l.colour ? { stroke: l.colour } : undefined" :class="lineClass(l.hot, !!l.colour, true)">
            <animate v-if="l.flow" attributeName="stroke-dashoffset" from="11" to="0" dur="0.8s" repeatCount="indefinite" />
          </line>
          <polygon v-if="l.arrow" :points="l.arrow" :style="l.colour ? { fill: l.colour } : undefined" :class="lineClass(l.hot, !!l.colour, false)" />
          <text v-if="l.hot && l.label" :x="l.mx" :y="l.my" text-anchor="middle" :font-size="10" class="fill-muted-foreground" :style="stroked">{{ l.label }}</text>
        </g>
        <g
          v-for="d in drawnNodes"
          :key="d.node.id"
          :transform="`translate(${d.p.x} ${d.p.y})`"
          role="button"
          tabindex="0"
          :aria-label="d.pin ? `${d.name}, ${t.pinned}` : d.name"
          :aria-pressed="d.on"
          :data-node="d.node.id"
          :data-pinned="d.pin ? 'true' : undefined"
          :data-shape="d.look.shape"
          :class="cn('cursor-grab outline-none transition-opacity active:cursor-grabbing', d.dim && 'opacity-25')"
          @click="onNodeClick(d.node.id)"
          @dblclick="unpin(d.node.id)"
          @keydown="onNodeKey($event, d.node.id)"
          @pointerenter="hover = d.node.id"
          @pointerleave="hover = null"
          @focus="hover = d.node.id"
          @blur="hover = null"
        >
          <slot v-if="slots.node" name="node" :node="d.node" :kind="d.kind" :shape="d.look.shape" :radius="d.look.r" :selected="d.on" :highlighted="focus !== null && !d.dim" :dimmed="d.dim" :pinned="d.pin" />
          <template v-else>
            <path v-if="d.on" :d="shapePath(d.look.shape, d.look.r + 5)" fill="none" :stroke-width="2" class="stroke-nq-focus" />
            <path :d="shapePath(d.look.shape, d.look.r)" :stroke-width="2" class="stroke-background" :style="{ fill: d.fill }" />
            <component :is="d.look.icon" v-if="d.look.icon && d.look.r >= 9" aria-hidden="true" :x="-d.look.r * 0.55" :y="-d.look.r * 0.55" :width="d.look.r * 1.1" :height="d.look.r * 1.1" :stroke-width="2.2" class="pointer-events-none text-white" />
            <circle v-if="d.pin" :cx="d.ext.hw * 0.75" :cy="-d.ext.hh * 0.75" :r="3.5" :stroke-width="1.5" class="fill-nq-brand stroke-background" />
            <text v-if="d.showLabel && d.look.label === 'bottom'" :y="d.ext.hh + 13" text-anchor="middle" :font-size="11" class="pointer-events-none fill-foreground" :style="stroked">{{ d.node.label }}</text>
            <text v-if="d.showLabel && d.look.label === 'right'" :x="d.ext.hw + 6" :y="4" text-anchor="start" :font-size="11" class="pointer-events-none fill-foreground" :style="stroked">{{ d.node.label }}</text>
            <text v-if="d.look.label === 'inside'" :y="4" text-anchor="middle" :font-size="10" class="pointer-events-none fill-white">{{ fitText(d.node.label, Math.floor((d.ext.hw * 2 - 8) / 5.6)) }}</text>
          </template>
        </g>
      </g>
    </svg>
    <NqGraphZoom
      :t="t"
      @zoom="(factor: number) => applyTf((p) => zoomAbout(p, factor, { x: size.w / 2, y: size.h / 2 }))"
      @fit="refit"
    />
    <p class="pointer-events-none absolute end-3 bottom-3 hidden max-w-72 text-end text-caption text-muted-foreground md:block">{{ t.graphHint }}</p>
  </div>
</template>
