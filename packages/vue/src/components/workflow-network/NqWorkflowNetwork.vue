<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { type Box, type Connector, connector, networkLinks, rowsFor, sideConnector } from "./network-geometry";
import NqWorkflowNetworkStep from "./NqWorkflowNetworkStep.vue";
import type { WorkflowNetworkLabels, WorkflowNetworkLink, WorkflowNetworkStep as Step } from "./types";

interface Props {
  steps: Step[];
  /** Connectors. Without any, the steps run in order. Ids that match no step are ignored. */
  links?: WorkflowNetworkLink[];
  /**
   * `horizontal`: rows that wrap and balance, following the reading direction (right to left in Arabic).
   * `vertical`: one column. `auto` (default): vertical when the container is narrow.
   */
  layout?: "horizontal" | "vertical" | "auto";
  /** Step id to emphasise: its card gets a ring and its connectors the brand colour. */
  highlight?: string;
  /** Draw the connectors in when the diagram first appears. Skipped with reduced motion. */
  animate?: boolean;
  /** Optional heading and caption around the diagram. */
  title?: string;
  caption?: string;
  labels?: Partial<WorkflowNetworkLabels>;
  class?: HTMLAttributes["class"];
}

/**
 * A workflow drawn as cards joined by connectors, for explaining a process: who does what, where a decision
 * branches, where it ends. Read-only and responsive: rows wrap and balance, and on a narrow container it
 * becomes one column. Rows follow the reading direction, so an Arabic flow runs right to left. Connectors are
 * measured from the rendered cards, so they always meet them. Listen to `@step-click` to make the cards buttons.
 */
const props = withDefaults(defineProps<Props>(), { links: undefined, layout: "auto", highlight: undefined, animate: false, title: undefined, caption: undefined, labels: undefined });
const emit = defineEmits<{ "step-click": [step: Step] }>();

interface Drawn extends Connector {
  label?: string;
  hot: boolean;
}

const STRINGS: { en: WorkflowNetworkLabels; ar: WorkflowNetworkLabels } = {
  en: {
    kind: { step: "Step", decision: "Decision", human: "Human review", system: "Automated", output: "Result" },
    network: "Workflow",
    stepCount: (n) => `${n} steps`,
  },
  ar: {
    kind: { step: "خطوة", decision: "قرار", human: "مراجعة بشرية", system: "آلية", output: "النتيجة" },
    network: "سير العمل",
    stepCount: (n) => `${n} خطوات`,
  },
};

const nasaq = useNasaq();
const ar = computed(() => nasaq.locale.value.startsWith("ar"));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }) as WorkflowNetworkLabels);
const clickable = Boolean(getCurrentInstance()?.vnode.props?.onStepClick);

const flow = ref<HTMLDivElement>();
const width = ref(0);
const em = ref(16);
const paths = ref<Drawn[]>([]);
const size = ref({ w: 0, h: 0 });
const uid = useId().replace(/[^\w-]/g, "");

const n = computed(() => props.steps.length);
const indexed = computed(() =>
  networkLinks(
    props.steps.map((s) => s.id),
    props.links,
  ),
);
const jumps = computed(() => indexed.value.some((e) => Math.abs(e.to - e.from) > 1));
const vertical = computed(() => props.layout === "vertical" || (props.layout !== "horizontal" && width.value > 0 && width.value < em.value * 30));
const perRow = computed(() => Math.max(2, Math.min(6, Math.floor((width.value + em.value * 2.6) / (em.value * 11.5)) || 4)));
const rows = computed(() => {
  if (vertical.value) return props.steps.map(() => 1);
  return rowsFor(n.value, props.layout === "horizontal" ? Math.max(perRow.value, Math.min(n.value, 4)) : perRow.value);
});
const arcs = computed(() => !vertical.value && jumps.value);
const grouped = computed(() => {
  let start = 0;
  return rows.value.map((count) => {
    const row = props.steps.slice(start, start + count);
    start += count;
    return row;
  });
});

function measureWidth() {
  const el = flow.value;
  if (!el) return;
  width.value = el.clientWidth;
  em.value = Number.parseFloat(getComputedStyle(el).fontSize) || 16;
}

function measurePaths() {
  const el = flow.value;
  if (!el || width.value === 0) return;
  const origin = el.getBoundingClientRect();
  const scale = el.offsetWidth ? origin.width / el.offsetWidth : 1;
  const boxes: Box[] = Array.from(el.querySelectorAll<HTMLElement>("[data-step]")).map((c) => {
    const r = c.getBoundingClientRect();
    return { x: (r.left - origin.left) / scale, y: (r.top - origin.top) / scale, w: r.width / scale, h: r.height / scale };
  });
  if (boxes.length !== n.value) return;
  size.value = { w: el.offsetWidth, h: el.offsetHeight };
  const next: Drawn[] = [];
  for (const e of indexed.value) {
    const a = boxes[e.from];
    const b = boxes[e.to];
    if (!a || !b) continue;
    const skip = Math.abs(e.to - e.from) > 1;
    const c = vertical.value && skip ? sideConnector(a, b, ar.value ? "left" : "right") : connector(a, b);
    const hot = Boolean(props.highlight) && (props.steps[e.from]?.id === props.highlight || props.steps[e.to]?.id === props.highlight);
    next.push({ ...c, ...(e.label ? { label: e.label } : {}), hot });
  }
  paths.value = next;
}

let ro: ResizeObserver | undefined;
onMounted(() => {
  measureWidth();
  if (typeof ResizeObserver !== "undefined" && flow.value) {
    ro = new ResizeObserver(measureWidth);
    ro.observe(flow.value);
  }
});
onBeforeUnmount(() => ro?.disconnect());

// Geometry depends on layout inputs only; measure after the cards are in the DOM.
watch([width, vertical, perRow, n, ar, arcs, () => JSON.stringify(indexed.value), () => props.highlight], () => nextTick(measurePaths), { flush: "post", immediate: true });
</script>

<template>
  <figure data-slot="workflow-network" :data-layout="vertical ? 'vertical' : 'horizontal'" :class="cn('m-0 w-full', props.class)">
    <h3 v-if="title" class="mb-2 text-h3 text-foreground">{{ title }}</h3>
    <p class="sr-only">{{ t.stepCount(String(n)) }}</p>
    <div ref="flow" :class="cn('relative', arcs && 'pt-12', vertical && jumps && 'px-12')">
      <svg aria-hidden="true" class="pointer-events-none absolute inset-0 overflow-visible text-muted-foreground" :width="size.w" :height="size.h" :viewBox="`0 0 ${size.w || 1} ${size.h || 1}`">
        <defs>
          <marker :id="`nq-net-${uid}`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" class="fill-muted-foreground" />
          </marker>
          <marker :id="`nq-net-${uid}-hot`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" class="fill-nq-brand" />
          </marker>
        </defs>
        <path
          v-for="(p, i) in paths"
          :key="i"
          :d="p.d"
          pathLength="1"
          :data-edge="i"
          fill="none"
          :stroke-width="p.hot ? 2 : 1.5"
          stroke-linecap="round"
          :class="cn(p.hot ? 'stroke-nq-brand' : 'stroke-current', animate && 'nq-net-draw')"
          :style="animate ? { animationDelay: `${i * 90}ms` } : undefined"
          :marker-end="`url(#nq-net-${uid}${p.hot ? '-hot' : ''})`"
        />
      </svg>
      <div :class="cn('relative flex flex-col p-2', vertical ? 'gap-9' : 'gap-10')">
        <div v-for="(row, r) in grouped" :key="r" :class="cn('flex items-stretch justify-center', vertical ? 'mx-auto w-full max-w-[26rem]' : 'gap-10')">
          <div v-for="s in row" :key="s.id" :class="cn('flex min-w-0', vertical ? 'w-full' : 'max-w-64 flex-1 basis-0')">
            <NqWorkflowNetworkStep :step="s" :hot="s.id === highlight" :kind-label="t.kind[s.kind ?? 'step']" :clickable="clickable" @click="emit('step-click', s)" />
          </div>
        </div>
      </div>
      <template v-for="(p, i) in paths" :key="`l${i}`">
        <span
          v-if="p.label"
          class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border bg-background px-2 text-caption text-muted-foreground"
          :style="{ left: `${p.mid.x}px`, top: `${p.mid.y}px` }"
        >
          {{ p.label }}
        </span>
      </template>
    </div>
    <figcaption v-if="caption" class="mt-3 text-body-sm text-muted-foreground">{{ caption }}</figcaption>
  </figure>
</template>
