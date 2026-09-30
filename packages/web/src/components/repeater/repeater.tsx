"use client";

import { closestCenter, DndContext, type DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Icon } from "../icon";
import { formatNumber } from "../numeric";
import { Tooltip } from "../tooltip";
import { canAdd, canRemove, fitKeys, insertAt, keyTarget, moveItem, removeAt } from "./repeater-math";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    list: "Items",
    add: "Add item",
    empty: "No items yet.",
    row: (n: string) => `Item ${n}`,
    remove: (title: string) => `Remove ${title}`,
    duplicate: (title: string) => `Duplicate ${title}`,
    reorder: (title: string) => `Reorder ${title}`,
    reorderHint: "Focus the handle, then use the arrow keys to move the row. Home and End jump to the ends.",
    collapse: (title: string) => `Collapse ${title}`,
    expand: (title: string) => `Expand ${title}`,
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    count: (n: string) => `${n} items`,
    countMax: (n: string, max: string) => `${n} of ${max} items`,
    minReached: (min: string) => `At least ${min} required.`,
    maxReached: (max: string) => `Limit of ${max} reached.`,
    moved: (title: string, pos: string, total: string) => `${title} moved to position ${pos} of ${total}`,
    added: (title: string) => `${title} added`,
    removed: (title: string) => `${title} removed`,
    duplicated: (title: string) => `${title} duplicated`,
  },
  ar: {
    list: "العناصر",
    add: "إضافة عنصر",
    empty: "لا توجد عناصر بعد.",
    row: (n: string) => `العنصر ${n}`,
    remove: (title: string) => `حذف ${title}`,
    duplicate: (title: string) => `تكرار ${title}`,
    reorder: (title: string) => `إعادة ترتيب ${title}`,
    reorderHint: "ركّز على المقبض ثم استخدم مفاتيح الأسهم لنقل الصف. Home وEnd للانتقال إلى الطرفين.",
    collapse: (title: string) => `طيّ ${title}`,
    expand: (title: string) => `توسيع ${title}`,
    expandAll: "توسيع الكل",
    collapseAll: "طيّ الكل",
    count: (n: string) => `${n} عناصر`,
    countMax: (n: string, max: string) => `${n} من ${max} عناصر`,
    minReached: (min: string) => `مطلوب ${min} على الأقل.`,
    maxReached: (max: string) => `تم بلوغ الحد الأقصى ${max}.`,
    moved: (title: string, pos: string, total: string) => `نُقل ${title} إلى الموضع ${pos} من ${total}`,
    added: (title: string) => `أُضيف ${title}`,
    removed: (title: string) => `حُذف ${title}`,
    duplicated: (title: string) => `تم تكرار ${title}`,
  },
};

const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];
export type RepeaterLabels = Partial<typeof STRINGS.en>;

/* ------------------------------------------------------------------ types */

export interface RepeaterRowContext<T> {
  /** Zero-based position. */
  index: number;
  /** Stable key of the row: survives reorder, so use it for input ids and touched state. */
  id: string;
  count: number;
  disabled: boolean;
  /** Replace this row (or derive the new row from the current one). */
  update: (next: T | ((current: T) => T)) => void;
}

export interface RepeaterProps<T> {
  /** The rows. Controlled. */
  value?: T[];
  defaultValue?: T[];
  onValueChange?: (value: T[]) => void;
  /** A new row for "Add". */
  createItem: () => T;
  /** Copy of a row for "Duplicate". Default: `structuredClone`. */
  cloneItem?: (item: T) => T;
  /** The fields of one row. */
  renderRow: (item: T, context: RepeaterRowContext<T>) => ReactNode;
  /** Heading of a row. Default "Item 1", "Item 2"… in the active language. */
  rowTitle?: (item: T, index: number) => ReactNode;
  /** Plain-text name of a row for button labels and announcements. Default: `rowTitle` when it is a string. */
  rowLabel?: (item: T, index: number) => string;
  /** Muted text after the title, shown while the row is collapsed: a one-line summary of its values. */
  rowSummary?: (item: T, index: number) => ReactNode;
  /** Extra header content at the inline end of the row, such as an error badge. */
  rowMeta?: (item: T, index: number, id: string) => ReactNode;
  /** Rows cannot be removed below this count. Default 0. */
  min?: number;
  /** "Add" and "Duplicate" stop at this count. */
  max?: number;
  /** Drag handle plus keyboard reorder. Default true. */
  reorderable?: boolean;
  /** Duplicate button on every row. Default true. */
  duplicable?: boolean;
  /** Rows fold to their header. Default true. */
  collapsible?: boolean;
  /** Rows present at mount start collapsed. New rows always open. */
  defaultCollapsed?: boolean;
  disabled?: boolean;
  /** Accessible name of the list and the group of rows. */
  label?: string;
  /** Shown when there are no rows. */
  empty?: ReactNode;
  /** Override any built-in English or Arabic string. */
  labels?: RepeaterLabels;
  /** Label of the add button. Same as `labels.add`. */
  addLabel?: ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ Repeater */

/**
 * A list of repeatable form rows: add, remove, duplicate, drag to reorder (or focus the handle and use the
 * arrow keys), collapse, with `min` and `max` limits. It owns the list mechanics and stable row keys;
 * you own what a row looks like (`renderRow`) and where the value lives.
 */
export function Repeater<T>({
  value: valueProp,
  defaultValue,
  onValueChange,
  createItem,
  cloneItem,
  renderRow,
  rowTitle,
  rowLabel,
  rowSummary,
  rowMeta,
  min = 0,
  max,
  reorderable = true,
  duplicable = true,
  collapsible = true,
  defaultCollapsed = false,
  disabled = false,
  label,
  empty,
  labels,
  addLabel,
  className,
}: RepeaterProps<T>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const n = (v: number) => formatNumber(v, locale);
  const uid = useId();

  const [inner, setInner] = useState<T[]>(defaultValue ?? []);
  const value = valueProp ?? inner;
  const count = value.length;

  // Row keys run parallel to the values. They are made here so rows of any shape keep their identity.
  const serial = useRef(0);
  const makeKey = useCallback(() => `${uid}-${serial.current++}`, [uid]);
  const keysRef = useRef<string[]>([]);
  if (keysRef.current.length !== count) keysRef.current = fitKeys(keysRef.current, count, makeKey);
  const keys = keysRef.current;

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (defaultCollapsed) setCollapsed(new Set(keysRef.current));
  }, [defaultCollapsed]);

  const [announcement, setAnnouncement] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const focusAfter = useRef<{ kind: "row"; key: string } | { kind: "handle"; index: number } | { kind: "add" } | null>(null);

  const commit = (nextValue: T[], nextKeys: string[]) => {
    keysRef.current = nextKeys;
    if (valueProp === undefined) setInner(nextValue);
    onValueChange?.(nextValue);
  };

  const titleOf = (item: T, index: number): ReactNode => rowTitle?.(item, index) ?? t.row(n(index + 1));
  const nameOf = (item: T, index: number): string => {
    if (rowLabel) return rowLabel(item, index);
    const title = rowTitle?.(item, index);
    return typeof title === "string" && title ? title : t.row(n(index + 1));
  };

  const add = () => {
    if (disabled || !canAdd(count, max)) return;
    const item = createItem();
    const key = makeKey();
    focusAfter.current = { kind: "row", key };
    commit(insertAt(value, count, item), insertAt(keys, count, key));
    setAnnouncement(t.added(nameOf(item, count)));
  };

  const duplicate = (index: number) => {
    const source = value[index];
    if (disabled || source === undefined || !canAdd(count, max)) return;
    const copy = cloneItem ? cloneItem(source) : structuredClone(source);
    const key = makeKey();
    focusAfter.current = { kind: "row", key };
    commit(insertAt(value, index + 1, copy), insertAt(keys, index + 1, key));
    setAnnouncement(t.duplicated(nameOf(source, index)));
  };

  const remove = (index: number) => {
    const source = value[index];
    if (disabled || source === undefined || !canRemove(count, min)) return;
    const name = nameOf(source, index);
    focusAfter.current = count > 1 ? { kind: "handle", index: Math.min(index, count - 2) } : { kind: "add" };
    commit(removeAt(value, index), removeAt(keys, index));
    setAnnouncement(t.removed(name));
  };

  const move = (from: number, to: number, announce: boolean) => {
    const target = Math.max(0, Math.min(count - 1, to));
    if (disabled || target === from || value[from] === undefined) return;
    commit(moveItem(value, from, target), moveItem(keys, from, target));
    if (announce) setAnnouncement(t.moved(nameOf(value[from] as T, from), n(target + 1), n(count)));
  };

  const update = (index: number, next: T | ((current: T) => T)) => {
    const current = value[index];
    if (current === undefined) return;
    const resolved = typeof next === "function" ? (next as (c: T) => T)(current) : next;
    commit(value.map((item, i) => (i === index ? resolved : item)), keys);
  };

  // Put focus where it belongs after add or remove: the new row's first field, the neighbour, or the add button.
  useEffect(() => {
    const target = focusAfter.current;
    if (!target) return;
    focusAfter.current = null;
    const scope = root.current;
    if (!scope) return;
    if (target.kind === "add") addButton.current?.focus();
    else if (target.kind === "handle") {
      const handles = scope.querySelectorAll<HTMLElement>("[data-repeater-focus]");
      handles[target.index]?.focus();
    } else {
      const row = scope.querySelector<HTMLElement>(`[data-row-key="${target.key}"]`);
      const field = row?.querySelector<HTMLElement>("[data-slot=repeater-body] :is(input, textarea, button, [tabindex]):not([disabled]):not([tabindex='-1'])");
      (field ?? row?.querySelector<HTMLElement>("[data-repeater-focus]"))?.focus();
    }
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = keys.indexOf(String(active.id));
    const to = keys.indexOf(String(over.id));
    if (from >= 0 && to >= 0) move(from, to, true);
  };

  const toggle = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const allCollapsed = count > 0 && keys.every((k) => collapsed.has(k));
  const atMax = !canAdd(count, max);
  const atMin = !canRemove(count, min);
  const hintId = `${uid}-hint`;
  const limitId = `${uid}-limit`;
  const limitText = atMax && max !== undefined ? t.maxReached(n(max)) : min > 0 && count <= min ? t.minReached(n(min)) : null;

  return (
    <div ref={root} data-slot="repeater" data-disabled={disabled || undefined} className={cn("flex min-w-0 flex-col gap-3", className)}>
      {count > 1 && collapsible ? (
        <div className="flex items-center justify-between gap-2">
          <span data-slot="repeater-count" className="text-caption tabular-nums text-muted-foreground">
            {max !== undefined ? t.countMax(n(count), n(max)) : t.count(n(count))}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(keys))}>
            <Icon icon={allCollapsed ? ChevronsUpDown : ChevronsDownUp} />
            {allCollapsed ? t.expandAll : t.collapseAll}
          </Button>
        </div>
      ) : null}

      {reorderable ? (
        <p id={hintId} className="sr-only">
          {t.reorderHint}
        </p>
      ) : null}

      {count === 0 ? (
        <div data-slot="repeater-empty" className="rounded-card border border-dashed border-border px-4 py-6 text-center text-body-sm text-muted-foreground">
          {empty ?? t.empty}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={keys} strategy={verticalListSortingStrategy}>
            <ol aria-label={label ?? t.list} className="flex flex-col gap-2">
              {value.map((item, index) => {
                const key = keys[index] as string;
                const isCollapsed = collapsible && collapsed.has(key);
                const name = nameOf(item, index);
                return (
                  <RepeaterRow
                    key={key}
                    rowKey={key}
                    title={titleOf(item, index)}
                    summary={rowSummary?.(item, index)}
                    meta={rowMeta?.(item, index, key)}
                    position={n(index + 1)}
                    collapsed={isCollapsed}
                    collapsible={collapsible}
                    reorderable={reorderable && count > 1}
                    duplicable={duplicable}
                    disabled={disabled}
                    canDuplicate={!atMax}
                    canRemove={!atMin}
                    hintId={hintId}
                    labels={{
                      remove: t.remove(name),
                      duplicate: t.duplicate(name),
                      reorder: t.reorder(name),
                      toggle: isCollapsed ? t.expand(name) : t.collapse(name),
                    }}
                    onToggle={() => toggle(key)}
                    onDuplicate={() => duplicate(index)}
                    onRemove={() => remove(index)}
                    onMoveKey={(pressed) => {
                      const target = keyTarget(pressed, index, count);
                      if (target !== null) move(index, target, true);
                    }}
                  >
                    {renderRow(item, {
                      index,
                      id: key,
                      count,
                      disabled,
                      update: (next) => update(index, next),
                    })}
                  </RepeaterRow>
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          ref={addButton}
          type="button"
          variant="secondary"
          disabled={disabled || atMax}
          aria-describedby={limitText ? limitId : undefined}
          onClick={add}
        >
          <Icon icon={Plus} />
          {addLabel ?? t.add}
        </Button>
        {limitText ? (
          <span id={limitId} className="text-caption text-muted-foreground">
            {limitText}
          </span>
        ) : null}
      </div>

      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ row */

interface RowProps {
  rowKey: string;
  title: ReactNode;
  summary?: ReactNode;
  meta?: ReactNode;
  position: string;
  collapsed: boolean;
  collapsible: boolean;
  reorderable: boolean;
  duplicable: boolean;
  disabled: boolean;
  canDuplicate: boolean;
  canRemove: boolean;
  hintId: string;
  labels: { remove: string; duplicate: string; reorder: string; toggle: string };
  onToggle: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveKey: (key: string) => void;
  children: ReactNode;
}

function RepeaterRow({
  rowKey,
  title,
  summary,
  meta,
  position,
  collapsed,
  collapsible,
  reorderable,
  duplicable,
  disabled,
  canDuplicate,
  canRemove: removable,
  hintId,
  labels,
  onToggle,
  onDuplicate,
  onRemove,
  onMoveKey,
  children,
}: RowProps) {
  const { setNodeRef, setActivatorNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: rowKey, disabled: disabled || !reorderable });
  const bodyId = useId();
  return (
    <li
      ref={setNodeRef}
      data-slot="repeater-row"
      data-row-key={rowKey}
      data-collapsed={collapsed || undefined}
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="relative rounded-card border border-border bg-card data-dragging:z-10 data-dragging:border-nq-focus data-dragging:shadow-floating"
    >
      <div data-slot="repeater-row-header" className="flex min-h-control items-center gap-1 p-1.5">
        {reorderable ? (
          <Tooltip content={labels.reorder}>
            <button
              ref={setActivatorNodeRef}
              type="button"
              data-repeater-focus=""
              aria-label={labels.reorder}
              aria-describedby={hintId}
              aria-keyshortcuts="ArrowUp ArrowDown Home End"
              disabled={disabled}
              onKeyDown={(event) => {
                if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
                  event.preventDefault();
                  const handle = event.currentTarget;
                  onMoveKey(event.key);
                  // A reorder can re-insert the row, which drops focus. Keep it on the handle.
                  requestAnimationFrame(() => handle.isConnected && handle.focus());
                }
              }}
              className="inline-flex size-control-sm shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4"
              {...listeners}
            >
              <GripVertical aria-hidden />
            </button>
          </Tooltip>
        ) : null}
        {collapsible ? (
          <button
            type="button"
            data-repeater-focus={reorderable ? undefined : ""}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            aria-label={labels.toggle}
            onClick={onToggle}
            className="flex min-h-control-sm min-w-0 flex-1 items-center gap-2 rounded-control px-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
          >
            <Icon icon={ChevronRight} directional className={cn("size-4 shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-nq", !collapsed && "rotate-90 rtl:-rotate-90")} />
            <span className="min-w-0 truncate text-label text-foreground">{title}</span>
            {collapsed && summary ? <span className="min-w-0 flex-1 truncate text-body-sm text-muted-foreground">{summary}</span> : null}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1.5">
            <span data-repeater-focus={reorderable ? undefined : ""} tabIndex={reorderable ? undefined : -1} className="min-w-0 truncate text-label text-foreground outline-none">
              {title}
            </span>
          </div>
        )}
        <span className="sr-only">{position}</span>
        {meta ? <div className="flex shrink-0 items-center gap-1.5">{meta}</div> : null}
        {duplicable ? (
          <Tooltip content={labels.duplicate}>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.duplicate} disabled={disabled || !canDuplicate} onClick={onDuplicate}>
              <Copy aria-hidden />
            </Button>
          </Tooltip>
        ) : null}
        <Tooltip content={labels.remove}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={labels.remove}
            disabled={disabled || !removable}
            onClick={onRemove}
            className="text-muted-foreground hover:text-nq-danger-text"
          >
            <Trash2 aria-hidden />
          </Button>
        </Tooltip>
      </div>
      <div id={bodyId} data-slot="repeater-body" hidden={collapsed} className="border-t border-border p-3 sm:p-4">
        {children}
      </div>
    </li>
  );
}
