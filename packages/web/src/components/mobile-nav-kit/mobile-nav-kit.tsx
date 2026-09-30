"use client";

import { type ComponentProps, type ElementType, type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import { centerScroll, clampSwipe, isHorizontalIntent, nextTabIndex, restOffset, type SwipeState, settleSwipe, toInlineOffset } from "./mobile-nav-math";

const STRINGS = {
  en: { navigation: "Main navigation", filters: "Filters" },
  ar: { navigation: "التنقل الرئيسي", filters: "التصفية" },
};

export type MobileNavLabels = Partial<(typeof STRINGS)["en"]>;

function useMobileNav(labels?: MobileNavLabels) {
  const ctx = useOptionalNasaq();
  const ar = ctx?.locale?.startsWith("ar") ?? false;
  const rtl = ctx?.direction ? ctx.direction === "rtl" : ar;
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels }, rtl };
}

/* ------------------------------------------------------------------ BottomTabBar */

export interface BottomTabBarItem {
  value: string;
  label: string;
  /** A lucide icon component. */
  icon: ElementType;
  /** A count or short text on the icon. 0 and empty hide it. */
  badge?: number | string;
  /** Renders a link instead of a button. */
  href?: string;
}

export interface BottomTabBarProps extends Omit<ComponentProps<"nav">, "onChange"> {
  items: readonly BottomTabBarItem[];
  value: string;
  onValueChange: (value: string) => void;
  /** `sticky` (default) sits at the bottom of its scroll parent, `fixed` at the bottom of the screen, `static` in flow. */
  position?: "sticky" | "fixed" | "static";
  labels?: MobileNavLabels;
}

/** A bottom tab bar for phones: 3 to 5 destinations, an icon over a label, a badge, and room for the home indicator. */
export function BottomTabBar({ items, value, onValueChange, position = "sticky", labels, className, ...props }: BottomTabBarProps) {
  const { t, rtl } = useMobileNav(labels);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const hasActive = items.some((i) => i.value === value);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    const next = nextTabIndex(index, items.length, event.key, rtl);
    if (next === null) return;
    event.preventDefault();
    refs.current[next]?.focus();
  };
  return (
    <nav
      data-slot="bottom-tab-bar"
      aria-label={t.navigation}
      className={cn(
        "z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] text-foreground",
        position === "sticky" && "sticky bottom-0",
        position === "fixed" && "fixed inset-x-0 bottom-0",
        className,
      )}
      {...props}
    >
      <ul className="flex items-stretch justify-around px-1">
        {items.map((item, index) => {
          const active = item.value === value;
          const Glyph = item.icon;
          const hasBadge = item.badge !== undefined && item.badge !== 0 && item.badge !== "";
          const shared = {
            "data-active": active ? "" : undefined,
            "aria-current": active ? ("page" as const) : undefined,
            tabIndex: active || (!hasActive && index === 0) ? 0 : -1,
            onKeyDown: (event: KeyboardEvent<HTMLElement>) => onKeyDown(event, index),
            onClick: () => onValueChange(item.value),
            className: cn(
              "relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-control px-2 py-1.5 text-caption text-muted-foreground outline-none transition-colors duration-150 ease-nq",
              "hover:text-foreground data-active:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
            ),
          };
          const inner = (
            <>
              <span className="relative">
                <Glyph aria-hidden className="size-5" strokeWidth={active ? 2.2 : 1.7} />
                {hasBadge ? (
                  <span
                    data-slot="bottom-tab-badge"
                    className="absolute -top-1.5 -end-2.5 grid min-w-4 place-items-center rounded-full bg-nq-danger px-1 text-[10px] leading-4 font-medium text-background"
                  >
                    {item.badge}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </>
          );
          return (
            <li key={item.value} className="min-w-0 flex-1">
              {item.href ? (
                <a
                  ref={(el) => {
                    refs.current[index] = el;
                  }}
                  href={item.href}
                  {...shared}
                >
                  {inner}
                </a>
              ) : (
                <button
                  type="button"
                  ref={(el) => {
                    refs.current[index] = el;
                  }}
                  {...shared}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ FilterStrip */

export interface FilterStripItem {
  value: string;
  label: string;
  icon?: ElementType;
  /** A count shown after the label. */
  count?: number;
}

interface FilterStripBase extends Omit<ComponentProps<"div">, "onChange" | "value"> {
  items: readonly FilterStripItem[];
  labels?: MobileNavLabels;
}
export interface FilterStripSingleProps extends FilterStripBase {
  multiple?: false;
  value: string;
  onValueChange: (value: string) => void;
}
export interface FilterStripMultiProps extends FilterStripBase {
  multiple: true;
  value: readonly string[];
  onValueChange: (value: string[]) => void;
}
export type FilterStripProps = FilterStripSingleProps | FilterStripMultiProps;

/** A horizontally scrolling row of filter chips. The active chip scrolls into view; the ends fade instead of clipping. */
export function FilterStrip(props: FilterStripProps) {
  const { items, labels, className, multiple: _multiple, value: _value, onValueChange: _onValueChange, ...rest } = props;
  const { t } = useMobileNav(labels);
  const scroller = useRef<HTMLDivElement>(null);
  const selected: readonly string[] = props.multiple ? props.value : [props.value];
  const key = selected.join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the key is the selection
  useEffect(() => {
    const box = scroller.current;
    const chip = box?.querySelector<HTMLElement>("[aria-pressed='true']");
    if (!box || !chip) return;
    const rtl = getComputedStyle(box).direction === "rtl";
    const boxRect = box.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    // Distance of the chip from the start edge of the content, then the scroll that centres it.
    const fromStart = rtl ? boxRect.right - chipRect.right - box.scrollLeft : chipRect.left - boxRect.left + box.scrollLeft;
    const target = centerScroll(fromStart, chipRect.width, box.clientWidth, box.scrollWidth);
    box.scrollTo?.({ left: rtl ? -target : target, behavior: "smooth" });
  }, [key]);
  const toggle = (v: string) => {
    if (props.multiple) props.onValueChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    else props.onValueChange(v);
  };
  return (
    <div data-slot="filter-strip" role="group" aria-label={t.filters} className={cn("relative", className)} {...rest}>
      <div
        ref={scroller}
        className="flex snap-x gap-2 overflow-x-auto px-4 py-1 [mask-image:linear-gradient(90deg,transparent,black_1rem,black_calc(100%-1rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const on = selected.includes(item.value);
          const Glyph = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(item.value)}
              className={cn(
                "inline-flex h-control shrink-0 snap-center items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-label outline-none transition-colors duration-150 ease-nq",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-nq-hover",
              )}
            >
              {Glyph ? <Glyph aria-hidden className="size-4" /> : null}
              {item.label}
              {item.count !== undefined ? <span className={cn("tabular-nums", on ? "text-primary-foreground/80" : "text-muted-foreground")}>{item.count}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ SwipeActionRow */

export interface SwipeAction extends Omit<ContextMenuAction, "danger" | "group" | "icon"> {
  icon: ElementType;
  tone?: "default" | "primary" | "warning" | "danger";
}

const ACTION_WIDTH = 76;
const toneClass: Record<NonNullable<SwipeAction["tone"]>, string> = {
  default: "bg-secondary text-foreground",
  primary: "bg-primary text-primary-foreground",
  warning: "bg-nq-warning text-background",
  danger: "bg-nq-danger text-background",
};

export interface SwipeActionRowProps extends Omit<ComponentProps<"div">, "children" | "contextMenu"> {
  children: ReactNode;
  /** Revealed by swiping toward the inline end (rightward in LTR): a pin, a read toggle. */
  startActions?: readonly SwipeAction[];
  /** Revealed by swiping toward the inline start (leftward in LTR): archive, delete. */
  endActions?: readonly SwipeAction[];
  /** Also open the actions from a context-click, long-press, Shift+F10 or the Menu key. Default true. */
  contextMenu?: boolean;
  disabled?: boolean;
  onOpenChange?: (state: SwipeState) => void;
}

interface Gesture {
  x: number;
  y: number;
  base: number;
  t: number;
  horizontal: boolean;
  last: number;
  velocity: number;
}

/**
 * A list row that slides sideways to reveal actions, the way phone lists do. The same actions are in the context
 * menu, so keyboard and mouse people are not left out. Swipe direction follows the reading direction.
 */
export function SwipeActionRow({ children, startActions = [], endActions = [], contextMenu = true, disabled, onOpenChange, className, ...props }: SwipeActionRowProps) {
  const { rtl } = useMobileNav();
  const startWidth = startActions.length * ACTION_WIDTH;
  const endWidth = endActions.length * ACTION_WIDTH;
  const [state, setState] = useState<SwipeState>("closed");
  const [drag, setDrag] = useState<number | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const moved = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const setOpen = (next: SwipeState) => {
    setState(next);
    onOpenChange?.(next);
  };
  // Close on any press outside.
  // biome-ignore lint/correctness/useExhaustiveDependencies: setOpen only reads props
  useEffect(() => {
    if (state === "closed") return;
    const away = (event: globalThis.PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen("closed");
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [state]);

  const offset = drag ?? restOffset(state, startWidth, endWidth);
  const physical = rtl ? -offset : offset;
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || (!startWidth && !endWidth) || event.pointerType === "mouse") return;
    gesture.current = { x: event.clientX, y: event.clientY, base: restOffset(state, startWidth, endWidth), t: event.timeStamp, horizontal: false, last: 0, velocity: 0 };
    moved.current = false;
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.horizontal) {
      if (isHorizontalIntent(dx, dy)) {
        g.horizontal = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      } else {
        if (Math.abs(dy) > 8) gesture.current = null;
        return;
      }
    }
    moved.current = true;
    const inline = g.base + toInlineOffset(dx, rtl);
    const dt = Math.max(1, event.timeStamp - g.t);
    g.velocity = (inline - g.last) / dt;
    g.last = inline;
    g.t = event.timeStamp;
    setDrag(clampSwipe(inline, startWidth, endWidth));
  };
  const finish = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || drag === null) return;
    const next = settleSwipe(drag, startWidth, endWidth, { velocity: g.velocity });
    setDrag(null);
    setOpen(next);
  };
  const run = (action: SwipeAction) => {
    if (action.disabled) return;
    setOpen("closed");
    action.onSelect();
  };
  const panel = (list: readonly SwipeAction[], side: "start" | "end") =>
    list.length ? (
      <div
        data-slot="swipe-actions"
        data-side={side}
        // Inert until open, so hidden buttons are not tab stops.
        inert={state !== side}
        className={cn("absolute inset-y-0 flex", side === "start" ? "start-0" : "end-0")}
        style={{ width: list.length * ACTION_WIDTH }}
      >
        {list.map((action) => {
          const Glyph = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              disabled={action.disabled}
              onClick={() => run(action)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 px-1 text-caption outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-50",
                toneClass[action.tone ?? "default"],
              )}
            >
              <Glyph aria-hidden className="size-5" />
              <span className="max-w-full truncate">{action.label}</span>
            </button>
          );
        })}
      </div>
    ) : null;
  const menuActions: ContextMenuAction[] = [...startActions, ...endActions].map((a) => ({ ...a, danger: a.tone === "danger" }));
  const row = (
    <div
      ref={root}
      data-slot="swipe-action-row"
      data-state={state}
      className={cn("relative overflow-hidden bg-card", className)}
      onClickCapture={(event) => {
        // A drag must not count as a tap on the row's own link or button, and a tap on an open row closes it.
        if (moved.current) {
          event.preventDefault();
          event.stopPropagation();
          moved.current = false;
        } else if (state !== "closed" && !(event.target as HTMLElement).closest("[data-slot=swipe-actions]")) {
          event.preventDefault();
          event.stopPropagation();
          setOpen("closed");
        }
      }}
      {...props}
    >
      {panel(startActions, "start")}
      {panel(endActions, "end")}
      <div
        data-slot="swipe-surface"
        className={cn("relative bg-card [touch-action:pan-y]", drag === null && "transition-transform duration-200 ease-nq")}
        style={{ transform: `translateX(${physical}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        {children}
      </div>
    </div>
  );
  if (!contextMenu || disabled || !menuActions.length) return row;
  return <ContextMenuActions actions={menuActions} render={row} />;
}
