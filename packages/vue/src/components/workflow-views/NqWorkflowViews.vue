<script setup lang="ts">
import { GitBranch, ListTree, Pencil, Workflow as WorkflowIcon } from "lucide-vue-next";
import { computed, getCurrentInstance, onMounted, ref, useId, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { formatNumber } from "../numeric";
import { NqEmptyState } from "../states";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { NqWorkflowNetwork } from "../workflow-network";
import NqWorkflowStepList from "./NqWorkflowStepList.vue";
import { countWorkflowSteps, type WorkflowTreeStep, type WorkflowView, workflowToNetwork } from "./workflow-views-logic";

export interface WorkflowViewsLabels {
  title: string;
  views: string;
  steps: string;
  pipeline: string;
  editor: string;
  count: string;
  emptyTitle: string;
  empty: string;
  kinds: Record<"step" | "decision" | "human" | "system" | "output", string>;
}

interface Props {
  /** The workflow, the one source every view draws from. */
  steps: readonly WorkflowTreeStep[];
  /** The current view (`v-model:view`). */
  view?: WorkflowView;
  /** Default `"steps"`. */
  defaultView?: WorkflowView;
  /** Remembers the view in `localStorage`, read after mount. */
  storageKey?: string;
  /** A step id to emphasise, e.g. the one running or selected. */
  highlight?: string;
  /** `null` hides the heading. */
  title?: string | null;
  headingAs?: string;
  labels?: Partial<WorkflowViewsLabels>;
  class?: HTMLAttributes["class"];
}

/**
 * One workflow, three ways: a readable outline of its steps, a pipeline diagram, and (with the `editor` slot) your
 * editor for the same steps. A switch in the header moves between them and can remember the choice. Listen to
 * `@step-click` to make steps clickable in both read views. The `actions` slot adds controls after the switch.
 */
const props = withDefaults(defineProps<Props>(), { view: undefined, defaultView: "steps", storageKey: undefined, highlight: undefined, title: undefined, headingAs: "h3", labels: undefined });
const emit = defineEmits<{ "update:view": [view: WorkflowView]; "step-click": [step: WorkflowTreeStep] }>();
const slots = defineSlots<{ editor?: () => unknown; actions?: () => unknown }>();

const STRINGS: { en: WorkflowViewsLabels; ar: WorkflowViewsLabels } = {
  en: {
    title: "Workflow",
    views: "View",
    steps: "Steps",
    pipeline: "Pipeline",
    editor: "Editor",
    count: "{n} steps",
    emptyTitle: "No steps yet",
    empty: "Add a step to start this workflow.",
    kinds: { step: "Step", decision: "Decision", human: "Person", system: "System", output: "Result" },
  },
  ar: {
    title: "سير العمل",
    views: "العرض",
    steps: "الخطوات",
    pipeline: "المسار",
    editor: "المحرّر",
    count: "{n} خطوات",
    emptyTitle: "لا خطوات بعد",
    empty: "أضف خطوة لبدء سير العمل هذا.",
    kinds: { step: "خطوة", decision: "قرار", human: "شخص", system: "نظام", output: "نتيجة" },
  },
};

const nasaq = useNasaq();
const base = computed(() => STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"]);
const t = computed<WorkflowViewsLabels>(() => ({ ...base.value, ...props.labels, kinds: { ...base.value.kinds, ...props.labels?.kinds } }));
const id = useId();
const clickable = Boolean(getCurrentInstance()?.vnode.props?.onStepClick);

const own = ref<WorkflowView>(props.defaultView);
const views = computed<WorkflowView[]>(() => (slots.editor ? ["steps", "pipeline", "editor"] : ["steps", "pipeline"]));
const current = computed<WorkflowView>(() => {
  const raw = props.view ?? own.value;
  return views.value.includes(raw) ? raw : "steps";
});

onMounted(() => {
  if (!props.storageKey || props.view) return;
  try {
    const saved = localStorage.getItem(props.storageKey);
    if (saved === "steps" || saved === "pipeline" || saved === "editor") own.value = saved;
  } catch {
    // Storage can be blocked; the default view is fine.
  }
});

function pick(next: string[]) {
  const v = next[0] as WorkflowView | undefined;
  if (!v) return;
  own.value = v;
  if (props.storageKey) {
    try {
      localStorage.setItem(props.storageKey, v);
    } catch {
      // Ignore: the choice just is not remembered.
    }
  }
  emit("update:view", v);
}

const ICONS: Record<WorkflowView, Component> = { steps: ListTree, pipeline: GitBranch, editor: Pencil };
const network = computed(() => (current.value === "pipeline" ? workflowToNetwork(props.steps) : null));
const heading = computed(() => (props.title === undefined ? t.value.title : props.title));
const total = computed(() => countWorkflowSteps(props.steps));
const byId = computed(() => {
  const map = new Map<string, WorkflowTreeStep>();
  const visit = (list: readonly WorkflowTreeStep[]) =>
    list.forEach((s) => {
      map.set(s.id, s);
      if (s.children) visit(s.children);
      s.branches?.forEach((b) => visit(b.steps));
    });
  visit(props.steps);
  return map;
});
function netClick(s: { id: string }) {
  const step = byId.value.get(s.id);
  if (step) emit("step-click", step);
}
</script>

<template>
  <section
    data-slot="workflow-views"
    :data-view="current"
    :aria-labelledby="heading ? `${id}-title` : undefined"
    :class="cn('flex flex-col rounded-card border border-border bg-card', props.class)"
  >
    <header class="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
      <div v-if="heading" class="flex min-w-0 flex-1 items-center gap-2">
        <component :is="props.headingAs" :id="`${id}-title`" class="text-h4 text-foreground">{{ heading }}</component>
        <NqBadge v-if="total" variant="neutral">{{ t.count.replace("{n}", formatNumber(total, nasaq.locale.value)) }}</NqBadge>
      </div>
      <span v-else class="flex-1" />
      <NqToggleGroup :aria-label="t.views" :model-value="[current]" @update:model-value="pick">
        <NqToggle v-for="v in views" :key="v" :value="v" :aria-controls="`${id}-panel`" :data-view="v">
          <component :is="ICONS[v]" aria-hidden="true" />
          {{ t[v] }}
        </NqToggle>
      </NqToggleGroup>
      <slot name="actions" />
    </header>

    <div :id="`${id}-panel`" data-slot="workflow-views-panel" class="min-w-0 p-4">
      <slot v-if="current === 'editor'" name="editor" />
      <NqEmptyState v-else-if="!props.steps.length" :icon="WorkflowIcon" :title="t.emptyTitle" :description="t.empty" />
      <NqWorkflowNetwork v-else-if="current === 'pipeline' && network" :steps="network.steps" :links="network.links" :highlight="props.highlight" v-bind="clickable ? { onStepClick: netClick } : {}" />
      <NqWorkflowStepList v-else :steps="props.steps" prefix="" :kinds="t.kinds" :clickable="clickable" :highlight="props.highlight" @step-click="emit('step-click', $event)" />
    </div>
  </section>
</template>
