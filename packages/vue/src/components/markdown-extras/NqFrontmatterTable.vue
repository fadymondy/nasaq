<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqDateTime } from "../numeric";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableRow } from "../table";
import { frontmatterLabel, type FrontmatterValue } from "./markdown-extras-model";
import { useExtrasStrings, type MarkdownExtrasLabels } from "./strings";

// The frontmatter of a document as a two-column table: label, then the value (tags as badges, dates formatted, links clickable).
interface Props {
  /** Pairs in display order (from `parseMarkdownFrontmatter`) or a plain record. */
  data: [key: string, value: FrontmatterValue][] | Record<string, FrontmatterValue>;
  /** Heading above the table. Default "Properties". */
  title?: string;
  labels?: MarkdownExtrasLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t } = useExtrasStrings(() => props.labels);
const pairs = computed(() => (Array.isArray(props.data) ? props.data : Object.entries(props.data)));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const kind = (v: FrontmatterValue) =>
  Array.isArray(v) ? "list" : typeof v === "boolean" ? "bool" : typeof v === "number" ? "num" : ISO_DATE.test(v) ? "date" : /^https?:\/\/\S+$/i.test(v) ? "link" : "text";
</script>

<template>
  <section v-if="pairs.length" data-slot="frontmatter-table" :class="cn('flex flex-col gap-2', props.class)">
    <p class="eyebrow">{{ props.title ?? t.properties }}</p>
    <div class="overflow-hidden rounded-card border border-border">
      <NqTable :label="props.title ?? t.properties">
        <NqTableBody>
          <NqTableRow v-for="[key, value] in pairs" :key="key">
            <NqTableHead scope="row" class="h-auto w-1/3 max-w-48 py-2 align-top whitespace-normal"><bdi>{{ frontmatterLabel(key) }}</bdi></NqTableHead>
            <NqTableCell class="h-auto py-2 whitespace-normal text-foreground">
              <span v-if="kind(value) === 'list'" class="flex flex-wrap gap-1">
                <NqBadge v-for="(v, i) in (value as string[])" :key="`${v}-${i}`" variant="outline"><bdi>{{ v }}</bdi></NqBadge>
              </span>
              <template v-else-if="kind(value) === 'bool'">{{ value ? t.yes : t.no }}</template>
              <bdi v-else-if="kind(value) === 'num'" class="tabular-nums">{{ value }}</bdi>
              <NqDateTime v-else-if="kind(value) === 'date'" :value="(value as string)" :format="{ dateStyle: 'medium' }" />
              <a
                v-else-if="kind(value) === 'link'"
                :href="(value as string)"
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                class="break-all rounded-[2px] underline decoration-nq-line-strong underline-offset-4 outline-none hover:decoration-current focus-visible:outline-2 focus-visible:outline-nq-focus"
              >{{ value }}</a>
              <span v-else dir="auto">{{ value }}</span>
            </NqTableCell>
          </NqTableRow>
        </NqTableBody>
      </NqTable>
    </div>
  </section>
</template>
