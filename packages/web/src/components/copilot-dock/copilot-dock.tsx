"use client";

import { ArrowUp, Maximize2, Minimize2, PanelBottom, PanelLeft, PanelRight, PictureInPicture2, Sparkles } from "lucide-react";
import { type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { isApplePlatform, useModHotkey } from "../../lib/hotkey";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { CopilotChat, type CopilotChatProps } from "../copilot-chat";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "../dropdown-menu";

const STRINGS = {
  en: {
    open: "Open assistant",
    close: "Close assistant",
    panel: "Assistant",
    layout: "Panel position",
    end: "Dock right",
    start: "Dock left",
    bottom: "Dock bottom",
    float: "Floating window",
    expand: "Expand to full page",
    collapse: "Exit full page",
    ask: "Ask anything…",
    send: "Send",
    resize: "Resize panel",
  },
  ar: {
    open: "افتح المساعد",
    close: "أغلق المساعد",
    panel: "المساعد",
    layout: "مكان اللوحة",
    end: "ثبّت يسارًا",
    start: "ثبّت يمينًا",
    bottom: "ثبّت بالأسفل",
    float: "نافذة عائمة",
    expand: "وسّع لملء الصفحة",
    collapse: "اخرج من ملء الصفحة",
    ask: "اسأل عن أي شيء…",
    send: "أرسل",
    resize: "غيّر حجم اللوحة",
  },
};

export type CopilotDockLabels = (typeof STRINGS)["en"];

/** Where the panel sits. `end` and `start` follow the reading direction. */
export type CopilotDockSide = "end" | "start" | "bottom" | "float";

const SIDES: readonly CopilotDockSide[] = ["end", "start", "bottom", "float"];

/** What a custom panel body receives: the dock's own header controls and a way to close it. */
export interface CopilotDockPanel {
  /** Position menu + expand button (plus `headerActions`), for the body's own header. */
  controls: ReactNode;
  /** Closes the dock and returns focus to the launcher or the bar. */
  close: () => void;
  expanded: boolean;
  side: CopilotDockSide;
}

export interface CopilotDockProps extends Omit<CopilotChatProps, "mode" | "onClose" | "messages" | "onSend" | "children"> {
  /** The conversation. Required unless `children` replaces the chat. */
  messages?: CopilotChatProps["messages"];
  onSend?: CopilotChatProps["onSend"];
  /**
   * Replaces `CopilotChat` with your own panel body: an inbox, a notes pane, a support console. A function receives
   * the dock's header controls and `close`, so the body can render its own header with them.
   */
  children?: ReactNode | ((panel: CopilotDockPanel) => ReactNode);
  /**
   * With `collapsedBar`, replaces the "Ask anything" input with your own content (a title, an unread count, a
   * preview). The whole bar then becomes one button that opens the dock.
   */
  barContent?: ReactNode;
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Letter bound to ⌘ / Ctrl to toggle the dock. Default "j". `false` turns the shortcut off. */
  hotkey?: string | false;
  /** Show the floating launcher button while the dock is closed. Default true. */
  launcher?: boolean;
  /** Replaces the launcher icon. */
  launcherIcon?: ReactNode;
  /** While closed, show a slim "Ask anything" bar at the bottom instead of the round launcher. Enter sends and opens. */
  collapsedBar?: boolean;
  /** `fixed` docks to the viewport, `absolute` to a `relative` parent (previews). Default `fixed`. */
  placement?: "fixed" | "absolute";
  /** Controlled panel position. */
  side?: CopilotDockSide;
  /** Default `end`. */
  defaultSide?: CopilotDockSide;
  onSideChange?: (side: CopilotDockSide) => void;
  /** Positions offered in the header menu. Default all four; one or none hides the menu. */
  sides?: readonly CopilotDockSide[];
  /** Controlled full-page state. */
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Show the expand button in the header. Default true. */
  expandable?: boolean;
  /** A localStorage key that remembers the position across visits. Default off. */
  persistKey?: string;
  /** Width of a side or floating panel. Default 26rem, never wider than the screen. */
  width?: string;
  /** Height of a bottom or floating panel. Default 50vh for bottom, 40rem for float. */
  height?: string;
  /**
   * Let people drag the panel's inner edge to resize it: the top edge when docked at the bottom (height only), the
   * inner side edge when docked to a side (width only). Arrow keys work on the focused edge, a double click resets.
   * With `persistKey`, the size is remembered too. Default false.
   */
  resizable?: boolean;
  dockLabels?: Partial<CopilotDockLabels>;
}

/** Smallest size a drag can reach, in px. The largest leaves 4rem of the page visible. */
const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;
const KEY_STEP = 16;

interface DockSize {
  width?: number;
  height?: number;
}

function readSize(key: string | undefined): DockSize {
  if (!key || typeof window === "undefined") return {};
  try {
    const v = JSON.parse(window.localStorage.getItem(`${key}:size`) ?? "{}") as DockSize;
    return {
      width: typeof v.width === "number" && v.width > 0 ? v.width : undefined,
      height: typeof v.height === "number" && v.height > 0 ? v.height : undefined,
    };
  } catch {
    return {};
  }
}

function readSide(key: string | undefined): CopilotDockSide | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(key);
    return SIDES.includes(v as CopilotDockSide) ? (v as CopilotDockSide) : null;
  } catch {
    return null;
  }
}

const SIDE_ICON = { end: PanelRight, start: PanelLeft, bottom: PanelBottom, float: PictureInPicture2 } as const;

/**
 * The app-wide assistant: a launcher (a round button or a slim "Ask anything" bar) that opens `CopilotChat` — or
 * any panel body passed as `children` — in a non-modal panel. The panel docks to either edge or the bottom, floats as a window, or expands to the whole page.
 * ⌘J / Ctrl+J toggles it from anywhere; Escape inside the panel closes it and returns focus to the launcher.
 */
export function CopilotDock({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  hotkey = "j",
  launcher = true,
  launcherIcon,
  collapsedBar = false,
  placement = "fixed",
  side: sideProp,
  defaultSide = "end",
  onSideChange,
  sides = SIDES,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  expandable = true,
  persistKey,
  width = "26rem",
  height,
  resizable = false,
  dockLabels,
  className,
  style,
  headerActions,
  children,
  barContent,
  messages = [],
  onSend,
  ...chat
}: CopilotDockProps) {
  const nasaq = useOptionalNasaq();
  const ar = nasaq?.locale.startsWith("ar") ?? false;
  const rtl = nasaq?.isRtl ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...dockLabels };
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  const [innerSide, setInnerSide] = useState<CopilotDockSide>(defaultSide);
  const side = sideProp ?? innerSide;
  const [innerExpanded, setInnerExpanded] = useState(defaultExpanded);
  const expanded = expandedProp ?? innerExpanded;
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLInputElement>(null);
  const barButtonRef = useRef<HTMLButtonElement>(null);
  const [shortcut, setShortcut] = useState<string | null>(null);
  const [barText, setBarText] = useState("");
  const [dragSize, setDragSize] = useState<DockSize>({});
  const [resizing, setResizing] = useState(false);

  const setOpen = (next: boolean) => {
    setInner(next);
    onOpenChange?.(next);
  };
  const setSide = (next: CopilotDockSide) => {
    setInnerSide(next);
    onSideChange?.(next);
    if (persistKey) {
      try {
        window.localStorage.setItem(persistKey, next);
      } catch {
        // Storage can be off; the choice still holds for this visit.
      }
    }
  };
  const setExpanded = (next: boolean) => {
    setInnerExpanded(next);
    onExpandedChange?.(next);
  };

  // A saved position (and size) is only readable in the browser, after the first render.
  useEffect(() => {
    const saved = readSide(persistKey);
    if (saved && sideProp === undefined) setInnerSide(saved);
    if (resizable) setDragSize(readSize(persistKey));
  }, [persistKey, sideProp, resizable]);

  useModHotkey(hotkey || "j", () => setOpen(!open), hotkey !== false);

  // The modifier depends on the platform, which is only known in the browser.
  useEffect(() => {
    if (hotkey) setShortcut(`${isApplePlatform() ? "⌘" : "Ctrl+"}${hotkey.toUpperCase()}`);
  }, [hotkey]);

  // Move focus into the panel on open, so keyboard users land in the conversation.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) {
      const field = panelRef.current?.querySelector<HTMLElement>("textarea, [contenteditable='true']");
      (field ?? panelRef.current)?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  const close = () => {
    setOpen(false);
    setExpanded(false);
    requestAnimationFrame(() => (collapsedBar ? (barRef.current ?? barButtonRef.current) : launcherRef.current)?.focus());
  };

  const sendFromBar = () => {
    const text = barText.trim();
    if (!text) {
      setOpen(true);
      return;
    }
    setBarText("");
    setOpen(true);
    void onSend?.(text, { context: [...(chat.context ?? [])], model: chat.model, mentions: [], attachments: [], commands: [], toggles: [] });
  };

  const menuSides = sides.filter((s) => SIDES.includes(s));
  // Physical icons for the logical sides: "end" is the right edge in English and the left in Arabic.
  const iconFor = (s: CopilotDockSide) => SIDE_ICON[s === "end" ? (rtl ? "start" : "end") : s === "start" ? (rtl ? "end" : "start") : s];
  const SideIcon = iconFor(side);

  const controls = (
    <>
      {headerActions}
      {menuSides.length > 1 && !expanded && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t.layout} title={t.layout} data-slot="copilot-dock-layout" />}>
            <SideIcon aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t.layout}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={side} onValueChange={(v) => setSide(v as CopilotDockSide)}>
              {menuSides.map((s) => {
                const Icon = iconFor(s);
                return (
                  <DropdownMenuRadioItem key={s} value={s}>
                    <Icon aria-hidden className="size-4 text-muted-foreground" />
                    {t[s]}
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {expandable && (
        <Button
          variant="ghost"
          size="icon-sm"
          data-slot="copilot-dock-expand"
          aria-pressed={expanded}
          aria-label={expanded ? t.collapse : t.expand}
          title={expanded ? t.collapse : t.expand}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
        </Button>
      )}
    </>
  );

  const shape: Record<CopilotDockSide, string> = {
    end: "inset-y-0 end-0 border-s",
    start: "inset-y-0 start-0 border-e",
    bottom: "inset-x-0 bottom-0 border-t",
    float: "bottom-4 end-4 max-h-[calc(100%-2rem)] max-w-[calc(100%-2rem)] rounded-card border",
  };
  // A dragged size wins over the `width` / `height` props, but never past the screen.
  const sideWidth = dragSize.width ? `${dragSize.width}px` : width;
  const bottomHeight = dragSize.height ? `${dragSize.height}px` : (height ?? "50vh");
  const size: CSSProperties = expanded
    ? {}
    : side === "bottom"
      ? { height: `min(100%, ${bottomHeight})` }
      : side === "float"
        ? { width, height: height ?? "40rem" }
        : { width: `min(100%, ${sideWidth})` };

  // Only docked panels resize, and only along one axis: height at the bottom, width on a side.
  const axis: "x" | "y" | null = !resizable || expanded ? null : side === "bottom" ? "y" : side === "end" || side === "start" ? "x" : null;
  const bounds = () => {
    const box = typeof window === "undefined" ? undefined : panelRef.current?.offsetParent?.getBoundingClientRect();
    const w = box?.width || (typeof window === "undefined" ? 1280 : window.innerWidth);
    const h = box?.height || (typeof window === "undefined" ? 800 : window.innerHeight);
    return axis === "x" ? { min: MIN_WIDTH, max: Math.max(MIN_WIDTH, w - 64) } : { min: MIN_HEIGHT, max: Math.max(MIN_HEIGHT, h - 64) };
  };
  const commitSize = (next: DockSize) => {
    setDragSize(next);
    if (persistKey) {
      try {
        window.localStorage.setItem(`${persistKey}:size`, JSON.stringify(next));
      } catch {
        // Storage can be off; the size still holds for this visit.
      }
    }
  };
  const applySize = (px: number, persist: boolean) => {
    const { min, max } = bounds();
    const v = Math.round(Math.min(max, Math.max(min, px)));
    const next = axis === "x" ? { ...dragSize, width: v } : { ...dragSize, height: v };
    if (persist) commitSize(next);
    else setDragSize(next);
    return next;
  };
  // Dragging away from the docked edge grows the panel. "end" is the right edge in LTR and the left in RTL.
  const growSign = side === "bottom" ? -1 : (side === "end") !== rtl ? -1 : 1;
  const drag = useRef<{ start: number; size: number; last: DockSize } | null>(null);
  const onResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    if (!axis || event.button !== 0 || !panelRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = panelRef.current.getBoundingClientRect();
    drag.current = { start: axis === "x" ? event.clientX : event.clientY, size: axis === "x" ? rect.width : rect.height, last: dragSize };
    setResizing(true);
  };
  const onResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const delta = (axis === "x" ? event.clientX : event.clientY) - d.start;
    d.last = applySize(d.size + growSign * delta, false);
  };
  const onResizeEnd = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setResizing(false);
    commitSize(d.last);
  };
  const onResizeKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!axis || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const current = axis === "x" ? rect.width : rect.height;
    // Arrows move the edge the way they point; Home and End jump to the smallest and largest size.
    const leftGrows = (side === "end") !== rtl;
    const keys: Record<string, number> =
      axis === "y" ? { ArrowUp: KEY_STEP, ArrowDown: -KEY_STEP } : { ArrowLeft: leftGrows ? KEY_STEP : -KEY_STEP, ArrowRight: leftGrows ? -KEY_STEP : KEY_STEP };
    const step = keys[event.key];
    if (step !== undefined) applySize(current + step, true);
    else if (event.key === "Home") applySize(0, true);
    else if (event.key === "End") applySize(Number.POSITIVE_INFINITY, true);
    else return;
    event.preventDefault();
  };
  // The handle sits on the panel's inner edge: wider to grab than the hairline it shows.
  const handleEdge =
    side === "bottom"
      ? "inset-x-0 top-0 h-2 cursor-row-resize after:inset-x-0 after:top-0 after:h-0.5"
      : side === "end"
        ? "inset-y-0 start-0 w-2 cursor-col-resize after:inset-y-0 after:start-0 after:w-0.5"
        : "inset-y-0 end-0 w-2 cursor-col-resize after:inset-y-0 after:end-0 after:w-0.5";

  const launcherName = shortcut ? `${t.open} (${shortcut})` : t.open;
  const keys = hotkey ? `${isApplePlatform() ? "Meta" : "Control"}+${hotkey.toUpperCase()}` : undefined;

  return (
    <>
      {launcher && !open && !collapsedBar && (
        <button
          ref={launcherRef}
          type="button"
          data-slot="copilot-dock-launcher"
          aria-expanded={false}
          aria-controls={panelId}
          aria-keyshortcuts={keys}
          title={launcherName}
          aria-label={t.open}
          onClick={() => setOpen(true)}
          className={cn(
            placement,
            "bottom-4 end-4 z-40 inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-floating",
            "transition-colors duration-150 ease-nq hover:bg-primary/90 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-5",
          )}
        >
          {launcherIcon ?? <Sparkles aria-hidden />}
        </button>
      )}
      {launcher && !open && collapsedBar && barContent !== undefined && (
        <button
          ref={barButtonRef}
          type="button"
          data-slot="copilot-dock-bar"
          aria-expanded={false}
          aria-controls={panelId}
          aria-keyshortcuts={keys}
          title={launcherName}
          onClick={() => setOpen(true)}
          className={cn(
            placement,
            "inset-x-0 bottom-4 z-40 mx-auto flex w-[min(calc(100%-2rem),36rem)] items-center gap-2 rounded-full border border-border bg-background ps-3 pe-1.5 py-1.5 text-start shadow-floating",
            "transition-colors duration-150 ease-nq hover:bg-muted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
          )}
        >
          <span aria-hidden className="text-primary [&_svg]:size-4">
            {launcherIcon ?? <Sparkles />}
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">{barContent}</span>
          {shortcut ? (
            <kbd dir="ltr" className="hidden rounded-sm border border-border px-1 font-mono text-[11px] text-muted-foreground sm:inline">
              {shortcut}
            </kbd>
          ) : null}
          <span aria-hidden className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground [&_svg]:size-3.5">
            <Maximize2 />
          </span>
        </button>
      )}
      {launcher && !open && collapsedBar && barContent === undefined && (
        <form
          data-slot="copilot-dock-bar"
          role="search"
          aria-label={t.panel}
          onSubmit={(event) => {
            event.preventDefault();
            sendFromBar();
          }}
          className={cn(
            placement,
            "inset-x-0 bottom-4 z-40 mx-auto flex w-[min(calc(100%-2rem),36rem)] items-center gap-2 rounded-full border border-border bg-background ps-3 pe-1.5 py-1.5 shadow-floating",
            "focus-within:border-nq-focus",
          )}
        >
          <span aria-hidden className="text-primary [&_svg]:size-4">
            {launcherIcon ?? <Sparkles />}
          </span>
          <input
            ref={barRef}
            value={barText}
            onChange={(event) => setBarText(event.target.value)}
            onFocus={() => {
              if (onSend === undefined) setOpen(true);
            }}
            aria-label={t.ask}
            aria-controls={panelId}
            aria-keyshortcuts={keys}
            placeholder={t.ask}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {shortcut && !barText ? (
            <kbd dir="ltr" className="hidden rounded-sm border border-border px-1 font-mono text-[11px] text-muted-foreground sm:inline">
              {shortcut}
            </kbd>
          ) : null}
          <Button type="submit" size="icon-sm" className="rounded-full" aria-label={barText.trim() ? t.send : t.open}>
            {barText.trim() ? <ArrowUp aria-hidden /> : <Maximize2 aria-hidden />}
          </Button>
        </form>
      )}
      <div
        ref={panelRef}
        id={panelId}
        role="complementary"
        aria-label={t.panel}
        tabIndex={-1}
        hidden={!open}
        data-slot="copilot-dock"
        data-open={open || undefined}
        data-side={side}
        data-expanded={expanded || undefined}
        data-resizing={resizing || undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.stopPropagation();
            if (expanded) setExpanded(false);
            else close();
          }
        }}
        style={{ ...size, ...style }}
        className={cn(
          placement,
          "z-40 flex flex-col overflow-hidden border-border bg-background shadow-floating outline-none",
          resizing && "select-none",
          expanded ? "inset-0" : shape[side],
          className,
        )}
      >
        {open && axis && (
          <div
            role="separator"
            tabIndex={0}
            aria-label={t.resize}
            aria-orientation={axis === "y" ? "horizontal" : "vertical"}
            aria-controls={panelId}
            aria-valuemin={bounds().min}
            aria-valuemax={bounds().max}
            aria-valuenow={axis === "x" ? dragSize.width : dragSize.height}
            data-slot="copilot-dock-resize"
            data-active={resizing || undefined}
            onPointerDown={onResizeStart}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeEnd}
            onPointerCancel={onResizeEnd}
            onKeyDown={onResizeKey}
            onDoubleClick={() => commitSize(axis === "x" ? { ...dragSize, width: undefined } : { ...dragSize, height: undefined })}
            className={cn(
              "absolute z-10 touch-none outline-none",
              "after:absolute after:bg-primary after:opacity-0 after:transition-opacity after:duration-150 after:ease-nq",
              "hover:after:opacity-60 focus-visible:after:opacity-100 data-[active]:after:opacity-100",
              handleEdge,
            )}
          />
        )}
        {open &&
          (children !== undefined ? (
            typeof children === "function" ? (
              children({ controls, close, expanded, side })
            ) : (
              children
            )
          ) : (
            <CopilotChat
              {...chat}
              messages={messages}
              onSend={onSend ?? (() => {})}
              mode={expanded ? "page" : "panel"}
              onClose={close}
              headerActions={controls}
              className="min-h-0 flex-1"
            />
          ))}
      </div>
    </>
  );
}
