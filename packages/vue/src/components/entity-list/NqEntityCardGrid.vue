<script setup lang="ts" generic="T">
import { computed, ref } from "vue";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { openContextMenuAt, type ContextMenuAction } from "../context-menu";
import type { DataTableInstance, DataTableLabels } from "../data-table";
import { NqErrorState, NqSkeleton } from "../states";
import { cn } from "../../lib/cn";
import NqEntityCard from "./NqEntityCard.vue";
import NqEntityCardMenu from "./NqEntityCardMenu.vue";
import { controlsWidth, verticalCard, type EntityListLabels } from "./entity-list-logic";

// The card layout of the entity list: a grid of cards with the table rows' keyboard model, selection, row menu and
// context menu. Internal.
const props = defineProps<{
  table: DataTableInstance<T>;
  label: string;
  rowLabel?: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ContextMenuAction[];
  contextMenu: boolean;
  loading: boolean;
  error?: string | boolean;
  onRetry?: () => void;
  minWidth: number;
  t: DataTableLabels & EntityListLabels;
}>();
defineSlots<{ card?: (p: { row: T }) => unknown; empty?: () => unknown }>();

const INTERACTIVE = "a,button,input,select,textarea,[role=checkbox],[role=menuitem],[contenteditable=true]";
const grid = ref<HTMLElement | null>(null);
const active = ref(0);
const rows = computed(() => props.table.rows);
const selectable = computed(() => props.table.selectable);
const current = computed(() => Math.min(active.value, Math.max(0, rows.value.length - 1)));
const nameOf = (row: T) => props.rowLabel?.(row) ?? props.table.getRowId(row);
const gridStyle = computed(() => ({ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${props.minWidth}px), 1fr))` }));
const skeletons = computed(() => Array.from({ length: Math.min(props.table.pageSize ?? 6, 8) }, (_, i) => i));
const WIDTHS = [64, 48, 72];

const cards = () => Array.from(grid.value?.querySelectorAll<HTMLElement>("[data-card]") ?? []);
function focusCard(index: number) {
  const target = cards()[index];
  if (!target) return;
  active.value = index;
  target.focus();
}
function onKeydown(event: KeyboardEvent, row: T, index: number) {
  const el = event.currentTarget as HTMLElement;
  if (event.target !== el) return;
  const last = rows.value.length - 1;
  const rtl = getComputedStyle(el).direction === "rtl";
  const step = (d: number) => Math.max(0, Math.min(last, index + d));
  const rects = () => cards().map((c) => c.getBoundingClientRect());
  let move: number | undefined;
  if (event.key === "ArrowRight") move = step(rtl ? -1 : 1);
  else if (event.key === "ArrowLeft") move = step(rtl ? 1 : -1);
  else if (event.key === "ArrowDown") move = verticalCard(rects(), index, 1);
  else if (event.key === "ArrowUp") move = verticalCard(rects(), index, -1);
  else if (event.key === "Home") move = 0;
  else if (event.key === "End") move = last;
  if (move !== undefined) {
    event.preventDefault();
    focusCard(move);
  } else if (event.key === "Enter" && props.onRowClick) {
    event.preventDefault();
    props.onRowClick(row);
  } else if (event.key === " " && selectable.value) {
    event.preventDefault();
    props.table.toggleRow(props.table.getRowId(row));
  } else if ((event.key === "F10" && event.shiftKey) || event.key === "ContextMenu") {
    if (props.contextMenu && props.rowActions?.(row).length && openContextMenuAt(el)) {
      event.preventDefault();
      return;
    }
    const trigger = el.querySelector<HTMLElement>("[data-slot=entity-card-actions]");
    if (trigger) {
      event.preventDefault();
      trigger.click();
    }
  }
}
function onClick(event: MouseEvent, row: T) {
  const hit = (event.target as HTMLElement).closest(INTERACTIVE);
  if (hit && hit !== event.currentTarget) return;
  if (window.getSelection()?.toString()) return;
  props.onRowClick?.(row);
}
</script>

<template>
  <ul v-if="props.loading" role="list" aria-busy="true" :aria-label="props.label" class="grid gap-3" :style="gridStyle">
    <li v-for="i in skeletons" :key="i" aria-hidden="true" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <div class="flex items-center gap-3">
        <NqSkeleton class="size-10 rounded-full" />
        <div class="flex flex-1 flex-col gap-2">
          <NqSkeleton class="h-3" :style="{ inlineSize: `${WIDTHS[i % 3]}%` }" />
          <NqSkeleton class="h-3 w-1/3" />
        </div>
      </div>
      <NqSkeleton class="h-3 w-4/5" />
      <div class="flex gap-2">
        <NqSkeleton class="h-5 w-14" />
        <NqSkeleton class="h-5 w-10" />
      </div>
    </li>
  </ul>
  <NqErrorState v-else-if="props.error" :title="props.error === true ? props.t.error : props.error">
    <template v-if="props.onRetry" #actions><NqButton size="sm" @click="props.onRetry()">{{ props.t.retry }}</NqButton></template>
  </NqErrorState>
  <div v-else-if="!rows.length" class="rounded-card border border-dashed border-border"><slot name="empty" /></div>
  <ul v-else ref="grid" role="list" :aria-label="props.label" class="grid gap-3" :style="gridStyle">
    <NqEntityCard
      v-for="(row, index) in rows"
      :key="props.table.getRowId(row)"
      :actions="props.rowActions?.(row) ?? []"
      :disabled="!props.contextMenu"
      data-card=""
      :data-state="props.table.selection.has(props.table.getRowId(row)) ? 'selected' : undefined"
      :tabindex="index === current ? 0 : -1"
      :style="{ '--entity-card-controls': controlsWidth(selectable, (props.rowActions?.(row) ?? []).length > 0) }"
      :class="
        cn(
          'group/card relative flex min-w-0 flex-col rounded-card border border-border bg-card p-4 text-card-foreground outline-none transition-colors duration-150 ease-nq',
          'hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus data-[state=selected]:border-primary data-[state=selected]:bg-nq-selected',
          props.onRowClick && 'cursor-pointer',
        )
      "
      @focus="(e: FocusEvent) => e.target === e.currentTarget && (active = index)"
      @keydown="(e: KeyboardEvent) => onKeydown(e, row, index)"
      @click="(e: MouseEvent) => onClick(e, row)"
    >
      <!-- The card keeps its full width. Only its top row should leave room for the controls: use pe-(--entity-card-controls). -->
      <div class="min-w-0 flex-1"><slot name="card" :row="row" /></div>
      <div v-if="selectable || (props.rowActions?.(row) ?? []).length" class="absolute end-2 top-2 flex items-center gap-1">
        <NqCheckbox
          v-if="selectable"
          :tabindex="index === current ? 0 : -1"
          :model-value="props.table.selection.has(props.table.getRowId(row))"
          :aria-label="props.t.selectRowCard(nameOf(row))"
          @update:model-value="props.table.toggleRow(props.table.getRowId(row))"
        />
        <NqEntityCardMenu
          v-if="(props.rowActions?.(row) ?? []).length"
          :actions="props.rowActions?.(row) ?? []"
          :label="props.t.rowActions(nameOf(row))"
          :tabindex="index === current ? 0 : -1"
        />
      </div>
    </NqEntityCard>
  </ul>
</template>
