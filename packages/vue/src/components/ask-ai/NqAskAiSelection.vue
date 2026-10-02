<script setup lang="ts">
import { PopoverAnchor } from "reka-ui";
import { BookOpen, Languages, PenLine, RefreshCw, Send, Sparkles, TextQuote, X } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqAiGeneratedLabel, NqAiStreamingText, NqAiSuggestionChips, NqAiThinking, useAiShortcutKeys, type AiAction } from "../ai-states";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCopyButton } from "../copy-button";
import { NqTextarea } from "../field";
import { NqPopover, NqPopoverContent } from "../popover";
import { NqKbd } from "../text";
import { askAiIsIgnoredTarget, askAiNormalizeSelection, askAiReadOutcome, askAiShortenMiddle, type AskAiOutcome } from "./ask-ai-logic";
import { askAiWords, type AskAiLabels } from "./labels";

export interface AskAiRequest {
  /** What to ask: the quick action label, or what the visitor typed. */
  prompt: string;
  /** The selected text, whitespace collapsed and cut to `maxLength`. */
  selection: string;
  /** Set when a quick action ran: `explain`, `summarize`, or your own id. */
  actionId?: string;
}

// Wraps read-only content. Select some text inside it and a small "Ask AI" pill appears by the selection. Press it (or the
// keyboard shortcut) for a panel with quick actions and a question box, then read the answer in place. Selections inside inputs,
// editors and `data-ask-ai-ignore` areas are ignored. It calls `onAsk`, nothing else.
const props = withDefaults(
  defineProps<{
    /** Answer a question about the selection. Return the Markdown text, `{ text }` or `{ error }`; a rejection shows the failure. */
    onAsk: (request: AskAiRequest) => Promise<AskAiOutcome>;
    /** Shows "Replace selection" under an answer. You change the text, the component never edits the page. */
    onReplace?: (answer: string, selection: string) => void;
    /** Quick actions in the popover. Default: explain, summarize, translate, improve, define. Pass `[]` for none. */
    actions?: readonly AiAction[];
    /** Selections shorter than this are ignored. Default 3. */
    minLength?: number;
    /** Longer selections are cut to this many characters. Default 2000. */
    maxLength?: number;
    /** Key that opens the panel from the keyboard while text is selected. Default `mod shift space`. Pass `null` to turn it off. */
    hotkey?: string | null;
    disabled?: boolean;
    labels?: Partial<AskAiLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { onReplace: undefined, actions: undefined, minLength: 3, maxLength: 2000, hotkey: "mod shift space", disabled: false, labels: undefined },
);

interface Picked {
  text: string;
  truncated: boolean;
  range: Range;
}
type Answer = { status: "idle" } | { status: "loading" } | { status: "done"; text: string } | { status: "error"; message: string };

const DEFAULT_ICONS: Record<string, Component> = { explain: BookOpen, summarize: TextQuote, translate: Languages, improve: PenLine, define: BookOpen };

const nq = useNasaq();
const t = computed(() => askAiWords(nq.locale.value, props.labels));
const root = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const picked = ref<Picked | null>(null);
const phase = ref<"pill" | "panel">("pill");
const answer = ref<Answer>({ status: "idle" });
const question = ref("");
const lastPrompt = ref<AskAiRequest | null>(null);
const keys = useAiShortcutKeys(() => props.hotkey ?? undefined);
let pointerDown = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let requestId = 0;

const quick = computed<readonly AiAction[]>(
  () => props.actions ?? (["explain", "summarize", "translate", "improve", "define"] as const).map((id) => ({ id, label: t.value[id], icon: DEFAULT_ICONS[id] })),
);
const doneText = computed(() => (answer.value.status === "done" ? answer.value.text : ""));

function reset() {
  requestId++;
  picked.value = null;
  phase.value = "pill";
  answer.value = { status: "idle" };
  question.value = "";
  lastPrompt.value = null;
}
function closeAndClear() {
  reset();
  window.getSelection()?.removeAllRanges();
}

function evaluate() {
  if (phase.value === "panel") return;
  const el = root.value;
  const sel = window.getSelection();
  if (!el || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
    picked.value = null;
    return;
  }
  const range = sel.getRangeAt(0);
  const anchor = range.commonAncestorContainer;
  const target = anchor instanceof Element ? anchor : anchor.parentElement;
  if (!el.contains(anchor) || askAiIsIgnoredTarget(target)) {
    picked.value = null;
    return;
  }
  const n = askAiNormalizeSelection(sel.toString(), props.minLength, props.maxLength);
  if (n.text === "") {
    picked.value = null;
    return;
  }
  if (picked.value?.text !== n.text) picked.value = { text: n.text, truncated: n.truncated, range: range.cloneRange() };
}

function onChange() {
  clearTimeout(timer);
  // Wait for the pointer to lift, and for keyboard selection to settle, before showing the pill.
  timer = setTimeout(() => {
    if (!pointerDown) evaluate();
  }, 220);
}
function onDown() {
  pointerDown = true;
}
function onUp() {
  if (!pointerDown) return;
  pointerDown = false;
  setTimeout(evaluate, 0);
}
function onKey(e: KeyboardEvent) {
  if (props.disabled || !props.hotkey || !picked.value) return;
  const want = props.hotkey.toLowerCase().split(/\s+/);
  const mod = want.includes("mod") ? e.ctrlKey || e.metaKey : true;
  const shift = want.includes("shift") === e.shiftKey;
  const last = want[want.length - 1] as string;
  const keyOk = last === "space" ? e.code === "Space" : e.key.toLowerCase() === last;
  if (mod && shift && keyOk && phase.value === "pill") {
    e.preventDefault();
    phase.value = "panel";
  }
}
onMounted(() => {
  document.addEventListener("selectionchange", onChange);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener("selectionchange", onChange);
  window.removeEventListener("pointerup", onUp);
  window.removeEventListener("pointercancel", onUp);
  window.removeEventListener("keydown", onKey);
  clearTimeout(timer);
});

watch(phase, async (p) => {
  if (p !== "panel") return;
  await nextTick();
  panel.value?.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true });
});

async function ask(req: AskAiRequest) {
  const id = ++requestId;
  lastPrompt.value = req;
  answer.value = { status: "loading" };
  let result: { text: string } | { error: string };
  try {
    result = askAiReadOutcome(await props.onAsk(req));
  } catch (e) {
    result = { error: e instanceof Error ? e.message : "" };
  }
  if (id !== requestId) return;
  answer.value = "text" in result ? { status: "done", text: result.text } : { status: "error", message: result.error || t.value.failed };
}
function submit() {
  const prompt = question.value.trim();
  if (!picked.value || prompt === "" || answer.value.status === "loading") return;
  void ask({ prompt, selection: picked.value.text });
}
function onQuick(id: string) {
  const a = quick.value.find((x) => x.id === id);
  if (a && picked.value) void ask({ prompt: a.label, selection: picked.value.text, actionId: a.id });
}
function onRetry() {
  if (lastPrompt.value) void ask(lastPrompt.value);
}
function onAnother() {
  requestId++;
  answer.value = { status: "idle" };
  lastPrompt.value = null;
}
function onReplaceClick() {
  if (picked.value) props.onReplace?.(doneText.value, picked.value.text);
}
function onTextKey(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    submit();
  }
}
function onOpenChange(next: boolean) {
  if (next) return;
  // A press elsewhere collapses the selection, which hides the pill. Only the open panel needs to close itself.
  if (phase.value === "panel") closeAndClear();
}

const reference = computed(() => (picked.value ? { getBoundingClientRect: () => picked.value!.range.getBoundingClientRect() } : undefined));
const open = computed(() => Boolean(picked.value) && !props.disabled);
</script>

<template>
  <div ref="root" data-slot="ask-ai-selection" :class="props.class" @pointerdown="onDown">
    <slot />
    <NqPopover :open="open" @update:open="onOpenChange">
      <PopoverAnchor v-if="reference" :reference="reference" />
      <NqPopoverContent
        data-slot="ask-ai-popup"
        :data-phase="phase"
        :side="phase === 'pill' ? 'top' : 'bottom'"
        :side-offset="8"
        :aria-label="t.title"
        :class="phase === 'pill' ? 'w-auto p-1' : 'w-[22rem] p-3'"
        @open-auto-focus.prevent
        @close-auto-focus.prevent
        @keydown.esc="closeAndClear"
      >
        <NqButton v-if="picked && phase === 'pill'" variant="ghost" size="sm" class="gap-1.5" @mousedown.prevent @pointerdown.stop @click="phase = 'panel'">
          <Sparkles aria-hidden="true" class="text-nq-accent-text" />
          {{ t.ask }}
          <span v-if="keys.length > 0" dir="ltr" class="ms-1 hidden items-center gap-0.5 sm:inline-flex">
            <NqKbd v-for="k in keys" :key="k">{{ k }}</NqKbd>
          </span>
        </NqButton>
        <div v-if="picked && phase === 'panel'" ref="panel" data-slot="ask-ai-panel" class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-2">
            <span class="flex items-center gap-1.5 text-body-sm font-semibold text-foreground">
              <Sparkles aria-hidden="true" class="size-4 text-nq-accent-text" />
              {{ t.ask }}
            </span>
            <NqButton variant="ghost" size="icon-sm" :aria-label="t.close" @click="closeAndClear"><X aria-hidden="true" /></NqButton>
          </div>
          <figure class="flex flex-col gap-1">
            <figcaption class="sr-only">{{ t.selected }}</figcaption>
            <blockquote dir="auto" class="line-clamp-3 border-s-2 border-nq-line-strong ps-3 text-caption text-muted-foreground">{{ askAiShortenMiddle(picked.text, 220) }}</blockquote>
            <span v-if="picked.truncated" class="text-caption text-muted-foreground">{{ t.truncated }}</span>
          </figure>
          <template v-if="answer.status === 'idle' || answer.status === 'error'">
            <NqAlert v-if="answer.status === 'error'" tone="danger">
              {{ answer.message }}
              <template #action><NqButton size="sm" variant="secondary" @click="onRetry">{{ t.retry }}</NqButton></template>
            </NqAlert>
            <NqAiSuggestionChips v-if="quick.length > 0" :suggestions="quick" :on-pick="onQuick" :label="t.quick" />
            <form class="flex items-end gap-2" @submit.prevent="submit">
              <NqTextarea v-model="question" :rows="1" :aria-label="t.inputLabel" :placeholder="t.placeholder" dir="auto" class="min-h-control flex-1 resize-none" @keydown="onTextKey" />
              <NqButton type="submit" variant="primary" size="icon" :aria-label="t.send" :disabled="question.trim() === ''"><Send aria-hidden="true" class="rtl:-scale-x-100" /></NqButton>
            </form>
          </template>
          <NqAiThinking v-if="answer.status === 'loading'" compact :label="t.thinking" />
          <div v-if="answer.status === 'done'" class="flex flex-col gap-2">
            <div class="max-h-64 overflow-y-auto"><NqAiStreamingText :text="doneText" /></div>
            <div class="flex flex-wrap items-center gap-1">
              <NqAiGeneratedLabel />
              <span class="flex-1" />
              <NqCopyButton :value="doneText" variant="ghost" size="icon-sm" :label="t.copy" />
              <NqButton v-if="props.onReplace" variant="ghost" size="sm" @click="onReplaceClick">
                <RefreshCw aria-hidden="true" />
                {{ t.replace }}
              </NqButton>
              <NqButton variant="ghost" size="sm" @click="onAnother">{{ t.another }}</NqButton>
            </div>
          </div>
        </div>
      </NqPopoverContent>
    </NqPopover>
  </div>
</template>
