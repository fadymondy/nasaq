"use client";

import { ArrowUp, Maximize2, Minimize2, PanelBottom, PanelLeft, PanelRight, PictureInPicture2, Sparkles } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from "react";
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
  dockLabels?: Partial<CopilotDockLabels>;
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

  // A saved position is only readable in the browser, after the first render.
  useEffect(() => {
    const saved = readSide(persistKey);
    if (saved && sideProp === undefined) setInnerSide(saved);
  }, [persistKey, sideProp]);

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
  const size: CSSProperties = expanded
    ? {}
    : side === "bottom"
      ? { height: `min(100%, ${height ?? "50vh"})` }
      : side === "float"
        ? { width, height: height ?? "40rem" }
        : { width: `min(100%, ${width})` };

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
          expanded ? "inset-0" : shape[side],
          className,
        )}
      >
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
