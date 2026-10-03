<script setup lang="ts">
import { computed, h, type HTMLAttributes, type VNode } from "vue";
import { cn } from "../../lib/cn";
import { NqCodeBlock, NqInlineCode } from "../code-block";
import { parseMarkdown, type MdBlock, type MdInline, type MdItem } from "../markdown/parse";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import { NqText } from "../text";
import { aiLinkCitations, aiParseCitationHref } from "./ai-citations-logic";
import type { AiCitationsLabels } from "./labels";
import NqAiCitationMarker from "./NqAiCitationMarker.vue";
import type { AiCitationSource } from "./types";

// Renders an answer with `[n]` markers as small buttons. Hover, focus or press one to see the passage behind it. The Markdown is rendered
// with the same blocks as NqMarkdown (raw HTML dropped); a `#nq-cite-N` link becomes a marker and a number with no source stays plain text.
const props = defineProps<{
  /** Markdown that may hold `[1]`, `[1, 2]` or `[2-4]` markers. Numbers point into `sources` (1-based). */
  text: string;
  sources: readonly AiCitationSource[];
  /** The source whose marker is open or hovered. Controlled by NqAiCitedAnswer, or by you. */
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
  labels?: Partial<AiCitationsLabels>;
  class?: HTMLAttributes["class"];
}>();

const blocks = computed(() => parseMarkdown(aiLinkCitations(props.text, props.sources.length)));
const cellAlign = (a: string | null) => (a === "left" ? "text-start" : a === "right" ? "text-end" : a === "center" ? "text-center" : undefined);
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
        const num = aiParseCitationHref(n.href);
        const source = num ? props.sources[num - 1] : undefined;
        if (num && source) {
          return h(NqAiCitationMarker, { n: num, source, active: props.activeId === source.id, onActiveChange: props.onActiveChange, labels: props.labels });
        }
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

function item(it: MdItem): VNode {
  const lone = it.blocks.length === 1 && it.blocks[0]!.t === "p" ? (it.blocks[0] as Extract<MdBlock, { t: "p" }>) : null;
  const task = it.checked !== undefined;
  return h("li", { dir: "auto", class: cn("text-start [&.task-list-item]:list-none [&.task-list-item]:-ms-6", task && "task-list-item") }, [
    task ? h("input", { type: "checkbox", checked: it.checked, disabled: true, class: "me-2 align-middle accent-[var(--nq-accent)]" }) : null,
    ...(lone ? inline(lone.c) : block(it.blocks)),
  ]);
}

function block(list: MdBlock[]): VNode[] {
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
        return h("blockquote", { dir: "auto", class: "border-s-2 border-nq-line-strong ps-4 text-start text-muted-foreground" }, block(b.blocks));
      case "hr":
        return h("hr", { class: "border-0 border-t border-border" });
      case "code":
        return h(NqCodeBlock, { code: b.code, language: b.lang });
      case "table":
        return h(NqTable, { dir: "auto" }, () => [
          h(NqTableHeader, null, () => h(NqTableRow, null, () => b.head.map((c, i) => h(NqTableHead, { dir: "auto", class: cn("text-start", cellAlign(b.align[i] ?? null)) }, () => inline(c))))),
          h(NqTableBody, null, () =>
            b.rows.map((row) => h(NqTableRow, null, () => row.map((c, i) => h(NqTableCell, { dir: "auto", class: cn("h-auto whitespace-normal py-2 text-start", cellAlign(b.align[i] ?? null)) }, () => inline(c))))),
          ),
        ]);
    }
  });
}

const Body = () => block(blocks.value);
</script>

<template>
  <div data-slot="ai-cited-text" :class="cn('flex min-w-0 flex-col gap-3 text-body text-nq-fg-body', props.class)"><Body /></div>
</template>
