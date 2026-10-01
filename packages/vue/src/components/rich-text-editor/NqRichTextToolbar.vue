<script setup lang="ts">
import {
  Bold, Code, Heading1, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Redo2, Strikethrough, Underline as UnderlineIcon, Undo2,
} from "lucide-vue-next";
import { computed, ref, type Component } from "vue";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqInput } from "../field";
import { NqIcon } from "../icon";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import { NqSeparator } from "../separator";
import { NqKbd } from "../text";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { NqTooltip } from "../tooltip";
import {
  BLOCK_ITEMS, EMPTY_ACTIVE, MARK_ITEMS, isSafeLink, readActive, richTextStrings, runItem, shortcutKeys,
  type RichTextEditorLike, type RichTextToolbarItem,
} from "./rich-text-editor-logic";

// The toolbar of NqRichTextEditor: toggles for marks and blocks, a link popover, undo and redo. It reads the editor's
// state on every `version` bump (the frame bumps it on each Tiptap transaction) and runs commands through `editor.chain()`.
interface Props {
  /** A Tiptap Editor, or null while it loads (every button is then disabled). */
  editor: RichTextEditorLike | null;
  items: RichTextToolbarItem[];
  /** Bumped by the frame on every editor transaction so the pressed states refresh. */
  version?: number;
}
const props = withDefaults(defineProps<Props>(), { version: 0 });

const nq = useNasaq();
const t = computed(() => richTextStrings(nq.locale.value));
const active = computed(() => {
  void props.version;
  return props.editor ? readActive(props.editor) : EMPTY_ACTIVE;
});

const icons: Record<string, Component> = {
  bold: Bold, italic: Italic, underline: UnderlineIcon, strike: Strikethrough, code: Code,
  h1: Heading1, h2: Heading2, h3: Heading3, bulletList: List, orderedList: ListOrdered, blockquote: Quote,
};
const has = (i: RichTextToolbarItem) => props.items.includes(i);
const marks = computed(() => MARK_ITEMS.filter(has));
const blocks = computed(() => BLOCK_ITEMS.filter(has));
const hasTail = computed(() => has("link") || has("undo") || has("redo"));
const groups = computed(() => [marks.value, blocks.value].filter((g) => g.length > 0));
const label = (i: RichTextToolbarItem) => t.value[i as keyof typeof t.value];
const isOn = (i: RichTextToolbarItem) => active.value[i as keyof typeof active.value] === true;

function onGroup(list: readonly RichTextToolbarItem[], next: string[]) {
  if (!props.editor) return;
  // A toggle reports the whole new set; run the one item that changed.
  const changed = list.find((i) => next.includes(i) !== isOn(i));
  if (changed) runItem(props.editor, changed);
}

const open = ref(false);
const url = ref("");
const error = ref(false);
function onOpen(next: boolean) {
  open.value = next;
  if (next) {
    url.value = active.value.href;
    error.value = false;
  }
}
function history(name: "undo" | "redo") {
  (props.editor?.chain().focus() as unknown as Record<string, () => { run(): boolean }> | undefined)?.[name]?.().run();
}
function unsetLink() {
  (props.editor?.chain().focus().extendMarkRange as unknown as (n: string) => { unsetLink(): { run(): boolean } })("link").unsetLink().run();
}
function submit() {
  const editor = props.editor;
  if (!editor) return;
  const next = url.value.trim();
  if (!next) unsetLink();
  else if (isSafeLink(next)) (editor.chain().focus().extendMarkRange as unknown as (n: string) => { setLink(o: { href: string }): { run(): boolean } })("link").setLink({ href: next }).run();
  else {
    error.value = true;
    return;
  }
  open.value = false;
}
const keep = (e: MouseEvent) => e.preventDefault();
</script>

<template>
  <div role="toolbar" :aria-label="t.toolbar" data-slot="rich-text-editor-toolbar" class="flex flex-wrap items-center gap-1 border-b border-border bg-card p-1.5">
    <template v-for="(list, gi) in groups" :key="list[0]">
      <NqSeparator v-if="gi > 0" orientation="vertical" />
      <NqToggleGroup multiple class="bg-transparent p-0" :model-value="list.filter(isOn)" :disabled="!props.editor" @update:model-value="(v) => onGroup(list, v)">
        <NqTooltip v-for="i in list" :key="i">
          <NqToggle :value="i" :aria-label="label(i)" class="size-control-sm px-0" @mousedown="keep">
            <component :is="icons[i]" />
          </NqToggle>
          <template #content>
            <span class="flex items-center gap-2">
              {{ label(i) }}
              <NqKbd class="border-transparent bg-transparent text-inherit">{{ shortcutKeys(i) }}</NqKbd>
            </span>
          </template>
        </NqTooltip>
      </NqToggleGroup>
    </template>

    <template v-if="hasTail">
      <NqSeparator v-if="groups.length > 0" orientation="vertical" />
      <div class="flex items-center gap-0.5">
        <NqPopover v-if="has('link')" :open="open" @update:open="onOpen">
          <NqTooltip>
            <NqPopoverTrigger as-child>
              <NqButton size="icon-sm" variant="ghost" :aria-label="t.link" :aria-pressed="active.link" :data-pressed="active.link || undefined" :disabled="!props.editor" class="data-pressed:bg-nq-selected">
                <Link2 />
              </NqButton>
            </NqPopoverTrigger>
            <template #content>
              <span class="flex items-center gap-2">
                {{ t.link }}
                <NqKbd class="border-transparent bg-transparent text-inherit">{{ shortcutKeys("link") }}</NqKbd>
              </span>
            </template>
          </NqTooltip>
          <NqPopoverContent align="start" class="w-72">
            <form class="flex flex-col gap-2" @submit.prevent="submit">
              <NqInput v-model="url" ltr type="text" inputmode="url" placeholder="https://" :aria-label="t.url" :aria-invalid="error || undefined" @update:model-value="error = false" />
              <div class="flex justify-end gap-2">
                <NqButton v-if="active.link" type="button" size="sm" variant="ghost" @click="unsetLink(); open = false">{{ t.remove }}</NqButton>
                <NqButton type="submit" size="sm" variant="primary">{{ t.apply }}</NqButton>
              </div>
            </form>
          </NqPopoverContent>
        </NqPopover>
        <NqTooltip v-if="has('undo')">
          <NqButton size="icon-sm" variant="ghost" :aria-label="t.undo" :disabled="!active.canUndo" @mousedown="keep" @click="history('undo')">
            <NqIcon :icon="Undo2" />
          </NqButton>
          <template #content>
            <span class="flex items-center gap-2">{{ t.undo }}<NqKbd class="border-transparent bg-transparent text-inherit">{{ shortcutKeys("undo") }}</NqKbd></span>
          </template>
        </NqTooltip>
        <NqTooltip v-if="has('redo')">
          <NqButton size="icon-sm" variant="ghost" :aria-label="t.redo" :disabled="!active.canRedo" @mousedown="keep" @click="history('redo')">
            <NqIcon :icon="Redo2" />
          </NqButton>
          <template #content>
            <span class="flex items-center gap-2">{{ t.redo }}<NqKbd class="border-transparent bg-transparent text-inherit">{{ shortcutKeys("redo") }}</NqKbd></span>
          </template>
        </NqTooltip>
      </div>
    </template>
  </div>
</template>
