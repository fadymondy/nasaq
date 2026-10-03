"use client";

import { SquareArrowOutUpRight, Trash2 } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";

const STRINGS = {
  en: { desktopIcons: "Desktop", open: "Open", remove: "Remove from desktop" },
  ar: { desktopIcons: "سطح المكتب", open: "فتح", remove: "إزالة من سطح المكتب" },
};

export type DesktopIconsLabels = Partial<(typeof STRINGS)["en"]>;

export interface DesktopIconItem {
  id: string;
  title: string;
  /** The tile. Any node; a lucide glyph in a `DesktopAppIcon` matches the dock. */
  icon: ReactNode;
}

/** Inline-start and top offset in pixels, inside the grid's box. */
export interface DesktopIconPosition {
  x: number;
  y: number;
}

/** `auto` opens on double-click with a mouse and on a single tap on touch screens. */
export type DesktopIconOpenOn = "auto" | "click" | "double-click";

export interface DesktopIconProps extends Omit<ComponentProps<"button">, "onSelect" | "title"> {
  item: DesktopIconItem;
  selected?: boolean;
  onOpen?: (item: DesktopIconItem) => void;
  onSelect?: (item: DesktopIconItem) => void;
  openOn?: DesktopIconOpenOn;
}

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(pointer: coarse)");
    if (!query) return;
    setCoarse(query.matches);
    const onChange = () => setCoarse(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return coarse;
}

/** One icon on the desktop: a tile and a two-line label. Enter or Space opens it. */
export function DesktopIcon({ item, selected, onOpen, onSelect, openOn = "auto", className, onClick, onDoubleClick, onKeyDown, ...props }: DesktopIconProps) {
  const coarse = useCoarsePointer();
  const single = openOn === "click" || (openOn === "auto" && coarse);
  return (
    <button
      type="button"
      data-slot="desktop-icon"
      data-selected={selected ? "" : undefined}
      aria-pressed={selected}
      className={cn(
        "group flex w-22 select-none flex-col items-center gap-1.5 rounded-lg p-1.5 text-center outline-none",
        "transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus",
        selected ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-nq-hover",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        onSelect?.(item);
        if (single) onOpen?.(item);
      }}
      onDoubleClick={(event) => {
        onDoubleClick?.(event);
        if (!single) onOpen?.(item);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.(item);
        }
      }}
      {...props}
    >
      <span aria-hidden className="size-12 shrink-0">
        {item.icon}
      </span>
      <span
        className={cn(
          "line-clamp-2 max-w-full rounded-sm px-1 text-caption font-medium break-words",
          selected ? "bg-primary text-primary-foreground" : "bg-background/70 text-foreground",
        )}
      >
        {item.title}
      </span>
    </button>
  );
}

export interface DesktopIconGridProps extends Omit<ComponentProps<"div">, "children" | "onSelect"> {
  items: readonly DesktopIconItem[];
  onOpen: (item: DesktopIconItem) => void;
  /** Saved positions by item id. Items without one take the next free cell. */
  positions?: Readonly<Record<string, DesktopIconPosition>>;
  /** Turns on free placement: icons drag anywhere and report where they were dropped. */
  onMove?: (item: DesktopIconItem, position: DesktopIconPosition) => void;
  /** Ids left off the desktop. */
  hiddenIds?: readonly string[];
  /** Adds "Remove from desktop" to the context menu. */
  onRemove?: (item: DesktopIconItem) => void;
  /** Extra context-menu actions, after "Open". */
  actions?: (item: DesktopIconItem) => ContextMenuAction[];
  selected?: string | null;
  defaultSelected?: string | null;
  onSelectedChange?: (id: string | null) => void;
  openOn?: DesktopIconOpenOn;
  /** Snap dropped icons to the cell grid. Default true. */
  snap?: boolean;
  labels?: DesktopIconsLabels;
}

export const DESKTOP_ICON_CELL = { w: 96, h: 108, gap: 8 } as const;

/** The cell an icon takes in free mode when it has no saved position: columns from the inline-start, top to bottom. */
export function desktopIconSlot(index: number, height: number): DesktopIconPosition {
  const { w, h, gap } = DESKTOP_ICON_CELL;
  const perColumn = Math.max(1, Math.floor((height - gap) / h));
  return { x: gap + Math.floor(index / perColumn) * w, y: gap + (index % perColumn) * h };
}

function snapTo({ x, y }: DesktopIconPosition): DesktopIconPosition {
  const { w, h, gap } = DESKTOP_ICON_CELL;
  return { x: gap + Math.max(0, Math.round((x - gap) / w)) * w, y: gap + Math.max(0, Math.round((y - gap) / h)) * h };
}

/**
 * Desktop icons for a `DesktopShell` (pass it as the shell's children) or any wallpaper. Without `onMove` they
 * fill an auto grid; with it they sit where they were dropped. Arrow keys move between icons, Enter opens one,
 * and a context-click opens Open, your actions and Remove.
 */
export function DesktopIconGrid({
  items,
  onOpen,
  positions,
  onMove,
  hiddenIds,
  onRemove,
  actions,
  selected: selectedProp,
  defaultSelected = null,
  onSelectedChange,
  openOn = "auto",
  snap = true,
  labels,
  className,
  ...props
}: DesktopIconGridProps) {
  const ctx = useOptionalNasaq();
  const ar = ctx?.locale?.startsWith("ar") ?? false;
  const rtl = ctx?.direction ? ctx.direction === "rtl" : ar;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [inner, setInner] = useState<string | null>(defaultSelected);
  const selected = selectedProp === undefined ? inner : selectedProp;
  const select = (id: string | null) => {
    if (selectedProp === undefined) setInner(id);
    onSelectedChange?.(id);
  };
  const shown = useMemo(() => {
    const off = new Set(hiddenIds ?? []);
    return items.filter((item) => !off.has(item.id));
  }, [items, hiddenIds]);
  const free = Boolean(onMove);
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el || !free) return;
    const measure = () => setHeight(el.clientHeight || 600);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [free]);

  const menuFor = (item: DesktopIconItem): ContextMenuAction[] => [
    { id: "open", label: t.open, icon: SquareArrowOutUpRight, onSelect: () => onOpen(item) },
    ...(actions?.(item) ?? []),
    ...(onRemove ? [{ id: "remove", label: t.remove, icon: Trash2, danger: true, group: "end", onSelect: () => onRemove(item) }] : []),
  ];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = rtl ? { next: "ArrowLeft", prev: "ArrowRight" } : { next: "ArrowRight", prev: "ArrowLeft" };
    const step = event.key === keys.next || event.key === "ArrowDown" ? 1 : event.key === keys.prev || event.key === "ArrowUp" ? -1 : 0;
    if (event.key === "Escape") return void select(null);
    if (!step) return;
    const buttons = Array.from(box.current?.querySelectorAll<HTMLButtonElement>('[data-slot="desktop-icon"]') ?? []);
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = buttons[Math.min(buttons.length - 1, Math.max(0, at + step))];
    if (!next) return;
    event.preventDefault();
    next.focus();
    const id = next.dataset.id;
    if (id) select(id);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: arrow keys move between the icon buttons inside
    <div
      ref={box}
      role="group"
      aria-label={t.desktopIcons}
      data-slot="desktop-icon-grid"
      data-free={free ? "" : undefined}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) select(null);
      }}
      className={cn(
        free ? "relative size-full" : "grid auto-rows-max grid-cols-[repeat(auto-fill,6rem)] content-start gap-2 p-2",
        className,
      )}
      {...props}
    >
      {shown.map((item, index) =>
        free ? (
          <FreeIcon
            key={item.id}
            item={item}
            position={positions?.[item.id] ?? desktopIconSlot(index, height)}
            bounds={box}
            rtl={rtl}
            snap={snap}
            selected={selected === item.id}
            openOn={openOn}
            actions={menuFor(item)}
            onOpen={onOpen}
            onSelect={() => select(item.id)}
            onMove={(position) => onMove?.(item, position)}
          />
        ) : (
          <ContextMenuActions key={item.id} actions={menuFor(item)} render={<div className="flex" />} focusTarget={(el) => el.querySelector("button")}>
            <DesktopIcon item={item} data-id={item.id} selected={selected === item.id} openOn={openOn} onOpen={onOpen} onSelect={() => select(item.id)} />
          </ContextMenuActions>
        ),
      )}
    </div>
  );
}

interface FreeIconProps {
  item: DesktopIconItem;
  position: DesktopIconPosition;
  bounds: React.RefObject<HTMLDivElement | null>;
  rtl: boolean;
  snap: boolean;
  selected: boolean;
  openOn: DesktopIconOpenOn;
  actions: ContextMenuAction[];
  onOpen: (item: DesktopIconItem) => void;
  onSelect: () => void;
  onMove: (position: DesktopIconPosition) => void;
}

function FreeIcon({ item, position, bounds, rtl, snap, selected, openOn, actions, onOpen, onSelect, onMove }: FreeIconProps) {
  const [live, setLive] = useState(position);
  const [dragging, setDragging] = useState(false);
  const justDropped = useRef(false);
  const drag = useRef<{ x: number; y: number; base: DesktopIconPosition; moved: boolean; id: number } | null>(null);
  useEffect(() => {
    if (!drag.current) setLive(position);
  }, [position]);

  const clamp = (p: DesktopIconPosition): DesktopIconPosition => {
    const el = bounds.current;
    const maxX = Math.max(0, (el?.clientWidth ?? 0) - DESKTOP_ICON_CELL.w);
    const maxY = Math.max(0, (el?.clientHeight ?? 0) - DESKTOP_ICON_CELL.h);
    return { x: Math.min(Math.max(0, p.x), maxX), y: Math.min(Math.max(0, p.y), maxY) };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, base: live, moved: false, id: event.pointerId };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = (event.clientX - d.x) * (rtl ? -1 : 1);
    const dy = event.clientY - d.y;
    if (!d.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 5) return;
      // Capture only once a real drag starts, so a plain click still fires click and dblclick.
      d.moved = true;
      event.currentTarget.setPointerCapture(d.id);
      setDragging(true);
      onSelect();
    }
    setLive(clamp({ x: d.base.x + dx, y: d.base.y + dy }));
  };
  const end = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    if (event.currentTarget.hasPointerCapture(d.id)) event.currentTarget.releasePointerCapture(d.id);
    setDragging(false);
    justDropped.current = true;
    setTimeout(() => {
      justDropped.current = false;
    }, 0);
    const dropped = clamp(snap ? snapTo(live) : live);
    setLive(dropped);
    onMove(dropped);
  };

  return (
    <ContextMenuActions
      actions={actions}
      focusTarget={(el) => el.querySelector("button")}
      render={
        // biome-ignore lint/a11y/noStaticElementInteractions: the pointer drags; the button inside holds the keyboard actions
        <div
          data-slot="desktop-icon-position"
          data-dragging={dragging ? "" : undefined}
          className={cn("absolute [touch-action:none]", dragging && "z-10 opacity-85")}
          style={{ insetInlineStart: live.x, top: live.y }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={end}
          onPointerCancel={end}
        />
      }
    >
      <DesktopIcon
        item={item}
        data-id={item.id}
        selected={selected}
        openOn={openOn}
        onOpen={onOpen}
        onSelect={onSelect}
        onClickCapture={(event) => {
          // A drag ends with a click on the same button; swallow it so dropping does not open the app.
          if (justDropped.current) event.stopPropagation();
        }}
      />
    </ContextMenuActions>
  );
}
