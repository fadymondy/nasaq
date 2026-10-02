<script setup lang="ts">
import { Copy, Download, FileText, Printer } from "lucide-vue-next";
import { ref, type Component } from "vue";
import { NqButton } from "../button";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuTrigger } from "../dropdown-menu";
import { saveExportBlob } from "../export-action";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { reportToMarkdown, type ReportDoc } from "./report-filter-math";
import { REPORT_FILTER_STRINGS, type ReportExportFormat, type ReportFilterBarLabels } from "./strings";

// An Export menu for a report: "Print or save as PDF" opens the browser print dialog for the NqReportSheet (or calls
// `onPrint`), Markdown downloads a `.md` file built from the same `document` data, and Copy puts it on the clipboard.
interface Props {
  /** The report as data, or a function that builds it when the user exports (so it is always current). */
  document: ReportDoc | (() => ReportDoc);
  /** File name without extension. Default: the report title. */
  filename?: string;
  /** Which formats to offer. Default: PDF (print), Markdown and copy. */
  formats?: readonly ReportExportFormat[];
  /** Replace the browser print dialog for PDF, for example to call a server that makes the file. */
  onPrint?: () => void | Promise<void>;
  /** Called after an export was made. */
  onExported?: (format: ReportExportFormat) => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  labels?: Partial<ReportFilterBarLabels>;
}
const props = withDefaults(defineProps<Props>(), {
  filename: undefined,
  formats: () => ["pdf", "markdown", "copy"],
  onPrint: undefined,
  onExported: undefined,
  variant: "secondary",
  size: "sm",
  labels: undefined,
});

defineOptions({ inheritAttrs: false });
const t = useAnalyticsLabels(REPORT_FILTER_STRINGS, () => props.labels);
const note = ref("");
const build = () => (typeof props.document === "function" ? props.document() : props.document);
const fileName = (d: ReportDoc) => (props.filename ?? d.title).trim().replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "") || "report";

async function run(format: ReportExportFormat) {
  try {
    if (format === "pdf") {
      if (props.onPrint) await props.onPrint();
      else window.print();
    } else {
      const d = build();
      const md = reportToMarkdown(d);
      if (format === "markdown") saveExportBlob(new Blob([md], { type: "text/markdown;charset=utf-8" }), `${fileName(d)}.md`);
      else {
        await navigator.clipboard.writeText(md);
        note.value = t.value.copied;
      }
    }
    props.onExported?.(format);
  } catch {
    note.value = t.value.failed;
  }
}
const ICON: Record<ReportExportFormat, Component> = { pdf: Printer, markdown: FileText, copy: Copy };
const ORDER: ReportExportFormat[] = ["pdf", "markdown", "copy"];
const labelOf = (f: ReportExportFormat) => ({ pdf: t.value.print, markdown: t.value.markdown, copy: t.value.copyMarkdown })[f];
</script>

<template>
  <NqDropdownMenu>
    <NqDropdownMenuTrigger as-child>
      <NqButton :variant="props.variant" :size="props.size" data-slot="report-export-menu" v-bind="$attrs">
        <Download aria-hidden="true" />
        {{ t.export }}
      </NqButton>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent align="end">
      <NqDropdownMenuItem v-for="f in ORDER.filter((x) => props.formats.includes(x))" :key="f" @select="run(f)">
        <component :is="ICON[f]" aria-hidden="true" />
        {{ labelOf(f) }}
      </NqDropdownMenuItem>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
  <span aria-live="polite" class="sr-only">{{ note }}</span>
</template>
