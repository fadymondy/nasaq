"use client";

import {
  type Announcements,
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type ComponentProps, type ReactNode, useCallback, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Badge, type TagHue } from "../badge";
import { ContextMenuActions, type ContextMenuAction } from "../context-menu";
import { formatNumber } from "../numeric";

const STRINGS = {
  en: {
    board: "Kanban board",
    card: "draggable card",
    empty: "No cards",
    cardCount: (n: string) => `${n} cards`,
    instructions:
      "To pick up a card, press Space or Enter. Use the arrow keys to move it within or between columns, Space or Enter to drop it, Escape to cancel.",
    pickedUp: (card: string, col: string, pos: string, total: string) => `Picked up ${card}. It is in ${col}, position ${pos} of ${total}.`,
    movedOver: (card: string, col: string, pos: string, total: string) => `${card} is now in ${col}, position ${pos} of ${total}.`,
    dropped: (card: string, col: string, pos: string, total: string) => `Dropped ${card} in ${col}, position ${pos} of ${total}.`,
    cancelled: (card: string) => `Move cancelled. ${card} returned to its place.`,
  },
  ar: {
    board: "لوحة كانبان",
    card: "بطاقة قابلة للسحب",
    empty: "لا توجد بطاقات",
    cardCount: (n: string) => `${n} بطاقات`,
    instructions:
      "لالتقاط بطاقة اضغط مسافة أو إدخال. استخدم مفاتيح الأسهم لنقلها داخل العمود أو بين الأعمدة، ومسافة أو إدخال لإفلاتها، وEscape للإلغاء.",
    pickedUp: (card: string, col: string, pos: string, total: string) => `تم التقاط ${card}. موجودة في ${col} بالموضع ${pos} من ${total}.`,
    movedOver: (card: string, col: string, pos: string, total: string) => `${card} الآن في ${col} بالموضع ${pos} من ${total}.`,
    dropped: (card: string, col: string, pos: string, total: string) => `تم إفلات ${card} في ${col} بالموضع ${pos} من ${total}.`,
    cancelled: (card: string) => `أُلغي النقل. عادت ${card} إلى مكانها.`,
  },
};

export interface KanbanLabel {
  label: string;
  hue?: TagHue;
}

export interface KanbanColumnData {
  /** Unique across columns AND cards. */
  id: string;
  title: string;
  /** The column's real size when only part of it is on the board (a paged column). Default: the cards shown. */
  count?: number;
  /** Before the title, e.g. a status dot. Decorative. */
  accent?: ReactNode;
  /** A line under the header, e.g. the column's total value. */
  meta?: ReactNode;
  /** Below the cards, outside the drop list, e.g. a "Load more" button. */
  footer?: ReactNode;
}

export interface KanbanCardData {
  /** Unique across cards AND columns. */
  id: string;
  /** The column the card is in. Cards keep the order of the `cards` array within their column. */
  columnId: string;
  title: string;
  labels?: KanbanLabel[];
  assignee?: { name: string; src?: string };
}

export interface KanbanCardRenderState {
  /** True for the copy that follows the pointer. */
  overlay: boolean;
  /** True for the card left in the list while its copy is dragged. */
  dragging: boolean;
}

type AnnounceFn = (card: string, column: string, position: number, total: number) => string;

export interface KanbanBoardProps<T extends KanbanCardData = KanbanCardData> extends Omit<ComponentProps<"div">, "children" | "onChange" | "contextMenu"> {
  columns: KanbanColumnData[];
  cards: T[];
  /**
   * A card was dropped somewhere new. `toIndex` is the position in the destination column once the card is
   * removed from its old place (the index it will have in the new array). Update your `cards` in response.
   */
  onMove: (cardId: string, toColumn: string, toIndex: number) => void;
  /** Replace the card body. The board wraps it in the drag handle. Default: `KanbanCard`. */
  renderCard?: (card: T, state: KanbanCardRenderState) => ReactNode;
  /** Text of an empty column. Default "No cards" / "لا توجد بطاقات". */
  emptyLabel?: string;
  /** Landmark name. Default "Kanban board" / "لوحة كانبان". */
  label?: string;
  /** Replace the screen-reader announcements. Each receives titles and a 1-based position. */
  announcements?: { pickedUp?: AnnounceFn; movedOver?: AnnounceFn; dropped?: AnnounceFn; cancelled?: (card: string) => string };
  /** Screen-reader instructions read when a card gets focus. Localise it. */
  instructions?: string;
  /** Column class, for example a different width. Default width `w-72`. */
  columnClassName?: string;
  /** Actions for a card. They open as a context menu on context-click, Shift+F10 or the Menu key while a card has focus. */
  cardActions?: (card: T) => ContextMenuAction[];
  /** Open `cardActions` as a context menu. Default true; false keeps the browser's menu. */
  contextMenu?: boolean;
}

function useStrings() {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { t: STRINGS[locale.startsWith("ar") ? "ar" : "en"], locale };
}

type Items = Record<string, string[]>;

function groupCards(columns: KanbanColumnData[], cards: KanbanCardData[]): Items {
  const items: Items = Object.fromEntries(columns.map((c) => [c.id, [] as string[]]));
  for (const card of cards) items[card.columnId]?.push(card.id);
  return items;
}

const findContainer = (items: Items, id: string): string | undefined =>
  id in items ? id : Object.keys(items).find((key) => items[key]?.includes(id));

/** The default card body: title, coloured labels and the assignee's avatar. */
export function KanbanCard({ card, className, ...props }: { card: KanbanCardData } & ComponentProps<"div">) {
  return (
    <div
      data-slot="kanban-card"
      className={cn("flex flex-col gap-2 rounded-card border border-border bg-card p-3 text-card-foreground", className)}
      {...props}
    >
      {card.labels?.length ? (
        <div className="flex flex-wrap gap-1">
          {card.labels.map((l) => (
            <Badge key={l.label} variant="tag" hue={l.hue ?? "gray"}>
              {l.label}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="text-label text-foreground">{card.title}</div>
      {card.assignee ? (
        <div className="flex items-center justify-end">
          <Avatar name={card.assignee.name} src={card.assignee.src} size="xs" />
        </div>
      ) : null}
    </div>
  );
}

function SortableCard<T extends KanbanCardData>({
  card,
  renderCard,
  roleDescription,
  actions,
}: {
  card: T;
  renderCard: (card: T, state: KanbanCardRenderState) => ReactNode;
  roleDescription: string;
  actions: ContextMenuAction[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const item = (
    <li
      ref={setNodeRef}
      data-slot="kanban-item"
      data-dragging={isDragging ? "" : undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "cursor-grab touch-manipulation rounded-card outline-none active:cursor-grabbing",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
        isDragging && "opacity-40",
      )}
      {...attributes}
      aria-roledescription={roleDescription}
      {...listeners}
    >
      {renderCard(card, { overlay: false, dragging: isDragging })}
    </li>
  );
  return actions.length ? <ContextMenuActions actions={actions} render={item} /> : item;
}

function Column<T extends KanbanCardData>({
  column,
  ids,
  cardsById,
  renderCard,
  emptyLabel,
  className,
  cardActions,
}: {
  cardActions?: ((card: T) => ContextMenuAction[]) | undefined;
  column: KanbanColumnData;
  ids: string[];
  cardsById: Map<string, T>;
  renderCard: (card: T, state: KanbanCardRenderState) => ReactNode;
  emptyLabel: string;
  className?: string | undefined;
}) {
  const { t, locale } = useStrings();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const headingId = useId();
  const count = formatNumber(column.count ?? ids.length, locale);
  return (
    <section
      data-slot="kanban-column"
      data-over={isOver ? "" : undefined}
      aria-labelledby={headingId}
      className={cn(
        "flex max-h-full w-72 shrink-0 flex-col gap-3 rounded-card border border-border bg-secondary p-3 transition-colors duration-150 ease-nq",
        "data-over:border-nq-focus",
        className,
      )}
    >
      <header data-slot="kanban-column-header" className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          {column.accent ? (
            <span aria-hidden className="flex shrink-0 items-center">
              {column.accent}
            </span>
          ) : null}
          <h3 id={headingId} className="min-w-0 flex-1 truncate text-label text-foreground">
            {column.title}
          </h3>
          <Badge variant="outline" aria-label={t.cardCount(count)}>
            <span className="tabular-nums">{count}</span>
          </Badge>
        </div>
        {column.meta ? (
          <div data-slot="kanban-column-meta" className="min-w-0 truncate text-body-sm text-muted-foreground">
            {column.meta}
          </div>
        ) : null}
      </header>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} data-slot="kanban-list" className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto">
          {ids.map((id) => {
            const card = cardsById.get(id);
            return card ? <SortableCard key={id} card={card} renderCard={renderCard} roleDescription={t.card} actions={cardActions?.(card) ?? []} /> : null;
          })}
          {ids.length === 0 ? (
            <li
              data-slot="kanban-empty"
              className="flex flex-1 items-center justify-center rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground"
            >
              {emptyLabel}
            </li>
          ) : null}
        </ul>
      </SortableContext>
      {column.footer ? <div data-slot="kanban-column-footer">{column.footer}</div> : null}
    </section>
  );
}

/**
 * Columns of draggable cards. Controlled: pass `columns` and `cards`, apply `onMove` to your state.
 * Pointer, touch and keyboard (Space to lift, arrows to move, Space to drop, Escape to cancel) with localised announcements.
 */
export function KanbanBoard<T extends KanbanCardData = KanbanCardData>({
  columns,
  cards,
  onMove,
  renderCard,
  emptyLabel,
  label,
  announcements,
  instructions,
  columnClassName,
  cardActions,
  contextMenu = true,
  className,
  ...props
}: KanbanBoardProps<T>) {
  const { t, locale } = useStrings();
  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const columnsById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const base = useMemo(() => groupCards(columns, cards), [columns, cards]);
  // While a card is dragged its position is tracked here; the parent is told once, on drop.
  const [drag, setDrag] = useState<Items | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const origin = useRef<{ column: string; index: number } | null>(null);
  const items = drag ?? base;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const render = useCallback(
    (card: T, state: KanbanCardRenderState) => (renderCard ? renderCard(card, state) : <KanbanCard card={card} />),
    [renderCard],
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    const id = String(active.id);
    const column = findContainer(base, id);
    if (!column) return;
    origin.current = { column, index: base[column]?.indexOf(id) ?? 0 };
    setActiveId(id);
    setDrag(base);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const rect = active.rect.current.translated;
    const below = rect ? rect.top > over.rect.top + over.rect.height / 2 : false;
    setDrag((prev) => {
      const cur = prev ?? base;
      const from = findContainer(cur, activeKey);
      const to = findContainer(cur, overKey);
      if (!from || !to || from === to) return prev;
      const target = cur[to] ?? [];
      const index = overKey in cur ? target.length : target.indexOf(overKey) + (below ? 1 : 0);
      return {
        ...cur,
        [from]: (cur[from] ?? []).filter((id) => id !== activeKey),
        [to]: [...target.slice(0, index), activeKey, ...target.slice(index)],
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    const start = origin.current;
    let cur = drag ?? base;
    const from = findContainer(cur, id);
    const to = over ? findContainer(cur, String(over.id)) : undefined;
    if (from && over && from === to) {
      const list = cur[from] ?? [];
      const oldIndex = list.indexOf(id);
      const overIndex = String(over.id) in cur ? list.length - 1 : list.indexOf(String(over.id));
      if (oldIndex !== overIndex && overIndex >= 0) cur = { ...cur, [from]: arrayMove(list, oldIndex, overIndex) };
    }
    const column = findContainer(cur, id);
    const index = column ? (cur[column] ?? []).indexOf(id) : -1;
    setActiveId(null);
    setDrag(null);
    origin.current = null;
    if (over && start && column && index >= 0 && (column !== start.column || index !== start.index)) onMove(id, column, index);
  };

  const onDragCancel = () => {
    setActiveId(null);
    setDrag(null);
    origin.current = null;
  };

  const describe = (rawId: string | number, overId?: string | number | null) => {
    const cardId = String(rawId);
    const cur = drag ?? base;
    const over = overId != null ? String(overId) : undefined;
    const colKey = findContainer(cur, over ?? cardId);
    const list = colKey ? (cur[colKey] ?? []) : [];
    const has = list.includes(cardId);
    const total = list.length + (has ? 0 : 1);
    const position = over === undefined ? list.indexOf(cardId) + 1 : over in cur ? total : list.indexOf(over) + 1;
    return {
      card: cardsById.get(cardId)?.title ?? cardId,
      column: colKey ? (columnsById.get(colKey)?.title ?? "") : "",
      position: Math.max(position, 1),
      total: Math.max(total, 1),
    };
  };
  const say = (kind: "pickedUp" | "movedOver" | "dropped", d: { card: string; column: string; position: number; total: number }) => {
    const custom = announcements?.[kind];
    return custom
      ? custom(d.card, d.column, d.position, d.total)
      : t[kind](d.card, d.column, formatNumber(d.position, locale), formatNumber(d.total, locale));
  };

  const dndAnnouncements: Announcements = {
    onDragStart: ({ active }) => say("pickedUp", describe(active.id)),
    onDragOver: ({ active, over }) => (over ? say("movedOver", describe(active.id, over.id)) : undefined),
    onDragEnd: ({ active, over }) => (over ? say("dropped", describe(active.id, over.id)) : undefined),
    onDragCancel: ({ active }) => (announcements?.cancelled ?? t.cancelled)(cardsById.get(String(active.id))?.title ?? String(active.id)),
  };

  const activeCard = activeId ? cardsById.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      accessibility={{ announcements: dndAnnouncements, screenReaderInstructions: { draggable: instructions ?? t.instructions } }}
    >
      <div
        data-slot="kanban-board"
        role="group"
        aria-label={label ?? t.board}
        className={cn("flex w-full items-start gap-4 overflow-x-auto pb-2", className)}
        {...props}
      >
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            ids={items[column.id] ?? []}
            cardsById={cardsById}
            renderCard={render}
            emptyLabel={emptyLabel ?? t.empty}
            cardActions={contextMenu ? cardActions : undefined}
            className={columnClassName}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? <div className="cursor-grabbing shadow-lg">{render(activeCard, { overlay: true, dragging: false })}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}
