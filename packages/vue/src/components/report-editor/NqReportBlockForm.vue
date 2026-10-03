<script setup lang="ts">
import { Plus, Trash2 } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqButton } from "../button";
import { NqField, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { formatNumber } from "../numeric";
import { NqRichTextEditor, type RichTextTiptap } from "../rich-text-editor";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { NqTooltip } from "../tooltip";
import NqReportChart from "./NqReportChart.vue";
import NqReportNumberInput from "./NqReportNumberInput.vue";
import {
  addSeries,
  addTableColumn,
  CALLOUT_TONES,
  CHART_KINDS,
  fitTable,
  makeBlockId,
  removeSeries,
  removeTableColumn,
  type CalloutTone,
  type ChartBlock,
  type ChartKind,
  type ReportBlock,
  type ReportFigure,
} from "./report-math";
import type { ReportText } from "./strings";

// Internal: the editing form of one block, by type. It never mutates the block: every change is emitted as a new block.
interface Props {
  block: ReportBlock;
  t: ReportText;
  locale: string;
  disabled?: boolean;
  uid: string;
  /** Loads Tiptap for text blocks. Without it a text block is edited as HTML source in a textarea. */
  loadEditor?: () => Promise<RichTextTiptap>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ change: [block: ReportBlock] }>();

const n = (v: number) => formatNumber(v, props.locale);
const change = (next: ReportBlock) => emit("change", next);
const kindName = (k: ChartKind) => ({ bar: props.t.kindBar, line: props.t.kindLine, area: props.t.kindArea })[k];
const toneName = (k: CalloutTone) => ({ info: props.t.toneInfo, success: props.t.toneSuccess, warning: props.t.toneWarning, danger: props.t.toneDanger })[k];
const defaultCurrency = computed(() => (props.locale.startsWith("ar") ? "SAR" : "USD"));

// The rich text editor rewrites HTML when it mounts (adds attributes); that is not an edit, so it must not mark the report unsaved.
const plain = (html: string) => html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const mounted = ref(false);
function onRichText(html: string) {
  if (props.block.type !== "text") return;
  if (!mounted.value) {
    mounted.value = true;
    if (plain(html) === plain(props.block.html)) return;
  }
  change({ ...props.block, html });
}

const setFigure = (id: string, patch: Partial<ReportFigure>) => {
  if (props.block.type !== "metrics") return;
  change({ ...props.block, items: props.block.items.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
};
const setRow = (ri: number, patch: Partial<ChartBlock["rows"][number]>) => {
  if (props.block.type !== "chart") return;
  change({ ...props.block, rows: props.block.rows.map((r, i) => (i === ri ? { ...r, ...patch } : r)) });
};
const setCell = (ri: number, ci: number, value: string) => {
  if (props.block.type !== "table") return;
  const fit = fitTable(props.block);
  change({ ...fit, rows: fit.rows.map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? value : c)) : r)) });
};
</script>

<template>
  <div data-slot="report-block-form" :data-type="props.block.type">
    <!-- heading -->
    <div v-if="props.block.type === 'heading'" class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <NqField>
        <NqFieldLabel>{{ t.headingText }}</NqFieldLabel>
        <NqInput dir="auto" :disabled="props.disabled" :model-value="props.block.text" @update:model-value="(v) => change({ ...(props.block as typeof props.block & { type: 'heading' }), text: String(v ?? '') })" />
      </NqField>
      <div class="flex flex-col gap-1.5">
        <span :id="`${props.uid}-lv`" class="text-label text-foreground">{{ t.headingLevel }}</span>
        <NqToggleGroup
          :aria-labelledby="`${props.uid}-lv`"
          :disabled="props.disabled"
          :model-value="[String(props.block.level)]"
          @update:model-value="(v) => v[0] && change({ ...(props.block as typeof props.block & { type: 'heading' }), level: Number(v[0]) as 1 | 2 | 3 })"
        >
          <NqToggle value="1">{{ t.level1 }}</NqToggle>
          <NqToggle value="2">{{ t.level2 }}</NqToggle>
          <NqToggle value="3">{{ t.level3 }}</NqToggle>
        </NqToggleGroup>
      </div>
    </div>

    <!-- text -->
    <template v-else-if="props.block.type === 'text'">
      <NqRichTextEditor
        v-if="props.loadEditor"
        :aria-label="t.textLabel"
        :placeholder="t.textPlaceholder"
        min-height="7rem"
        :toolbar="['bold', 'italic', 'underline', 'h2', 'h3', 'bulletList', 'orderedList', 'blockquote', 'link', 'undo', 'redo']"
        :default-value="props.block.html"
        :load="props.loadEditor"
        :read-only="props.disabled"
        @update:model-value="(v) => onRichText(String(v))"
      />
      <NqField v-else>
        <NqFieldLabel>{{ t.textLabel }}</NqFieldLabel>
        <NqTextarea dir="auto" :rows="5" :disabled="props.disabled" :placeholder="t.textPlaceholder" :model-value="props.block.html" @update:model-value="(v) => change({ ...(props.block as typeof props.block & { type: 'text' }), html: String(v ?? '') })" />
      </NqField>
    </template>

    <!-- metrics -->
    <div v-else-if="props.block.type === 'metrics'" class="flex flex-col gap-3">
      <ul class="flex flex-col gap-3">
        <li v-for="(m, i) in props.block.items" :key="m.id" class="grid gap-2 rounded-control border border-border p-2.5 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <NqField>
            <NqFieldLabel>{{ t.metricLabel }}</NqFieldLabel>
            <NqInput dir="auto" :disabled="props.disabled" :model-value="m.label" @update:model-value="(v) => setFigure(m.id, { label: String(v ?? '') })" />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.metricValue }}</NqFieldLabel>
            <NqReportNumberInput :disabled="props.disabled" :value="m.value" @value="(v) => setFigure(m.id, { value: v })" />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.metricDelta }}</NqFieldLabel>
            <NqReportNumberInput :disabled="props.disabled" :value="m.delta === undefined ? undefined : Math.round(m.delta * 1000) / 10" placeholder="—" @value="(v) => setFigure(m.id, { delta: v / 100 })" />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.metricCurrency }}</NqFieldLabel>
            <NqInput ltr :maxlength="3" :disabled="props.disabled" :model-value="m.currency ?? ''" :placeholder="defaultCurrency" @update:model-value="(v) => setFigure(m.id, { currency: String(v ?? '').toUpperCase() || undefined })" />
          </NqField>
          <div class="flex items-end">
            <NqTooltip :content="t.removeMetric(n(i + 1))">
              <NqButton size="icon-sm" variant="ghost" :aria-label="t.removeMetric(n(i + 1))" :disabled="props.disabled || props.block.items.length <= 1" @click="props.block.type === 'metrics' && change({ ...props.block, items: props.block.items.filter((x) => x.id !== m.id) })">
                <Trash2 aria-hidden="true" />
              </NqButton>
            </NqTooltip>
          </div>
        </li>
      </ul>
      <div>
        <NqButton size="sm" variant="secondary" :disabled="props.disabled || props.block.items.length >= 6" @click="props.block.type === 'metrics' && change({ ...props.block, items: [...props.block.items, { id: makeBlockId(), label: '', value: 0 }] })">
          <Plus aria-hidden="true" />
          {{ t.addMetric }}
        </NqButton>
      </div>
    </div>

    <!-- chart -->
    <div v-else-if="props.block.type === 'chart'" class="flex flex-col gap-4">
      <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <NqField>
          <NqFieldLabel>{{ t.chartTitle }}</NqFieldLabel>
          <NqInput dir="auto" :disabled="props.disabled" :model-value="props.block.title" @update:model-value="(v) => props.block.type === 'chart' && change({ ...props.block, title: String(v ?? '') })" />
        </NqField>
        <NqField>
          <NqFieldLabel>{{ t.chartKind }}</NqFieldLabel>
          <NqSelect :disabled="props.disabled" :model-value="props.block.kind" @update:model-value="(v) => v && props.block.type === 'chart' && change({ ...props.block, kind: v as ChartKind })">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="k in CHART_KINDS" :key="k" :value="k">{{ kindName(k) }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
      </div>

      <div class="min-w-0 overflow-x-auto rounded-control border border-border">
        <table class="w-full min-w-[32rem] border-collapse text-body-sm">
          <thead>
            <tr class="bg-secondary">
              <th scope="col" class="w-40 p-1.5 text-start text-caption font-medium text-muted-foreground">{{ t.rowLabel }}</th>
              <th v-for="(s, si) in props.block.series" :key="si" scope="col" class="p-1.5 text-start">
                <div class="flex items-center gap-1">
                  <NqInput dir="auto" :aria-label="t.seriesName(n(si + 1))" :disabled="props.disabled" :model-value="s" :placeholder="t.defaultSeries(n(si + 1))" @update:model-value="(v) => props.block.type === 'chart' && change({ ...props.block, series: props.block.series.map((x, i) => (i === si ? String(v ?? '') : x)) })" />
                  <NqButton v-if="props.block.series.length > 1" size="icon-sm" variant="ghost" :aria-label="t.removeSeries(n(si + 1))" :disabled="props.disabled" @click="props.block.type === 'chart' && change(removeSeries(props.block, si))">
                    <Trash2 aria-hidden="true" />
                  </NqButton>
                </div>
              </th>
              <th class="w-10" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, ri) in props.block.rows" :key="ri" class="border-t border-border">
              <td class="p-1.5">
                <NqInput dir="auto" :aria-label="`${t.rowLabel} ${n(ri + 1)}`" :disabled="props.disabled" :model-value="r.label" @update:model-value="(v) => setRow(ri, { label: String(v ?? '') })" />
              </td>
              <td v-for="(s, si) in props.block.series" :key="si" class="p-1.5">
                <NqReportNumberInput
                  :aria-label="`${t.rowValue(s || t.defaultSeries(n(si + 1)))}, ${r.label || n(ri + 1)}`"
                  :disabled="props.disabled"
                  :value="r.values[si] ?? 0"
                  @value="(v) => props.block.type === 'chart' && setRow(ri, { values: props.block.series.map((_, i) => (i === si ? v : (r.values[i] ?? 0))) })"
                />
              </td>
              <td class="p-1.5">
                <NqButton size="icon-sm" variant="ghost" :aria-label="t.removeRow(n(ri + 1))" :disabled="props.disabled || props.block.rows.length <= 1" @click="props.block.type === 'chart' && change({ ...props.block, rows: props.block.rows.filter((_, i) => i !== ri) })">
                  <Trash2 aria-hidden="true" />
                </NqButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap gap-2">
        <NqButton size="sm" variant="secondary" :disabled="props.disabled || props.block.rows.length >= 24" @click="props.block.type === 'chart' && change({ ...props.block, rows: [...props.block.rows, { label: '', values: props.block.series.map(() => 0) }] })">
          <Plus aria-hidden="true" />
          {{ t.addRow }}
        </NqButton>
        <NqButton size="sm" variant="secondary" :disabled="props.disabled || props.block.series.length >= 5" @click="props.block.type === 'chart' && change(addSeries(props.block, ''))">
          <Plus aria-hidden="true" />
          {{ t.addSeries }}
        </NqButton>
      </div>
      <NqField>
        <NqFieldLabel>{{ t.caption }}</NqFieldLabel>
        <NqInput dir="auto" :disabled="props.disabled" :model-value="props.block.caption ?? ''" @update:model-value="(v) => props.block.type === 'chart' && change({ ...props.block, caption: String(v ?? '') })" />
      </NqField>
      <div :id="`${props.uid}-preview`" class="rounded-card border border-border bg-card p-3">
        <NqReportChart :block="props.block" />
      </div>
    </div>

    <!-- table -->
    <div v-else-if="props.block.type === 'table'" class="flex flex-col gap-3">
      <NqField>
        <NqFieldLabel>{{ t.tableTitle }}</NqFieldLabel>
        <NqInput dir="auto" :disabled="props.disabled" :model-value="props.block.title ?? ''" @update:model-value="(v) => props.block.type === 'table' && change({ ...props.block, title: String(v ?? '') })" />
      </NqField>
      <div class="min-w-0 overflow-x-auto rounded-control border border-border">
        <table class="w-full min-w-[28rem] border-collapse">
          <thead>
            <tr class="bg-secondary">
              <th v-for="(c, ci) in fitTable(props.block).columns" :key="ci" scope="col" class="p-1.5">
                <div class="flex items-center gap-1">
                  <NqInput dir="auto" :aria-label="t.column(n(ci + 1))" :disabled="props.disabled" :model-value="c" :placeholder="t.column(n(ci + 1))" class="text-label" @update:model-value="(v) => props.block.type === 'table' && change({ ...fitTable(props.block), columns: fitTable(props.block).columns.map((x, i) => (i === ci ? String(v ?? '') : x)) })" />
                  <NqButton v-if="fitTable(props.block).columns.length > 1" size="icon-sm" variant="ghost" :aria-label="t.removeColumn(n(ci + 1))" :disabled="props.disabled" @click="props.block.type === 'table' && change(removeTableColumn(fitTable(props.block), ci))">
                    <Trash2 aria-hidden="true" />
                  </NqButton>
                </div>
              </th>
              <th class="w-10" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, ri) in fitTable(props.block).rows" :key="ri" class="border-t border-border">
              <td v-for="(cell, ci) in r" :key="ci" class="p-1.5">
                <NqInput dir="auto" :aria-label="t.cell(n(ri + 1), n(ci + 1))" :disabled="props.disabled" :model-value="cell" @update:model-value="(v) => setCell(ri, ci, String(v ?? ''))" />
              </td>
              <td class="p-1.5">
                <NqButton size="icon-sm" variant="ghost" :aria-label="t.removeRow(n(ri + 1))" :disabled="props.disabled || fitTable(props.block).rows.length <= 1" @click="props.block.type === 'table' && change({ ...fitTable(props.block), rows: fitTable(props.block).rows.filter((_, i) => i !== ri) })">
                  <Trash2 aria-hidden="true" />
                </NqButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap gap-2">
        <NqButton size="sm" variant="secondary" :disabled="props.disabled" @click="props.block.type === 'table' && change({ ...fitTable(props.block), rows: [...fitTable(props.block).rows, fitTable(props.block).columns.map(() => '')] })">
          <Plus aria-hidden="true" />
          {{ t.addRow }}
        </NqButton>
        <NqButton size="sm" variant="secondary" :disabled="props.disabled || fitTable(props.block).columns.length >= 8" @click="props.block.type === 'table' && change(addTableColumn(fitTable(props.block)))">
          <Plus aria-hidden="true" />
          {{ t.addColumn }}
        </NqButton>
      </div>
    </div>

    <!-- callout -->
    <div v-else-if="props.block.type === 'callout'" class="grid gap-3 sm:grid-cols-2">
      <NqField>
        <NqFieldLabel>{{ t.calloutTone }}</NqFieldLabel>
        <NqSelect :disabled="props.disabled" :model-value="props.block.tone" @update:model-value="(v) => v && props.block.type === 'callout' && change({ ...props.block, tone: v as CalloutTone })">
          <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
          <NqSelectContent>
            <NqSelectItem v-for="k in CALLOUT_TONES" :key="k" :value="k">{{ toneName(k) }}</NqSelectItem>
          </NqSelectContent>
        </NqSelect>
      </NqField>
      <NqField>
        <NqFieldLabel>{{ t.calloutTitle }}</NqFieldLabel>
        <NqInput dir="auto" :disabled="props.disabled" :model-value="props.block.title ?? ''" @update:model-value="(v) => props.block.type === 'callout' && change({ ...props.block, title: String(v ?? '') })" />
      </NqField>
      <NqField class="sm:col-span-2">
        <NqFieldLabel>{{ t.calloutText }}</NqFieldLabel>
        <NqTextarea dir="auto" :rows="3" :disabled="props.disabled" :model-value="props.block.text" @update:model-value="(v) => props.block.type === 'callout' && change({ ...props.block, text: String(v ?? '') })" />
      </NqField>
    </div>

    <p v-else class="text-body-sm text-muted-foreground">—</p>
  </div>
</template>
