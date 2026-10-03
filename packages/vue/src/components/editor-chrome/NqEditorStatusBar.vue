<script setup lang="ts">
import { AlertCircle, Check, CloudOff } from "lucide-vue-next";
import { getCurrentInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqIcon } from "../icon";
import { formatNumber } from "../numeric";
import { NqSpinner } from "../spinner";
import { editorSaveNeedsAttention, type EditorSaveState } from "./editor-chrome-model";
import { fill, useChromeStrings, type EditorChromeLabels } from "./strings";

// The strip under an editor: cursor, words and characters, and a save state announced politely (an error is announced at once).
// Slots: `items` (inline start), `trailing` (inline end, before the save state). `@retry` shows a Retry button on error.
interface Props {
  words?: number;
  characters?: number;
  /** 1-based caret position. */
  line?: number;
  column?: number;
  /** Characters selected. Shown only when above zero. */
  selection?: number;
  saveState?: EditorSaveState;
  labels?: EditorChromeLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { words: undefined, characters: undefined, line: undefined, column: undefined, selection: undefined, saveState: undefined, labels: undefined });
const emit = defineEmits<{ retry: [] }>();
const canRetry = typeof (getCurrentInstance()?.vnode.props ?? {}).onRetry !== "undefined";
const { t, locale } = useChromeStrings(() => props.labels);
const n = (v: number) => formatNumber(v, locale.value);
</script>

<template>
  <div
    data-slot="editor-status-bar"
    role="group"
    :aria-label="t.statusBar"
    :class="cn('flex min-h-8 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border bg-nq-surface-soft px-3 py-1 text-caption text-muted-foreground', props.class)"
  >
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span v-if="props.line !== undefined" class="tabular-nums">{{ fill(t.line, { n: n(props.line) }) }}{{ props.column !== undefined ? `, ${fill(t.column, { n: n(props.column) })}` : "" }}</span>
      <span v-if="props.selection" class="tabular-nums">{{ fill(t.selected, { n: n(props.selection) }) }}</span>
      <span v-if="props.words !== undefined" class="tabular-nums">{{ fill(t.words, { n: n(props.words) }) }}</span>
      <span v-if="props.characters !== undefined" class="tabular-nums">{{ fill(t.characters, { n: n(props.characters) }) }}</span>
      <slot name="items" />
    </div>
    <div class="flex items-center gap-x-4">
      <slot name="trailing" />
      <span
        v-if="props.saveState"
        data-slot="editor-save-state"
        :data-state="props.saveState"
        :role="editorSaveNeedsAttention(props.saveState) ? 'alert' : 'status'"
        :class="cn('inline-flex items-center gap-1.5', props.saveState === 'error' && 'text-nq-danger-text', props.saveState === 'offline' && 'text-nq-warning-text')"
      >
        <NqSpinner v-if="props.saveState === 'saving'" class="size-3" />
        <span v-else-if="props.saveState === 'dirty'" aria-hidden="true" class="size-2 rounded-full bg-nq-accent" />
        <NqIcon v-else :icon="props.saveState === 'saved' ? Check : props.saveState === 'error' ? AlertCircle : CloudOff" class="size-3" />
        {{ t[props.saveState] }}
        <button
          v-if="props.saveState === 'error' && canRetry"
          type="button"
          class="rounded-[2px] text-foreground underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
          @click="emit('retry')"
        >
          {{ t.retry }}
        </button>
      </span>
    </div>
  </div>
</template>
