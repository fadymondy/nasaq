<script setup lang="ts">
import { computed, h, useSlots, type HTMLAttributes, type VNode, type VNodeArrayChildren } from "vue";
import { cn } from "../../lib/cn";
import { NqCodeBlock, NqInlineCode } from "../code-block";
import { parseMarkdown, type MdBlock, type MdInline, type MdItem } from "../markdown/parse";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import { NqText } from "../text";
import NqDownloadableCodeBlock from "./NqDownloadableCodeBlock.vue";
import NqFrontmatterTable from "./NqFrontmatterTable.vue";
import NqMarkdownTable from "./NqMarkdownTable.vue";
import { parseFenceMeta, parseMarkdownFrontmatter } from "./markdown-extras-model";
import type { MarkdownExtrasLabels } from "./strings";

// Markdown with the extras: the frontmatter as a table, tables you can sort, filter and download, and code blocks with line numbers and
// download. Fence meta is understood: ```ts title="app.ts" showLineNumbers {2,4-6}.
interface Props {
  /** The Markdown source, with an optional frontmatter block (or put it in the default slot). */
  source?: string;
  /** `table` renders the frontmatter above the body, `hide` drops it. Default `table`. */
  frontmatter?: "table" | "hide";
  /** Sortable, filterable tables. `false` keeps the plain tables. */
  tables?: false | { sortable?: boolean; filterable?: boolean | "auto"; filterMinRows?: number; downloadable?: boolean };
  /** Code blocks with a line-number toggle and download. `false` keeps plain code blocks. */
  code?: false | { lineNumbers?: boolean; download?: boolean };
  labels?: MarkdownExtrasLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { source: undefined, frontmatter: "table", tables: () => ({}), code: () => ({}), labels: undefined });

const slots = useSlots();
const text = computed(() => {
  if (props.source !== undefined) return props.source;
  const collect = (list: VNodeArrayChildren): string =>
    list.map((n) => (typeof n === "string" ? n : typeof n === "object" && n && "children" in n ? (typeof n.children === "string" ? n.children : Array.isArray(n.children) ? collect(n.children) : "") : "")).join("");
  return collect(slots.default?.() ?? []);
});
const parsed = computed(() => parseMarkdownFrontmatter(text.value));
const blocks = computed(() => parseMarkdown(parsed.value.body));

/** The text after the language on each fence line, in document order (the parser keeps only the language). */
function fenceMetas(src: string): string[] {
  const out: string[] = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const open = /^[ \t>]*(`{3,}|~{3,})\s*([^`]*)$/.exec(lines[i]!);
    if (!open) continue;
    const mark = open[1]!;
    out.push((open[2] ?? "").trim().replace(/^\S+\s*/, ""));
    const closer = new RegExp(`^[ \\t>]*${mark[0] === "`" ? "`" : "~"}{${mark.length},}\\s*$`);
    i++;
    while (i < lines.length && !closer.test(lines[i]!)) i++;
  }
  return out;
}
function countCode(list: MdBlock[]): number {
  let n = 0;
  for (const b of list) {
    if (b.t === "code") n++;
    else if (b.t === "bq") n += countCode(b.blocks);
    else if (b.t === "ul" || b.t === "ol") for (const it of b.items) n += countCode(it.blocks);
  }
  return n;
}

const cellAlign = (a: string | null) => (a === "left" ? "text-start" : a === "right" ? "text-end" : a === "center" ? "text-center" : undefined);
const alignOf = (a: string | null | undefined): "start" | "center" | "end" | undefined => (a === "left" ? "start" : a === "right" ? "end" : a === "center" ? "center" : undefined);
const HEADINGS = { 1: ["h1", "h1"], 2: ["h2", "h2"], 3: ["h3", "h3"], 4: ["h3", "h4"], 5: ["h3", "h5"], 6: ["h3", "h6"] } as const;

function inline(nodes: MdInline[]): (VNode | string)[] {
  return nodes.map((n): VNode | string => {
    switch (n.t) {
      case "text":
        return n.v;
      case "br":
        return h("br");
      case "code":
        return h(NqInlineCode, null, () => n.v);
      case "strong":
        return h("strong", { class: "font-semibold text-foreground" }, inline(n.c));
      case "em":
        return h("em", inline(n.c));
      case "del":
        return h("del", inline(n.c));
      case "a": {
        const external = typeof n.href === "string" && /^https?:\/\//i.test(n.href);
        return h(
          "a",
          {
            href: n.href,
            ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}),
            class:
              "rounded-[2px] text-foreground underline decoration-nq-line-strong underline-offset-4 outline-none hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
          },
          inline(n.c),
        );
      }
      case "img":
        return h("img", { src: n.src, alt: n.alt ?? "", title: n.title, loading: "lazy", class: "h-auto max-w-full rounded-card border border-border" });
    }
  });
}

function render(list: MdBlock[], metas: string[] | null, counter: { i: number }): VNode[] {
  const item = (it: MdItem): VNode => {
    const lone = it.blocks.length === 1 && it.blocks[0]!.t === "p" ? (it.blocks[0] as Extract<MdBlock, { t: "p" }>) : null;
    const task = it.checked !== undefined;
    return h("li", { dir: "auto", class: cn("text-start [&.task-list-item]:list-none [&.task-list-item]:-ms-6", task && "task-list-item") }, [
      task ? h("input", { type: "checkbox", checked: it.checked, disabled: true, class: "me-2 align-middle accent-[var(--nq-accent)]" }) : null,
      ...(lone ? inline(lone.c) : render(it.blocks, metas, counter)),
    ]);
  };
  return list.map((b): VNode => {
    switch (b.t) {
      case "h": {
        const [variant, tag] = HEADINGS[b.level];
        return h(NqText, { as: tag, variant, dir: "auto", class: "mt-2 text-start first:mt-0" }, () => inline(b.c));
      }
      case "p":
        return h(NqText, { as: "p", variant: "body", dir: "auto", class: "text-start" }, () => inline(b.c));
      case "ul":
        return h("ul", { dir: "auto", class: "list-disc space-y-1 ps-6 text-body text-nq-fg-body marker:text-muted-foreground" }, b.items.map(item));
      case "ol":
        return h("ol", { dir: "auto", start: b.start !== 1 ? b.start : undefined, class: "list-decimal space-y-1 ps-6 text-body text-nq-fg-body marker:text-muted-foreground" }, b.items.map(item));
      case "bq":
        return h("blockquote", { dir: "auto", class: "border-s-2 border-nq-line-strong ps-4 text-start text-muted-foreground" }, render(b.blocks, metas, counter));
      case "hr":
        return h("hr", { class: "border-0 border-t border-border" });
      case "code": {
        if (props.code === false) return h(NqCodeBlock, { code: b.code, language: b.lang });
        const meta = parseFenceMeta(metas?.[counter.i++]);
        return h(NqDownloadableCodeBlock, {
          code: b.code,
          language: b.lang,
          ...(meta.title ? { filename: meta.title } : {}),
          ...(meta.highlight ? { highlightLines: meta.highlight } : {}),
          lineNumbers: meta.lineNumbers ?? props.code.lineNumbers ?? false,
          download: props.code.download ?? true,
          labels: props.labels,
        });
      }
      case "table":
        if (props.tables === false) {
          return h(NqTable, { dir: "auto" }, () => [
            h(NqTableHeader, null, () => h(NqTableRow, null, () => b.head.map((c, i) => h(NqTableHead, { dir: "auto", class: cn("text-start", cellAlign(b.align[i] ?? null)) }, () => inline(c))))),
            h(NqTableBody, null, () =>
              b.rows.map((row) => h(NqTableRow, null, () => row.map((c, i) => h(NqTableCell, { dir: "auto", class: cn("h-auto whitespace-normal py-2 text-start", cellAlign(b.align[i] ?? null)) }, () => inline(c))))),
            ),
          ]);
        }
        return h(NqMarkdownTable, {
          ...props.tables,
          labels: props.labels,
          columns: b.head.map((c, i) => ({ header: inline(c), align: alignOf(b.align[i]) })),
          rows: b.rows.map((row) => ({ cells: row.map((c) => inline(c)) })),
        });
    }
  });
}

const Body = () => {
  const metas = fenceMetas(parsed.value.body);
  return render(blocks.value, metas.length === countCode(blocks.value) ? metas : null, { i: 0 });
};
</script>

<template>
  <div data-slot="rich-markdown" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <NqFrontmatterTable v-if="props.frontmatter === 'table' && parsed.data.length" :data="parsed.data" :labels="props.labels" />
    <div data-slot="markdown" class="flex min-w-0 flex-col gap-3 text-body text-nq-fg-body"><Body /></div>
  </div>
</template>
