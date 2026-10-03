<script setup lang="ts">
import { Copy, MessageSquareText, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { computed, h, ref } from "vue";
import { useNasaq } from "../../provider";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import type { DataTableColumn, DataTableRowAction } from "../data-table";
import { NqActivityCell, NqCardMeta, NqEntityList } from "../entity-list";
import { NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import NqCannedReplyEditor from "./NqCannedReplyEditor.vue";
import { nextFreeCannedShortcut } from "./canned-replies-logic";
import { cannedStrings, type CannedReply, type CannedRepliesLabelOverrides, type CannedReplyResult, type CannedReplyVariable } from "./strings";

// The library behind a reply composer's `/` menu: search, add, edit, duplicate and delete canned replies, with
// variable buttons and a live preview. Built on NqEntityList, so row actions also open as a context menu.
// You own the data: `onSave` and `onDelete` are async callbacks and you send back new `replies`.
const props = defineProps<{
  replies: CannedReply[];
  /** Variables people can insert. Default name, agent and company. */
  variables?: CannedReplyVariable[];
  /** Create or update. A new reply has an id that starts with `new-`. */
  onSave?: (reply: CannedReply) => Promise<CannedReplyResult>;
  onDelete?: (reply: CannedReply) => Promise<CannedReplyResult>;
  label?: string;
  labels?: CannedRepliesLabelOverrides;
}>();
defineSlots<{ empty?: () => unknown }>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => cannedStrings(locale.value, props.labels));
const ar = computed(() => locale.value.startsWith("ar"));
const vars = computed<CannedReplyVariable[]>(
  () =>
    props.variables ?? [
      { key: "name", label: t.value.variableNames.name ?? "name", sample: ar.value ? "سارة" : "Sara" },
      { key: "agent", label: t.value.variableNames.agent ?? "agent", sample: ar.value ? "عمر" : "Omar" },
      { key: "company", label: t.value.variableNames.company ?? "company", sample: ar.value ? "نسق" : "Nasaq" },
    ],
);

const editing = ref<{ reply: CannedReply; isNew: boolean } | null>(null);
const removing = ref<CannedReply | null>(null);
// The last non-null target, so the dialog keeps its content while it animates out.
const heldRemoving = ref<CannedReply | null>(null);

const newId = () => `new-${Date.now()}`;
const startNew = () => (editing.value = { reply: { id: newId(), shortcut: "", title: "", body: "" }, isNew: true });
const startEdit = (r: CannedReply) => (editing.value = { reply: r, isNew: false });
function askRemove(r: CannedReply) {
  removing.value = r;
  heldRemoving.value = r;
}
async function duplicate(r: CannedReply) {
  if (!props.onSave) return;
  await props.onSave({ ...r, id: newId(), title: `${r.title} (${t.value.duplicate.toLowerCase()})`, shortcut: nextFreeCannedShortcut(r.shortcut, props.replies), uses: 0, updatedAt: new Date() });
}
function confirmRemove() {
  const target = removing.value ?? heldRemoving.value;
  removing.value = null;
  if (target && props.onDelete) void Promise.resolve(props.onDelete(target));
}

const rowActions = (r: CannedReply): DataTableRowAction[] => [
  ...(props.onSave
    ? [
        { id: "edit", label: t.value.edit, icon: Pencil, onSelect: () => startEdit(r) },
        { id: "duplicate", label: t.value.duplicate, icon: Copy, onSelect: () => void duplicate(r) },
      ]
    : []),
  ...(props.onDelete ? [{ id: "delete", label: t.value.remove, icon: Trash2, danger: true, group: "danger", onSelect: () => askRemove(r) }] : []),
];
const actions = computed(() => (props.onSave ? [{ id: "new", label: t.value.add, icon: Plus, primary: true, onSelect: startNew }] : undefined));

const columns = computed<DataTableColumn<CannedReply>[]>(() => {
  const s = t.value;
  return [
    {
      id: "shortcut",
      header: s.shortcut,
      hideable: false,
      cell: (r) => h("bdi", { dir: "ltr", class: "rounded-[4px] bg-secondary px-1.5 py-0.5 font-mono text-caption text-foreground" }, `/${r.shortcut}`),
      sortValue: (r) => r.shortcut,
      searchValue: (r) => `${r.shortcut} ${r.title} ${r.body}`,
    },
    { id: "title", header: s.title, cell: (r) => h("span", { dir: "auto", class: "font-medium" }, r.title), sortValue: (r) => r.title, className: "min-w-40" },
    { id: "body", header: s.body, cell: (r) => h("span", { dir: "auto", class: "line-clamp-2 max-w-xl text-muted-foreground" }, r.body), className: "min-w-64" },
    { id: "uses", header: s.uses, cell: (r) => (r.uses == null ? "—" : h(NqNum, { value: r.uses })), sortValue: (r) => r.uses, align: "end" },
    { id: "updated", header: s.updated, cell: (r) => h(NqActivityCell, { value: r.updatedAt }), sortValue: (r) => (r.updatedAt == null ? null : new Date(r.updatedAt)), align: "end" },
  ];
});
</script>

<template>
  <div data-slot="canned-replies" class="flex min-w-0 flex-col gap-3">
    <NqEntityList
      :data="props.replies"
      :columns="columns"
      :get-row-id="(r: CannedReply) => r.id"
      :row-label="(r: CannedReply) => r.title"
      :label="props.label ?? t.label"
      :search-placeholder="t.search"
      :selectable="false"
      :default-sort="{ id: 'shortcut', direction: 'asc' }"
      :on-row-click="props.onSave ? startEdit : undefined"
      :actions="actions"
      :row-actions="rowActions"
    >
      <template #card="{ row: r }">
        <div class="flex min-w-0 flex-col gap-2">
          <bdi dir="ltr" class="w-fit rounded-[4px] bg-secondary px-1.5 py-0.5 font-mono text-caption text-foreground">/{{ r.shortcut }}</bdi>
          <span dir="auto" class="text-label text-foreground">{{ r.title }}</span>
          <span dir="auto" class="line-clamp-3 text-body-sm text-muted-foreground">{{ r.body }}</span>
          <NqCardMeta v-if="r.uses != null" :label="t.uses"><NqNum :value="r.uses" /></NqCardMeta>
        </div>
      </template>
      <template #empty><slot name="empty"><NqEmptyState :icon="MessageSquareText" :title="t.empty" :description="t.emptyHint" class="border-0" /></slot></template>
    </NqEntityList>

    <NqCannedReplyEditor
      v-if="props.onSave"
      :target="editing"
      :others="props.replies"
      :variables="vars"
      :t="t"
      :on-save="props.onSave"
      @close="editing = null"
    />

    <NqAlertDialog :open="removing !== null" @update:open="(o: boolean) => !o && (removing = null)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ t.removeTitle(heldRemoving?.title ?? "") }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.removeBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
          <NqAlertDialogAction @click="confirmRemove">{{ t.remove }}</NqAlertDialogAction>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
