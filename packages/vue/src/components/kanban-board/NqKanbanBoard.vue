<script setup lang="ts" generic="T extends KanbanCardData">
import { computed, nextTick, onBeforeUnmount, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { formatNumber } from "../numeric";
import { findContainer, groupCards, keyMove, placeCard, dropTarget, type ColumnGeometry, type Items } from "./kanban-logic";
import { strings } from "./kanban-strings";
import type { AnnounceFn, KanbanCardData, KanbanColumnData } from "./kanban-types";
import NqKanbanCard from "./NqKanbanCard.vue";

// Columns of draggable cards. Controlled: pass `columns` and `cards`, apply `onMove` to your state. Pointer, touch (press and hold)
// and keyboard (Space to lift, arrows to move, Space to drop, Escape to cancel) with localised announcements. Native pointer events, no dnd-kit.
const props = withDefaults(defineProps<{
  columns: KanbanColumnData[];
  cards: T[];
  /** A card was dropped somewhere new. `toIndex` is the position in the destination column once the card is removed from its old place. Update your `cards` in response. */
  onMove: (cardId: string, toColumn: string, toIndex: number) => void;
  /** Text of an empty column. Default "No cards" / "لا توجد بطاقات". */
  emptyLabel?: string;
  /** Landmark name. Default "Kanban board" / "لوحة كانبان". */
  label?: string;
  /** Replace the screen-reader announcements. Each receives titles and a 1-based position. */
  announcements?: { pickedUp?: AnnounceFn; movedOver?: AnnounceFn; dropped?: AnnounceFn; cancelled?: (card: string) => string };
  /** Screen-reader instructions read when a card gets focus. Localise it. */
  instructions?: string;
  /** Column class, for example a different width. Default width `w-72`. */
  columnClass?: HTMLAttributes["class"];
  /** Actions for a card. They open as a context menu on context-click, Shift+F10 or the Menu key while a card has focus. */
  cardActions?: (card: T) => ContextMenuAction[];
  /** Open `cardActions` as a context menu. Default true. */
  contextMenu?: boolean;
  class?: HTMLAttributes["class"];
}>(), { contextMenu: true });
defineSlots<{
  /** Replace the card body. The board wraps it in the drag handle. Default: `NqKanbanCard`. */
  card?: (p: { card: T; overlay: boolean; dragging: boolean }) => unknown;
}>();

const nq = useNasaq();
const t = computed(() => strings(nq.locale.value));
const locale = computed(() => nq.locale.value);
const rtl = computed(() => nq.direction.value === "rtl");
const num = (v: number) => formatNumber(v, locale.value);
const uid = useId();
const hintId = `${uid}-hint`;

const root = ref<HTMLElement | null>(null);
const cardsById = computed(() => new Map(props.cards.map((c) => [c.id, c])));
const columnsById = computed(() => new Map(props.columns.map((c) => [c.id, c])));
const base = computed(() => groupCards(props.columns, props.cards));
// While a card is dragged its position is tracked here; the parent is told once, on drop.
const drag = ref<Items | null>(null);
const items = computed(() => drag.value ?? base.value);
const activeId = ref<string | null>(null);
const announcement = ref("");
const overlay = ref<{ left: number; top: number; width: number } | null>(null);
let origin: { column: string; index: number } | null = null;
let session: { id: string; pointerId: number; startX: number; startY: number; offX: number; offY: number; width: number; active: boolean; touch: boolean; timer: ReturnType<typeof setTimeout> | undefined } | null = null;

const overColumn = computed(() => (activeId.value ? findContainer(items.value, activeId.value) : undefined));
const activeCard = computed(() => (activeId.value ? cardsById.value.get(activeId.value) : undefined));

function say(kind: "pickedUp" | "movedOver" | "dropped", id: string) {
  const cur = items.value;
  const col = findContainer(cur, id);
  const list = col ? (cur[col] ?? []) : [];
  const d = {
    card: cardsById.value.get(id)?.title ?? id,
    column: col ? (columnsById.value.get(col)?.title ?? "") : "",
    position: Math.max(list.indexOf(id) + 1, 1),
    total: Math.max(list.length, 1),
  };
  const custom = props.announcements?.[kind];
  announcement.value = custom ? custom(d.card, d.column, d.position, d.total) : t.value[kind](d.card, d.column, num(d.position), num(d.total));
}

function lift(id: string) {
  const column = findContainer(base.value, id);
  if (!column) return false;
  origin = { column, index: base.value[column]?.indexOf(id) ?? 0 };
  activeId.value = id;
  drag.value = base.value;
  return true;
}

function reset() {
  if (session?.timer) clearTimeout(session.timer);
  window.removeEventListener("pointermove", pointerMove);
  window.removeEventListener("pointerup", pointerUp);
  window.removeEventListener("pointercancel", onCancelPointer);
  window.removeEventListener("touchmove", blockScroll);
  session = null;
  activeId.value = null;
  drag.value = null;
  overlay.value = null;
  origin = null;
}

function drop() {
  const id = activeId.value;
  const cur = items.value;
  const column = id ? findContainer(cur, id) : undefined;
  const index = id && column ? (cur[column] ?? []).indexOf(id) : -1;
  const start = origin;
  if (id) say("dropped", id);
  reset();
  if (id && start && column && index >= 0 && (column !== start.column || index !== start.index)) props.onMove(id, column, index);
}

function cancel() {
  const id = activeId.value;
  reset();
  if (id) announcement.value = (props.announcements?.cancelled ?? t.value.cancelled)(cardsById.value.get(id)?.title ?? id);
}

/* ------------------------------------------------------------- keyboard */

function onKey(event: KeyboardEvent, id: string) {
  if (event.target !== event.currentTarget) return;
  const lifted = activeId.value === id;
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (lifted) drop();
    else if (activeId.value === null && lift(id)) say("pickedUp", id);
    return;
  }
  if (!lifted) return;
  if (event.key === "Escape") {
    event.preventDefault();
    cancel();
    return;
  }
  const to = keyMove(items.value, props.columns, id, event.key, rtl.value);
  if (event.key.startsWith("Arrow")) event.preventDefault();
  if (!to) return;
  drag.value = placeCard(items.value, id, to.column, to.index);
  say("movedOver", id);
  void nextTick(() => root.value?.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`)?.focus());
}

/* ------------------------------------------------------------- pointer */

function measure(skip: string): ColumnGeometry[] {
  return [...(root.value?.querySelectorAll<HTMLElement>('[data-slot="kanban-column"]') ?? [])].map((col) => {
    const r = col.getBoundingClientRect();
    const centers = [...col.querySelectorAll<HTMLElement>("[data-card-id]")]
      .filter((li) => li.dataset.cardId !== skip)
      .map((li) => {
        const b = li.getBoundingClientRect();
        return b.top + b.height / 2;
      });
    return { id: col.dataset.columnId ?? "", left: r.left, right: r.right, centers };
  });
}

function onDown(event: PointerEvent, id: string) {
  if (session || (event.pointerType === "mouse" && event.button !== 0)) return;
  if ((event.target as HTMLElement).closest("button,a,input,textarea,select,[contenteditable]")) return;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const touch = event.pointerType === "touch";
  session = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offX: event.clientX - rect.left, offY: event.clientY - rect.top, width: rect.width, active: false, touch, timer: undefined };
  if (touch) session.timer = setTimeout(activate, 200, event.clientX, event.clientY);
  window.addEventListener("pointermove", pointerMove);
  window.addEventListener("pointerup", pointerUp);
  window.addEventListener("pointercancel", onCancelPointer);
}

function blockScroll(event: Event) {
  if (event.cancelable) event.preventDefault();
}

function activate(x: number, y: number) {
  if (!session || session.active) return;
  if (!lift(session.id)) return reset();
  session.active = true;
  say("pickedUp", session.id);
  if (session.touch) window.addEventListener("touchmove", blockScroll, { passive: false });
  follow(x, y);
}

function follow(x: number, y: number) {
  if (!session) return;
  overlay.value = { left: x - session.offX, top: y - session.offY, width: session.width };
  const target = dropTarget(measure(session.id), x, y);
  const cur = items.value;
  const column = findContainer(cur, session.id);
  if (!target || !column) return;
  const index = (cur[column] ?? []).indexOf(session.id);
  if (target.column === column && target.index === index) return;
  drag.value = placeCard(cur, session.id, target.column, target.index);
  say("movedOver", session.id);
}

function pointerMove(event: PointerEvent) {
  if (!session || event.pointerId !== session.pointerId) return;
  if (!session.active) {
    const dist = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
    if (session.touch) {
      // A touch that moves before the press-and-hold is a scroll, not a drag.
      if (dist > 6) reset();
      return;
    }
    if (dist < 4) return;
    activate(event.clientX, event.clientY);
    if (!session) return;
  }
  event.preventDefault();
  follow(event.clientX, event.clientY);
}

function pointerUp(event: PointerEvent) {
  if (!session || event.pointerId !== session.pointerId) return;
  if (session.active) drop();
  else reset();
}
function onCancelPointer() {
  if (session?.active) cancel();
  else reset();
}
onBeforeUnmount(reset);

const actionsFor = (card: T) => (props.contextMenu ? (props.cardActions?.(card) ?? []) : []);
</script>

<template>
  <div ref="root" data-slot="kanban-board" role="group" :aria-label="props.label ?? t.board" :class="cn('flex w-full items-start gap-4 overflow-x-auto pb-2', props.class)">
    <p :id="hintId" class="sr-only">{{ props.instructions ?? t.instructions }}</p>
    <section
      v-for="column in props.columns"
      :key="column.id"
      data-slot="kanban-column"
      :data-column-id="column.id"
      :data-over="overColumn === column.id ? '' : undefined"
      :aria-labelledby="`${uid}-${column.id}`"
      :class="cn('flex max-h-full w-72 shrink-0 flex-col gap-3 rounded-card border border-border bg-secondary p-3 transition-colors duration-150 ease-nq', 'data-over:border-nq-focus', props.columnClass)"
    >
      <header data-slot="kanban-column-header" class="flex items-center justify-between gap-2">
        <h3 :id="`${uid}-${column.id}`" class="min-w-0 truncate text-label text-foreground">{{ column.title }}</h3>
        <NqBadge variant="outline" :aria-label="t.cardCount(num((items[column.id] ?? []).length))">
          <span class="tabular-nums">{{ num((items[column.id] ?? []).length) }}</span>
        </NqBadge>
      </header>
      <ul data-slot="kanban-list" class="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto">
        <template v-for="id in items[column.id] ?? []" :key="id">
          <NqContextMenuActions
            v-if="cardsById.get(id)"
            as="li"
            :actions="actionsFor(cardsById.get(id)!)"
            data-slot="kanban-item"
            :data-card-id="id"
            :data-dragging="activeId === id ? '' : undefined"
            role="button"
            tabindex="0"
            :aria-roledescription="t.card"
            :aria-pressed="activeId === id ? 'true' : 'false'"
            :aria-describedby="hintId"
            :class="cn('cursor-grab touch-manipulation rounded-card outline-none active:cursor-grabbing', 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus', activeId === id && 'opacity-40')"
            @pointerdown="onDown($event, id)"
            @keydown="onKey($event, id)"
          >
            <slot name="card" :card="cardsById.get(id)!" :overlay="false" :dragging="activeId === id">
              <NqKanbanCard :card="cardsById.get(id)!" />
            </slot>
          </NqContextMenuActions>
        </template>
        <li
          v-if="(items[column.id] ?? []).length === 0"
          data-slot="kanban-empty"
          class="flex flex-1 items-center justify-center rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground"
        >
          {{ props.emptyLabel ?? t.empty }}
        </li>
      </ul>
    </section>

    <div v-if="activeCard && overlay" data-slot="kanban-overlay" aria-hidden="true" class="pointer-events-none fixed z-50 cursor-grabbing shadow-lg" :style="{ left: `${overlay.left}px`, top: `${overlay.top}px`, width: `${overlay.width}px` }">
      <slot name="card" :card="activeCard" :overlay="true" :dragging="false">
        <NqKanbanCard :card="activeCard" />
      </slot>
    </div>
    <div role="status" aria-live="assertive" class="sr-only">{{ announcement }}</div>
  </div>
</template>
