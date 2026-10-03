<script setup lang="ts">
import { FlaskConical, ListTree } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCodeBlock } from "../code-block";
import { NqRepeater } from "../repeater";
import { NqEmptyState } from "../states";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqWorkflowStatusGlyph, type WorkflowStepType } from "../workflow-canvas";
import type { WorkflowCanvasLabels } from "../workflow-canvas/labels";
import NqStepList from "./NqStepList.vue";
import NqStepParamRow from "./NqStepParamRow.vue";
import type { StepContext } from "./step-context";
import { countSteps, flattenSteps, maskSecrets, stepUid, validateSteps, type StepIssue, type StepNode, type StepParam, type StepTestResult } from "./step-model";
import { STEP_STRINGS, type StepEditorLabels } from "./step-strings";

/**
 * Edits a workflow as a plain list: steps you can reorder, duplicate and nest, each with a form generated from its
 * step type, a continue-on-failure switch, parameters you reference as {{name}} (secrets masked), problems listed
 * before you can run, and a test run that shows each step's result. It has no backend: you keep the steps and
 * parameters (v-model:steps, v-model:params), and `onTestRun` does the running.
 */
const props = withDefaults(
  defineProps<{
    /** The step types on offer, including triggers when a trigger is a step. */
    types: WorkflowStepType[];
    categories?: { id: string; label: string }[];
    /** The steps. Controlled with `v-model:steps`. */
    steps?: StepNode[];
    defaultSteps?: StepNode[];
    /** Parameters and variables. Controlled with `v-model:params`. */
    params?: StepParam[];
    defaultParams?: StepParam[];
    /** Ids of step types that can hold steps inside them (a loop, a branch). */
    nestableTypes?: readonly string[];
    /** Placeholder names that are always available without a parameter (such as `trigger.body`). */
    knownVariables?: readonly string[];
    /** Runs the steps with the parameters and returns what each did, or `{ error }`. Omit it to hide the Test run tab. */
    onTestRun?: (steps: StepNode[], params: StepParam[]) => Promise<StepTestResult[] | { error: string }>;
    disabled?: boolean;
    labels?: Partial<StepEditorLabels>;
    canvasLabels?: Partial<WorkflowCanvasLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { categories: undefined, steps: undefined, defaultSteps: () => [], params: undefined, defaultParams: () => [], nestableTypes: () => [], knownVariables: () => [], onTestRun: undefined, labels: undefined, canvasLabels: undefined },
);
const emit = defineEmits<{ "update:steps": [steps: StepNode[]]; "update:params": [params: StepParam[]] }>();

const nq = useNasaq();
const t = computed<StepEditorLabels>(() => ({ ...STEP_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));

const stepsState = ref<StepNode[]>(props.defaultSteps);
const paramsState = ref<StepParam[]>(props.defaultParams);
const steps = computed(() => props.steps ?? stepsState.value);
const params = computed(() => props.params ?? paramsState.value);
function setSteps(next: StepNode[]) {
  if (props.steps === undefined) stepsState.value = next;
  emit("update:steps", next);
}
function setParams(next: StepParam[]) {
  if (props.params === undefined) paramsState.value = next;
  emit("update:params", next);
}

const typeMap = computed(() => new Map(props.types.map((s) => [s.id, s])));
const issues = computed(() => validateSteps(steps.value, params.value, props.types, props.knownVariables));
const usageText = computed(() =>
  JSON.stringify(
    steps.value.map(function walk(s: StepNode): unknown {
      return [s.config, s.children?.map(walk)];
    }),
  ),
);
const usage = (name: string) => usageText.value.split(`{{${name}}}`).length - 1;

const tab = ref<string | number>("steps");
const running = ref(false);
const results = ref<StepTestResult[] | null>(null);
const testError = ref<string | null>(null);

const ctx = computed<StepContext>(() => ({
  types: typeMap.value,
  pickable: props.types,
  categories: props.categories,
  nestable: new Set(props.nestableTypes),
  issues: issues.value,
  t: t.value,
  canvasLabels: props.canvasLabels,
  disabled: props.disabled,
}));

const labelOfStep = (id: string) => {
  const s = flattenSteps(steps.value).find((x) => x.id === id);
  return s ? s.label || typeMap.value.get(s.type)?.label || t.value.newStep : id;
};
const typeOfStep = (id: string) => flattenSteps(steps.value).find((x) => x.id === id)?.type ?? "";
function describe(i: StepIssue): string {
  const label = labelOfStep(i.id);
  const field = (name?: string) => typeMap.value.get(typeOfStep(i.id))?.fields?.find((f) => f.name === name)?.label ?? name ?? "";
  switch (i.code) {
    case "missing-field":
      return t.value.issueMissing(label, field(i.field));
    case "unknown-placeholder":
      return t.value.issuePlaceholder(label, i.token ?? "");
    case "no-type":
      return t.value.issueNoType(label);
    case "bad-param-name":
      return t.value.issueParamName(i.token ?? "");
    default:
      return t.value.issueParamDup(i.token ?? "");
  }
}

const createParam = (): StepParam => ({ id: stepUid("param"), name: "", value: "" });

async function runTest() {
  if (!props.onTestRun) return;
  running.value = true;
  testError.value = null;
  results.value = null;
  const res = await props.onTestRun(steps.value, params.value);
  running.value = false;
  if (Array.isArray(res)) results.value = res;
  else testError.value = res.error;
}

const outputText = (r: StepTestResult) => maskSecrets(typeof r.output === "string" ? r.output : JSON.stringify(r.output, null, 2), params.value);
</script>

<template>
  <div data-slot="step-editor" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <NqAlert v-if="issues.length > 0" tone="warning" :title="t.problems(String(issues.length))">
      <ul class="mt-1 list-disc ps-5 text-body-sm">
        <li v-for="(i, n) in issues.slice(0, 6)" :key="`${i.id}-${i.code}-${i.field ?? i.token ?? ''}-${n}`">{{ describe(i) }}</li>
        <li v-if="issues.length > 6">…</li>
      </ul>
    </NqAlert>
    <NqTabs v-model="tab">
      <NqTabsList variant="underline">
        <NqTabsTab value="steps">
          {{ t.steps }} <span class="ms-1 text-caption text-muted-foreground tabular-nums">{{ countSteps(steps) }}</span>
        </NqTabsTab>
        <NqTabsTab value="params">
          {{ t.params }} <span class="ms-1 text-caption text-muted-foreground tabular-nums">{{ params.length }}</span>
        </NqTabsTab>
        <NqTabsTab v-if="props.onTestRun" value="test">{{ t.test }}</NqTabsTab>
      </NqTabsList>
      <NqTabsPanel value="steps">
        <NqStepList :model-value="steps" :ctx="ctx" @update:model-value="setSteps" />
      </NqTabsPanel>
      <NqTabsPanel value="params">
        <div class="flex flex-col gap-3">
          <p class="text-body-sm text-muted-foreground">{{ t.paramsIntro }}</p>
          <NqRepeater
            :model-value="params"
            :create-item="createParam"
            :disabled="props.disabled"
            :label="t.paramList"
            :add-label="t.paramAdd"
            reorderable
            :row-title="(p, i) => p.name || t.paramRow(String(i + 1))"
            :row-label="(p, i) => p.name || t.paramRow(String(i + 1))"
            :row-summary="(p) => (p.secret ? '••••••' : p.value)"
            :labels="{ list: t.paramList, add: t.paramAdd, empty: t.paramEmpty, row: (n: string) => t.paramRow(n) }"
            @update:model-value="setParams"
          >
            <template #empty>
              <p class="text-body-sm text-muted-foreground">{{ t.paramEmpty }}</p>
            </template>
            <template #default="{ item, update }">
              <NqStepParamRow
                :param="item"
                :t="t"
                :disabled="props.disabled"
                :used="usage(item.name)"
                :issue="issues.filter((i) => i.id === item.id).map(describe)[0]"
                @change="(next) => update(next)"
              />
            </template>
          </NqRepeater>
        </div>
      </NqTabsPanel>
      <NqTabsPanel v-if="props.onTestRun" value="test">
        <div class="flex flex-col gap-3">
          <p class="text-body-sm text-muted-foreground">{{ t.testIntro }}</p>
          <div class="flex items-center gap-3">
            <NqButton :loading="running" :disabled="props.disabled || issues.length > 0 || steps.length === 0" @click="runTest()">
              <FlaskConical aria-hidden="true" />
              {{ running ? t.testing : t.testRun }}
            </NqButton>
            <span v-if="issues.length > 0" class="text-body-sm text-muted-foreground">{{ t.testBlocked }}</span>
          </div>
          <p v-if="testError" role="alert" class="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">{{ t.testFailed }}: {{ testError }}</p>
          <ol v-if="results" :aria-label="t.testAria" class="divide-y divide-border rounded-control border border-border">
            <li v-for="r in results" :key="r.stepId" :data-result="r.stepId" class="flex flex-col gap-2 p-3">
              <div class="flex flex-wrap items-center gap-2">
                <NqWorkflowStatusGlyph :status="r.status" :label="t.status[r.status]" class="size-5" />
                <span class="text-label text-foreground">{{ labelOfStep(r.stepId) }}</span>
                <NqBadge :variant="r.status === 'error' ? 'danger' : r.status === 'success' ? 'success' : 'neutral'">{{ t.status[r.status] }}</NqBadge>
                <span v-if="r.durationMs !== undefined" dir="ltr" class="ms-auto text-caption text-muted-foreground tabular-nums">{{ r.durationMs }} ms</span>
              </div>
              <p v-if="r.error" role="alert" dir="auto" class="text-body-sm text-nq-danger-text">{{ maskSecrets(r.error, params) }}</p>
              <NqCodeBlock v-if="r.output !== undefined" :code="outputText(r)" language="json" :label="t.output" :filename="t.output" pre-class-name="max-h-48" />
            </li>
          </ol>
          <NqEmptyState v-else-if="!running && !testError" :icon="ListTree" :title="t.testNone" />
        </div>
      </NqTabsPanel>
    </NqTabs>
  </div>
</template>
