<script setup lang="ts">
import { CircleAlert, Plus, TriangleAlert } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import NqWorkflowStatusGlyph from "./NqWorkflowStatusGlyph.vue";
import type { WorkflowCanvasLabels } from "./labels";
import {
  firstFilled,
  nodeHeight,
  NODE_WIDTH,
  STATUS_BORDER,
  type WorkflowDirection,
  type WorkflowIssue,
  type WorkflowNodeData,
  type WorkflowNodeRun,
  type WorkflowStepType,
} from "./workflow-model";

// One step on the canvas: icon, title, a hint of its config, its status (icon + text) and its connection handles.
// Positioned by the canvas; drag and connect start here and are handled there.
const props = defineProps<{
  node: WorkflowNodeData;
  type?: WorkflowStepType;
  issues: WorkflowIssue[];
  run?: WorkflowNodeRun;
  /** Output ids that already lead somewhere. */
  usedHandles: string[];
  selected: boolean;
  editable: boolean;
  direction: WorkflowDirection;
  rtl: boolean;
  t: WorkflowCanvasLabels;
  formatDuration: (ms: number) => string;
  formatNumber: (n: number) => string;
}>();
const emit = defineEmits<{ select: []; add: [handle: string | null]; "connect-start": [handle: string | null, e: PointerEvent]; "drag-start": [e: PointerEvent] }>();

const horizontal = computed(() => props.direction === "horizontal");
const trigger = computed(() => props.type?.role === "trigger");
const outputs = computed(() => (props.type?.outputs?.length ? props.type.outputs : [{ id: "", label: "" }]));
const branching = computed(() => outputs.value.length > 1);
const status = computed(() => props.run?.status ?? "idle");
const title = computed(() => props.node.label?.trim() || props.type?.label || props.t.unknownType);
const subtitle = computed(() => firstFilled(props.node, props.type) ?? (props.node.label ? props.type?.label : props.type?.description) ?? "");
const errors = computed(() => props.issues.filter((i) => i.level === "error"));
const detail = computed(() =>
  props.run
    ? [props.run.durationMs !== undefined ? props.formatDuration(props.run.durationMs) : null, props.run.items !== undefined ? `${props.formatNumber(props.run.items)} ${props.t.items.toLowerCase()}` : null].filter(Boolean).join(" · ")
    : "",
);
const issueLabel = computed(() => {
  const first = errors.value[0] ?? props.issues[0];
  return first ? props.t.issue[first.code](title.value, String(first.field ?? "")) : "";
});
const frac = (i: number) => ((i + 1) / (outputs.value.length + 1)) * 100;
const pos = (i: number) => (horizontal.value ? { top: `${frac(i)}%` } : { left: `${frac(i)}%` });
const HANDLE = "absolute size-2.5 rounded-full border border-nq-line-strong bg-card";

function onKey(e: KeyboardEvent) {
  if (e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    emit("select");
  }
}
</script>

<template>
  <div
    :dir="props.rtl ? 'rtl' : 'ltr'"
    data-slot="workflow-node"
    :data-node-id="props.node.id"
    :data-status="status"
    :data-selected="props.selected || undefined"
    :data-type="props.node.type"
    role="group"
    tabindex="0"
    :aria-label="title"
    :style="{ width: `${NODE_WIDTH}px`, height: `${nodeHeight(outputs.length)}px` }"
    :class="
      cn(
        'relative flex touch-none items-center gap-3 rounded-card border bg-card px-3 py-2.5 text-start text-foreground shadow-xs transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        STATUS_BORDER[status],
        trigger && 'rounded-s-[28px]',
        props.selected && 'outline-2 outline-offset-2 outline-nq-focus',
        status === 'running' && 'shadow-[0_0_0_3px_color-mix(in_oklab,var(--nq-info)_18%,transparent)]',
        errors.length > 0 && status === 'idle' && 'border-nq-danger/60',
        props.editable ? 'cursor-grab' : 'cursor-pointer',
      )
    "
    @click="emit('select')"
    @keydown="onKey"
    @pointerdown="emit('drag-start', $event)"
  >
    <span
      v-if="!trigger"
      aria-hidden="true"
      data-handle="target"
      :class="cn(HANDLE, horizontal ? 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2' : 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2')"
    />
    <span class="flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-foreground [&_svg]:size-4">
      <component :is="props.type?.icon ?? CircleAlert" aria-hidden="true" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-label" :title="title">{{ title }}</span>
      <span class="block truncate text-caption text-muted-foreground" :title="subtitle">{{ subtitle }}</span>
      <span v-if="detail" class="block truncate text-caption text-muted-foreground"><bdi>{{ detail }}</bdi></span>
    </span>
    <NqWorkflowStatusGlyph v-if="props.run" :status="status" :label="props.t.status[status]" />
    <span v-else-if="props.issues.length > 0" role="img" :aria-label="issueLabel">
      <CircleAlert v-if="errors.length" class="size-4 text-nq-danger-text" aria-hidden="true" />
      <TriangleAlert v-else class="size-4 text-nq-warning-text" aria-hidden="true" />
    </span>
    <template v-for="(o, i) in outputs" :key="o.id || 'out'">
      <span
        aria-hidden="true"
        data-handle="source"
        :data-handle-id="o.id"
        :class="cn(HANDLE, 'touch-none', props.editable && 'cursor-crosshair')"
        :style="{ ...pos(i), ...(horizontal ? { left: '100%', transform: 'translate(-50%, -50%)' } : { top: '100%', transform: 'translate(-50%, -50%)' }) }"
        @pointerdown.stop="props.editable && emit('connect-start', o.id || null, $event)"
      />
      <span
        v-if="branching"
        aria-hidden="true"
        :style="horizontal ? { top: `${frac(i)}%` } : { left: `${frac(i)}%` }"
        :class="cn('pointer-events-none absolute -translate-y-1/2 rounded-sm bg-secondary px-1 text-caption text-muted-foreground', horizontal ? 'right-3' : 'bottom-1 -translate-x-1/2 translate-y-0')"
      >
        {{ o.label }}
      </span>
      <button
        v-if="props.editable && !props.usedHandles.includes(o.id)"
        type="button"
        data-slot="workflow-node-add"
        :aria-label="props.t.addAfter(title)"
        :title="props.t.addAfter(title)"
        :style="horizontal ? { ...pos(i), left: 'calc(100% + 14px)' } : { ...pos(i), top: 'calc(100% + 14px)' }"
        :class="
          cn(
            'absolute flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus',
            horizontal ? '-translate-y-1/2' : '-translate-x-1/2',
          )
        "
        @pointerdown.stop
        @click.stop="emit('add', o.id || null)"
      >
        <Plus class="size-3.5" aria-hidden="true" />
      </button>
    </template>
  </div>
</template>
