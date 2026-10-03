<script setup lang="ts">
import { Printer } from "lucide-vue-next";
import { computed, getCurrentInstance, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { formatDate, formatNumber } from "../numeric";
import { NqStatCard, NqStatGrid } from "../stat-card";
import NqReportChart from "./NqReportChart.vue";
import { sanitizeHtml } from "./report-html";
import { fitTable, readingMinutes, tocOf, wordCount, type Report, type ReportBlock } from "./report-math";
import { reportText, type ReportLabels } from "./strings";

// A finished report for reading: cover, contents, and the blocks as prose, figures, charts, tables and callouts. Read-only and print
// friendly: the toolbar hides on paper and charts, tables and figures do not split across pages. Text blocks are shown from their HTML
// with the editor's tags only (no Tiptap needed to read a report).
interface Props {
  report: Report;
  /** Show the contents list built from the headings. Default true when there are two or more headings. */
  showToc?: boolean;
  /** Hide the Print button. */
  hidePrint?: boolean;
  labels?: ReportLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { showToc: undefined, hidePrint: false });
const emit = defineEmits<{ /** Print was pressed. Without a listener the browser's print dialog opens. */ print: [] }>();

const listening = "onPrint" in (getCurrentInstance()?.vnode.props ?? {});
const print = () => (listening ? emit("print") : window.print());

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => reportText(locale.value, props.labels));
const uid = useId();
const n = (v: number) => formatNumber(v, locale.value);

const toc = computed(() => tocOf(props.report));
const words = computed(() => wordCount(props.report));
const withToc = computed(() => props.showToc ?? toc.value.length >= 2);
const anchor = (id: string) => `${uid}-${id}`;
const jump = (id: string) => document.getElementById(anchor(id))?.scrollIntoView({ behavior: "smooth", block: "start" });
const meta = computed(() =>
  [
    props.report.author ? t.value.by(props.report.author) : null,
    props.report.date ? formatDate(props.report.date, locale.value, { dateStyle: "long" }) : null,
    words.value ? `${t.value.words(n(words.value))} · ${t.value.minutes(n(readingMinutes(words.value)))}` : null,
  ].filter(Boolean),
);

const HEADING_CLASS = { 1: "text-h2", 2: "text-h3", 3: "text-label" } as const;
const headingTag = (level: 1 | 2 | 3) => `h${level + 1}`;
const textClass =
  "flex flex-col gap-3 text-body text-nq-fg-body [&_p]:text-start [&_h1]:text-h1 [&_h2]:text-h2 [&_h3]:text-h3 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-6 [&_ol]:ps-6 [&_li]:text-start [&_blockquote]:border-s-2 [&_blockquote]:border-nq-line-strong [&_blockquote]:ps-4 [&_blockquote]:text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_strong]:font-semibold [&_strong]:text-foreground [&_code]:rounded-[4px] [&_code]:bg-secondary [&_code]:px-1 [&_code]:font-mono";

const figureFormat = (currency?: string) => (currency ? { style: "currency" as const, currency, maximumFractionDigits: 0 } : undefined);
const visible = (b: ReportBlock) => !(b.type === "heading" && !b.text.trim());
</script>

<template>
  <article data-slot="report-viewer" :aria-label="props.report.title || t.viewer" :class="cn('mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-5 print:max-w-none', props.class)">
    <header class="flex flex-col gap-2">
      <div class="flex items-start gap-3">
        <h1 dir="auto" class="min-w-0 flex-1 text-start text-h1 font-semibold text-foreground">{{ props.report.title || t.titlePlaceholder }}</h1>
        <NqButton v-if="!props.hidePrint" variant="secondary" size="sm" class="print:hidden" @click="print">
          <Printer aria-hidden="true" />
          {{ t.print }}
        </NqButton>
      </div>
      <p v-if="props.report.subtitle" dir="auto" class="text-start text-body text-muted-foreground">{{ props.report.subtitle }}</p>
      <p v-if="meta.length" class="text-caption text-muted-foreground">{{ meta.join(" · ") }}</p>
    </header>

    <nav v-if="withToc && toc.length" :aria-label="t.contents" class="rounded-card border border-border bg-card p-3 break-inside-avoid">
      <p class="mb-1 text-label text-foreground">{{ t.contents }}</p>
      <ol class="flex flex-col gap-0.5">
        <li v-for="e in toc" :key="e.id" :style="{ paddingInlineStart: `${(e.level - 1) * 0.75}rem` }">
          <a
            :href="`#${anchor(e.id)}`"
            dir="auto"
            class="rounded-control text-body-sm text-foreground underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click.prevent="jump(e.id)"
          >{{ e.text }}</a>
        </li>
      </ol>
    </nav>

    <p v-if="props.report.blocks.length === 0" class="text-body-sm text-muted-foreground">{{ t.emptyReport }}</p>
    <template v-else>
     <template v-for="b in props.report.blocks" :key="b.id">
      <template v-if="visible(b)">
        <component :is="headingTag(b.level)" v-if="b.type === 'heading'" :id="anchor(b.id)" dir="auto" :class="cn('scroll-mt-4 text-start font-semibold text-foreground break-after-avoid', HEADING_CLASS[b.level])">{{ b.text }}</component>
        <div v-else-if="b.type === 'text'" data-slot="report-text" :class="textClass" v-html="sanitizeHtml(b.html)" />
        <NqStatGrid v-else-if="b.type === 'metrics'" class="break-inside-avoid">
          <NqStatCard
            v-for="m in b.items.filter((x) => x.label.trim())"
            :key="m.id"
            :label="m.label"
            :value="m.value"
            :format="figureFormat(m.currency)"
            :delta="m.delta"
            :delta-label="m.deltaLabel"
            :lang="locale"
          />
        </NqStatGrid>
        <figure v-else-if="b.type === 'chart'" class="flex min-w-0 flex-col gap-2 break-inside-avoid">
          <figcaption v-if="b.title" class="text-label text-foreground">{{ b.title }}</figcaption>
          <div class="rounded-card border border-border bg-card p-3"><NqReportChart :block="b" :labels="props.labels" /></div>
          <p v-if="b.caption" dir="auto" class="text-caption text-muted-foreground">{{ b.caption }}</p>
        </figure>
        <figure v-else-if="b.type === 'table'" class="flex min-w-0 flex-col gap-2 break-inside-avoid">
          <figcaption v-if="b.title" class="text-label text-foreground">{{ b.title }}</figcaption>
          <div class="overflow-x-auto rounded-card border border-border">
            <table class="w-full border-collapse text-body-sm">
              <thead class="bg-secondary text-start">
                <tr>
                  <th v-for="(c, i) in fitTable(b).columns" :key="i" scope="col" class="border-b border-border px-3 py-2 text-start text-label text-foreground">{{ c }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, ri) in fitTable(b).rows" :key="ri" class="border-b border-border last:border-b-0">
                  <td v-for="(cell, ci) in r" :key="ci" dir="auto" class="px-3 py-2 text-start text-foreground">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </figure>
        <NqAlert v-else-if="b.type === 'callout' && (b.text.trim() || b.title?.trim())" :tone="b.tone" :title="b.title" role="note" class="break-inside-avoid">
          <span dir="auto">{{ b.text }}</span>
        </NqAlert>
        <hr v-else-if="b.type === 'divider'" class="border-border" />
      </template>
     </template>
    </template>
  </article>
</template>
