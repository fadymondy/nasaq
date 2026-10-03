<script setup lang="ts">
import { ExternalLink } from "lucide-vue-next";
import { NqBadge } from "../badge";
import { formatDate, formatNumber } from "../numeric";
import { isEmpty, type ContentCell, type ContentColumn } from "./math";
import type { ContentTableText } from "./strings";

// What a cell shows when it is not being edited. Internal to the content table editor.
interface Props {
  column: ContentColumn;
  value: ContentCell | undefined;
  locale: string;
  t: ContentTableText;
  rowLabel: string;
}
const props = defineProps<Props>();
const HUES = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"];
const hueOf = (h?: string) => (HUES.includes(h ?? "") ? (h as "gray") : "gray");
const optionOf = (v: string) => props.column.options?.find((o) => o.value === v);
const text = () => String(props.value);
const isLink = () => /^https?:\/\//i.test(text());
</script>

<template>
  <template v-if="props.column.type === 'checkbox'" />
  <span v-else-if="isEmpty(props.value)" class="text-muted-foreground/60" aria-hidden="true">—</span>
  <span v-else-if="props.column.type === 'number'" class="block w-full text-end tabular-nums">{{ formatNumber(Number(props.value), props.locale) }}</span>
  <span v-else-if="props.column.type === 'date'">{{ formatDate(`${text()}T00:00:00`, props.locale) }}</span>
  <span v-else-if="props.column.type === 'url'" class="flex min-w-0 items-center gap-1.5">
    <bdi dir="ltr" class="min-w-0 truncate text-start underline decoration-nq-line-strong underline-offset-4">{{ text().replace(/^https?:\/\//, "") }}</bdi>
    <a
      v-if="isLink()"
      :href="text()"
      target="_blank"
      rel="noopener noreferrer"
      tabindex="-1"
      :aria-label="`${props.t.open}: ${props.rowLabel}`"
      class="shrink-0 rounded-[4px] text-muted-foreground hover:text-foreground"
      @click.stop
    >
      <ExternalLink aria-hidden="true" class="size-3.5" />
    </a>
  </span>
  <NqBadge v-else-if="props.column.type === 'select'" variant="tag" :hue="hueOf(optionOf(text())?.hue)">{{ optionOf(text())?.label ?? text() }}</NqBadge>
  <span v-else-if="props.column.type === 'tags'" class="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden">
    <NqBadge v-for="v in (props.value as string[])" :key="v" variant="tag" :hue="hueOf(optionOf(v)?.hue)">{{ optionOf(v)?.label ?? v }}</NqBadge>
  </span>
  <span v-else class="block min-w-0 truncate" dir="auto">{{ text() }}</span>
</template>
