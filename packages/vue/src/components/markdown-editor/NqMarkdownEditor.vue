<script setup lang="ts">
import { Bold, Code, Columns2, Eye, Heading2, Heading3, Italic, Link2, List, ListChecks, ListOrdered, Pencil, Quote, SquareCode } from "lucide-vue-next";
import { computed, nextTick, ref, useId, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqMarkdown } from "../markdown";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { NqTooltip } from "../tooltip";
import { markdownEditorStrings, type MarkdownEditorLabels, type MarkdownEditorView } from "./labels";
import { applyMarkdownEditorFormat, MARKDOWN_EDITOR_TOOLS, type MarkdownEditorFormat } from "./markdown-editor-format";

// A plain-text Markdown editor: a formatting toolbar, a text area and a Write / Preview / Split view with a live preview in Nasaq
// typography. No editor engine; Ctrl/Cmd+B, I and K work. For rich text use the rich-text editor.
const props = withDefaults(
  defineProps<{
    /** The Markdown source (`v-model`). Omit to let the editor own it. */
    modelValue?: string;
    defaultValue?: string;
    /** The view (`v-model:view`): write, preview or split. */
    view?: MarkdownEditorView;
    defaultView?: MarkdownEditorView;
    placeholder?: string;
    /** Rows of the text area. Default 10. */
    rows?: number;
    disabled?: boolean;
    /** Name of a hidden input carrying the value, for plain form posts. */
    name?: string;
    /** Accessible name of the text area when there is no visible label. */
    ariaLabel?: string;
    labels?: Partial<MarkdownEditorLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { modelValue: undefined, defaultValue: "", view: undefined, defaultView: "write", rows: 10, disabled: false },
);
const emit = defineEmits<{ "update:modelValue": [value: string]; "update:view": [view: MarkdownEditorView] }>();

const nq = useNasaq();
const t = computed(() => ({ ...markdownEditorStrings[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as MarkdownEditorLabels);
const id = useId();
const field = ref<HTMLTextAreaElement | null>(null);
const innerText = ref(props.defaultValue);
const text = computed(() => props.modelValue ?? innerText.value);
const innerView = ref<MarkdownEditorView>(props.defaultView);
const current = computed(() => props.view ?? innerView.value);

const GLYPHS: Record<MarkdownEditorFormat, Component> = {
  bold: Bold,
  italic: Italic,
  strike: Bold,
  code: Code,
  link: Link2,
  wikilink: Link2,
  h1: Heading2,
  h2: Heading2,
  h3: Heading3,
  quote: Quote,
  bullet: List,
  ordered: ListOrdered,
  task: ListChecks,
  codeBlock: SquareCode,
};
const tools = MARKDOWN_EDITOR_TOOLS.map((x) => ({ ...x, glyph: GLYPHS[x.format] }));
const label = (key: string) => t.value[key as keyof MarkdownEditorLabels];

function setText(next: string) {
  innerText.value = next;
  emit("update:modelValue", next);
}
function setView(next: MarkdownEditorView) {
  innerView.value = next;
  emit("update:view", next);
}

function apply(f: MarkdownEditorFormat) {
  const el = field.value;
  if (!el || props.disabled) return;
  const r = applyMarkdownEditorFormat(text.value, el.selectionStart, el.selectionEnd, f);
  setText(r.value);
  nextTick(() => {
    el.focus();
    el.setSelectionRange(r.start, r.end);
  });
}

function onKeydown(e: KeyboardEvent) {
  if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
  const tool = MARKDOWN_EDITOR_TOOLS.find((x) => x.shortcut === e.key.toLowerCase());
  if (tool) {
    e.preventDefault();
    apply(tool.format);
  }
}

const showEditor = computed(() => current.value !== "preview");
const showPreview = computed(() => current.value !== "write");
</script>

<template>
  <div
    data-slot="markdown-editor"
    :data-view="current"
    :class="cn('flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card', props.disabled && 'opacity-60', props.class)"
  >
    <div class="flex flex-wrap items-center gap-1 border-b border-border px-1.5 py-1">
      <div role="toolbar" :aria-label="t.toolbar" :aria-controls="id" class="flex flex-wrap items-center gap-0.5">
        <NqTooltip v-for="tool in tools" :key="tool.key" :content="tool.shortcut ? `${label(tool.key)} (⌘${tool.shortcut.toUpperCase()})` : label(tool.key)">
          <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="label(tool.key)" :disabled="props.disabled || !showEditor" @mousedown.prevent @click="apply(tool.format)">
            <component :is="tool.glyph" aria-hidden="true" />
          </NqButton>
        </NqTooltip>
      </div>
      <NqToggleGroup :aria-label="t.view" class="ms-auto" :model-value="[current]" @update:model-value="(v) => v[0] && setView(v[0] as MarkdownEditorView)">
        <NqToggle value="write" :aria-label="t.write">
          <Pencil aria-hidden="true" />
          <span class="max-sm:hidden">{{ t.write }}</span>
        </NqToggle>
        <NqToggle value="preview" :aria-label="t.preview">
          <Eye aria-hidden="true" />
          <span class="max-sm:hidden">{{ t.preview }}</span>
        </NqToggle>
        <NqToggle value="split" :aria-label="t.split" class="max-md:hidden">
          <Columns2 aria-hidden="true" />
          <span class="max-sm:hidden">{{ t.split }}</span>
        </NqToggle>
      </NqToggleGroup>
    </div>

    <div :class="cn('grid min-h-0 flex-1', current === 'split' && 'md:grid-cols-2 md:divide-x md:divide-border rtl:md:divide-x-reverse')">
      <textarea
        v-if="showEditor"
        :id="id"
        ref="field"
        dir="auto"
        :value="text"
        :rows="props.rows"
        :disabled="props.disabled"
        :aria-label="props.ariaLabel ?? t.write"
        :placeholder="props.placeholder ?? t.placeholder"
        class="min-h-48 w-full resize-y bg-transparent p-3 font-mono text-body-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:bg-nq-hover/40"
        @input="setText(($event.target as HTMLTextAreaElement).value)"
        @keydown="onKeydown"
      />
      <div v-if="showPreview" data-slot="markdown-editor-preview" aria-live="polite" :class="cn('min-h-48 overflow-auto p-4', current === 'split' && 'max-md:border-t max-md:border-border')">
        <NqMarkdown v-if="text.trim()" :source="text" />
        <p v-else class="text-body-sm text-muted-foreground">{{ t.empty }}</p>
      </div>
    </div>
    <input v-if="props.name" type="hidden" :name="props.name" :value="text" />
  </div>
</template>
