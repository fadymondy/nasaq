<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqNoteDialogs from "./NqNoteDialogs.vue";
import NqNoteEditorBody from "./NqNoteEditorBody.vue";
import { useNotesLabels } from "./strings";
import { useNoteMenu, type NoteMenuApi, type NoteMenuOptions, type NoteResult } from "./use-note-menu";
import type { Note } from "./notes-model";

// The note editor: title, a rich or Markdown body, properties, backlinks, word count and an autosave state. It has a context menu
// (on everything but the text) and a "…" menu with the same actions. Changes go to `onUpdate(id, { title, body })` after
// `autosaveDelay`, on blur, on Mod+S and when the note closes.
interface Props extends NoteMenuOptions {
  /** The note to edit. Switching `note.id` resets the editor; other changes (pin, colour, tags) update in place. */
  note: Note | null | undefined;
  /** Milliseconds of quiet before a change is saved. Default 800. */
  autosaveDelay?: number;
  /** Shows a back button (the list on narrow screens). */
  onBack?: () => void;
  /** Extra classes for the back button, for example `@2xl:hidden`. */
  backClass?: HTMLAttributes["class"];
  /** A wikilink or a backlink was chosen. */
  onOpenNote?: (id: string) => void;
  /** Check the password of a sealed note. Resolve `{ error }` for a wrong one. */
  onUnlock?: (id: string, password: string) => Promise<NoteResult>;
  /** Loads Tiptap for the rich body: `() => import("./tiptap")`. */
  load?: () => Promise<any>;
  /** Share one menu (and its dialogs) with a sibling NqNotesView, as NqNotes does. */
  menu?: NoteMenuApi;
  now?: number;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t } = useNotesLabels(() => props.labels);
const own = useNoteMenu(() => props);
const menu = computed(() => props.menu ?? own);
</script>

<template>
  <div data-slot="note-editor" :class="cn('flex min-h-0 min-w-0 flex-1 flex-col', props.class)">
    <NqNoteEditorBody v-if="props.note" :key="props.note.id" v-bind="{ ...props, note: props.note, menu }" />
    <div v-else class="flex flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
      <p class="text-h3 text-foreground">{{ t.pickOne }}</p>
      <p class="text-body-sm text-muted-foreground">{{ t.pickOneHint }}</p>
    </div>
    <NqNoteDialogs v-if="!props.menu" :menu="own" />
  </div>
</template>
