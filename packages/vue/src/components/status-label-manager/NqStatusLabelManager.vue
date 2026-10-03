<script setup lang="ts">
import { ArrowDown, ArrowUp, Pencil, Plus, Tag, Trash2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { NqContextMenu, NqContextMenuContent, NqContextMenuItem, NqContextMenuSeparator, NqContextMenuTrigger } from "../context-menu";
import { NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import NqStatusEditDialog from "./NqStatusEditDialog.vue";
import { groupByStage, moveWithinStage, type WorkLabel, type WorkStatus } from "./status-label-logic";
import { statusLabelStrings, type StatusLabelManagerLabels, type StatusLabelStrings } from "./strings";
import type { LabelDraft, StatusDraft, StatusLabelResult } from "./types";

// Manage the two vocabularies of a work tracker: workflow statuses (a name, a colour and a stage, ordered inside their stage) and free
// labels (a name and a colour). Create and edit go through a dialog with validation; delete asks first and says how many items lose the
// value. Every row also opens its actions from a context menu. No backend: your callbacks save, then you pass the updated lists back.
interface Props {
  statuses: WorkStatus[];
  labels: WorkLabel[];
  /** Create (no `id`) or update a status. */
  onSaveStatus: (draft: StatusDraft) => Promise<StatusLabelResult>;
  onDeleteStatus: (id: string) => Promise<StatusLabelResult>;
  /** The full new order of status ids, after a move within a stage. */
  onReorderStatuses: (ids: string[]) => Promise<StatusLabelResult>;
  onSaveLabel: (draft: LabelDraft) => Promise<StatusLabelResult>;
  onDeleteLabel: (id: string) => Promise<StatusLabelResult>;
  /** Which tab opens first. Default `statuses`. */
  defaultTab?: "statuses" | "labels";
  copy?: StatusLabelManagerLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { defaultTab: "statuses", copy: undefined });

const nq = useNasaq();
const t = computed<StatusLabelStrings>(() => ({ ...statusLabelStrings(nq.locale.value), ...props.copy }) as StatusLabelStrings);
const edit = ref<{ kind: "status" | "label"; item: WorkStatus | WorkLabel | null } | null>(null);
const error = ref<string | null>(null);
const deleting = ref<{ kind: "status" | "label"; id: string; name: string; usage: number } | null>(null);
const deleteBusy = ref(false);
const groups = computed(() => groupByStage(props.statuses));
const hasDone = computed(() => props.statuses.some((s) => s.stage === "done"));

async function run(fn: () => Promise<StatusLabelResult>) {
  error.value = null;
  try {
    const r = await fn();
    if (r && typeof r === "object" && r.error) error.value = r.error;
  } catch {
    error.value = t.value.failed;
  }
}
const move = (id: string, delta: -1 | 1) => void run(() => props.onReorderStatuses(moveWithinStage(props.statuses, id, delta)));

async function confirmDelete() {
  const d = deleting.value;
  if (!d) return;
  deleteBusy.value = true;
  error.value = null;
  try {
    const r = d.kind === "status" ? await props.onDeleteStatus(d.id) : await props.onDeleteLabel(d.id);
    if (r && typeof r === "object" && r.error) error.value = r.error;
    else deleting.value = null;
  } catch {
    error.value = t.value.failed;
  }
  deleteBusy.value = false;
}
const askDelete = (kind: "status" | "label", item: WorkStatus | WorkLabel) => (deleting.value = { kind, id: item.id, name: item.name, usage: item.usage ?? 0 });
</script>

<template>
  <section data-slot="status-label-manager" :class="cn('flex flex-col gap-4', props.class)">
    <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
    <NqTabs :default-value="props.defaultTab">
      <NqTabsList variant="underline">
        <NqTabsTab value="statuses">{{ t.statuses }}</NqTabsTab>
        <NqTabsTab value="labels">{{ t.labels }}</NqTabsTab>
        <NqTabsIndicator />
      </NqTabsList>

      <NqTabsPanel value="statuses" class="mt-4 flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="max-w-prose text-body-sm text-muted-foreground">{{ t.statusesBody }}</p>
          <NqButton variant="primary" @click="edit = { kind: 'status', item: null }">
            <Plus aria-hidden="true" />
            {{ t.addStatus }}
          </NqButton>
        </div>
        <NqAlert v-if="!hasDone" tone="warning">{{ t.noDone }}</NqAlert>
        <div class="flex flex-col gap-3">
          <NqCard v-for="g in groups" :key="g.stage" :data-stage="g.stage" class="gap-0 py-0">
            <div class="flex items-center justify-between border-b border-border px-4 py-2">
              <h3 class="text-label text-foreground">{{ t.stage[g.stage] }}</h3>
              <NqNum :value="g.items.length" class="text-caption text-muted-foreground" />
            </div>
            <p v-if="g.items.length === 0" class="px-4 py-3 text-body-sm text-muted-foreground">{{ t.stageEmpty }}</p>
            <ul v-else class="divide-y divide-border">
              <NqContextMenu v-for="(s, i) in g.items" :key="s.id">
                <NqContextMenuTrigger as="li" class="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <NqBadge variant="tag" :hue="s.hue">{{ s.name }}</NqBadge>
                  <span class="min-w-0 flex-1 text-caption text-muted-foreground">{{ s.usage !== undefined ? t.usedBy(s.usage) : null }}</span>
                  <div class="flex items-center">
                    <NqButton variant="ghost" size="icon-sm" :disabled="i === 0" :aria-label="t.moveUp(s.name)" @click="move(s.id, -1)"><ArrowUp aria-hidden="true" /></NqButton>
                    <NqButton variant="ghost" size="icon-sm" :disabled="i === g.items.length - 1" :aria-label="t.moveDown(s.name)" @click="move(s.id, 1)"><ArrowDown aria-hidden="true" /></NqButton>
                    <NqButton variant="ghost" size="icon-sm" :aria-label="t.edit(s.name)" @click="edit = { kind: 'status', item: s }"><Pencil aria-hidden="true" /></NqButton>
                    <NqButton variant="ghost" size="icon-sm" :aria-label="t.remove(s.name)" @click="askDelete('status', s)"><Trash2 aria-hidden="true" /></NqButton>
                  </div>
                </NqContextMenuTrigger>
                <NqContextMenuContent>
                  <NqContextMenuItem @select="edit = { kind: 'status', item: s }"><Pencil aria-hidden="true" />{{ t.editStatus }}</NqContextMenuItem>
                  <NqContextMenuItem :disabled="i === 0" @select="move(s.id, -1)"><ArrowUp aria-hidden="true" />{{ t.moveUp(s.name) }}</NqContextMenuItem>
                  <NqContextMenuItem :disabled="i === g.items.length - 1" @select="move(s.id, 1)"><ArrowDown aria-hidden="true" />{{ t.moveDown(s.name) }}</NqContextMenuItem>
                  <NqContextMenuSeparator />
                  <NqContextMenuItem variant="danger" @select="askDelete('status', s)"><Trash2 aria-hidden="true" />{{ t.remove(s.name) }}</NqContextMenuItem>
                </NqContextMenuContent>
              </NqContextMenu>
            </ul>
          </NqCard>
        </div>
      </NqTabsPanel>

      <NqTabsPanel value="labels" class="mt-4 flex flex-col gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="max-w-prose text-body-sm text-muted-foreground">{{ t.labelsBody }}</p>
          <NqButton variant="primary" @click="edit = { kind: 'label', item: null }">
            <Plus aria-hidden="true" />
            {{ t.addLabel }}
          </NqButton>
        </div>
        <NqEmptyState v-if="props.labels.length === 0" :icon="Tag" :title="t.emptyLabels" :description="t.emptyLabelsBody" />
        <NqCard v-else class="gap-0 py-0">
          <ul class="divide-y divide-border">
            <NqContextMenu v-for="l in props.labels" :key="l.id">
              <NqContextMenuTrigger as="li" class="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <NqBadge variant="tag" :hue="l.hue">{{ l.name }}</NqBadge>
                <span class="min-w-0 flex-1 text-caption text-muted-foreground">{{ l.usage !== undefined ? t.usedBy(l.usage) : null }}</span>
                <div class="flex items-center">
                  <NqButton variant="ghost" size="icon-sm" :aria-label="t.edit(l.name)" @click="edit = { kind: 'label', item: l }"><Pencil aria-hidden="true" /></NqButton>
                  <NqButton variant="ghost" size="icon-sm" :aria-label="t.remove(l.name)" @click="askDelete('label', l)"><Trash2 aria-hidden="true" /></NqButton>
                </div>
              </NqContextMenuTrigger>
              <NqContextMenuContent>
                <NqContextMenuItem @select="edit = { kind: 'label', item: l }"><Pencil aria-hidden="true" />{{ t.editLabel }}</NqContextMenuItem>
                <NqContextMenuSeparator />
                <NqContextMenuItem variant="danger" @select="askDelete('label', l)"><Trash2 aria-hidden="true" />{{ t.remove(l.name) }}</NqContextMenuItem>
              </NqContextMenuContent>
            </NqContextMenu>
          </ul>
        </NqCard>
      </NqTabsPanel>
    </NqTabs>

    <NqAlertDialog :open="deleting !== null" @update:open="(o: boolean) => !o && !deleteBusy && (deleting = null)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ deleting ? (deleting.kind === "status" ? t.deleteStatusTitle(deleting.name) : t.deleteLabelTitle(deleting.name)) : "" }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ deleting ? t.deleteBody(deleting.usage) : "" }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel :disabled="deleteBusy">{{ t.cancel }}</NqAlertDialogCancel>
          <NqButton variant="danger" :loading="deleteBusy" @click="confirmDelete">{{ t.deleteConfirm }}</NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
    <NqStatusEditDialog
      v-if="edit"
      :key="`${edit.kind}-${edit.item?.id ?? 'new'}`"
      :kind="edit.kind"
      :item="edit.item"
      :statuses="props.statuses"
      :labels="props.labels"
      :t="t"
      :on-save-status="props.onSaveStatus"
      :on-save-label="props.onSaveLabel"
      @close="edit = null"
    />
  </section>
</template>
