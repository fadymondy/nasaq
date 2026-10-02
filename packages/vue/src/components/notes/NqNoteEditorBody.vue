<script setup lang="ts">
import { ArrowLeft, Bold, Check, CircleAlert, Code, FolderInput, Heading2, Italic, Link2, ListChecks, LoaderCircle, Lock, Palette, Pin, PinOff, Share2, Tag } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqContextMenuActions } from "../context-menu";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqMarkdown } from "../markdown";
import { formatRelativeTime, useFormatNumber } from "../numeric";
import { NqPasswordInput } from "../password-input";
import { NqRichTextEditor } from "../rich-text-editor";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqNoteActionsMenu from "./NqNoteActionsMenu.vue";
import { noteTint } from "./note-tint";
import { applyMarkdownFormat, backlinksOf, bodyText, INITIAL_SAVE, linksFrom, notebookPath, readingMinutes, saveReducer, wordCount, type MarkdownFormat, type Note, type SaveEvent, type SaveState } from "./notes-model";
import { useNotesLabels } from "./strings";
import { resultError, type NoteMenuApi, type NoteMenuOptions, type NoteResult } from "./use-note-menu";

// The editor for one note. NqNoteEditor mounts it with `:key="note.id"`, so switching notes starts from a clean state.
interface Props extends NoteMenuOptions {
  note: Note;
  menu: NoteMenuApi;
  autosaveDelay?: number;
  onBack?: () => void;
  backClass?: HTMLAttributes["class"];
  onOpenNote?: (id: string) => void;
  onUnlock?: (id: string, password: string) => Promise<NoteResult>;
  /** Loads Tiptap for the rich body: `() => import("./tiptap")`. */
  load?: () => Promise<any>;
  now?: number;
}
const props = withDefaults(defineProps<Props>(), { autosaveDelay: 800 });

const FORMAT_KEYS: MarkdownFormat[] = ["bold", "italic", "strike", "code", "link", "wikilink", "h1", "h2", "h3", "quote", "bullet", "ordered", "task"];
const { t, locale } = useNotesLabels(() => props.labels);
const fmt = useFormatNumber();
const note = computed(() => props.note);
const noteId = props.note.id;
const locked = computed(() => props.menu.isLocked(note.value));
const format = computed(() => note.value.format ?? "rich");
const title = ref(props.note.title);
const body = ref(props.note.body);
const save = ref<SaveState>(INITIAL_SAVE);
const savedAt = ref<number | null>(null);
const failed = ref<string | null>(null);
const mode = ref<"write" | "preview">("write");
const area = ref<HTMLTextAreaElement | null>(null);
const markdownHost = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;
let inflight = false;
let caret: { start: number; end: number } | null = null;
// The rich editor re-serialises the HTML when it mounts; that is not an edit, so wait for real input.
let touched = false;
const touch = () => (touched = true);
const dispatch = (event: SaveEvent) => (save.value = saveReducer(save.value, event));

async function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!props.onUpdate || inflight) return;
  if (save.value.status !== "dirty" && save.value.status !== "error") return;
  inflight = true;
  dispatch({ type: "start" });
  try {
    const result = await props.onUpdate(noteId, { title: title.value, body: body.value });
    const message = resultError(result);
    if (message) {
      failed.value = message;
      dispatch({ type: "fail" });
    } else {
      failed.value = null;
      savedAt.value = Date.now();
      dispatch({ type: "done" });
    }
  } catch {
    dispatch({ type: "fail" });
  } finally {
    inflight = false;
  }
}
function schedule() {
  dispatch({ type: "edit" });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), props.autosaveDelay);
}
// A save that finishes after a newer edit leaves the note dirty: save again.
watch(
  () => [save.value.status, save.value.rev] as const,
  ([status]) => {
    if (status === "dirty" && !timer && !inflight) timer = setTimeout(() => void flush(), props.autosaveDelay);
  },
);
// Save what is left when the note closes.
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if ((save.value.status === "dirty" || save.value.status === "error") && props.onUpdate) void props.onUpdate(noteId, { title: title.value, body: body.value });
});

function applyFormat(f: MarkdownFormat) {
  const el = area.value;
  if (!el) return;
  const edit = applyMarkdownFormat(body.value, el.selectionStart, el.selectionEnd, f);
  caret = { start: edit.start, end: edit.end };
  body.value = edit.value;
  schedule();
  void nextTick(() => {
    if (caret && area.value) {
      area.value.focus();
      area.value.setSelectionRange(caret.start, caret.end);
      caret = null;
    }
  });
}
function onAreaKey(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
  const f = ({ KeyB: "bold", KeyI: "italic", KeyK: "link" } as Record<string, MarkdownFormat>)[e.code];
  if (f) {
    e.preventDefault();
    applyFormat(f);
  }
}
function onRootKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === "KeyS") {
    e.preventDefault();
    void flush();
  }
}
function onRichChange(v: unknown) {
  if (!touched || v === body.value) return;
  body.value = v as string;
  schedule();
}
// NqMarkdown has no component overrides, so wikilinks (`#note-<id>`) are caught on the wrapper.
function onPreviewClick(e: MouseEvent) {
  const a = (e.target as HTMLElement).closest("a");
  const href = a?.getAttribute("href");
  if (href?.startsWith("#note-")) {
    e.preventDefault();
    props.onOpenNote?.(href.slice(6));
  }
}

const actions = computed(() => props.menu.actionsFor(note.value, { inEditor: true }));
const text = computed(() => wordCount(`${title.value} ${locked.value ? "" : bodyText({ ...note.value, body: body.value })}`));
const words = computed(() => text.value);
const path = computed(() => notebookPath(props.notebooks ?? [], note.value.notebookId));
const backlinks = computed(() => (locked.value ? [] : backlinksOf(note.value, props.notes ?? [], props.unlocked ?? [])));
const links = computed(() => (locked.value ? [] : linksFrom({ ...note.value, body: body.value }, props.notes ?? [])));
const pin = computed(() => actions.value.find((a) => a.id === "pin"));
const share = computed(() => actions.value.find((a) => a.id === "share"));
const has = (id: string) => actions.value.some((a) => a.id === id);
const rel = (ms: number) => formatRelativeTime(ms, locale.value, { now: props.now ?? Date.now() });
const status = computed(() => {
  const s = t.value;
  switch (save.value.status) {
    case "saving": return { text: s.saving, tone: "text-muted-foreground" };
    case "dirty": return { text: s.unsaved, tone: "text-muted-foreground" };
    case "error": return { text: failed.value ?? s.saveFailed, tone: "text-nq-danger-text" };
    default: return { text: savedAt.value ? s.savedAt(rel(savedAt.value)) : s.saved, tone: "text-muted-foreground" };
  }
});
const previewSource = computed(() =>
  body.value.replace(/\[\[([^\]\n]+)\]\]/g, (_m, name: string) => {
    const hit = (props.notes ?? []).find((n) => n.id !== noteId && n.title.trim().toLowerCase() === name.trim().toLowerCase());
    return hit ? `[${name.trim()}](#note-${hit.id})` : name.trim();
  }),
);

// Unlock form for a sealed note.
const password = ref("");
const unlockBusy = ref(false);
const unlockError = ref<string | null>(null);
async function unlock() {
  if (!props.onUnlock || !password.value) return;
  unlockBusy.value = true;
  unlockError.value = null;
  try {
    const result = await props.onUnlock(noteId, password.value);
    const message = resultError(result);
    if (message) unlockError.value = message;
  } catch {
    unlockError.value = t.value.failed;
  } finally {
    unlockBusy.value = false;
  }
}
</script>

<template>
  <NqContextMenuActions
    as="article"
    :actions="actions"
    data-slot="note-editor-body"
    :data-color="note.color ?? undefined"
    :aria-label="title.trim() || t.untitled"
    class="flex min-h-0 flex-1 flex-col"
    @keydown="onRootKey"
  >
    <header class="flex items-center gap-1.5 border-b border-border px-3 py-2" :style="note.color ? { borderBottomColor: noteTint(note.color)?.borderColor } : undefined">
      <NqButton v-if="props.onBack" variant="ghost" size="sm" data-slot="note-back" :class="cn('gap-1.5', props.backClass)" @click="props.onBack">
        <ArrowLeft aria-hidden="true" class="rtl:rotate-180" />
        {{ t.back }}
      </NqButton>
      <span role="status" aria-live="polite" data-slot="note-save-status" :data-status="save.status" :class="cn('flex min-w-0 items-center gap-1.5 text-caption', status.tone)">
        <LoaderCircle v-if="save.status === 'saving'" aria-hidden="true" class="size-3.5 animate-spin" />
        <span v-else-if="save.status === 'dirty'" aria-hidden="true" class="size-1.5 rounded-full bg-[var(--nq-tag-amber)]" />
        <CircleAlert v-else-if="save.status === 'error'" aria-hidden="true" class="size-3.5" />
        <Check v-else aria-hidden="true" class="size-3.5" />
        <span class="truncate">{{ status.text }}</span>
        <NqButton v-if="save.status === 'error'" variant="link" size="sm" @click="flush">{{ t.saveNow }}</NqButton>
      </span>
      <span class="ms-auto" />
      <NqButton v-if="pin" variant="ghost" size="icon-sm" :aria-label="pin.label" :aria-pressed="!!note.pinned" :class="note.pinned ? 'text-foreground' : 'text-muted-foreground'" @click="pin.onSelect()">
        <PinOff v-if="note.pinned" aria-hidden="true" />
        <Pin v-else aria-hidden="true" />
      </NqButton>
      <NqButton v-if="share" variant="ghost" size="icon-sm" :aria-label="share.label" :disabled="share.disabled" class="text-muted-foreground" @click="share.onSelect()">
        <Share2 aria-hidden="true" />
      </NqButton>
      <NqNoteActionsMenu :actions="actions" :label="t.noteActions" />
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto" :style="note.color ? { background: `color-mix(in oklab, var(--nq-tag-${note.color}-soft) 40%, transparent)` } : undefined">
      <div class="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-4 @2xl:px-8">
        <input
          v-model="title"
          dir="auto"
          :placeholder="t.titlePlaceholder"
          :aria-label="t.titleLabel"
          :disabled="!props.onUpdate"
          data-slot="note-title"
          class="w-full bg-transparent text-h1 text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
          @input="schedule"
          @blur="flush"
        />
        <div role="group" :aria-label="t.properties" data-slot="note-properties" class="-mx-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-caption text-muted-foreground">
          <NqButton variant="ghost" size="sm" class="max-w-full gap-1.5 text-muted-foreground" :aria-label="t.move" :disabled="!has('move')" @click="props.menu.openDialog('move', note)">
            <FolderInput aria-hidden="true" />
            <span class="truncate">{{ path.length ? path.join(" / ") : t.moveNone }}</span>
          </NqButton>
          <NqButton variant="ghost" size="sm" class="max-w-full gap-1.5 text-muted-foreground" :aria-label="t.editTags" :disabled="!has('tags')" @click="props.menu.openDialog('tags', note)">
            <Tag aria-hidden="true" />
            <span v-if="note.tags?.length" class="flex flex-wrap gap-1"><NqBadge v-for="tag in note.tags" :key="tag" variant="neutral">{{ tag }}</NqBadge></span>
            <span v-else>{{ t.tags }}</span>
          </NqButton>
          <NqButton variant="ghost" size="sm" class="max-w-full gap-1.5 text-muted-foreground" :aria-label="t.color" :disabled="!has('color')" @click="props.menu.openDialog('color', note)">
            <Palette aria-hidden="true" />
            <span v-if="note.color" aria-hidden="true" class="size-3 rounded-full border border-border" :style="{ background: `var(--nq-tag-${note.color})` }" />
          </NqButton>
          <span class="px-2">{{ t.updated(rel(note.updatedAt)) }}</span>
        </div>

        <form v-if="locked" data-slot="note-unlock" class="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3 rounded-card border border-border bg-card p-5" @submit.prevent="unlock">
          <div class="flex items-center gap-2 text-h3 text-foreground"><Lock aria-hidden="true" class="size-4" />{{ t.locked }}</div>
          <p class="text-body-sm text-muted-foreground">{{ t.lockedHint }}</p>
          <NqPasswordInput v-model="password" autocomplete="current-password" :aria-label="t.password" :placeholder="t.password" :aria-invalid="!!unlockError" aria-describedby="note-unlock-error" />
          <p v-if="unlockError" id="note-unlock-error" role="alert" class="text-body-sm text-nq-danger-text">{{ unlockError }}</p>
          <NqButton type="submit" variant="primary" :loading="unlockBusy" :disabled="!password">{{ t.unlock }}</NqButton>
        </form>
        <template v-else>
          <div v-if="note.sealed" class="flex items-center gap-2 rounded-control border border-border bg-secondary px-3 py-2 text-body-sm text-muted-foreground" data-slot="note-unlocked">
            <Lock aria-hidden="true" class="size-3.5" />
            <span class="flex-1">{{ t.unlockedBanner }}</span>
            <NqButton v-if="props.onLock" variant="secondary" size="sm" @click="props.onLock(note.id)">{{ t.lockNow }}</NqButton>
          </div>
          <div v-if="format === 'markdown'" ref="markdownHost" class="flex min-w-0 flex-col gap-2" data-slot="note-markdown">
            <div class="flex items-center gap-2">
              <NqToggleGroup :model-value="[mode]" :aria-label="t.formatMarkdown" @update:model-value="(v: string[]) => v[0] && (mode = v[0] as 'write' | 'preview')">
                <NqToggle value="write">{{ t.write }}</NqToggle>
                <NqToggle value="preview">{{ t.preview }}</NqToggle>
              </NqToggleGroup>
              <span class="ms-auto" />
              <template v-if="mode === 'write'">
                <NqButton variant="ghost" size="icon-sm" :aria-label="t.formats.bold" @click="applyFormat('bold')"><Bold aria-hidden="true" /></NqButton>
                <NqButton variant="ghost" size="icon-sm" :aria-label="t.formats.italic" @click="applyFormat('italic')"><Italic aria-hidden="true" /></NqButton>
                <NqButton variant="ghost" size="icon-sm" :aria-label="t.formats.link" @click="applyFormat('link')"><Link2 aria-hidden="true" /></NqButton>
                <NqDropdownMenu>
                  <NqDropdownMenuTrigger as-child>
                    <NqButton variant="ghost" size="sm" :aria-label="t.formatTitle"><Heading2 aria-hidden="true" />{{ t.format }}</NqButton>
                  </NqDropdownMenuTrigger>
                  <NqDropdownMenuContent align="end" class="min-w-48">
                    <NqDropdownMenuItem v-for="key in FORMAT_KEYS" :key="key" @select="applyFormat(key)">
                      <Code v-if="key === 'code'" aria-hidden="true" />
                      <ListChecks v-else-if="key === 'task'" aria-hidden="true" />
                      {{ t.formats[key] }}
                    </NqDropdownMenuItem>
                  </NqDropdownMenuContent>
                </NqDropdownMenu>
              </template>
            </div>
            <textarea
              v-if="mode === 'write'"
              ref="area"
              v-model="body"
              dir="auto"
              :placeholder="t.bodyPlaceholder"
              :aria-label="t.bodyLabel"
              :disabled="!props.onUpdate"
              data-slot="note-body"
              class="min-h-64 w-full resize-y rounded-control border border-border bg-transparent p-3 font-mono text-code text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
              @input="schedule"
              @blur="flush"
              @keydown="onAreaKey"
            />
            <div v-else-if="body.trim()" data-slot="note-preview" @click="onPreviewClick"><NqMarkdown :source="previewSource" /></div>
            <p v-else class="text-body-sm text-muted-foreground">{{ t.nothingToPreview }}</p>
          </div>
          <div v-else class="contents" @keydown.capture="touch" @pointerdown.capture="touch" @paste.capture="touch">
            <NqRichTextEditor
              data-slot="note-body"
              :default-value="props.note.body"
              :load="props.load"
              :read-only="!props.onUpdate"
              :placeholder="t.bodyPlaceholder"
              :aria-label="t.bodyLabel"
              min-height="16rem"
              @update:model-value="onRichChange"
              @blur="flush"
            />
          </div>
        </template>
      </div>
    </div>

    <footer v-if="!locked" data-slot="note-footer" class="flex flex-col gap-1 border-t border-border px-4 py-2 text-caption text-muted-foreground">
      <div class="flex flex-wrap items-center gap-x-3">
        <span>{{ t.words(fmt(words)) }}</span>
        <span>{{ t.readMinutes(fmt(readingMinutes(words))) }}</span>
        <span>{{ t.created(rel(note.createdAt)) }}</span>
      </div>
      <div class="flex flex-wrap items-center gap-1.5" data-slot="note-links">
        <span class="font-medium">{{ t.backlinks }}</span>
        <template v-if="backlinks.length">
          <NqButton v-for="n in backlinks" :key="n.id" variant="secondary" size="sm" :aria-label="t.openNote(n.title)" class="max-w-48" @click="props.onOpenNote?.(n.id)"><span dir="auto" class="truncate">{{ n.title || "…" }}</span></NqButton>
        </template>
        <span v-else>{{ t.noBacklinks }}</span>
      </div>
      <div v-if="links.length" class="flex flex-wrap items-center gap-1.5" data-slot="note-links">
        <span class="font-medium">{{ t.linksTo }}</span>
        <NqButton v-for="n in links" :key="n.id" variant="secondary" size="sm" :aria-label="t.openNote(n.title)" class="max-w-48" @click="props.onOpenNote?.(n.id)"><span dir="auto" class="truncate">{{ n.title || "…" }}</span></NqButton>
      </div>
    </footer>
  </NqContextMenuActions>
</template>
