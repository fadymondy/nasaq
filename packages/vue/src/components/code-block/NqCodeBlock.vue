<script setup lang="ts">
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqCopyButton } from "../copy-button";
import { highlightCode, type CodeToken } from "./highlight";

// Syntax-highlighted code. The tokeniser is built in (no Shiki dependency); pass `highlight` to plug Shiki or any other highlighter in.
// Code is always left-to-right, also in Arabic pages.
interface Props {
  /** The source text. */
  code: string;
  /** A language id or common alias (ts, tsx, bash, py, ...). Omit or use `text` for no highlighting. */
  language?: string;
  /** Shown in a header above the code. */
  filename?: string;
  lineNumbers?: boolean;
  /** Lines to emphasise: `[2, 3]` or `"2-4,7"` (1-based). */
  highlightLines?: number[] | string;
  copyable?: boolean;
  /** Accessible name for the copy button. Default "Copy code" / "نسخ الشيفرة". */
  copyLabel?: string;
  /** Accessible name of the scrollable code region. Defaults to the filename, then "Code". */
  label?: string;
  /** Classes for the scrolling `<pre>`, e.g. `max-h-80`. */
  preClassName?: string;
  /** Replaces the built-in tokeniser, e.g. with Shiki. Resolve `null` for plain text. */
  highlight?: (code: string, language: string) => Promise<CodeToken[][] | null> | CodeToken[][] | null;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  language: "text",
  filename: undefined,
  lineNumbers: false,
  highlightLines: undefined,
  copyable: true,
  copyLabel: undefined,
  label: undefined,
  preClassName: undefined,
  highlight: undefined,
});

const STRINGS = {
  en: { code: "Code", copy: "Copy code", copied: "Code copied to clipboard" },
  ar: { code: "شيفرة برمجية", copy: "نسخ الشيفرة", copied: "تم نسخ الشيفرة إلى الحافظة" },
};
const nq = useNasaq();
const t = computed(() => STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"]);

const source = computed(() => props.code.replace(/\n$/, ""));

/** "1,3-5" or [1, 3, 4, 5] to a set of 1-based line numbers. */
function parseLines(lines: number[] | string | undefined): Set<number> {
  const out = new Set<number>();
  if (!lines) return out;
  if (Array.isArray(lines)) {
    for (const n of lines) out.add(n);
    return out;
  }
  for (const part of lines.split(",")) {
    const [a, b] = part.trim().split("-").map(Number);
    if (a === undefined || Number.isNaN(a)) continue;
    const end = b === undefined || Number.isNaN(b) ? a : b;
    for (let n = a; n <= end; n++) out.add(n);
  }
  return out;
}

// A custom highlighter may be async: the plain lines show first, then the colours arrive (no layout shift).
const custom = ref<{ key: string; tokens: CodeToken[][] } | null>(null);
const key = computed(() => `${props.language}\u0000${source.value}`);
watch(
  [source, () => props.language, () => props.highlight],
  async () => {
    if (!props.highlight) return;
    const k = key.value;
    try {
      const tokens = await props.highlight(source.value, props.language);
      if (tokens && k === key.value) custom.value = { key: k, tokens };
    } catch {
      // The highlighter failed: the plain lines stay.
    }
  },
  { immediate: true },
);

const tokens = computed<CodeToken[][] | null>(() => {
  if (props.highlight) return custom.value?.key === key.value ? custom.value.tokens : null;
  return highlightCode(source.value, props.language);
});
const highlighted = computed(() => tokens.value !== null);
const lines = computed<CodeToken[][]>(() => tokens.value ?? source.value.split("\n").map((content) => (content ? [{ content }] : [])));
const marked = computed(() => parseLines(props.highlightLines));
const gutter = computed(() => String(lines.value.length).length);

const shikiVars = [
  "[--shiki-foreground:var(--nq-fg)]",
  "[--shiki-background:transparent]",
  "[--shiki-token-comment:var(--nq-fg-muted)]",
  "[--shiki-token-keyword:var(--nq-accent-text)]",
  "[--shiki-token-string:var(--nq-success-text)]",
  "[--shiki-token-string-expression:var(--nq-success-text)]",
  "[--shiki-token-constant:var(--nq-warning-text)]",
  "[--shiki-token-function:var(--nq-info-text)]",
  "[--shiki-token-parameter:var(--nq-fg-body)]",
  "[--shiki-token-punctuation:var(--nq-fg-muted)]",
  "[--shiki-token-link:var(--nq-info-text)]",
];
</script>

<template>
  <figure
    data-slot="code-block"
    :data-language="props.language"
    :data-highlighted="highlighted || undefined"
    dir="ltr"
    :class="cn('group/code relative m-0 overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start', shikiVars, props.class)"
  >
    <figcaption v-if="props.filename" data-slot="code-block-header" class="flex h-row items-center justify-between gap-2 border-b border-border ps-3 pe-1.5 font-mono text-caption text-muted-foreground">
      <span class="truncate">{{ props.filename }}</span>
      <slot v-if="props.copyable" name="copy-action"><NqCopyButton :value="source" :label="props.copyLabel ?? t.copy" :copied-label="t.copied" /></slot>
    </figcaption>
    <div v-if="props.copyable && !props.filename" class="absolute end-1.5 top-1.5 z-10 opacity-0 transition-opacity duration-150 ease-nq focus-within:opacity-100 group-hover/code:opacity-100 pointer-coarse:opacity-100">
      <slot name="copy-action"><NqCopyButton :value="source" :label="props.copyLabel ?? t.copy" :copied-label="t.copied" /></slot>
    </div>
    <pre
      data-slot="code-block-pre"
      role="region"
      tabindex="0"
      :aria-label="props.label ?? props.filename ?? t.code"
      :class="cn('m-0 overflow-auto bg-transparent py-3 font-mono text-code text-[var(--shiki-foreground)] outline-none', 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus', props.preClassName)"
    ><code class="block w-max min-w-full"><span
          v-for="(line, i) in lines"
          :key="i"
          :data-line="i + 1"
          :data-highlighted="marked.has(i + 1) || undefined"
          :class="cn('flex min-h-[1lh] border-s-2 border-transparent pe-4 whitespace-pre', !props.lineNumbers && 'ps-3', marked.has(i + 1) && 'border-nq-accent bg-nq-selected')"
        ><span v-if="props.lineNumbers" aria-hidden="true" class="inline-block shrink-0 select-none pe-4 ps-3 text-end text-muted-foreground tabular-nums" :style="{ minWidth: `${gutter + 3}ch` }">{{ i + 1 }}</span><span><span
              v-for="(tok, j) in line"
              :key="j"
              :style="tok.color ? { color: tok.color } : undefined"
              :class="cn(tok.italic && 'italic', tok.bold && 'font-semibold')"
            >{{ tok.content }}</span></span></span></code></pre>
  </figure>
</template>
