<script setup lang="ts">
import { Link2 } from "lucide-vue-next";
import { computed, h, type HTMLAttributes, type VNode } from "vue";
import { cn } from "../../lib/cn";
import { CALLOUT_KINDS, extractToc, type CalloutKind } from "../blog-index/blog-model";
import { NqCodeBlock, NqInlineCode } from "../code-block";
import { NqIcon } from "../icon";
import { parseMarkdown, type MdBlock, type MdInline, type MdItem } from "../markdown/parse";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import { NqText } from "../text";
import NqCallout from "./NqCallout.vue";
import { useBlogPostStrings } from "./labels";

// The article text: Markdown in Nasaq typography with anchored h2/h3 headings (ids match extractToc), code blocks, tables, and
// `> [!NOTE]` callouts. Raw HTML in the source is dropped.
interface Props {
  /** The Markdown source. */
  markdown: string;
  /** Distance in px that headings keep from the top when scrolled to. Default 96. */
  scrollOffset?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { scrollOffset: 96 });
const { t } = useBlogPostStrings();
const blocks = computed(() => parseMarkdown(props.markdown));

const cellAlign = (a: string | null) => (a === "left" ? "text-start" : a === "right" ? "text-end" : a === "center" ? "text-center" : undefined);
const HEADINGS = { 1: ["h1", "h1"], 2: ["h2", "h2"], 3: ["h3", "h3"], 4: ["h3", "h4"], 5: ["h3", "h5"], 6: ["h3", "h6"] } as const;

function plain(nodes: MdInline[]): string {
  return nodes.map((n) => (n.t === "text" || n.t === "code" ? n.v : n.t === "br" ? " " : n.t === "img" ? n.alt : plain(n.c))).join("");
}

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

/** `[!NOTE]` on the first line of a blockquote: the kind and the blocks left once the marker is gone. */
function calloutOf(list: MdBlock[]): { kind: CalloutKind; rest: MdBlock[] } | null {
  const first = list[0];
  const lead = first?.t === "p" ? first.c[0] : undefined;
  const m = lead?.t === "text" ? /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\r?\n?/i.exec(lead.v) : null;
  if (!first || first.t !== "p" || !lead || lead.t !== "text" || !m) return null;
  const kind = (m[1] as string).toLowerCase() as CalloutKind;
  if (!CALLOUT_KINDS.includes(kind)) return null;
  const text = lead.v.slice(m[0].length);
  const c = text ? [{ t: "text" as const, v: text }, ...first.c.slice(1)] : first.c.slice(1);
  // A "br" right after the marker belongs to the marker's line.
  const trimmed = c[0]?.t === "br" ? c.slice(1) : c;
  return { kind, rest: [...(trimmed.length ? [{ ...first, c: trimmed }] : []), ...list.slice(1)] };
}

function item(it: MdItem): VNode {
  const lone = it.blocks.length === 1 && it.blocks[0]!.t === "p" ? (it.blocks[0] as Extract<MdBlock, { t: "p" }>) : null;
  const task = it.checked !== undefined;
  return h("li", { dir: "auto", class: cn("text-start [&.task-list-item]:list-none [&.task-list-item]:-ms-6", task && "task-list-item") }, [
    task ? h("input", { type: "checkbox", checked: it.checked, disabled: true, class: "me-2 align-middle accent-[var(--nq-accent)]" }) : null,
    ...(lone ? inline(lone.c) : block(it.blocks)),
  ]);
}

// Heading ids come from extractToc, in source order; a heading that is not in it (setext, inside a quote) gets none.
let toc: ReturnType<typeof extractToc> = [];
let tocAt = 0;
function idFor(text: string): string | undefined {
  for (let i = tocAt; i < toc.length; i++) {
    if (toc[i]!.text === text) {
      tocAt = i + 1;
      return toc[i]!.id;
    }
  }
  return undefined;
}

function block(list: MdBlock[], top = false): VNode[] {
  return list.map((b): VNode => {
    switch (b.t) {
      case "h": {
        const [variant, tag] = HEADINGS[b.level];
        // Only h2 to h4 are anchored (like React's PostBody); h1, h5 and h6 render as plain Markdown headings.
        const anchored = b.level >= 2 && b.level <= 4;
        if (!anchored) return h(NqText, { as: tag, variant, dir: "auto", class: "mt-2 text-start first:mt-0" }, () => inline(b.c));
        const id = top ? idFor(plain(b.c)) : undefined;
        return h(
          NqText,
          { as: tag, variant, id, dir: "auto", style: { scrollMarginTop: `${props.scrollOffset}px` }, class: "group/heading mt-4 text-start first:mt-0" },
          () => [
            ...inline(b.c),
            id
              ? h(
                  "a",
                  {
                    href: `#${id}`,
                    "aria-label": t.value.permalink,
                    class:
                      "ms-2 inline-flex align-middle text-muted-foreground opacity-0 outline-none transition-opacity duration-150 group-hover/heading:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-nq-focus",
                  },
                  [h(NqIcon, { icon: Link2, class: "size-4" })],
                )
              : null,
          ],
        );
      }
      case "p":
        return h(NqText, { as: "p", variant: "body", dir: "auto", class: "text-start" }, () => inline(b.c));
      case "ul":
        return h("ul", { dir: "auto", class: "list-disc space-y-1 ps-6 text-body text-nq-fg-body marker:text-muted-foreground" }, b.items.map(item));
      case "ol":
        return h("ol", { dir: "auto", start: b.start !== 1 ? b.start : undefined, class: "list-decimal space-y-1 ps-6 text-body text-nq-fg-body marker:text-muted-foreground" }, b.items.map(item));
      case "bq": {
        const callout = calloutOf(b.blocks);
        if (callout) return h(NqCallout, { kind: callout.kind }, () => block(callout.rest));
        return h("blockquote", { dir: "auto", class: "border-s-2 border-nq-line-strong ps-4 text-start text-muted-foreground" }, block(b.blocks));
      }
      case "hr":
        return h("hr", { class: "border-0 border-t border-border" });
      case "code":
        return h(NqCodeBlock, { code: b.code, language: b.lang });
      case "table":
        return h(NqTable, { dir: "auto" }, () => [
          h(NqTableHeader, null, () => h(NqTableRow, null, () => b.head.map((c, i) => h(NqTableHead, { dir: "auto", class: cn("text-start", cellAlign(b.align[i] ?? null)) }, () => inline(c))))),
          h(NqTableBody, null, () =>
            b.rows.map((row) =>
              h(NqTableRow, null, () => row.map((c, i) => h(NqTableCell, { dir: "auto", class: cn("h-auto whitespace-normal py-2 text-start", cellAlign(b.align[i] ?? null)) }, () => inline(c)))),
            ),
          ),
        ]);
    }
  });
}

const Body = () => {
  toc = extractToc(props.markdown, { minLevel: 1, maxLevel: 6 });
  tocAt = 0;
  return block(blocks.value, true);
};
</script>

<template>
  <div data-slot="post-body" :class="cn('flex min-w-0 flex-col gap-3 text-body text-nq-fg-body', 'gap-5 text-[1.0625rem] leading-relaxed', props.class)"><Body /></div>
</template>
