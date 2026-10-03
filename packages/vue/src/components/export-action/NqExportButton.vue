<script setup lang="ts">
import { Download, FileJson, FileSpreadsheet, FileText, Table2 } from "lucide-vue-next";
import { computed, ref, type Component, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";
import { strings, type Labels } from "./export-strings";
import { EXPORT_SCOPES, sourceCount, type ExportColumn, type ExportFile, type ExportFormat, type ExportPdfHandler, type ExportScope, type ExportScopeSource } from "./export-types";
import NqExportDialog from "./NqExportDialog.vue";

// The export action. A button that opens the options dialog (format, rows, columns, progress), or with
// mode="menu" a menu of formats that export at once with every column and the first available scope.
interface Props {
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
  mode?: "dialog" | "menu";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  class?: HTMLAttributes["class"];
  labels?: Labels;
}
const props = withDefaults(defineProps<Props>(), {
  mode: "dialog",
  variant: "secondary",
  size: "sm",
  disabled: false,
  formats: undefined,
  defaultFormat: undefined,
  defaultScope: undefined,
  filename: "export",
  sheetName: undefined,
  onExportPdf: undefined,
  onDownload: undefined,
  onComplete: undefined,
  labels: undefined,
});

const nq = useNasaq();
const t = computed(() => ({ ...strings(nq.locale.value ?? "en"), ...props.labels }));
const open = ref(false);
const auto = ref<{ format: ExportFormat; scope?: ExportScope } | null>(null);
const ICON: Record<ExportFormat, Component> = { csv: Table2, xlsx: FileSpreadsheet, json: FileJson, pdf: FileText };
const formats = computed(() => (props.formats ?? (["csv", "xlsx", "json"] as ExportFormat[])).filter((f) => f !== "pdf" || props.onExportPdf));
const nothing = computed(() => EXPORT_SCOPES.every((s) => sourceCount(props.scopes[s]) === 0));
function start(f: ExportFormat) {
  auto.value = { format: f };
  open.value = true;
}
</script>

<template>
  <NqDropdownMenu v-if="props.mode === 'menu'">
    <NqDropdownMenuTrigger as-child>
      <NqButton :variant="props.variant" :size="props.size" :disabled="props.disabled || nothing" :class="props.class" data-slot="export-button">
        <Download aria-hidden="true" />
        <slot>{{ t.export }}</slot>
      </NqButton>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent align="end" class="min-w-48" :aria-label="t.menuLabel">
      <NqDropdownMenuItem v-for="f in formats" :key="f" @select="start(f)">
        <component :is="ICON[f]" aria-hidden="true" />
        {{ t[f] }}
      </NqDropdownMenuItem>
      <NqDropdownMenuSeparator />
      <NqDropdownMenuItem @select="open = true">{{ t.menuMore }}</NqDropdownMenuItem>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
  <NqButton v-else :variant="props.variant" :size="props.size" :disabled="props.disabled || nothing" :class="props.class" data-slot="export-button" @click="open = true">
    <Download aria-hidden="true" />
    <slot>{{ t.export }}</slot>
  </NqButton>
  <NqExportDialog
    v-model:open="open"
    :columns="props.columns"
    :scopes="props.scopes"
    :formats="props.formats"
    :default-format="props.defaultFormat"
    :default-scope="props.defaultScope"
    :filename="props.filename"
    :sheet-name="props.sheetName"
    :on-export-pdf="props.onExportPdf"
    :on-download="props.onDownload"
    :on-complete="props.onComplete"
    :labels="props.labels"
    :auto-start="auto"
    @auto-started="auto = null"
  />
</template>
