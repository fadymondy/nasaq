<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  Check,
  Ellipsis,
  Expand,
  GripVertical,
  LayoutDashboard,
  MoveDiagonal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Settings2,
  Shrink,
  Trash2,
} from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, ref, watch, type FunctionalComponent, type HTMLAttributes, type VNodeChild } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { NqContextMenuActions, openContextMenuAt, type ContextMenuAction } from "../context-menu";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogHeader, NqDialogTitle } from "../dialog";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqEmptyState, NqErrorState, NqLoadingState } from "../states";
import {
  BOARD_MAX_COLS,
  BOARD_MAX_ROWS,
  boardColumns,
  moveItem,
  nextItemId,
  normalizeLayout,
  reorderItems,
  resizeFromDelta,
  resizeItem,
  sameLayout,
  togglePin,
  type BoardItem,
  type BoardSettingValue,
} from "./board-math";
import { BOARD_STRINGS, type DashboardBoardLabels } from "./board-strings";
import type { DashboardWidgetContext, DashboardWidgetDef } from "./board-types";
import NqDashboardBoardSettings from "./NqDashboardBoardSettings.vue";

// A customisable grid of widget cards. Each item is { id, type, cols, rows, pinned?, settings? }; `widgets` says what each type is
// and how it renders (a `render` function, or the `widget` slot). Customise turns on editing: drag a card by its handle (native
// pointer events, or Space and the arrow keys), resize it from the corner grip or the actions menu, pin, add, remove, open settings.
// Save calls onSave with the draft; reject to keep the editor open with an error.

export type { DashboardBoardLabels };

const GAP = 16;

interface Props {
  widgets: readonly DashboardWidgetDef[];
  /** The saved layout. Unknown widget types and repeated ids are dropped, spans are clamped. */
  layout: readonly BoardItem[];
  /** Saves the layout. Reject to keep the editor open with an error. Update `layout` when it resolves. */
  onSave: (layout: BoardItem[]) => void | Promise<void>;
  /** What Reset to default goes back to. Without it there is no Reset. */
  defaultLayout?: readonly BoardItem[];
  /** Editing mode (`v-model:editing`). */
  editing?: boolean;
  defaultEditing?: boolean;
  /** Height of one grid row, in pixels. Default 200. */
  rowHeight?: number;
  /** A heading shown above the toolbar. */
  title?: string;
  loading?: boolean;
  error?: boolean | string;
  onRetry?: () => void;
  labels?: Partial<DashboardBoardLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  defaultLayout: undefined,
  editing: undefined,
  defaultEditing: false,
  rowHeight: 200,
  title: undefined,
  loading: false,
  error: undefined,
  onRetry: undefined,
  labels: undefined,
});
const emit = defineEmits<{ "update:editing": [editing: boolean] }>();
defineSlots<{
  /** Renders widgets whose definition has no `render`. */
  widget?: (p: { def: DashboardWidgetDef; ctx: DashboardWidgetContext }) => unknown;
  title?: () => unknown;
}>();

const t = useAnalyticsLabels(BOARD_STRINGS, () => props.labels);
const nq = useNasaq();
const isRtl = computed(() => nq.isRtl.value);

const innerEditing = ref(props.defaultEditing);
const editing = computed(() => props.editing ?? innerEditing.value);
function setEditing(next: boolean) {
  innerEditing.value = next;
  emit("update:editing", next);
}

type Limits = { minCols: number; maxCols: number; minRows: number; maxRows: number };
const limitsOf = (def?: DashboardWidgetDef): Limits => ({
  minCols: def?.minCols ?? 1,
  maxCols: def?.maxCols ?? BOARD_MAX_COLS,
  minRows: def?.minRows ?? 1,
  maxRows: def?.maxRows ?? BOARD_MAX_ROWS,
});
const settingsOf = (def: DashboardWidgetDef | undefined, item: BoardItem): Record<string, BoardSettingValue> => ({ ...def?.defaultSettings, ...item.settings });
const typeInfos = computed(() => props.widgets.map((w) => ({ type: w.type, ...limitsOf(w) })));

const defs = computed(() => new Map(props.widgets.map((w) => [w.type, w])));
const saved = computed(() => normalizeLayout(props.layout, typeInfos.value));
const draft = ref<BoardItem[] | null>(null);
// While a card is being dragged (pointer or keyboard) its live order is kept here and committed on drop.
const order = ref<BoardItem[] | null>(null);
const baseItems = computed(() => (editing.value ? (draft.value ?? saved.value) : saved.value));
const items = computed(() => order.value ?? baseItems.value);
const dirty = computed(() => editing.value && draft.value !== null && !sameLayout(draft.value, saved.value));

const saving = ref(false);
const saveError = ref(false);
const adding = ref(false);
const settingsFor = ref<string | null>(null);
const live = ref("");
const preview = ref<{ id: string; cols: number; rows: number } | null>(null);

// The grid decides how many columns fit its own width, not the window.
const gridRef = ref<HTMLElement | null>(null);
const width = ref(1200);
watch(
  gridRef,
  (el, _old, onCleanup) => {
    if (!el) return;
    width.value = el.clientWidth || 1200;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => entry && (width.value = entry.contentRect.width));
    ro.observe(el);
    onCleanup(() => ro.disconnect());
  },
  { flush: "post" },
);
const columns = computed(() => boardColumns(width.value));
const cellWidth = computed(() => (width.value - GAP * (columns.value - 1)) / columns.value + GAP);
const cellHeight = computed(() => props.rowHeight + GAP);

watch(editing, (on) => {
  if (!on) {
    draft.value = null;
    order.value = null;
    saveError.value = false;
  }
});

function startEditing() {
  draft.value = saved.value;
  setEditing(true);
}
function change(next: BoardItem[]) {
  draft.value = next;
  saveError.value = false;
}
const titleOf = (id: string) => {
  const item = items.value.find((i) => i.id === id);
  return (item && defs.value.get(item.type)?.title) ?? id;
};

async function save() {
  if (!draft.value || saving.value) return;
  saving.value = true;
  saveError.value = false;
  try {
    await props.onSave(draft.value);
    setEditing(false);
  } catch {
    saveError.value = true;
  } finally {
    saving.value = false;
  }
}

const position = (id: string) => items.value.findIndex((i) => i.id === id) + 1;

/* ------------------------------------------------------------ drag to reorder */

const activeId = ref<string | null>(null);
const shift = ref({ x: 0, y: 0 });
let session: { id: string; pointerId: number; startX: number; startY: number; grabX: number; grabY: number; active: boolean } | null = null;
let origin: BoardItem[] | null = null;

const cardEl = (id: string) => gridRef.value?.querySelector<HTMLElement>(`[data-board-id="${CSS.escape(id)}"]`) ?? null;

function lift(id: string) {
  origin = baseItems.value;
  activeId.value = id;
  order.value = baseItems.value;
  shift.value = { x: 0, y: 0 };
  live.value = t.value.announce.pickedUp(titleOf(id), position(id), items.value.length);
}
function endDrag() {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerCancel);
  session = null;
  activeId.value = null;
  order.value = null;
  shift.value = { x: 0, y: 0 };
  origin = null;
}
function drop() {
  const id = activeId.value;
  const next = order.value;
  const from = origin;
  if (id) live.value = t.value.announce.dropped(titleOf(id), position(id), items.value.length);
  endDrag();
  if (next && from && !sameLayout(next, from)) change(next);
}
function cancel() {
  const id = activeId.value;
  endDrag();
  if (id) live.value = t.value.announce.cancelled(titleOf(id));
}

function onHandleDown(event: PointerEvent, id: string) {
  if (!editing.value || session || (event.pointerType === "mouse" && event.button !== 0)) return;
  const el = cardEl(id);
  const rect = el?.getBoundingClientRect();
  session = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, grabX: event.clientX - (rect?.left ?? 0), grabY: event.clientY - (rect?.top ?? 0), active: false };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);
}
function follow(x: number, y: number) {
  if (!session) return;
  const id = session.id;
  const el = cardEl(id);
  if (el) {
    const rect = el.getBoundingClientRect();
    const layoutLeft = rect.left - shift.value.x;
    const layoutTop = rect.top - shift.value.y;
    shift.value = { x: x - session.grabX - layoutLeft, y: y - session.grabY - layoutTop };
  }
  // Reorder when the pointer is inside another card.
  const over = [...(gridRef.value?.querySelectorAll<HTMLElement>("[data-board-id]") ?? [])].find((li) => {
    if (li.dataset.boardId === id) return false;
    const r = li.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  });
  const overId = over?.dataset.boardId;
  if (!overId) return;
  const next = reorderItems(items.value, id, overId);
  if (next.every((it, i) => it.id === items.value[i]?.id)) return;
  order.value = next;
  live.value = t.value.announce.over(titleOf(id), position(id), next.length);
}
function onPointerMove(event: PointerEvent) {
  if (!session || event.pointerId !== session.pointerId) return;
  if (!session.active) {
    if (Math.hypot(event.clientX - session.startX, event.clientY - session.startY) < 4) return;
    session.active = true;
    lift(session.id);
  }
  event.preventDefault();
  follow(event.clientX, event.clientY);
}
function onPointerUp(event: PointerEvent) {
  if (!session || event.pointerId !== session.pointerId) return;
  if (session.active) drop();
  else endDrag();
}
function onPointerCancel() {
  if (session?.active) cancel();
  else endDrag();
}

function onHandleKey(event: KeyboardEvent, id: string) {
  const lifted = activeId.value === id;
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (lifted) drop();
    else if (activeId.value === null) lift(id);
    return;
  }
  if (!lifted) return;
  if (event.key === "Escape") {
    event.preventDefault();
    cancel();
    return;
  }
  if (!event.key.startsWith("Arrow")) return;
  event.preventDefault();
  const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : (event.key === "ArrowLeft") === isRtl.value ? 1 : -1;
  const next = moveItem(items.value, id, step as -1 | 1);
  if (next.every((it, i) => it.id === items.value[i]?.id)) return;
  order.value = next;
  live.value = t.value.announce.over(titleOf(id), position(id), next.length);
  void nextTick(() => gridRef.value?.querySelector<HTMLElement>(`[data-board-handle="${CSS.escape(id)}"]`)?.focus());
}

/* ----------------------------------------------------------------- resize */

let rs: { id: string; pointerId: number; startX: number; startY: number; start: BoardItem } | null = null;

function onGripDown(event: PointerEvent, item: BoardItem) {
  if (!editing.value || rs || (event.pointerType === "mouse" && event.button !== 0)) return;
  event.preventDefault();
  rs = { id: item.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, start: item };
  preview.value = null;
  window.addEventListener("pointermove", onGripMove);
  window.addEventListener("pointerup", onGripUp);
  window.addEventListener("pointercancel", endResize);
}
function onGripMove(event: PointerEvent) {
  if (!rs || event.pointerId !== rs.pointerId) return;
  const item = rs.start;
  const next = resizeFromDelta(item, { x: event.clientX - rs.startX, y: event.clientY - rs.startY }, { width: cellWidth.value, height: cellHeight.value }, limitsOf(defs.value.get(item.type)), isRtl.value);
  // Width only changes on a four column board; narrower boards cap the span, so keep the saved one.
  const cols = columns.value === 4 ? next.cols : item.cols;
  const p = preview.value;
  if (!(p && p.id === item.id && p.cols === cols && p.rows === next.rows)) preview.value = { id: item.id, cols, rows: next.rows };
}
function onGripUp(event: PointerEvent) {
  if (!rs || event.pointerId !== rs.pointerId) return;
  const p = preview.value;
  endResize();
  if (p) {
    const type = items.value.find((i) => i.id === p.id)?.type ?? "";
    change(resizeItem(items.value, p.id, p.cols, p.rows, limitsOf(defs.value.get(type))));
    live.value = t.value.announce.resized(titleOf(p.id), p.cols, p.rows);
  }
}
function endResize() {
  window.removeEventListener("pointermove", onGripMove);
  window.removeEventListener("pointerup", onGripUp);
  window.removeEventListener("pointercancel", endResize);
  rs = null;
  preview.value = null;
}
onBeforeUnmount(() => {
  endDrag();
  endResize();
});

/* ---------------------------------------------------------------- actions */

function resizeBy(item: BoardItem, dc: number, dr: number) {
  const next = resizeItem(items.value, item.id, item.cols + dc, item.rows + dr, limitsOf(defs.value.get(item.type)));
  change(next);
  const now = next.find((i) => i.id === item.id);
  if (now) live.value = t.value.announce.resized(titleOf(item.id), now.cols, now.rows);
}
function pin(item: BoardItem) {
  change(togglePin(items.value, item.id));
  live.value = item.pinned ? t.value.announce.unpinned(titleOf(item.id)) : t.value.announce.pinned(titleOf(item.id));
}
function addWidget(def: DashboardWidgetDef) {
  const lim = limitsOf(def);
  const item: BoardItem = {
    id: nextItemId(items.value, def.type),
    type: def.type,
    cols: Math.min(Math.max(def.defaultCols ?? lim.minCols, lim.minCols), lim.maxCols),
    rows: Math.min(Math.max(def.defaultRows ?? lim.minRows, lim.minRows), lim.maxRows),
    ...(def.defaultSettings ? { settings: { ...def.defaultSettings } } : {}),
  };
  change([...items.value, item]);
  live.value = t.value.announce.added(def.title);
  adding.value = false;
}
function resetToDefault() {
  if (props.defaultLayout) change(normalizeLayout(props.defaultLayout, typeInfos.value));
}

function menuFor(item: BoardItem): ContextMenuAction[] {
  const def = defs.value.get(item.type);
  const lim = limitsOf(def);
  const idx = items.value.findIndex((i) => i.id === item.id);
  const group = items.value.filter((i) => !!i.pinned === !!item.pinned);
  const gi = group.findIndex((i) => i.id === item.id);
  const s = t.value;
  const out: ContextMenuAction[] = [];
  if (editing.value) {
    out.push(
      { id: "wider", label: s.wider, icon: Expand, disabled: item.cols >= lim.maxCols, group: "size", onSelect: () => resizeBy(item, 1, 0) },
      { id: "narrower", label: s.narrower, icon: Shrink, disabled: item.cols <= lim.minCols, group: "size", onSelect: () => resizeBy(item, -1, 0) },
      { id: "taller", label: s.taller, icon: Expand, disabled: item.rows >= lim.maxRows, group: "size", onSelect: () => resizeBy(item, 0, 1) },
      { id: "shorter", label: s.shorter, icon: Shrink, disabled: item.rows <= lim.minRows, group: "size", onSelect: () => resizeBy(item, 0, -1) },
      { id: "earlier", label: s.earlier, icon: ArrowUp, disabled: gi <= 0, group: "order", onSelect: () => change(moveItem(items.value, item.id, -1)) },
      { id: "later", label: s.later, icon: ArrowDown, disabled: gi < 0 || gi >= group.length - 1 || idx < 0, group: "order", onSelect: () => change(moveItem(items.value, item.id, 1)) },
      { id: "pin", label: item.pinned ? s.unpin : s.pin, icon: item.pinned ? PinOff : Pin, group: "order", onSelect: () => pin(item) },
    );
  }
  if (def?.fields?.length) out.push({ id: "settings", label: s.settings, icon: Settings2, group: "item", onSelect: () => (settingsFor.value = item.id) });
  if (editing.value)
    out.push({
      id: "remove",
      label: s.remove,
      icon: Trash2,
      danger: true,
      group: "danger",
      onSelect: () => {
        live.value = t.value.announce.removed(titleOf(item.id));
        change(items.value.filter((i) => i.id !== item.id));
      },
    });
  return out;
}

const settingsItem = computed(() => (settingsFor.value ? items.value.find((i) => i.id === settingsFor.value) : undefined));
async function saveSettings(values: Record<string, BoardSettingValue>) {
  const target = settingsItem.value;
  if (!target) return;
  const next = items.value.map((i) => (i.id === target.id ? { ...i, settings: values } : i));
  if (editing.value) change(next);
  else await props.onSave(next);
  settingsFor.value = null;
}

const shownItem = (item: BoardItem) => (preview.value?.id === item.id ? { ...item, cols: preview.value.cols, rows: preview.value.rows } : item);
const justSettings = (menu: ContextMenuAction[]) => menu.length === 1 && menu[0]?.id === "settings";

function openMenu(event: MouseEvent) {
  const card = (event.currentTarget as HTMLElement).closest<HTMLElement>('[data-slot="dashboard-board-card"]');
  if (card) openContextMenuAt(card);
}

const Widget: FunctionalComponent<{ node: VNodeChild }> = (p) => p.node as never;
const ctxOf = (item: BoardItem, span: number): DashboardWidgetContext => ({ id: item.id, settings: settingsOf(defs.value.get(item.type), item), cols: span, rows: item.rows, editing: editing.value });
</script>

<template>
  <section data-slot="dashboard-board" :aria-label="t.region" :class="cn('flex w-full min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center gap-3">
      <h2 v-if="props.title || $slots.title" class="me-auto text-h3 font-semibold"><slot name="title">{{ props.title }}</slot></h2>
      <span v-else class="me-auto" />
      <template v-if="editing">
        <NqBadge variant="brand">{{ t.editing }}</NqBadge>
        <NqButton variant="secondary" :disabled="saving" @click="adding = true"><Plus aria-hidden="true" /> {{ t.add }}</NqButton>
        <NqButton v-if="props.defaultLayout" variant="ghost" :disabled="saving" @click="resetToDefault"><RotateCcw aria-hidden="true" /> {{ t.reset }}</NqButton>
        <NqButton variant="ghost" :disabled="saving" @click="setEditing(false)">{{ t.cancel }}</NqButton>
        <NqButton :loading="saving" :disabled="!dirty" @click="save"><Check aria-hidden="true" /> {{ saving ? t.saving : t.save }}</NqButton>
      </template>
      <NqButton v-else variant="secondary" :disabled="!!props.loading || !!props.error" @click="startEditing"><Pencil aria-hidden="true" /> {{ t.customise }}</NqButton>
    </div>
    <p v-if="editing" class="text-body-sm text-muted-foreground">{{ t.customiseHint }}</p>
    <p v-if="saveError" role="alert" class="text-body-sm text-danger">{{ t.saveFailed }}</p>

    <NqErrorState v-if="props.error" :title="typeof props.error === 'string' ? props.error : undefined">
      <template v-if="props.onRetry" #actions><NqButton @click="props.onRetry">{{ t.retry }}</NqButton></template>
    </NqErrorState>
    <NqLoadingState v-else-if="props.loading" :rows="4" />
    <NqEmptyState v-else-if="items.length === 0" :icon="LayoutDashboard" :title="t.emptyTitle" :description="t.emptyBody">
      <template #actions>
        <NqButton v-if="editing" @click="adding = true"><Plus aria-hidden="true" /> {{ t.add }}</NqButton>
        <NqButton v-else @click="startEditing"><Pencil aria-hidden="true" /> {{ t.customise }}</NqButton>
      </template>
    </NqEmptyState>
    <ul
      v-else
      ref="gridRef"
      :aria-label="t.region"
      class="grid w-full list-none p-0"
      :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: `${props.rowHeight}px`, gap: `${GAP}px` }"
    >
      <li
        v-for="source in items"
        :key="source.id"
        :data-board-id="source.id"
        :data-dragging="activeId === source.id ? '' : undefined"
        :class="cn('min-w-0', activeId === source.id && 'opacity-80')"
        :style="{
          gridColumn: `span ${Math.min(shownItem(source).cols, columns)}`,
          gridRow: `span ${shownItem(source).rows}`,
          transform: activeId === source.id ? `translate(${shift.x}px, ${shift.y}px)` : undefined,
          zIndex: activeId === source.id || preview?.id === source.id ? 20 : undefined,
        }"
      >
        <NqContextMenuActions :actions="menuFor(source)" data-slot="dashboard-board-card" class="relative h-full w-full">
          <NqCard :class="cn('h-full w-full gap-0 overflow-hidden py-0', editing && 'border-dashed ring-1 ring-border', preview?.id === source.id && 'ring-2 ring-ring')">
            <div class="flex min-h-11 items-center gap-2 border-b border-border px-3 py-1.5">
              <button
                v-if="editing"
                type="button"
                :data-board-handle="source.id"
                :aria-roledescription="t.sortable"
                :aria-label="t.dragHandle(defs.get(source.type)?.title ?? source.id)"
                :aria-pressed="activeId === source.id ? 'true' : 'false'"
                :title="t.instructions"
                class="-ms-1 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                @pointerdown="onHandleDown($event, source.id)"
                @keydown="onHandleKey($event, source.id)"
              >
                <GripVertical aria-hidden="true" class="size-4" />
              </button>
              <h3 class="min-w-0 flex-1 truncate text-body-sm font-medium">{{ defs.get(source.type)?.title ?? source.id }}</h3>
              <Pin v-if="source.pinned" role="img" :aria-label="t.pinned" class="size-3.5 shrink-0 text-muted-foreground" />
              <span v-if="editing" dir="ltr" class="shrink-0 text-caption tabular-nums text-muted-foreground" role="img" :aria-label="`${t.sizeLabel}: ${t.size(shownItem(source).cols, shownItem(source).rows)}`">
                {{ shownItem(source).cols }}×{{ shownItem(source).rows }}
              </span>
              <NqButton v-if="editing" variant="ghost" size="icon-sm" :aria-pressed="!!source.pinned" :aria-label="source.pinned ? t.unpin : t.pin" @click="pin(source)">
                <PinOff v-if="source.pinned" aria-hidden="true" />
                <Pin v-else aria-hidden="true" />
              </NqButton>
              <NqButton
                v-if="menuFor(source).length > 0"
                variant="ghost"
                size="icon-sm"
                data-board-more=""
                :aria-label="justSettings(menuFor(source)) ? `${t.settings}: ${defs.get(source.type)?.title ?? source.id}` : t.more(defs.get(source.type)?.title ?? source.id)"
                @click="justSettings(menuFor(source)) ? (settingsFor = source.id) : openMenu($event)"
              >
                <Settings2 v-if="justSettings(menuFor(source))" aria-hidden="true" />
                <Ellipsis v-else aria-hidden="true" />
              </NqButton>
            </div>
            <div class="min-h-0 flex-1 overflow-auto p-3" :inert="editing || undefined">
              <template v-if="defs.get(source.type)">
                <Widget v-if="defs.get(source.type)!.render" :node="defs.get(source.type)!.render!(ctxOf(shownItem(source), Math.min(shownItem(source).cols, columns)))" />
                <slot v-else name="widget" :def="defs.get(source.type)!" :ctx="ctxOf(shownItem(source), Math.min(shownItem(source).cols, columns))" />
              </template>
              <p v-else class="text-body-sm text-muted-foreground">{{ t.unavailable }}</p>
            </div>
          </NqCard>
          <button
            v-if="editing"
            type="button"
            tabindex="-1"
            aria-hidden="true"
            data-board-grip=""
            class="absolute bottom-1 end-1 z-10 flex size-6 cursor-nwse-resize touch-none items-center justify-center rounded-control text-muted-foreground hover:bg-muted rtl:cursor-nesw-resize"
            @pointerdown="onGripDown($event, source)"
          >
            <MoveDiagonal aria-hidden="true" class="size-4 rtl:-scale-x-100" />
          </button>
        </NqContextMenuActions>
      </li>
    </ul>
    <p role="status" aria-live="polite" class="sr-only">{{ live }}</p>

    <NqDialog :open="adding" @update:open="adding = $event">
      <NqDialogContent :close-label="t.close">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.addTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.addBody }}</NqDialogDescription>
        </NqDialogHeader>
        <ul class="flex flex-col divide-y divide-border rounded-control border border-border">
          <li v-for="w in props.widgets" :key="w.type" class="flex items-center gap-3 px-3 py-2.5">
            <div class="min-w-0 flex-1">
              <p class="text-body font-medium">{{ w.title }}</p>
              <p v-if="w.description" class="text-caption text-muted-foreground">{{ w.description }}</p>
              <p v-if="w.unique && items.some((i) => i.type === w.type)" class="text-caption text-muted-foreground">{{ t.alreadyOnBoard }}</p>
            </div>
            <NqButton size="sm" variant="secondary" :disabled="!!w.unique && items.some((i) => i.type === w.type)" :aria-label="`${t.add}: ${w.title}`" @click="addWidget(w)">
              <Plus aria-hidden="true" /> {{ t.add }}
            </NqButton>
          </li>
        </ul>
      </NqDialogContent>
    </NqDialog>

    <NqDashboardBoardSettings
      v-if="settingsItem"
      :key="settingsItem.id"
      :def="defs.get(settingsItem.type)"
      :initial="settingsOf(defs.get(settingsItem.type), settingsItem)"
      :labels="t"
      :on-save="saveSettings"
      @close="settingsFor = null"
    />
  </section>
</template>
