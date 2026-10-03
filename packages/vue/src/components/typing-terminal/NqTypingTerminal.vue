<script setup lang="ts">
import { RotateCcw } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqAnsiText, stripAnsi } from "../terminal";

// A terminal that types commands and prints their output, step by step, for hero sections and docs.
// The first render is the finished transcript, so servers, crawlers and reduced motion get all of it.
const STRINGS = {
  en: { title: "Terminal", replay: "Replay", transcript: "Terminal session" },
  ar: { title: "الطرفية", replay: "إعادة التشغيل", transcript: "جلسة الطرفية" },
};

export interface TypingTerminalStep {
  /** The command typed at the prompt, without the prompt. */
  cmd: string;
  /** Lines printed after it. May contain ANSI colour codes. */
  out?: readonly string[];
}
export type TypingTerminalLabels = Partial<(typeof STRINGS)["en"]>;

const props = withDefaults(
  defineProps<{
    steps: readonly TypingTerminalStep[];
    /** In the header. Default "Terminal" / "الطرفية". Also the `title` slot. */
    title?: string;
    prompt?: string;
    /** Milliseconds per typed character. Default 28. */
    typeMs?: number;
    /** Milliseconds between printed lines. Default 110. */
    lineMs?: number;
    /** Start again after a pause instead of stopping with a Replay button. */
    loop?: boolean;
    /** Fixed height of the body in pixels, so the page does not move while it types. Default 320. */
    height?: number;
    /** Start playing. Set it from an in-view observer to play when scrolled to. Default true. */
    play?: boolean;
    labels?: TypingTerminalLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { title: undefined, prompt: "❯", typeMs: 28, lineMs: 110, loop: false, height: 320, play: true, labels: undefined },
);
const emit = defineEmits<{
  /** The playback ended, or at once when motion is reduced. */
  complete: [];
}>();

interface Progress {
  step: number;
  typed: number;
  lines: number;
  end: boolean;
}

const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const fullProgress = (): Progress => ({ step: props.steps.length, typed: 0, lines: 0, end: true });
const progress = ref<Progress>(fullProgress());
const run = ref(0);
const playing = ref(false);
const body = ref<HTMLDivElement>();

const staticFrame = () => typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || navigator.webdriver === true);

let stop: (() => void) | undefined;
function start() {
  stop?.();
  stop = undefined;
  if (!props.play) return;
  if (staticFrame()) {
    progress.value = fullProgress();
    emit("complete");
    return;
  }
  let alive = true;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const wait = (ms: number) => new Promise<void>((resolve) => timers.push(setTimeout(resolve, ms)));
  void (async () => {
    playing.value = true;
    do {
      for (let s = 0; s < props.steps.length && alive; s++) {
        const step = props.steps[s];
        if (!step) continue;
        for (let c = 0; c <= step.cmd.length && alive; c++) {
          progress.value = { step: s, typed: c, lines: 0, end: false };
          await wait(props.typeMs);
        }
        await wait(240);
        for (let l = 1; l <= (step.out?.length ?? 0) && alive; l++) {
          progress.value = { step: s, typed: step.cmd.length, lines: l, end: false };
          await wait(props.lineMs);
        }
      }
      if (!alive) return;
      progress.value = fullProgress();
      if (!props.loop) break;
      await wait(4000);
    } while (alive);
    if (!alive) return;
    playing.value = false;
    emit("complete");
  })();
  stop = () => {
    alive = false;
    for (const id of timers) clearTimeout(id);
  };
}

onMounted(start);
watch(() => [props.steps, props.typeMs, props.lineMs, props.loop, props.play, run.value], start);
onBeforeUnmount(() => stop?.());

// Follow the newest line.
watch(progress, () => nextTick(() => body.value && (body.value.scrollTop = body.value.scrollHeight)));

const rows = computed(() => {
  const out: { key: string; kind: "command" | "output"; cmd?: string; typing?: boolean; line?: string }[] = [];
  props.steps.forEach((step, s) => {
    if (s > progress.value.step) return;
    const current = s === progress.value.step && !progress.value.end;
    const typing = current && progress.value.typed <= step.cmd.length && progress.value.lines === 0;
    out.push({ key: `c${s}`, kind: "command", cmd: current ? step.cmd.slice(0, progress.value.typed) : step.cmd, typing });
    const lines = step.out ?? [];
    lines.slice(0, current ? progress.value.lines : lines.length).forEach((line, l) => out.push({ key: `o${s}-${l}`, kind: "output", line }));
  });
  return out;
});
const transcript = computed(() => stripAnsi(props.steps.map((s) => [`${props.prompt} ${s.cmd}`, ...(s.out ?? [])].join("\n")).join("\n")));
</script>

<template>
  <div
    data-slot="typing-terminal"
    :data-playing="playing || undefined"
    dir="ltr"
    :class="cn('relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start', props.class)"
  >
    <div data-slot="typing-terminal-header" class="flex h-row shrink-0 items-center gap-2 border-b border-border ps-3 pe-1.5">
      <span aria-hidden="true" class="flex gap-1.5">
        <span class="size-2.5 rounded-full bg-border" />
        <span class="size-2.5 rounded-full bg-border" />
        <span class="size-2.5 rounded-full bg-border" />
      </span>
      <span class="min-w-0 flex-1 truncate font-mono text-caption text-muted-foreground"><slot name="title">{{ props.title ?? t.title }}</slot></span>
      <NqButton v-if="!props.loop && !playing && props.play" type="button" variant="ghost" size="sm" @click="run++">
        <RotateCcw aria-hidden="true" />
        {{ t.replay }}
      </NqButton>
    </div>
    <pre class="sr-only" :aria-label="t.transcript">{{ transcript }}</pre>
    <div ref="body" data-slot="typing-terminal-body" :style="{ height: `${props.height}px` }" class="min-h-0 overflow-auto px-4 py-3 font-mono text-code leading-relaxed">
      <div aria-hidden="true">
        <template v-for="row in rows" :key="row.key">
          <div v-if="row.kind === 'command'" data-kind="command" class="whitespace-pre-wrap break-words">
            <span class="text-primary">{{ `${props.prompt} ` }}</span>
            <span class="text-foreground">{{ row.cmd }}</span>
            <span v-if="row.typing" aria-hidden="true" class="ms-0.5 inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] animate-pulse bg-primary" />
          </div>
          <div v-else data-kind="output" class="whitespace-pre-wrap break-words text-muted-foreground"><NqAnsiText :text="row.line!" /></div>
        </template>
      </div>
      <div v-if="progress.end && $slots.end" data-slot="typing-terminal-end" class="mt-4 border-t border-border pt-4 font-sans"><slot name="end" /></div>
    </div>
  </div>
</template>
