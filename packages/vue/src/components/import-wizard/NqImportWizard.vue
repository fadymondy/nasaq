<script setup lang="ts">
import { ArrowLeft, ArrowRight, CircleCheck, Download, FileSpreadsheet, TriangleAlert } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { NqCheckbox } from "../checkbox";
import { NqField, NqFieldLabel, NqTextarea } from "../field";
import { formatFileSize, NqDropzone, type FileRejection } from "../file-upload";
import { NqNum } from "../numeric";
import { NqProgress } from "../progress";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqStepper, NqStepperItem } from "../stepper";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import {
  buildRows,
  guessMapping,
  parseCsv,
  summarize,
  unmappedRequired,
  type ColumnMapping,
  type ImportField,
  type ParsedCsv,
  type ParsedRow,
} from "./import-wizard-csv";
import { strings, type Labels } from "./import-wizard-strings";

// A four step import: choose a CSV (or paste rows), match its columns to your fields, review the rows with
// problems marked, then import. Excel users save as CSV first; no spreadsheet library is needed. It has no
// backend: `onImport` receives the valid rows and returns the outcome.
export interface ImportResult {
  imported: number;
  /** Rows the server refused, by source line. */
  failed?: { line: number; message: string }[];
  error?: string;
}
export type ImportWizardLabels = Labels;

interface Props {
  /** What each imported row can hold. Required fields must be mapped and filled. */
  fields: ImportField[];
  /** Runs the import for the valid rows (keyed by field key). Return counts, or `{ error }` to show a failure. */
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult | void>;
  /** Field key that must be unique (an email, a code). Repeats are flagged and skipped. */
  uniqueKey?: string;
  /** Most rows per import. Default 5000. */
  maxRows?: number;
  /** Largest file in bytes. Default 5 MB. */
  maxSize?: number;
  /** Called from the last step's Done button. */
  onDone?: () => void;
  labels?: ImportWizardLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { uniqueKey: undefined, maxRows: 5000, maxSize: 5 * 1024 * 1024, onDone: undefined, labels: undefined });

const PREVIEW_ROWS = 25;
const SKIP = "__skip__";

const nasaq = useNasaq();
const t = computed(() => ({ ...strings(nasaq.locale.value), ...props.labels }) as ReturnType<typeof strings>);
const step = ref(0);
const source = ref<{ name: string; size?: number; csv: ParsedCsv } | null>(null);
const mapping = ref<ColumnMapping>({});
const skipInvalid = ref(true);
const paste = ref("");
const uploadError = ref<string | null>(null);
const busy = ref(false);
const result = ref<ImportResult | null>(null);
const runError = ref<string | null>(null);

const rows = computed<ParsedRow[]>(() => (source.value ? buildRows(source.value.csv.rows, mapping.value, props.fields, { uniqueKey: props.uniqueKey }) : []));
const summary = computed(() => summarize(rows.value));
const missing = computed(() => unmappedRequired(mapping.value, props.fields));
const toImport = computed(() => (skipInvalid.value ? rows.value.filter((r) => r.issues.length === 0) : rows.value));
const problemRows = computed(() => rows.value.filter((r) => r.issues.length > 0));
const fieldLabel = (key: string) => props.fields.find((f) => f.key === key)?.label ?? key;

function load(name: string, text: string, size?: number) {
  const csv = parseCsv(text);
  if (csv.headers.length === 0 || csv.rows.length === 0) {
    uploadError.value = t.value.empty;
    return;
  }
  if (csv.rows.length > props.maxRows) {
    uploadError.value = t.value.tooMany(props.maxRows);
    return;
  }
  uploadError.value = null;
  source.value = { name, size, csv };
  mapping.value = guessMapping(csv.headers, props.fields);
  step.value = 1;
}

async function onFiles(files: File[]) {
  const file = files[0];
  if (!file) return;
  try {
    load(file.name, await file.text(), file.size);
  } catch {
    uploadError.value = t.value.readFailed;
  }
}

function onReject(rej: FileRejection[]) {
  if (rej.length > 0) uploadError.value = rej[0]?.code === "too-large" ? t.value.fileTooBig : t.value.wrongType;
}

async function runImport() {
  busy.value = true;
  runError.value = null;
  step.value = 3;
  try {
    const r = await props.onImport(toImport.value.map((row) => row.values));
    if (r && r.error) runError.value = r.error;
    else result.value = r ?? { imported: toImport.value.length };
  } catch {
    runError.value = t.value.failed;
  }
  busy.value = false;
}

function reset() {
  step.value = 0;
  source.value = null;
  mapping.value = {};
  paste.value = "";
  result.value = null;
  runError.value = null;
  uploadError.value = null;
}

function downloadTemplate() {
  const csv = `﻿${props.fields.map((f) => `"${f.label.replace(/"/g, '""')}"`).join(",")}\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const items = (headers: string[]) => [{ value: SKIP, label: t.value.skip }, ...headers.map((h, i) => ({ value: String(i), label: h || `#${i + 1}` }))];
const setMap = (key: string, v: string | number | null) => {
  if (v === null || v === undefined || v === "") return;
  mapping.value = { ...mapping.value, [key]: v === SKIP ? null : Number(v) };
};
const sampleFor = (key: string) => {
  const col = mapping.value[key] ?? null;
  return col !== null && source.value ? (source.value.csv.rows[0]?.[col] ?? "") : "";
};
const issueFor = (row: ParsedRow, key: string) => row.issues.find((i) => i.field === key);
</script>

<template>
  <div data-slot="import-wizard" :data-step="step" :class="cn('flex flex-col gap-6', props.class)">
    <div role="group" :aria-label="t.steps.join(', ')" class="max-sm:[&_li:not([data-status=current])_[data-slot=stepper-text]]:sr-only">
      <NqStepper :current="step">
        <NqStepperItem v-for="s in t.steps" :key="s" :title="s" />
      </NqStepper>
    </div>

    <NqCard v-if="step === 0" class="gap-4 p-4 sm:p-6">
      <div class="flex flex-col gap-1">
        <h2 class="text-h3 text-foreground">{{ t.uploadTitle }}</h2>
        <p class="text-body-sm text-muted-foreground">{{ t.uploadHint }}</p>
      </div>
      <NqDropzone
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
        :max-size="props.maxSize"
        :multiple="false"
        :invalid="uploadError !== null"
        :input-props="{ 'aria-label': t.uploadTitle }"
        @files="(f: File[]) => void onFiles(f)"
        @reject="onReject"
      >
        <span class="inline-flex items-center gap-2">
          <FileSpreadsheet aria-hidden="true" class="size-4" />
          {{ t.dropPrompt }}
        </span>
      </NqDropzone>
      <NqAlert v-if="uploadError" tone="danger">{{ uploadError }}</NqAlert>
      <NqField>
        <NqFieldLabel>{{ t.orPaste }}</NqFieldLabel>
        <NqTextarea v-model="paste" dir="ltr" class="text-start font-mono text-caption" rows="4" :placeholder="t.pastePlaceholder" />
      </NqField>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <NqButton variant="ghost" size="sm" @click="downloadTemplate">
          <Download aria-hidden="true" />
          {{ t.template }}
        </NqButton>
        <NqButton variant="primary" :disabled="paste.trim() === ''" @click="load('pasted.csv', paste)">{{ t.usePasted }}</NqButton>
      </div>
    </NqCard>

    <NqCard v-if="step === 1 && source" class="gap-4 p-4 sm:p-6">
      <div class="flex flex-col gap-1">
        <h2 class="text-h3 text-foreground">{{ t.mapTitle }}</h2>
        <p class="text-body-sm text-muted-foreground">{{ t.mapBody }}</p>
        <p dir="auto" class="text-caption text-muted-foreground">
          {{ t.loaded(source.name, source.csv.rows.length, source.csv.headers.length) }}{{ source.size ? ` · ${formatFileSize(source.size, nasaq.locale.value)}` : "" }}
        </p>
      </div>
      <div class="flex flex-col divide-y divide-border rounded-control border border-border">
        <div v-for="f in props.fields" :key="f.key" class="grid items-center gap-2 p-3 sm:grid-cols-[1fr_1fr_1fr]">
          <div class="flex items-center gap-2 text-label text-foreground">
            {{ f.label }}
            <NqBadge v-if="f.required" :variant="(mapping[f.key] ?? null) === null ? 'danger' : 'outline'">{{ t.required }}</NqBadge>
          </div>
          <NqSelect :model-value="(mapping[f.key] ?? null) === null ? SKIP : String(mapping[f.key])" @update:model-value="(v) => setMap(f.key, v)">
            <NqSelectTrigger :aria-label="`${f.label}: ${t.sourceCol}`">
              <NqSelectValue />
            </NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="o in items(source.csv.headers)" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
          <div class="min-w-0 truncate text-caption text-muted-foreground" dir="auto">
            <template v-if="sampleFor(f.key)">
              {{ t.example }}: <bdi class="text-foreground">{{ sampleFor(f.key) }}</bdi>
            </template>
          </div>
        </div>
      </div>
      <NqAlert v-if="missing.length > 0" tone="warning">{{ t.unmappedRequired(missing.map((f) => f.label).join(", ")) }}</NqAlert>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <NqButton variant="ghost" @click="step = 0">
          <ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />
          {{ t.back }}
        </NqButton>
        <NqButton variant="primary" :disabled="missing.length > 0" @click="step = 2">
          {{ t.next }}
          <ArrowRight aria-hidden="true" class="rtl:-scale-x-100" />
        </NqButton>
      </div>
    </NqCard>

    <NqCard v-if="step === 2 && source" class="gap-4 p-4 sm:p-6">
      <h2 class="text-h3 text-foreground">{{ t.reviewTitle }}</h2>
      <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          v-for="[label, n, tone] in [
            [t.total, summary.total, 'text-foreground'],
            [t.ready, summary.valid, 'text-nq-success-text'],
            [t.problems, summary.invalid, summary.invalid > 0 ? 'text-nq-danger-text' : 'text-foreground'],
            [t.duplicates, summary.duplicates, 'text-foreground'],
          ] as [string, number, string][]"
          :key="label"
          class="flex flex-col gap-0.5 rounded-control border border-border p-3"
        >
          <dt class="text-caption text-muted-foreground">{{ label }}</dt>
          <dd :class="cn('text-h3', tone)"><NqNum :value="n" /></dd>
        </div>
      </dl>

      <div class="flex flex-col gap-2">
        <NqTable :label="t.filePreview">
          <NqTableHeader>
            <NqTableRow>
              <NqTableHead class="w-16">{{ t.line }}</NqTableHead>
              <NqTableHead v-for="f in props.fields" :key="f.key">{{ f.label }}</NqTableHead>
            </NqTableRow>
          </NqTableHeader>
          <NqTableBody>
            <NqTableRow v-for="r in rows.slice(0, PREVIEW_ROWS)" :key="r.line" :data-invalid="r.issues.length > 0 || undefined" :class="cn(r.issues.length > 0 && 'bg-nq-danger-soft/40')">
              <NqTableCell class="text-muted-foreground"><NqNum :value="r.line" /></NqTableCell>
              <NqTableCell v-for="f in props.fields" :key="f.key" :class="cn(issueFor(r, f.key) && 'text-nq-danger-text')">
                <bdi>{{ r.values[f.key] || (issueFor(r, f.key) ? "" : "—") }}</bdi>
                <span v-if="issueFor(r, f.key)" class="ms-1 text-caption">({{ t.issue[issueFor(r, f.key)!.code] }})</span>
              </NqTableCell>
            </NqTableRow>
          </NqTableBody>
        </NqTable>
        <p v-if="rows.length > PREVIEW_ROWS" class="text-caption text-muted-foreground">{{ t.showing(PREVIEW_ROWS, rows.length) }}</p>
      </div>

      <div v-if="problemRows.length > 0" class="flex flex-col gap-2">
        <h3 class="flex items-center gap-2 text-label text-foreground">
          <TriangleAlert aria-hidden="true" class="size-4 text-nq-warning-text" />
          {{ t.unresolved }}
        </h3>
        <ul class="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-control border border-border p-2 text-body-sm">
          <li v-for="r in problemRows.slice(0, 50)" :key="r.line" class="flex flex-wrap items-center gap-x-2">
            <span class="text-muted-foreground">{{ t.line }} <NqNum :value="r.line" /></span>
            <span v-for="i in r.issues" :key="`${i.field}-${i.code}`" class="text-nq-danger-text">{{ fieldLabel(i.field) }}: {{ t.issue[i.code] }}</span>
          </li>
        </ul>
        <label class="flex items-start gap-2 text-body-sm text-foreground">
          <NqCheckbox v-model="skipInvalid" class="mt-0.5" />
          <span class="flex flex-col">
            {{ t.skipInvalid }}
            <span class="text-caption text-muted-foreground">{{ t.skipInvalidHint }}</span>
          </span>
        </label>
      </div>

      <NqAlert v-if="toImport.length === 0" tone="danger" :title="t.nothing">{{ t.nothingBody }}</NqAlert>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <NqButton variant="ghost" @click="step = 1">
          <ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />
          {{ t.back }}
        </NqButton>
        <NqButton variant="primary" :disabled="toImport.length === 0" @click="runImport">{{ t.importN(toImport.length) }}</NqButton>
      </div>
    </NqCard>

    <NqCard v-if="step === 3" class="gap-4 p-4 sm:p-6" aria-live="polite">
      <div v-if="busy" class="flex flex-col gap-3">
        <h2 class="text-h3 text-foreground">{{ t.importing }}</h2>
        <NqProgress :value="null" :label="t.importing" />
      </div>
      <div v-else-if="runError" class="flex flex-col gap-3">
        <NqAlert tone="danger" :title="t.failed">{{ runError }}</NqAlert>
        <div class="flex gap-2">
          <NqButton variant="ghost" @click="step = 2">
            <ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />
            {{ t.back }}
          </NqButton>
          <NqButton variant="primary" @click="runImport">{{ t.retry }}</NqButton>
        </div>
      </div>
      <div v-else-if="result" class="flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <span class="inline-flex size-10 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
            <CircleCheck aria-hidden="true" class="size-5" />
          </span>
          <div class="flex flex-col">
            <h2 class="text-h3 text-foreground">{{ t.done }}</h2>
            <p class="text-body-sm text-muted-foreground">
              {{ t.imported(result.imported) }}{{ summary.total - toImport.length > 0 ? ` · ${t.skipped(summary.total - toImport.length)}` : "" }}
            </p>
          </div>
        </div>
        <div v-if="result.failed && result.failed.length > 0" class="flex flex-col gap-1">
          <h3 class="text-label text-foreground">{{ t.failedRows }}</h3>
          <ul class="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-control border border-border p-2 text-body-sm">
            <li v-for="f in result.failed" :key="f.line" class="flex gap-2">
              <span class="text-muted-foreground">{{ t.line }} <NqNum :value="f.line" /></span>
              <span class="text-nq-danger-text">{{ f.message }}</span>
            </li>
          </ul>
        </div>
        <div class="flex flex-wrap gap-2">
          <NqButton variant="primary" @click="props.onDone?.()">{{ t.finish }}</NqButton>
          <NqButton variant="ghost" @click="reset">{{ t.another }}</NqButton>
        </div>
      </div>
    </NqCard>
  </div>
</template>
