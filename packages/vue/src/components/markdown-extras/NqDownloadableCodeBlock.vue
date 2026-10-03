<script setup lang="ts">
import { Download, ListOrdered } from "lucide-vue-next";
import { computed, ref } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCodeBlock } from "../code-block";
import { NqCopyButton } from "../copy-button";
import { saveExportBlob } from "../export-action";
import { NqIcon } from "../icon";
import { codeDownloadName } from "./markdown-extras-model";
import { useExtrasStrings, type MarkdownExtrasLabels } from "./strings";

// A CodeBlock with a line-number toggle and a download button next to copy. Other CodeBlock props (highlightLines, label, preClassName,
// highlight, class ...) pass through.
interface Props {
  code: string;
  language?: string;
  filename?: string;
  /** The starting state of the line numbers. */
  lineNumbers?: boolean;
  /** Show the download button. Default true. */
  download?: boolean;
  /** File name of the download. Default the `filename`, else `code.<ext>` by language. */
  downloadName?: string;
  /** Show the line-number toggle. Default true. */
  lineNumberToggle?: boolean;
  labels?: MarkdownExtrasLabels;
}
const props = withDefaults(defineProps<Props>(), { language: "text", filename: undefined, lineNumbers: false, download: true, downloadName: undefined, lineNumberToggle: true, labels: undefined });
const { t } = useExtrasStrings(() => props.labels);
const numbers = ref(props.lineNumbers);
const source = computed(() => props.code.replace(/\n$/, ""));
function save() {
  saveExportBlob(new Blob([source.value], { type: "text/plain;charset=utf-8" }), props.downloadName ?? codeDownloadName(props.language, props.filename));
}
</script>

<template>
  <NqCodeBlock :code="props.code" :language="props.language" :filename="props.filename" :line-numbers="numbers">
    <template #copy-action>
      <span class="flex items-center gap-0.5">
        <NqButton v-if="props.lineNumberToggle" variant="ghost" size="icon-sm" :aria-label="t.lineNumbers" :aria-pressed="numbers" :title="t.lineNumbers" :class="cn(numbers && 'bg-nq-selected')" @click="numbers = !numbers">
          <NqIcon :icon="ListOrdered" />
        </NqButton>
        <NqButton v-if="props.download" variant="ghost" size="icon-sm" :aria-label="t.downloadCode" :title="t.downloadCode" @click="save">
          <NqIcon :icon="Download" />
        </NqButton>
        <NqCopyButton :value="source" />
      </span>
    </template>
  </NqCodeBlock>
</template>
