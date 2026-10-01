<script setup lang="ts">
import { CircleCheck, Download, FileJson, FileSpreadsheet, FileText, Table2 } from "lucide-vue-next";
import { computed, ref, watch, type Component } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { formatNumber } from "../numeric";
import { NqProgress } from "../progress";
import { NqRadio, NqRadioCard, NqRadioGroup } from "../radio-group";
import { buildExportFile, EXPORT_MIME } from "./export-formats";
import { strings, type Labels } from "./export-strings";
import {
  EXPORT_SCOPES,
  saveExportBlob,
  sourceCount,
  type ExportColumn,
  type ExportFile,
  type ExportFormat,
  type ExportPdfHandler,
  type ExportRequest,
  type ExportScope,
  type ExportScopeSource,
} from "./export-types";

// The options dialog: format, rows, columns, a progress state while the file is built, and the result with a
// "Download again" button. Use NqExportButton unless you open it from your own control.
interface Props {
  /** `v-model:open`. */
  open: boolean;
  columns: ExportColumn[];
  scopes: Partial<Record<ExportScope, ExportScopeSource>>;
  formats?: ExportFormat[];
  defaultFormat?: ExportFormat;
  defaultScope?: ExportScope;
  filename?: string;
  sheetName?: string;
  onExportPdf?: ExportPdfHandler;
  onDownload?: (file: ExportFile) => void | Promise<void>;
  onComplete?: (file: ExportFile) => void;
  labels?: Labels;
  /** Start exporting as soon as the dialog opens (used by the menu mode). */
  autoStart?: { format: ExportFormat; scope?: ExportScope } | null;
}
const props = withDefaults(defineProps<Props>(), {
  filename: "export",
  formats: undefined,
  defaultFormat: undefined,
  defaultScope: undefined,
  sheetName: undefined,
  onExportPdf: undefined,
  onDownload: undefined,
  onComplete: undefined,
  labels: undefined,
  autoStart: null,
});
const emit = defineEmits<{ "update:open": [open: boolean]; autoStarted: [] }>();

type Phase =
  | { name: "idle" }
  | { name: "running"; stage: "loading" | "building"; progress: number | null }
  | { name: "done"; file: ExportFile }
  | { name: "error"; message: string };

const nq = useNasaq();
const locale = computed(() => nq.locale.value ?? "en");
const t = computed(() => ({ ...strings(locale.value), ...props.labels }));
const n = (v: number) => formatNumber(v, locale.value);
const FORMAT_ICON: Record<ExportFormat, Component> = { csv: Table2, xlsx: FileSpreadsheet, json: FileJson, pdf: FileText };

const formats = computed(() => (props.formats ?? (["csv", "xlsx", "json"] as ExportFormat[])).filter((f) => f !== "pdf" || props.onExportPdf));
const firstScope = (): ExportScope =>
  props.defaultScope && sourceCount(props.scopes[props.defaultScope]) > 0 ? props.defaultScope : (EXPORT_SCOPES.find((s) => sourceCount(props.scopes[s]) > 0) ?? "all");

const format = ref<ExportFormat>(props.defaultFormat && formats.value.includes(props.defaultFormat) ? props.defaultFormat : (formats.value[0] ?? "csv"));
const scope = ref<ExportScope>(firstScope());
const chosen = ref<Set<string>>(new Set(props.columns.map((c) => c.id)));
const phase = ref<Phase>({ name: "idle" });
let abort: AbortController | null = null;

watch(
  () => props.columns.map((c) => c.id).join("|"),
  () => (chosen.value = new Set(props.columns.map((c) => c.id))),
);

async function run(overrides?: { format?: ExportFormat; scope?: ExportScope }) {
  const fmt = overrides?.format ?? format.value;
  const scp = overrides?.scope ?? scope.value;
  const cols = props.columns.filter((c) => (overrides ? true : chosen.value.has(c.id)));
  const source = props.scopes[scp];
  if (!source || !cols.length) return;
  const controller = new AbortController();
  abort = controller;
  const baseName = props.filename.replace(/\.[a-z0-9]+$/i, "");
  try {
    phase.value = { name: "running", stage: "loading", progress: null };
    const rows = "count" in (source as object) ? await (source as { load: () => readonly unknown[] | Promise<readonly unknown[]> }).load() : (source as readonly unknown[]);
    if (controller.signal.aborted) return;
    const request: ExportRequest = { format: fmt, scope: scp, columns: cols, rows, filename: `${baseName}.${fmt}` };
    phase.value = { name: "running", stage: "building", progress: 0 };
    const onProgress = (progress: number) => (phase.value = { name: "running", stage: "building", progress });
    let blob: Blob | void;
    if (fmt === "pdf") {
      if (!props.onExportPdf) return;
      blob = await props.onExportPdf(request, { signal: controller.signal, onProgress });
    } else {
      const bytes = await buildExportFile({
        format: fmt,
        columns: cols,
        rows,
        sheetName: props.sheetName ?? baseName,
        rtl: locale.value.startsWith("ar"),
        onProgress,
        signal: controller.signal,
      });
      blob = new Blob([bytes as BlobPart], { type: EXPORT_MIME[fmt] });
    }
    if (controller.signal.aborted) return;
    const file: ExportFile = { blob: blob ?? new Blob([]), filename: request.filename, request };
    if (blob) {
      if (props.onDownload) await props.onDownload(file);
      else saveExportBlob(blob, file.filename);
    }
    phase.value = { name: "done", file };
    props.onComplete?.(file);
  } catch (error) {
    if (controller.signal.aborted || (error as Error)?.name === "AbortError") return;
    phase.value = { name: "error", message: (error as Error)?.message || t.value.failed };
  }
}

watch(
  () => [props.open, props.autoStart] as const,
  ([open, auto]) => {
    if (!open) {
      abort?.abort();
      phase.value = { name: "idle" };
      return;
    }
    if (auto) {
      format.value = auto.format;
      if (auto.scope) scope.value = auto.scope;
      emit("autoStarted");
      void run({ format: auto.format, scope: auto.scope ?? firstScope() });
    } else scope.value = firstScope();
  },
  { immediate: true },
);

function cancel() {
  abort?.abort();
  phase.value = { name: "idle" };
}
function onOpen(next: boolean) {
  if (phase.value.name === "running" && !next) return;
  emit("update:open", next);
}
function toggle(id: string) {
  const next = new Set(chosen.value);
  if (!next.delete(id)) next.add(id);
  chosen.value = next;
}
function again(file: ExportFile) {
  if (props.onDownload) void props.onDownload(file);
  else saveExportBlob(file.blob, file.filename);
}

const picked = computed(() => chosen.value.size);
const allPicked = computed(() => picked.value === props.columns.length);
const noRows = computed(() => EXPORT_SCOPES.every((s) => sourceCount(props.scopes[s]) === 0));
const countText = (c: number) => (c === 1 ? t.value.rowCountOne : t.value.rowCount(n(c)));
const hint = (f: ExportFormat) => t.value[`${f}Hint` as "csvHint"];
</script>

<template>
  <NqDialog :open="props.open" @update:open="onOpen">
    <NqDialogContent class="max-w-xl grid-cols-[minmax(0,1fr)]" data-slot="export-dialog">
      <NqDialogHeader>
        <NqDialogTitle>{{ t.title }}</NqDialogTitle>
        <NqDialogDescription>{{ t.description }}</NqDialogDescription>
      </NqDialogHeader>

      <div v-if="phase.name === 'idle' || phase.name === 'error'" class="flex flex-col gap-5">
        <NqAlert v-if="phase.name === 'error'" tone="danger" :title="t.failed">{{ phase.message }}</NqAlert>
        <fieldset class="flex flex-col gap-2">
          <legend class="mb-2 text-label text-foreground">{{ t.format }}</legend>
          <NqRadioGroup v-model="format" class="grid grid-cols-1 gap-2 sm:grid-cols-2" :aria-label="t.format">
            <NqRadioCard v-for="f in formats" :key="f" :value="f" :description="hint(f)" class="p-3">
              <span class="inline-flex items-center gap-2"><component :is="FORMAT_ICON[f]" aria-hidden="true" class="size-4 text-muted-foreground" />{{ t[f] }}</span>
            </NqRadioCard>
          </NqRadioGroup>
        </fieldset>

        <fieldset class="flex flex-col gap-2">
          <legend class="mb-2 text-label text-foreground">{{ t.scope }}</legend>
          <NqRadioGroup v-model="scope" :aria-label="t.scope">
            <template v-for="s in EXPORT_SCOPES" :key="s">
              <label v-if="props.scopes[s] !== undefined" :class="cn('flex items-center gap-2.5 text-body', sourceCount(props.scopes[s]) === 0 && 'opacity-50')">
                <NqRadio :value="s" :disabled="sourceCount(props.scopes[s]) === 0" />
                <span class="flex-1">{{ t[s] }}</span>
                <span class="text-body-sm tabular-nums text-muted-foreground">{{ countText(sourceCount(props.scopes[s])) }}</span>
              </label>
            </template>
          </NqRadioGroup>
        </fieldset>

        <fieldset class="flex flex-col gap-2">
          <legend class="mb-2 flex w-full items-center justify-between text-label text-foreground">
            {{ t.columns }}
            <span class="text-caption font-normal tabular-nums text-muted-foreground">{{ n(picked) }} / {{ n(props.columns.length) }}</span>
          </legend>
          <label class="flex items-center gap-2.5 border-b border-border pb-2 text-body">
            <NqCheckbox
              :model-value="allPicked"
              :indeterminate="picked > 0 && !allPicked"
              @update:model-value="(v: boolean) => (chosen = v ? new Set(props.columns.map((c) => c.id)) : new Set())"
            />
            {{ t.selectAllColumns }}
          </label>
          <div class="grid max-h-40 grid-cols-1 gap-x-4 gap-y-2 overflow-y-auto py-1 sm:grid-cols-2">
            <label v-for="c in props.columns" :key="c.id" class="flex min-w-0 items-center gap-2.5 text-body">
              <NqCheckbox :model-value="chosen.has(c.id)" @update:model-value="toggle(c.id)" />
              <span class="truncate">{{ c.label }}</span>
            </label>
          </div>
          <p v-if="picked === 0" class="text-body-sm text-nq-danger-text">{{ t.noColumns }}</p>
        </fieldset>

        <NqDialogFooter>
          <NqButton variant="ghost" @click="emit('update:open', false)">{{ t.cancel }}</NqButton>
          <NqButton variant="primary" :disabled="picked === 0 || sourceCount(props.scopes[scope]) === 0" @click="run()">
            <Download aria-hidden="true" />
            {{ phase.name === "error" ? t.retry : t.run }}
          </NqButton>
        </NqDialogFooter>
        <p v-if="noRows" class="text-body-sm text-muted-foreground">{{ t.noRows }}</p>
      </div>

      <div v-if="phase.name === 'running'" class="flex flex-col gap-4 py-2" data-slot="export-progress">
        <NqProgress
          :value="phase.progress == null ? null : Math.round(phase.progress * 100)"
          :aria-label="t.preparing"
          :label="phase.stage === 'loading' ? t.loadingRows : t.building(n(Math.round((phase.progress ?? 0) * 100)) + '%')"
          :show-value="false"
          tone="info"
        />
        <NqDialogFooter>
          <NqButton variant="ghost" @click="cancel">{{ t.cancel }}</NqButton>
        </NqDialogFooter>
      </div>

      <div v-if="phase.name === 'done'" class="flex flex-col gap-4 py-2" data-slot="export-done">
        <p role="status" class="flex items-center gap-2 text-body text-foreground">
          <CircleCheck aria-hidden="true" class="size-5 shrink-0 text-nq-success-text" />
          <span>
            {{ t.ready("") }}
            <bdi dir="ltr" class="font-medium">{{ phase.file.filename }}</bdi>
          </span>
        </p>
        <NqDialogFooter>
          <NqButton v-if="phase.file.blob.size > 0" variant="ghost" @click="again(phase.file)">
            <Download aria-hidden="true" />
            {{ t.downloadAgain }}
          </NqButton>
          <NqButton variant="primary" @click="emit('update:open', false)">{{ t.done }}</NqButton>
        </NqDialogFooter>
      </div>
    </NqDialogContent>
  </NqDialog>
</template>
