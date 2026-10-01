<script setup lang="ts">
import { ArrowDownToLine, Check, Copy, Eraser, WrapText } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { copyText } from "../copy-button";
import { NqSpinner } from "../spinner";
import { parseAnsiRows, stripAnsi, type AnsiSpan } from "./ansi";
import { useFollowScroll } from "./follow-scroll";
import NqAnsiSpans from "./NqAnsiSpans.vue";
import NqTerminalInput from "./NqTerminalInput.vue";
import { TERMINAL_STRINGS, type TerminalLabels, type TerminalLine, type TerminalLineData, type TerminalLineKind } from "./strings";

// Terminal-style output: prompt lines, ANSI colours mapped to tokens, streaming with a follow mode, copy, and an optional command input.
// Always left-to-right, also in Arabic pages; only the chrome is translated.
interface Props {
  /** What was printed, oldest first. Append to stream. */
  lines: readonly TerminalLine[];
  /** Header text, e.g. `~/app`. Default "Terminal". */
  title?: string;
  /** The prompt shown before command lines and the input. */
  prompt?: string;
  /** The process is still running: shows a live indicator and a blinking cursor. */
  streaming?: boolean;
  /** Keep the view pinned to the newest line while output arrives. */
  follow?: boolean;
  /** Keep at most this many rows in the DOM; older ones are dropped with a note. */
  maxLines?: number;
  lineNumbers?: boolean;
  /** Wrap long lines instead of scrolling sideways. */
  wrap?: boolean;
  /** Show the copy button. */
  copyable?: boolean;
  /** Show a clear button that calls this. */
  onClear?: () => void;
  /** Adds an input line. Called with the typed command; the input stays disabled until it resolves. */
  onCommand?: (command: string) => Promise<void> | void;
  /** Height of the output area (CSS value or number of px). */
  height?: string | number;
  labels?: Partial<TerminalLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  prompt: "$",
  streaming: false,
  follow: true,
  maxLines: 2000,
  lineNumbers: false,
  wrap: false,
  copyable: true,
  onClear: undefined,
  onCommand: undefined,
  height: "20rem",
  labels: undefined,
});

const nq = useNasaq();
const t = computed(() => ({ ...TERMINAL_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as TerminalLabels);

const KIND_CLASS: Record<TerminalLineKind, string> = {
  command: "text-foreground",
  output: "text-nq-fg-body",
  error: "text-nq-danger-text",
  info: "text-nq-info-text",
  success: "text-nq-success-text",
};
interface Row {
  key: string;
  kind: TerminalLineKind;
  spans: AnsiSpan[];
  prompt: boolean;
}

const wrap = ref(props.wrap);
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

const all = computed(() => {
  const out: Row[] = [];
  props.lines.forEach((line, i) => {
    const data: TerminalLineData = typeof line === "string" ? { text: line } : line;
    const kind = data.kind ?? "output";
    parseAnsiRows(data.text).forEach((spans, r) => out.push({ key: `${data.id ?? i}:${r}`, kind, spans, prompt: kind === "command" && r === 0 }));
  });
  return out;
});
const hidden = computed(() => Math.max(0, all.value.length - props.maxLines));
const rows = computed(() => (hidden.value ? all.value.slice(hidden.value) : all.value));
const gutter = computed(() => String(all.value.length).length);

const { el: output, following, setFollowing, onScroll } = useFollowScroll<HTMLDivElement>(() => rows.value.length + (props.streaming ? 1 : 0), props.follow);

function plain() {
  return props.lines.map((l) => stripAnsi(typeof l === "string" ? l : l.kind === "command" ? `${props.prompt} ${l.text}` : l.text)).join("\n");
}
async function copy() {
  copied.value = await copyText(plain());
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copied.value = false), 1500);
}
onBeforeUnmount(() => copiedTimer && clearTimeout(copiedTimer));
</script>

<template>
  <div
    data-slot="terminal"
    :data-streaming="props.streaming || undefined"
    dir="ltr"
    :class="cn('relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start', props.class)"
  >
    <div data-slot="terminal-header" class="flex h-row shrink-0 items-center justify-between gap-2 border-b border-border ps-3 pe-1.5">
      <span class="flex min-w-0 items-center gap-2 font-mono text-caption text-muted-foreground">
        <span class="truncate">{{ props.title ?? t.title }}</span>
        <span v-if="props.streaming" class="inline-flex shrink-0 items-center gap-1 font-sans text-nq-success-text">
          <NqSpinner class="size-3" />
          {{ t.streaming }}
        </span>
      </span>
      <span class="flex shrink-0 items-center">
        <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.wrap" :aria-pressed="wrap" :data-active="wrap || undefined" class="data-active:bg-nq-selected" @click="wrap = !wrap">
          <WrapText aria-hidden="true" />
        </NqButton>
        <NqButton v-if="props.onClear" type="button" variant="ghost" size="icon-sm" :aria-label="t.clear" @click="props.onClear()">
          <Eraser aria-hidden="true" />
        </NqButton>
        <NqButton v-if="props.copyable" type="button" variant="ghost" size="icon-sm" :aria-label="t.copy" :data-copied="copied || undefined" class="data-copied:text-nq-success-text" @click="copy">
          <Check v-if="copied" aria-hidden="true" />
          <Copy v-else aria-hidden="true" />
        </NqButton>
      </span>
    </div>

    <div
      ref="output"
      data-slot="terminal-output"
      role="log"
      :aria-label="t.output"
      aria-live="off"
      tabindex="0"
      :style="{ height: typeof props.height === 'number' ? `${props.height}px` : props.height }"
      class="min-h-0 overflow-auto py-2 font-mono text-code outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
      @scroll="onScroll"
    >
      <div :class="cn('min-w-full', wrap ? 'w-full' : 'w-max')">
        <p v-if="hidden" class="px-3 pb-1 text-caption text-muted-foreground">{{ t.trimmed(hidden) }}</p>
        <p v-if="rows.length === 0 && !props.streaming" class="px-3 text-muted-foreground">{{ t.empty }}</p>
        <div v-for="(row, i) in rows" :key="row.key" data-slot="terminal-row" :data-kind="row.kind" :class="cn('flex min-h-[1lh] px-3', KIND_CLASS[row.kind], wrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre')">
          <span v-if="props.lineNumbers" aria-hidden="true" class="me-3 inline-block shrink-0 select-none text-end text-muted-foreground tabular-nums" :style="{ minWidth: `${gutter}ch` }">{{ hidden + i + 1 }}</span>
          <span v-if="row.prompt" aria-hidden="true" class="me-2 shrink-0 select-none text-nq-accent-text">{{ props.prompt }}</span>
          <span class="min-w-0"><NqAnsiSpans :spans="row.spans" /></span>
        </div>
        <div v-if="props.streaming" class="flex min-h-[1lh] px-3" aria-hidden="true">
          <span class="inline-block h-[1lh] w-[0.6em] bg-nq-fg motion-safe:animate-pulse" />
        </div>
      </div>
    </div>

    <NqButton
      v-if="!following && (props.streaming || rows.length > 0)"
      type="button"
      size="sm"
      variant="secondary"
      class="absolute end-3 bottom-3 shadow-sm"
      :style="props.onCommand ? { bottom: '3.25rem' } : undefined"
      @click="setFollowing(true)"
    >
      <ArrowDownToLine aria-hidden="true" />
      {{ t.jump }}
    </NqButton>

    <NqTerminalInput v-if="props.onCommand" :prompt="props.prompt" :on-command="props.onCommand" :label="t.input" :running-label="t.running" />

    <span role="status" aria-live="polite" class="sr-only">{{ copied ? t.copied : "" }}</span>
  </div>
</template>
