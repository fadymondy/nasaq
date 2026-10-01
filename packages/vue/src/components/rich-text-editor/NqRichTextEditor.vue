<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import NqRichTextToolbar from "./NqRichTextToolbar.vue";
import {
  DEFAULT_TOOLBAR, buildExtensions, contentClass, richTextStrings, sameDocument,
  type RichTextEditorLike, type RichTextFormat, type RichTextJson, type RichTextTiptap, type RichTextToolbarItem,
} from "./rich-text-editor-logic";

/**
 * A Tiptap (ProseMirror) rich text editor: bold, italic, underline, strike, code, three heading levels, lists, quote,
 * links, undo and redo, with a Nasaq toolbar. Every block carries `dir="auto"`, so Arabic and English paragraphs align
 * themselves. Tiptap is not bundled: pass `load` (a dynamic import of a module that re-exports `Editor`, `Extension`,
 * `StarterKit` and `Placeholder`) and it is fetched the first time the editor mounts. Until it arrives, the toolbar is disabled.
 *
 * `v-model` holds HTML by default, or the Tiptap JSON document with `format="json"`.
 */
interface Props {
  modelValue?: string | RichTextJson;
  defaultValue?: string | RichTextJson;
  /** Type of the value. HTML by default. */
  format?: RichTextFormat;
  /** Loads Tiptap: `() => import("./tiptap")`. */
  load?: () => Promise<RichTextTiptap>;
  /** Shown while the document is empty. Defaults to a localised "Write something…". */
  placeholder?: string;
  /** Render the content without a toolbar and refuse edits. */
  readOnly?: boolean;
  /** Which toolbar buttons to show, in order. Pass `[]` to hide the toolbar. */
  toolbar?: RichTextToolbarItem[];
  /** Minimum height of the writing area. Default `10rem`. */
  minHeight?: string;
  /** `id` of the label element that names the editor. */
  ariaLabelledby?: string;
  ariaLabel?: string;
  id?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined, defaultValue: undefined, format: "html", load: undefined, placeholder: undefined, readOnly: false,
  toolbar: () => DEFAULT_TOOLBAR, minHeight: "10rem", ariaLabelledby: undefined, ariaLabel: undefined, id: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [value: string | RichTextJson];
  blur: [];
  /** The Tiptap editor exists (for advanced use: commands, extensions). */
  ready: [editor: RichTextEditorLike];
}>();

const nq = useNasaq();
const t = computed(() => richTextStrings(nq.locale.value));
const fallbackId = useId();
const placeholderText = computed(() => props.placeholder ?? t.value.placeholder);

const host = ref<HTMLElement | null>(null);
const editor = shallowRef<RichTextEditorLike | null>(null);
const version = ref(0);
let tiptap: RichTextTiptap | null = null;
const initial = props.modelValue ?? props.defaultValue ?? "";

function create() {
  if (!tiptap || !host.value) return;
  const labelled = props.ariaLabelledby ? { "aria-labelledby": props.ariaLabelledby } : { "aria-label": props.ariaLabel ?? t.value.editor };
  const e = new tiptap.Editor({
    element: host.value,
    extensions: buildExtensions(tiptap, placeholderText.value),
    content: initial,
    editable: !props.readOnly,
    editorProps: {
      attributes: { role: "textbox", "aria-multiline": "true", "aria-readonly": props.readOnly ? "true" : "false", ...labelled, "data-slot": "rich-text-editor-content" },
    },
    onUpdate: ({ editor: ed }: { editor: RichTextEditorLike }) => emit("update:modelValue", props.format === "json" ? ed.getJSON() : ed.getHTML()),
    onBlur: () => emit("blur"),
    onTransaction: () => void version.value++,
  });
  editor.value = e;
  emit("ready", e);
}

onMounted(async () => {
  if (!props.load) return;
  tiptap = await props.load();
  create();
});
onBeforeUnmount(() => editor.value?.destroy());

// Controlled value: push external changes into the document without echoing them back.
watch(
  () => props.modelValue,
  (value) => {
    const e = editor.value;
    if (!e || value === undefined) return;
    const current = props.format === "json" ? e.getJSON() : e.getHTML();
    if (!sameDocument(current, value)) e.commands.setContent(value, { emitUpdate: false });
  },
);
watch(() => props.readOnly, (ro) => editor.value?.setEditable(!ro));

const items = computed(() => (props.readOnly ? [] : props.toolbar));
</script>

<template>
  <div
    data-slot="rich-text-editor"
    :data-readonly="props.readOnly || undefined"
    :id="props.id ?? fallbackId"
    :class="
      cn(
        'flex min-w-0 flex-col overflow-hidden rounded-control border border-input bg-card text-foreground transition-colors duration-150 ease-nq',
        'focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus',
        props.readOnly && 'border-transparent bg-transparent',
        props.class,
      )
    "
  >
    <NqRichTextToolbar v-if="items.length > 0" :editor="editor" :items="items" :version="version" />
    <div ref="host" :style="{ minHeight: props.minHeight }" :class="cn('min-w-0 flex-1 cursor-text', props.readOnly ? 'p-0' : 'px-3 py-2.5', contentClass)" />
  </div>
</template>
