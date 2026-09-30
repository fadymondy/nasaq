"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { type ComponentProps, createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Switch } from "../switch";

/* ---------------------------------------------------------------- layout state */

export interface SidebarLayout {
  /** Every id, in the user's order. */
  order: string[];
  /** Ids the user switched off. */
  hidden: string[];
  /** `order` without the hidden ids: what the sidebar renders. */
  visible: string[];
  move: (activeId: string, overId: string) => void;
  setVisible: (id: string, visible: boolean) => void;
  reset: () => void;
  isDefault: boolean;
}

interface Stored {
  order: string[];
  hidden: string[];
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/**
 * Keeps saved state valid when the product adds or removes items: unknown ids drop, new ones append
 * (switched off if they are hidden by default).
 */
function normalise(saved: Stored, ids: readonly string[], defaultHidden: readonly string[]): Stored {
  const known = new Set(ids);
  const order = saved.order.filter((id) => known.has(id));
  const hidden = saved.hidden.filter((id) => known.has(id));
  for (const id of ids) {
    if (order.includes(id)) continue;
    order.push(id);
    if (defaultHidden.includes(id)) hidden.push(id);
  }
  return { order, hidden };
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

export interface SidebarLayoutOptions {
  /** Ids that start switched off, e.g. products the user hasn't pinned. They stay available in SidebarCustomize. */
  defaultHidden?: readonly string[];
}

/**
 * Order and visibility of one list of sidebar items, persisted in localStorage under `storageKey`.
 * Pass the default order; the hook returns what to render.
 */
export function useSidebarLayout(storageKey: string, ids: readonly string[], options: SidebarLayoutOptions = {}): SidebarLayout {
  const idsKey = ids.join("\u0000");
  const defaultHidden = options.defaultHidden ?? [];
  const hiddenKey = defaultHidden.join("\u0000");
  const defaults = (): Stored => ({ order: [...ids], hidden: ids.filter((id) => defaultHidden.includes(id)) });
  const [state, setState] = useState<Stored>(defaults);

  // Read after mount so server and first client render agree.
  useEffect(() => {
    let saved: Stored = defaults();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        const shape = parsed as Partial<Stored> | null;
        // Wrong shape (older version, hand-edited): keep the defaults.
        if (shape && typeof shape === "object" && isStringArray(shape.order) && isStringArray(shape.hidden)) saved = { order: shape.order, hidden: shape.hidden };
      }
    } catch {
      /* corrupt or blocked storage: fall back to the defaults */
    }
    setState(normalise(saved, ids, defaultHidden));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, idsKey, hiddenKey]);

  const commit = useCallback(
    (next: Stored) => {
      setState(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage full or blocked: keep the in-memory layout */
      }
    },
    [storageKey],
  );

  return useMemo(() => {
    const hiddenSet = new Set(state.hidden);
    return {
      order: state.order,
      hidden: state.hidden,
      visible: state.order.filter((id) => !hiddenSet.has(id)),
      move: (activeId, overId) => {
        const from = state.order.indexOf(activeId);
        const to = state.order.indexOf(overId);
        if (from < 0 || to < 0 || from === to) return;
        commit({ ...state, order: arrayMove(state.order, from, to) });
      },
      setVisible: (id, visible) =>
        commit({ ...state, hidden: visible ? state.hidden.filter((h) => h !== id) : [...new Set([...state.hidden, id])] }),
      reset: () => {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
        setState(defaults());
      },
      isDefault: sameSet(state.hidden, defaults().hidden) && state.order.join("\u0000") === idsKey,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, commit, storageKey, idsKey, hiddenKey]);
}

/* ---------------------------------------------------------------- drag in the sidebar */

const SuppressClickContext = createContext<{ current: number }>({ current: 0 });

export interface SidebarSortableProps {
  /** The visible ids, in order (`layout.visible`). */
  ids: string[];
  onMove: (activeId: string, overId: string) => void;
  children: ReactNode;
}

/**
 * Lets the user drag sidebar items into a new order. Mouse drags after 4px, touch after a
 * 250ms press (so the list still scrolls). Keyboard reordering lives in SidebarCustomize.
 */
export function SidebarSortable({ ids, onMove, children }: SidebarSortableProps) {
  const suppressClickUntil = useRef(0);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    // The mouseup that ends a drag would otherwise click the link under it.
    suppressClickUntil.current = performance.now() + 100;
    if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
  };
  return (
    <SuppressClickContext.Provider value={suppressClickUntil}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </DndContext>
    </SuppressClickContext.Provider>
  );
}

export function SidebarSortableItem({ id, className, children, ...props }: ComponentProps<"div"> & { id: string }) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id });
  const suppressClickUntil = useContext(SuppressClickContext);
  return (
    <div
      ref={setNodeRef}
      data-slot="sidebar-sortable-item"
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative [&_a]:[-webkit-user-drag:none]",
        "data-dragging:z-10 data-dragging:cursor-grabbing data-dragging:*:bg-nq-surface-overlay data-dragging:*:shadow-floating",
        className,
      )}
      onClickCapture={(event) => {
        if (performance.now() < suppressClickUntil.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onDragStart={(event) => event.preventDefault()}
      {...listeners}
      {...props}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- customize dialog */

export interface SidebarCustomizeItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Can be reordered but not hidden (e.g. the home page). */
  required?: boolean;
}

export interface SidebarCustomizeSection {
  id: string;
  label?: string;
  items: SidebarCustomizeItem[];
  layout: SidebarLayout;
}

export interface SidebarCustomizeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: SidebarCustomizeSection[];
  labels?: {
    title?: string;
    description?: string;
    reset?: string;
    done?: string;
    /** Accessible name for a row's drag handle, given the item label. */
    reorder?: (label: string) => string;
    /** Announced after a keyboard move, e.g. "Inbox, position 2 of 3". */
    moved?: (label: string, position: number, total: number) => string;
    close?: string;
  };
}

/**
 * The accessible way to arrange the sidebar: drag handles that also work with the keyboard
 * (focus a handle, then Up/Down moves one place and Home/End to either end) and a switch per
 * item for show/hide.
 */
export function SidebarCustomize({ open, onOpenChange, sections, labels }: SidebarCustomizeProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = {
    title: labels?.title ?? (ar ? "تخصيص الشريط الجانبي" : "Customize sidebar"),
    description: labels?.description ?? (ar ? "اسحب لإعادة الترتيب. أوقف العناصر لإخفائها." : "Drag to reorder. Switch items off to hide them."),
    reset: labels?.reset ?? (ar ? "إعادة الضبط الافتراضي" : "Reset to default"),
    done: labels?.done ?? (ar ? "تم" : "Done"),
    reorder: labels?.reorder ?? ((label: string) => (ar ? `إعادة ترتيب ${label}` : `Reorder ${label}`)),
    moved:
      labels?.moved ??
      ((label: string, position: number, total: number) => (ar ? `${label}، الموضع ${position} من ${total}` : `${label}, position ${position} of ${total}`)),
  };
  const [announcement, setAnnouncement] = useState("");
  const allDefault = sections.every((s) => s.layout.isDefault);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={labels?.close} className="max-w-md gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pe-12">
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60dvh] flex-col gap-4 overflow-y-auto px-3 py-3">
          {sections.map((section) => (
            <CustomizeSection
              key={section.id}
              section={section}
              reorderLabel={t.reorder}
              onKeyboardMove={(label, position, total) => setAnnouncement(t.moved(label, position, total))}
            />
          ))}
        </div>
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
        <DialogFooter className="border-t border-border px-5 py-3 sm:justify-between">
          <Button variant="ghost" size="sm" disabled={allDefault} onClick={() => sections.forEach((s) => s.layout.reset())}>
            {t.reset}
          </Button>
          <Button variant="primary" size="sm" onClick={() => onOpenChange(false)}>
            {t.done}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomizeSection({
  section,
  reorderLabel,
  onKeyboardMove,
}: {
  section: SidebarCustomizeSection;
  reorderLabel: (label: string) => string;
  onKeyboardMove: (label: string, position: number, total: number) => void;
}) {
  const { layout } = section;
  const byId = new Map(section.items.map((item) => [item.id, item]));
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 2 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  );
  const moveTo = (id: string, index: number) => {
    const target = Math.max(0, Math.min(layout.order.length - 1, index));
    const overId = layout.order[target];
    if (overId === undefined || overId === id) return;
    layout.move(id, overId);
    onKeyboardMove(byId.get(id)?.label ?? id, target + 1, layout.order.length);
  };
  return (
    <section className="flex flex-col gap-1" aria-label={section.label}>
      {section.label ? <h3 className="px-2 text-caption font-medium text-muted-foreground">{section.label}</h3> : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => over && active.id !== over.id && layout.move(String(active.id), String(over.id))}
      >
        <SortableContext items={layout.order} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-0.5">
            {layout.order.map((id) => {
              const item = byId.get(id);
              return item ? (
                <CustomizeRow
                  key={id}
                  item={item}
                  visible={!layout.hidden.includes(id)}
                  onVisibleChange={(v) => layout.setVisible(id, v)}
                  reorderLabel={reorderLabel(item.label)}
                  onMoveKey={(key) => {
                    const index = layout.order.indexOf(id);
                    if (key === "ArrowUp") moveTo(id, index - 1);
                    else if (key === "ArrowDown") moveTo(id, index + 1);
                    else if (key === "Home") moveTo(id, 0);
                    else if (key === "End") moveTo(id, layout.order.length - 1);
                  }}
                />
              ) : null;
            })}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function CustomizeRow({
  item,
  visible,
  onVisibleChange,
  reorderLabel,
  onMoveKey,
}: {
  item: SidebarCustomizeItem;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  reorderLabel: string;
  onMoveKey: (key: "ArrowUp" | "ArrowDown" | "Home" | "End") => void;
}) {
  const { setNodeRef, setActivatorNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      data-dragging={isDragging || undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="relative flex h-10 items-center gap-2 rounded-control bg-popover px-1 data-dragging:z-10 data-dragging:shadow-floating"
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={reorderLabel}
        aria-keyshortcuts="ArrowUp ArrowDown Home End"
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Home" || event.key === "End") {
            event.preventDefault();
            const handle = event.currentTarget;
            onMoveKey(event.key);
            // Reordering can re-insert this row, which drops focus; keep it on the handle.
            requestAnimationFrame(() => handle.focus());
          }
        }}
        className="inline-flex size-7 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus active:cursor-grabbing [&_svg]:size-4"
        {...listeners}
      >
        <GripVertical />
      </button>
      {item.icon ? <span className={cn("text-muted-foreground [&_svg]:size-4", !visible && "opacity-50")}>{item.icon}</span> : null}
      <span className={cn("min-w-0 flex-1 truncate text-body-sm", visible ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
      <Switch checked={visible} disabled={item.required} onCheckedChange={onVisibleChange} aria-label={item.label} className="me-1" />
    </li>
  );
}
