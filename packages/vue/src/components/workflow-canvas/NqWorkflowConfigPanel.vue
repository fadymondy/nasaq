<script setup lang="ts">
import { CircleAlert, Plus, Trash2 } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqButton } from "../button";
import { NqCodeBlock } from "../code-block";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import NqWorkflowFieldEditor from "./NqWorkflowFieldEditor.vue";
import NqWorkflowPanelHeader from "./NqWorkflowPanelHeader.vue";
import NqWorkflowStatusGlyph from "./NqWorkflowStatusGlyph.vue";
import { useCanvasLabels, type WorkflowCanvasLabels } from "./labels";
import type { WorkflowIssue, WorkflowNodeData, WorkflowNodeRun, WorkflowStepType } from "./workflow-model";

// The side panel for one node: its name and a form built from the step type's fields, plus an Output tab
// (status, duration, items, error, JSON) when an execution is being shown.
interface Props {
  node: WorkflowNodeData;
  /** The step type of the node. `undefined` when it is not installed. */
  type?: WorkflowStepType;
  issues?: WorkflowIssue[];
  /** How this node ran in the execution being shown. */
  run?: WorkflowNodeRun;
  readOnly?: boolean;
  /** Show "Add next step". */
  canAddNext?: boolean;
  /** Show "Remove step". */
  canRemove?: boolean;
  labels?: Partial<WorkflowCanvasLabels>;
  formatDuration?: (ms: number) => string;
}
const props = withDefaults(defineProps<Props>(), { type: undefined, issues: () => [], run: undefined, readOnly: false, canAddNext: false, canRemove: false, labels: undefined, formatDuration: undefined });
const emit = defineEmits<{ change: [patch: { label?: string; config?: Record<string, unknown> }]; remove: []; addNext: []; close: [] }>();

const { t } = useCanvasLabels(() => props.labels);
const tab = ref<string | number>(props.run ? "output" : "settings");
const missing = computed(() => new Set(props.issues.filter((i) => i.code === "missing-field").map((i) => i.field)));
const others = computed(() => props.issues.filter((i) => i.code !== "missing-field"));
const title = computed(() => props.node.label?.trim() || props.type?.label || t.value.unknownType);
const setField = (name: string, v: unknown) => emit("change", { config: { ...props.node.config, [name]: v } });
const duration = (ms: number) => (props.formatDuration ? props.formatDuration(ms) : `${ms} ms`);
</script>

<template>
  <div data-slot="workflow-config-panel" class="flex h-full min-h-0 flex-col">
    <NqWorkflowPanelHeader :title="title" :hint="props.type?.description" :close-label="t.close" @close="emit('close')">
      <template #icon><component :is="props.type?.icon ?? CircleAlert" aria-hidden="true" /></template>
    </NqWorkflowPanelHeader>
    <NqTabs v-model="tab" class="min-h-0 flex-1 gap-0">
      <NqTabsList variant="underline" class="px-4">
        <NqTabsTab value="settings">{{ t.settings }}</NqTabsTab>
        <NqTabsTab value="output">{{ t.output }}</NqTabsTab>
      </NqTabsList>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <NqTabsPanel value="settings">
          <div class="flex flex-col gap-4 p-4">
            <NqField :disabled="props.readOnly">
              <NqFieldLabel>{{ t.name }}</NqFieldLabel>
              <NqInput :model-value="props.node.label ?? ''" :placeholder="props.type?.label" @update:model-value="(v) => emit('change', { label: String(v ?? '') })" />
              <NqFieldDescription>{{ t.nameHelp }}</NqFieldDescription>
            </NqField>
            <p v-if="props.type && (props.type.fields?.length ?? 0) === 0" class="text-body-sm text-muted-foreground">{{ t.noFields }}</p>
            <NqWorkflowFieldEditor
              v-for="f in props.type?.fields ?? []"
              :key="f.name"
              :def="f"
              :value="props.node.config[f.name]"
              :disabled="props.readOnly"
              :invalid="missing.has(f.name)"
              :required-label="t.required"
              @change="(v: unknown) => setField(f.name, v)"
            />
            <p v-for="i in others" :key="i.code" class="flex items-start gap-2 text-body-sm text-nq-warning-text">
              <CircleAlert aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
              {{ t.issue[i.code](title, "") }}
            </p>
          </div>
        </NqTabsPanel>
        <NqTabsPanel value="output">
          <div v-if="props.run" class="flex flex-col gap-3 p-4">
            <dl class="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-body-sm">
              <dt class="text-muted-foreground">{{ t.runStatus }}</dt>
              <dd class="flex items-center gap-1.5">
                <NqWorkflowStatusGlyph :status="props.run.status" />
                {{ t.status[props.run.status] }}
              </dd>
              <template v-if="props.run.durationMs !== undefined">
                <dt class="text-muted-foreground">{{ t.duration }}</dt>
                <dd><bdi>{{ duration(props.run.durationMs) }}</bdi></dd>
              </template>
              <template v-if="props.run.items !== undefined">
                <dt class="text-muted-foreground">{{ t.items }}</dt>
                <dd><bdi>{{ props.run.items }}</bdi></dd>
              </template>
            </dl>
            <div v-if="props.run.error" role="alert" class="rounded-control border border-nq-danger/40 bg-nq-danger-soft p-3 text-body-sm text-nq-danger-text">
              <p class="font-medium">{{ t.errorLabel }}</p>
              <p dir="auto">{{ props.run.error }}</p>
            </div>
            <NqCodeBlock v-if="props.run.output !== undefined" :code="JSON.stringify(props.run.output, null, 2)" language="json" :label="t.output" pre-class-name="max-h-72" />
          </div>
          <p v-else class="p-4 text-body-sm text-muted-foreground">{{ t.noOutput }}</p>
        </NqTabsPanel>
      </div>
    </NqTabs>
    <div v-if="!props.readOnly && (props.canAddNext || props.canRemove)" class="flex items-center gap-2 border-t border-border px-4 py-3">
      <NqButton v-if="props.canAddNext" variant="secondary" size="sm" @click="emit('addNext')">
        <Plus aria-hidden="true" />
        {{ t.addNext }}
      </NqButton>
      <NqButton v-if="props.canRemove" variant="ghost" size="sm" class="ms-auto text-nq-danger-text" @click="emit('remove')">
        <Trash2 aria-hidden="true" />
        {{ t.remove }}
      </NqButton>
    </div>
  </div>
</template>
