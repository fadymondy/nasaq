<script setup lang="ts">
import { Check, FolderOpen, Notebook as NotebookIcon } from "lucide-vue-next";
import { computed, ref, useId, watch } from "vue";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import { NqColorPicker, tagSwatches } from "../color-picker";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { saveExportBlob } from "../export-action";
import { NqPasswordInput } from "../password-input";
import { NqShareDialog } from "../share-action";
import { NqTagInput } from "../tag-input";
import { exportNote, noteExportFormats, notebookTree, tagCounts, type NoteColor, type NoteExportFormat, type NotebookNode, type Notebook } from "./notes-model";
import { useNotesLabels } from "./strings";
import { useAction } from "./use-action";
import type { NoteMenuApi } from "./use-note-menu";

// The dialogs behind the note actions: move, tags, colour, share, export, seal, remove seal and delete. One at a time.
// Render it once next to the surfaces that share `menu`.
const props = defineProps<{ menu: NoteMenuApi }>();
const options = () => props.menu.options();
const { t, locale } = useNotesLabels(() => options().labels);
const { busy, error, run } = useAction();
const uid = useId();

const state = computed(() => props.menu.state.value);
const note = computed(() => state.value?.note ?? null);
const kind = computed(() => state.value?.kind ?? null);
const is = (k: string) => kind.value === k;
const close = () => props.menu.closeDialog();
const onOpen = (k: string) => (open: boolean) => {
  if (!open && kind.value === k) close();
};
const title = computed(() => note.value?.title || t.value.untitled);

// Local fields reset whenever another dialog opens.
const tags = ref<string[]>([]);
const password = ref("");
const repeat = ref("");
const format = ref<NoteExportFormat>("text");
watch(state, (s) => {
  error.value = null;
  password.value = "";
  repeat.value = "";
  tags.value = [...(s?.note.tags ?? [])];
  format.value = s ? (noteExportFormats(s.note)[0] ?? "text") : "text";
});

function flatten(nodes: NotebookNode[], depth = 0): { notebook: Notebook; depth: number }[] {
  return nodes.flatMap((n) => [{ notebook: n.notebook, depth }, ...flatten(n.children, depth + 1)]);
}
const rows = computed(() => [
  { id: null as string | null, label: t.value.moveNone, depth: 0 },
  ...flatten(notebookTree(options().notebooks ?? [])).map((o) => ({ id: o.notebook.id as string | null, label: o.notebook.name, depth: o.depth })),
]);
const suggestions = computed(() => tagCounts(options().notes ?? []).map((x) => x.tag));
const formats = computed(() => (note.value ? noteExportFormats(note.value) : []));

async function pickNotebook(id: string | null) {
  const n = note.value;
  if (!n) return;
  if (id === (n.notebookId ?? null)) return close();
  if (await run(() => options().onUpdate?.(n.id, { notebookId: id }), t.value.failed)) close();
}
async function saveTags() {
  const n = note.value;
  if (n && (await run(() => options().onUpdate?.(n.id, { tags: tags.value }), t.value.failed))) close();
}
async function setColor(color: NoteColor | null) {
  const n = note.value;
  if (n && (await run(() => options().onUpdate?.(n.id, { color }), t.value.failed))) close();
}
async function download() {
  const n = note.value;
  if (!n) return;
  const file = exportNote(n, format.value);
  const ok = await run(async () => {
    const handler = options().onExport;
    if (handler) await handler(n, format.value, file);
    else saveExportBlob(new Blob([file.content], { type: file.mime }), file.filename);
  }, t.value.failed);
  if (ok) close();
}
async function submitSeal() {
  const n = note.value;
  if (!n) return;
  const sealing = is("seal");
  if (sealing) {
    if (password.value.length < 4) return void (error.value = t.value.passwordShort);
    if (password.value !== repeat.value) return void (error.value = t.value.passwordMismatch);
  } else if (!password.value) return;
  const o = options();
  if (await run(() => (sealing ? o.onSeal?.(n.id, password.value) : o.onRemoveSeal?.(n.id, password.value)), t.value.failed)) close();
}
function remove() {
  const n = note.value;
  if (!n) return;
  // The alert dialog closes itself; a failure leaves the note in place.
  close();
  void run(() => options().onDelete?.(n.id), t.value.failed);
}
</script>

<template>
  <template v-if="note">
    <NqDialog :open="is('move')" @update:open="onOpen('move')($event)">
      <NqDialogContent class="max-w-sm" data-slot="note-move-dialog">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.moveTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ title }}</NqDialogDescription>
        </NqDialogHeader>
        <div role="radiogroup" :aria-label="t.moveTitle" class="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
          <button
            v-for="row in rows"
            :key="row.id ?? 'none'"
            type="button"
            role="radio"
            :aria-checked="row.id === (note.notebookId ?? null)"
            :disabled="busy"
            :style="{ paddingInlineStart: `${0.5 + row.depth * 1.25}rem` }"
            class="flex h-nav-row items-center gap-2 rounded-control pe-2 text-start text-body-sm text-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-ring aria-checked:bg-nq-selected [&_svg]:size-4 [&_svg]:text-muted-foreground"
            @click="pickNotebook(row.id)"
          >
            <FolderOpen v-if="row.id === null" aria-hidden="true" />
            <NotebookIcon v-else aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ row.label }}</span>
            <Check v-if="row.id === (note.notebookId ?? null)" aria-hidden="true" class="text-foreground" />
          </button>
        </div>
        <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
      </NqDialogContent>
    </NqDialog>

    <NqDialog :open="is('tags')" @update:open="onOpen('tags')($event)">
      <NqDialogContent class="max-w-md" data-slot="note-tags-dialog">
        <form class="grid gap-4" @submit.prevent="saveTags">
          <NqDialogHeader>
            <NqDialogTitle>{{ t.tagsTitle }}</NqDialogTitle>
            <NqDialogDescription>{{ title }}</NqDialogDescription>
          </NqDialogHeader>
          <NqTagInput v-model="tags" :suggestions="suggestions" :placeholder="t.tagsPlaceholder" :input-props="{ 'aria-label': t.tagsTitle }" />
          <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
          <NqDialogFooter>
            <NqButton type="button" variant="ghost" @click="close">{{ t.cancel }}</NqButton>
            <NqButton type="submit" variant="primary" :loading="busy">{{ t.save }}</NqButton>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>

    <NqDialog :open="is('color')" @update:open="onOpen('color')($event)">
      <NqDialogContent class="max-w-sm" data-slot="note-color-dialog">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.colorTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ title }}</NqDialogDescription>
        </NqDialogHeader>
        <div class="flex flex-wrap items-center gap-2">
          <NqColorPicker
            :model-value="note.color ? `--nq-tag-${note.color}` : null"
            :swatches="tagSwatches(locale)"
            :allow-hex="false"
            :allow-native="false"
            :disabled="busy"
            :locale="locale"
            :aria-label="t.colorTitle"
            @update:model-value="(v: string) => v && setColor(v.replace('--nq-tag-', '') as NoteColor)"
          />
          <NqButton type="button" variant="ghost" size="sm" :disabled="busy || !note.color" @click="setColor(null)">{{ t.noColor }}</NqButton>
        </div>
        <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
      </NqDialogContent>
    </NqDialog>

    <NqShareDialog
      v-if="options().shareUrl && is('share')"
      v-bind="options().shareProps"
      :open="true"
      :url="options().shareUrl!(note)"
      :title="title"
      @update:open="onOpen('share')($event)"
    />

    <NqDialog :open="is('export')" @update:open="onOpen('export')($event)">
      <NqDialogContent class="max-w-sm" data-slot="note-export-dialog">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.exportTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.exportHint }}</NqDialogDescription>
        </NqDialogHeader>
        <div role="radiogroup" :aria-label="t.exportTitle" class="flex flex-col gap-1">
          <button
            v-for="f in formats"
            :key="f"
            type="button"
            role="radio"
            :aria-checked="f === format"
            class="flex h-nav-row items-center gap-2 rounded-control px-2 text-start text-body-sm text-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-ring aria-checked:bg-nq-selected"
            @click="format = f"
          >
            <span class="flex-1">{{ t.exportFormats[f] }}</span>
            <Check v-if="f === format" aria-hidden="true" class="size-4" />
          </button>
        </div>
        <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" @click="close">{{ t.cancel }}</NqButton>
          <NqButton type="button" variant="primary" :loading="busy" @click="download">{{ t.exportDownload }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>

    <NqDialog :open="is('seal') || is('unseal')" @update:open="(o: boolean) => !o && close()">
      <NqDialogContent class="max-w-sm" data-slot="note-seal-dialog">
        <form class="grid gap-4" @submit.prevent="submitSeal">
          <NqDialogHeader>
            <NqDialogTitle>{{ is("seal") ? t.sealTitle : t.unsealTitle }}</NqDialogTitle>
            <NqDialogDescription>{{ is("seal") ? t.sealBody : t.unsealBody }}</NqDialogDescription>
          </NqDialogHeader>
          <div class="grid gap-1.5">
            <label :for="`${uid}-pw`" class="text-label text-foreground">{{ t.password }}</label>
            <NqPasswordInput :id="`${uid}-pw`" v-model="password" :autocomplete="is('seal') ? 'new-password' : 'current-password'" :show-strength="is('seal')" dir="ltr" />
          </div>
          <div v-if="is('seal')" class="grid gap-1.5">
            <label :for="`${uid}-pw2`" class="text-label text-foreground">{{ t.passwordConfirm }}</label>
            <NqPasswordInput :id="`${uid}-pw2`" v-model="repeat" autocomplete="new-password" dir="ltr" />
          </div>
          <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
          <NqDialogFooter>
            <NqButton type="button" variant="ghost" @click="close">{{ t.cancel }}</NqButton>
            <NqButton type="submit" variant="primary" :loading="busy">{{ is("seal") ? t.sealAction : t.unsealAction }}</NqButton>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>

    <NqAlertDialog :open="is('delete')" @update:open="onOpen('delete')($event)">
      <NqAlertDialogContent data-slot="note-delete-dialog">
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ t.deleteTitle }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>
            {{ t.deleteBody }}
            <span class="mt-1 block font-medium text-foreground">{{ title }}</span>
          </NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
          <NqAlertDialogAction @click="remove">{{ t.deleteConfirm }}</NqAlertDialogAction>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </template>
</template>
