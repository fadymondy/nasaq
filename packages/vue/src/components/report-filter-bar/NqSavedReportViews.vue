<script setup lang="ts">
import { Bookmark, Ellipsis, Link2, Pencil, Save, Share2, Trash2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqContextMenuActions, openContextMenuAt, type ContextMenuAction } from "../context-menu";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import NqReportNameDialog from "./NqReportNameDialog.vue";
import { emptyReportFilters, type ReportFilterFieldSpec, type ReportFilterState, type SavedReportView } from "./report-filter-math";
import { reportFiltersToQuery, savedViewMatches, savedViewState } from "./report-filter-url";
import { REPORT_FILTER_STRINGS, type ReportFilterBarLabels } from "./strings";
import { REPORT_DEFAULT_RANGE, type ReportFilterField } from "./useReportFilters";

// Named filter sets for a report. Each view is a chip; context-click, the Menu key or the "..." button opens
// rename, update, share and delete. A view opened and then changed shows "Changed", with update and save-as-new.
type Pending = { kind: "save" } | { kind: "rename"; view: SavedReportView } | { kind: "delete"; view: SavedReportView } | null;

interface Props {
  views: readonly SavedReportView[];
  fields: readonly ReportFilterField[];
  /** The current filters. */
  state: ReportFilterState;
  defaults?: ReportFilterState;
  /** Open a view: set the filters to `next`. */
  onApply: (view: SavedReportView, next: ReportFilterState) => void;
  /** Save the current filters as a new view. `query` is what to store. Throw to show an error. */
  onSave: (name: string, query: string) => void | Promise<void>;
  onRename?: (view: SavedReportView, name: string) => void | Promise<void>;
  /** Replace what a view stores with the current filters. */
  onUpdate?: (view: SavedReportView, query: string) => void | Promise<void>;
  /**
   * Turn sharing on or off. When it turns on, return the link and it is copied to the clipboard. Without this the
   * share actions are hidden.
   */
  onShare?: (view: SavedReportView, shared: boolean) => string | void | Promise<string | void>;
  onDelete?: (view: SavedReportView) => void | Promise<void>;
  /** The opened view (controlled). Default: the last opened, or the one whose filters match. */
  activeId?: string | null;
  class?: HTMLAttributes["class"];
  labels?: Partial<ReportFilterBarLabels>;
}
const props = withDefaults(defineProps<Props>(), { defaults: undefined, onRename: undefined, onUpdate: undefined, onShare: undefined, onDelete: undefined, activeId: undefined, labels: undefined });

const t = useAnalyticsLabels(REPORT_FILTER_STRINGS, () => props.labels);
const specs = computed(() => props.fields as readonly ReportFilterFieldSpec[]);
const base = computed(() => props.defaults ?? emptyReportFilters(specs.value, REPORT_DEFAULT_RANGE));
const opened = ref<string | null>(null);
const pending = ref<Pending>(null);
const note = ref("");
// The view a delete dialog was opened for; kept after it closes so the confirm click still knows it.
const doomed = ref<SavedReportView | null>(null);
const currentId = computed(() => (props.activeId !== undefined ? props.activeId : opened.value));
const matching = computed(() => props.views.find((v) => savedViewMatches(v, props.state, specs.value, base.value)));
const current = computed(() => props.views.find((v) => v.id === currentId.value) ?? matching.value);
const dirty = computed(() => (current.value ? !savedViewMatches(current.value, props.state, specs.value, base.value) : false));
const query = computed(() => reportFiltersToQuery(props.state, specs.value, base.value));
const nameOpen = computed(() => pending.value?.kind === "save" || pending.value?.kind === "rename");
const renaming = computed(() => (pending.value?.kind === "rename" ? pending.value.view : null));
const taken = computed(() => props.views.filter((v) => (renaming.value ? v.id !== renaming.value.id : true)).map((v) => v.name));

function apply(view: SavedReportView) {
  opened.value = view.id;
  props.onApply(view, savedViewState(view, specs.value, base.value));
}

async function run(fn: () => unknown) {
  try {
    await fn();
  } catch {
    note.value = t.value.failed;
  }
}

function copyLink(link: string | void) {
  if (typeof link !== "string") return;
  navigator.clipboard?.writeText(link).then(() => (note.value = t.value.linkCopied)).catch(() => undefined);
}

function actionsFor(view: SavedReportView): ContextMenuAction[] {
  const list: ContextMenuAction[] = [{ id: "apply", label: t.value.apply, icon: Bookmark, onSelect: () => apply(view), group: "open" }];
  if (props.onRename) list.push({ id: "rename", label: t.value.rename, icon: Pencil, onSelect: () => (pending.value = { kind: "rename", view }), group: "edit" });
  if (props.onUpdate) {
    list.push({
      id: "update",
      label: t.value.update,
      icon: Save,
      disabled: savedViewMatches(view, props.state, specs.value, base.value),
      onSelect: () => void run(() => props.onUpdate!(view, query.value)),
      group: "edit",
    });
  }
  if (props.onShare) {
    if (view.shared) {
      list.push({ id: "copy", label: t.value.copyLink, icon: Link2, onSelect: () => void run(async () => copyLink(await props.onShare!(view, true))), group: "share" });
      list.push({ id: "unshare", label: t.value.unshare, icon: Share2, onSelect: () => void run(() => props.onShare!(view, false)), group: "share" });
    } else {
      list.push({ id: "share", label: t.value.share, icon: Share2, onSelect: () => void run(async () => copyLink(await props.onShare!(view, true))), group: "share" });
    }
  }
  if (props.onDelete) list.push({ id: "delete", label: t.value.remove, icon: Trash2, danger: true, onSelect: () => ((doomed.value = view), (pending.value = { kind: "delete", view })), group: "danger" });
  return list;
}

async function submitName(name: string) {
  const p = pending.value;
  if (p?.kind === "rename") await props.onRename?.(p.view, name);
  else await props.onSave(name, query.value);
}

function confirmDelete() {
  const view = doomed.value;
  if (view) void run(() => props.onDelete?.(view));
}
</script>

<template>
  <section data-slot="saved-report-views" :aria-label="t.views" :class="cn('flex w-full min-w-0 flex-col gap-2', props.class)">
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="text-label text-muted-foreground">{{ t.views }}</h3>
      <p v-if="props.views.length === 0" class="text-body-sm text-muted-foreground">{{ t.noViews }}</p>
      <ul class="flex min-w-0 flex-wrap items-center gap-1.5">
        <NqContextMenuActions v-for="view in props.views" :key="view.id" as="li" class="flex items-center rounded-full" :actions="actionsFor(view)">
          <NqButton
            :variant="current?.id === view.id ? 'secondary' : 'ghost'"
            size="sm"
            :aria-pressed="current?.id === view.id"
            :class="cn('rounded-full', current?.id === view.id && 'border-primary')"
            @click="apply(view)"
          >
            {{ view.name }}
            <NqBadge v-if="view.shared" variant="info">{{ t.shared }}</NqBadge>
            <NqBadge v-if="current?.id === view.id && dirty" variant="warning">{{ t.modified }}</NqBadge>
          </NqButton>
          <NqButton
            v-if="actionsFor(view).length > 1"
            variant="ghost"
            size="icon-sm"
            :aria-label="t.more(view.name)"
            @click="(e: MouseEvent) => openContextMenuAt((e.currentTarget as HTMLElement).closest('li') as HTMLElement)"
          >
            <Ellipsis aria-hidden="true" />
          </NqButton>
        </NqContextMenuActions>
      </ul>
      <div class="ms-auto flex items-center gap-2">
        <NqButton v-if="dirty && current && props.onUpdate" variant="secondary" size="sm" @click="run(() => props.onUpdate!(current!, query))">
          <Save aria-hidden="true" />
          {{ t.update }}
        </NqButton>
        <NqButton :variant="dirty || !current ? 'primary' : 'ghost'" size="sm" @click="pending = { kind: 'save' }">
          <Bookmark aria-hidden="true" />
          {{ dirty ? t.saveAsNew : t.saveView }}
        </NqButton>
      </div>
    </div>
    <p aria-live="polite" class="min-h-4 text-caption text-muted-foreground">{{ note }}</p>

    <NqReportNameDialog
      :open="nameOpen"
      :title="renaming ? t.renameTitle : t.saveTitle"
      :description="renaming ? undefined : t.saveHelp"
      :initial="renaming ? renaming.name : ''"
      :taken="taken"
      :t="t"
      :on-submit="submitName"
      @close="pending = null"
    />
    <NqAlertDialog :open="pending?.kind === 'delete'" @update:open="(open: boolean) => !open && (pending = null)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ doomed ? t.deleteTitle(doomed.name) : "" }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.deleteBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
          <NqAlertDialogAction @click="confirmDelete">{{ t.remove }}</NqAlertDialogAction>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </section>
</template>
