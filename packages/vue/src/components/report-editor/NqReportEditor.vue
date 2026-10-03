<script setup lang="ts">
import { AlignLeft, BarChart3, Heading, Info, Minus, Plus, Table2, TrendingUp, type LucideIcon } from "lucide-vue-next";
import { computed, getCurrentInstance, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { formatNumber } from "../numeric";
import { NqRepeater } from "../repeater";
import type { RichTextTiptap } from "../rich-text-editor";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqReportBlockForm from "./NqReportBlockForm.vue";
import NqReportViewer from "./NqReportViewer.vue";
import { cloneBlock, convertBlock, newBlock, plainText, readingMinutes, REPORT_BLOCK_TYPES, reportIssues, wordCount, type Report, type ReportBlock, type ReportBlockType } from "./report-math";
import { reportText, type ReportLabels } from "./strings";

// Builds a report from blocks: headings, rich text, key figures, charts, tables, callouts and dividers. Each block edits in a collapsible,
// reorderable row; Preview shows the finished report as a reader sees it. `v-model` holds the report; `onSave` adds a Save button and the
// unsaved-changes state.
interface Props {
  /** The report (v-model). Omit to let the editor keep it, starting from `defaultValue`. */
  modelValue?: Report;
  defaultValue?: Report;
  /** Persist the report. Return `{ error }` to show why it failed. Adds a Save button and the unsaved-changes state. */
  onSave?: (report: Report) => Promise<void | { error?: string }>;
  /** Start on the preview tab. */
  defaultView?: "edit" | "preview";
  /** Read the report, change nothing. Shows the viewer only. */
  readOnly?: boolean;
  /** Loads Tiptap for text blocks: `() => import("./tiptap")`. Without it text blocks are edited as HTML in a textarea. */
  loadEditor?: () => Promise<RichTextTiptap>;
  labels?: ReportLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined, onSave: undefined, defaultView: "edit", readOnly: false, loadEditor: undefined });
const emit = defineEmits<{
  "update:modelValue": [report: Report];
  /** Print was pressed in the preview. Without a listener the browser's print dialog opens. */
  print: [];
}>();
const printable = "onPrint" in (getCurrentInstance()?.vnode.props ?? {});

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => reportText(locale.value, props.labels));
const n = (v: number) => formatNumber(v, locale.value);
const uid = useId();

const inner = ref<Report>(props.defaultValue ?? props.modelValue ?? { title: "", blocks: [] });
const report = computed(() => props.modelValue ?? inner.value);
const saved = ref<Report>(report.value);
const dirty = computed(() => saved.value !== report.value);
const saveState = ref<{ status: "idle" | "saving" | "error"; message?: string }>({ status: "idle" });
const view = ref<"edit" | "preview">(props.readOnly ? "preview" : props.defaultView);
const editable = computed(() => !props.readOnly);

function commit(next: Report) {
  if (props.modelValue === undefined) inner.value = next;
  emit("update:modelValue", next);
  if (saveState.value.status === "error") saveState.value = { status: "idle" };
}
const patch = (p: Partial<Report>) => commit({ ...report.value, ...p });

async function save() {
  if (!props.onSave) return;
  const current = report.value;
  saveState.value = { status: "saving" };
  try {
    const result = await props.onSave(current);
    if (result && result.error) {
      saveState.value = { status: "error", message: result.error };
      return;
    }
    saved.value = current;
    saveState.value = { status: "idle" };
  } catch (error) {
    saveState.value = { status: "error", message: error instanceof Error ? error.message : t.value.saveFailed };
  }
}

const issues = computed(() => reportIssues(report.value));
const issueIds = computed(() => new Set(issues.value.map((i) => i.blockId)));
const words = computed(() => wordCount(report.value));

const TYPE_ICON: Record<ReportBlockType, LucideIcon> = { heading: Heading, text: AlignLeft, metrics: TrendingUp, chart: BarChart3, table: Table2, callout: Info, divider: Minus };
const typeName = (type: ReportBlockType) => ({ heading: t.value.typeHeading, text: t.value.typeText, metrics: t.value.typeMetrics, chart: t.value.typeChart, table: t.value.typeTable, callout: t.value.typeCallout, divider: t.value.typeDivider })[type];

const insert = (type: ReportBlockType) => commit({ ...report.value, blocks: [...report.value.blocks, newBlock(type)] });
function summaryOf(b: ReportBlock): string {
  if (b.type === "metrics") return b.items.map((m) => m.label).filter(Boolean).join(", ");
  if (b.type === "chart") return b.title;
  if (b.type === "table") return b.title || b.columns.filter(Boolean).join(", ");
  return plainText(b).slice(0, 90);
}
</script>

<template>
  <div data-slot="report-editor" role="group" :aria-label="t.editor" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center gap-2">
      <NqToggleGroup v-if="editable" :aria-label="t.view" :model-value="[view]" @update:model-value="(v) => v[0] && (view = v[0] as 'edit' | 'preview')">
        <NqToggle value="edit">{{ t.edit }}</NqToggle>
        <NqToggle value="preview">{{ t.preview }}</NqToggle>
      </NqToggleGroup>
      <span class="text-caption text-muted-foreground">{{ t.words(n(words)) }} · {{ t.minutes(n(readingMinutes(words))) }}</span>
      <NqBadge v-if="issues.length > 0 && editable" variant="warning">{{ t.issues(n(issues.length)) }}</NqBadge>
      <div class="ms-auto flex flex-wrap items-center gap-2">
        <template v-if="props.onSave">
          <NqBadge v-if="saveState.status === 'saving'" variant="info">{{ t.saving }}</NqBadge>
          <NqBadge v-else-if="saveState.status === 'error'" variant="danger" role="alert">{{ saveState.message ?? t.saveFailed }}</NqBadge>
          <NqBadge v-else-if="dirty" variant="warning">{{ t.unsaved }}</NqBadge>
          <NqBadge v-else variant="success">{{ t.saved }}</NqBadge>
        </template>
        <NqButton v-if="props.onSave && editable" size="sm" :loading="saveState.status === 'saving'" :disabled="!dirty" @click="save">{{ t.save }}</NqButton>
      </div>
    </div>

    <div v-if="view === 'preview'" class="rounded-card border border-border bg-card p-4 sm:p-8">
      <NqEmptyState v-if="report.blocks.length === 0 && !report.title" :title="t.emptyReport" :description="t.previewEmpty" />
      <NqReportViewer v-else :report="report" :labels="props.labels" v-bind="printable ? { onPrint: () => emit('print') } : {}" />
    </div>
    <template v-else>
      <div class="grid gap-3 rounded-card border border-border bg-card p-3 sm:grid-cols-2 sm:p-4">
        <NqField class="sm:col-span-2">
          <NqFieldLabel>{{ t.reportTitle }}</NqFieldLabel>
          <NqInput dir="auto" :model-value="report.title" :placeholder="t.titlePlaceholder" class="text-label" @update:model-value="(v) => patch({ title: String(v ?? '') })" />
        </NqField>
        <NqField class="sm:col-span-2">
          <NqFieldLabel>{{ t.subtitle }}</NqFieldLabel>
          <NqInput dir="auto" :model-value="report.subtitle ?? ''" @update:model-value="(v) => patch({ subtitle: String(v ?? '') })" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.author }}</NqFieldLabel>
          <NqInput dir="auto" :model-value="report.author ?? ''" @update:model-value="(v) => patch({ author: String(v ?? '') })" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.date }}</NqFieldLabel>
          <NqInput ltr type="date" :model-value="report.date ?? ''" @update:model-value="(v) => patch({ date: String(v ?? '') || undefined })" />
        </NqField>
      </div>

      <NqRepeater
        :label="t.blocks"
        :model-value="report.blocks"
        :create-item="() => newBlock('text')"
        :clone-item="cloneBlock"
        :add-label="t.addText"
        :empty="t.previewEmpty"
        :row-title="(b: ReportBlock) => typeName(b.type)"
        :row-label="(b: ReportBlock) => typeName(b.type)"
        :row-summary="(b: ReportBlock) => summaryOf(b) || t.untitledBlock"
        @update:model-value="(blocks: ReportBlock[]) => patch({ blocks })"
      >
        <template #meta="{ item }">
          <NqBadge v-if="issueIds.has((item as ReportBlock).id)" variant="warning">{{ t.untitledBlock }}</NqBadge>
        </template>
        <template #default="{ item, update, id }">
          <div class="flex flex-col gap-4">
            <NqField class="sm:max-w-56">
              <NqFieldLabel>{{ t.blockType }}</NqFieldLabel>
              <NqSelect :model-value="(item as ReportBlock).type" @update:model-value="(v) => v && update(convertBlock(item as ReportBlock, v as ReportBlockType))">
                <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="k in REPORT_BLOCK_TYPES" :key="k" :value="k">{{ typeName(k) }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </NqField>
            <NqReportBlockForm :block="item as ReportBlock" :t="t" :locale="locale" :disabled="false" :uid="`${uid}-${id}`" :load-editor="props.loadEditor" @change="(next) => update(next)" />
          </div>
        </template>
      </NqRepeater>

      <div>
        <NqDropdownMenu>
          <NqDropdownMenuTrigger as-child>
            <NqButton variant="secondary">
              <Plus aria-hidden="true" />
              {{ t.insert }}
            </NqButton>
          </NqDropdownMenuTrigger>
          <NqDropdownMenuContent align="start" class="min-w-44">
            <NqDropdownMenuItem v-for="k in REPORT_BLOCK_TYPES" :key="k" @select="insert(k)">
              <component :is="TYPE_ICON[k]" aria-hidden="true" />
              {{ typeName(k) }}
            </NqDropdownMenuItem>
          </NqDropdownMenuContent>
        </NqDropdownMenu>
      </div>
    </template>
  </div>
</template>
