"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import { ChevronRight, PanelLeft } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useModHotkey } from "../../lib/hotkey";
import { useNasaq, useOptionalNasaq } from "../../provider/nasaq-provider";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { CommandProvider, CommandRegistry, useCommandRegistry } from "../commands";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../collapsible";
import { Icon } from "../icon";
import { Tooltip } from "../tooltip";

export const SIDEBAR_STORAGE_KEY = "nasaq-sidebar";
const DESKTOP_QUERY = "(min-width: 48rem)";

interface ShellContextValue {
  /** Desktop only: the sidebar is reduced to an icon rail. */
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  /** Collapses the rail on desktop, opens the sheet below md. */
  toggleSidebar: () => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
}
const ShellContext = createContext<ShellContextValue | null>(null);

export function useAppShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useAppShell() must be used inside <AppShell>.");
  return ctx;
}

export function useOptionalAppShell() {
  return useContext(ShellContext);
}

const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // blocked storage
  }
};
const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* blocked or full: keep the in-memory value */
  }
};

/** Whether the sidebar this component renders in is the collapsed rail (always false inside the mobile sheet). */
const SidebarRailContext = createContext(false);
export const useSidebarCollapsed = () => useContext(SidebarRailContext);

export interface AppShellProps extends ComponentProps<"div"> {
  /** Rendered as a column at md+ (collapsible to an icon rail) and inside a sheet below md. */
  sidebar: ReactNode;
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Lets the user drag the sidebar edge to resize it (desktop). Default true. */
  resizable?: boolean;
  /** Sidebar width in px. Default 256; the user's width is remembered. */
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** Accessible name of the resize handle; localise it. */
  resizeLabel?: string;
}

export const SIDEBAR_WIDTH_KEY = "nasaq-sidebar-width";
/** Dragging this far below minWidth snaps the sidebar to the icon rail. */
const SNAP_TO_RAIL = 56;
const KEY_STEP = 16;

/**
 * The shell every product re-solved: a sidebar at the inline start, a header, and the page.
 * ⌘B / Ctrl+B toggles the rail. Below md the sidebar moves into a sheet opened from the header.
 */
export function AppShell({
  sidebar,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  resizable = true,
  defaultWidth = 256,
  minWidth = 208,
  maxWidth = 420,
  resizeLabel,
  className,
  children,
  ...props
}: AppShellProps) {
  const [storedCollapsed, setStoredCollapsed] = useState(defaultCollapsed);
  const collapsed = controlledCollapsed ?? storedCollapsed;
  const [mobileOpen, setMobileOpen] = useState(false);
  // The palette's open state lives in the command registry, so SearchTrigger and CommandPalette
  // share it with or without the shell. An outer CommandProvider's registry is reused.
  const outerRegistry = useCommandRegistry();
  const [ownRegistry] = useState(() => new CommandRegistry());
  const registry = outerRegistry ?? ownRegistry;
  const commandOpen = useSyncExternalStore(registry.subscribe, () => registry.getSnapshot().paletteOpen, () => false);
  const setCommandOpen = registry.setPaletteOpen;

  useEffect(() => {
    if (controlledCollapsed !== undefined) return;
    const saved = readStorage(SIDEBAR_STORAGE_KEY);
    if (saved === "collapsed" || saved === "expanded") setStoredCollapsed(saved === "collapsed");
  }, [controlledCollapsed]);

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (controlledCollapsed === undefined) {
        setStoredCollapsed(next);
        writeStorage(SIDEBAR_STORAGE_KEY, next ? "collapsed" : "expanded");
      }
      onCollapsedChange?.(next);
    },
    [controlledCollapsed, onCollapsedChange],
  );

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia(DESKTOP_QUERY).matches) setCollapsed(!collapsed);
    else setMobileOpen(!mobileOpen);
  }, [collapsed, mobileOpen, setCollapsed]);

  useModHotkey("b", toggleSidebar, { ignoreEditable: true });
  const ar = useNasaq().locale.startsWith("ar");

  const [width, setWidth] = useState(defaultWidth);
  const [resizing, setResizing] = useState(false);
  const clamp = useCallback((w: number) => Math.round(Math.min(maxWidth, Math.max(minWidth, w))), [minWidth, maxWidth]);

  useEffect(() => {
    const saved = Number(readStorage(SIDEBAR_WIDTH_KEY));
    if (saved) setWidth(clamp(saved));
  }, [clamp]);

  const commitWidth = useCallback(
    (w: number) => {
      const next = clamp(w);
      setWidth(next);
      writeStorage(SIDEBAR_WIDTH_KEY, String(next));
    },
    [clamp],
  );

  const onResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const rtl = getComputedStyle(handle).direction === "rtl";
    const startX = event.clientX;
    const startWidth = collapsed ? minWidth - SNAP_TO_RAIL : width;
    let current = width;
    let rail = collapsed;
    setResizing(true);
    document.documentElement.style.cursor = "col-resize";

    const onMove = (e: PointerEvent) => {
      const raw = startWidth + (rtl ? startX - e.clientX : e.clientX - startX);
      const toRail = raw < minWidth - SNAP_TO_RAIL / 2;
      if (toRail !== rail) {
        rail = toRail;
        setCollapsed(toRail);
      }
      if (!toRail) {
        current = clamp(raw);
        setWidth(current);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.documentElement.style.cursor = "";
      setResizing(false);
      if (!rail) commitWidth(current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const onResizeKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const grow = rtl ? "ArrowLeft" : "ArrowRight";
    const shrink = rtl ? "ArrowRight" : "ArrowLeft";
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    let next: number | null = null;
    if (event.key === grow) next = collapsed ? minWidth : width + step;
    else if (event.key === shrink) {
      if (collapsed) return;
      if (width <= minWidth) {
        event.preventDefault();
        setCollapsed(true);
        return;
      }
      next = width - step;
    } else if (event.key === "Home") next = minWidth;
    else if (event.key === "End") next = maxWidth;
    else if (event.key === "Enter") next = defaultWidth;
    if (next === null) return;
    event.preventDefault();
    if (collapsed) setCollapsed(false);
    commitWidth(next);
  };

  return (
    <ShellContext.Provider
      value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen, toggleSidebar, commandOpen, setCommandOpen }}
    >
      <CommandProvider registry={registry}>
      <div data-slot="app-shell" className={cn("flex min-h-dvh bg-background text-foreground", className)} {...props}>
        <a
          href="#app-main"
          className="sr-only rounded-control border border-border bg-popover text-label text-foreground shadow-md focus:not-sr-only focus:fixed focus:start-3 focus:top-2 focus:z-50 focus:px-3 focus:py-2 focus-visible:outline-2 focus-visible:outline-nq-focus"
        >
          {ar ? "تخطَّ إلى المحتوى" : "Skip to content"}
        </a>
        <aside
          data-slot="app-sidebar"
          data-collapsed={collapsed || undefined}
          data-resizing={resizing || undefined}
          style={{ "--nq-sidebar-width": `${width}px` } as CSSProperties}
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 border-e border-border bg-sidebar transition-[width] duration-200 ease-nq md:block",
            "data-resizing:transition-none",
            collapsed ? "w-[calc(var(--nq-control)+2*var(--nq-shell-pad))]" : "w-(--nq-sidebar-width)",
          )}
        >
          <div className="h-full overflow-hidden">
            <SidebarRailContext.Provider value={collapsed}>{sidebar}</SidebarRailContext.Provider>
          </div>
          {resizable ? (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label={resizeLabel ?? (ar ? "تغيير عرض الشريط الجانبي" : "Resize sidebar")}
              aria-valuemin={minWidth}
              aria-valuemax={maxWidth}
              aria-valuenow={width}
              aria-hidden={collapsed || undefined}
              tabIndex={collapsed ? -1 : 0}
              data-slot="sidebar-resize-handle"
              onPointerDown={onResizeStart}
              onKeyDown={onResizeKey}
              onDoubleClick={() => {
                if (collapsed) setCollapsed(false);
                commitWidth(defaultWidth);
              }}
              className={cn(
                // A 9px hit area centred on the border; the visible 2px line appears on hover, focus or drag.
                "absolute inset-y-0 -end-[5px] z-20 w-[9px] cursor-col-resize touch-none outline-none",
                "after:absolute after:inset-y-0 after:start-1 after:w-0.5 after:bg-transparent after:transition-colors after:duration-150",
                "hover:after:bg-nq-line-strong focus-visible:after:bg-nq-focus",
                resizing && "after:bg-nq-accent!",
              )}
            />
          ) : null}
        </aside>
        <BaseDialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <BaseDialog.Portal>
            <BaseDialog.Backdrop className="fixed inset-0 z-40 bg-nq-fg/15 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 md:hidden dark:bg-nq-bg/70" />
            <BaseDialog.Popup
              data-slot="app-shell-sheet"
              className="fixed inset-y-0 start-0 z-50 w-[min(18rem,85vw)] border-e border-border bg-sidebar outline-none transition-[translate,opacity] duration-200 ease-nq data-ending-style:-translate-x-8 data-ending-style:opacity-0 data-starting-style:-translate-x-8 data-starting-style:opacity-0 rtl:data-ending-style:translate-x-8 rtl:data-starting-style:translate-x-8 md:hidden"
            >
              <BaseDialog.Title className="sr-only">{ar ? "التنقل" : "Navigation"}</BaseDialog.Title>
              {/* No close button: it would sit on the workspace switcher. Backdrop tap and Esc close it. */}
              <SidebarRailContext.Provider value={false}>{sidebar}</SidebarRailContext.Provider>
            </BaseDialog.Popup>
          </BaseDialog.Portal>
        </BaseDialog.Root>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      </CommandProvider>
    </ShellContext.Provider>
  );
}

/** Toggles the rail on desktop and opens the sheet on mobile. Place it first in the header. */
export function SidebarTrigger({ className, label, ...props }: ComponentProps<typeof Button> & { label?: string }) {
  const { collapsed, mobileOpen, toggleSidebar } = useAppShell();
  const ar = useNasaq().locale.startsWith("ar");
  const isDesktop = useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(DESKTOP_QUERY);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
  const name = label ?? (ar ? "إظهار/إخفاء الشريط الجانبي" : "Toggle sidebar");
  return (
    <Tooltip content={name}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={name}
        aria-expanded={isDesktop ? !collapsed : mobileOpen}
        className={cn("-ms-1 text-muted-foreground", className as string)}
        onClick={toggleSidebar}
        {...props}
      >
        <Icon icon={PanelLeft} directional />
      </Button>
    </Tooltip>
  );
}

export function AppHeader({ className, children, ...props }: ComponentProps<"header">) {
  return (
    <header
      data-slot="app-header"
      className={cn(
        "sticky top-0 z-30 flex h-header shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-sm md:px-4",
        className,
      )}
      {...props}
    >
      {children}
    </header>
  );
}

export function AppMain({ className, ...props }: ComponentProps<"main">) {
  // `id` and `tabIndex` are the skip link's target; focus lands on the page, not in the header.
  return (
    <main
      id="app-main"
      tabIndex={-1}
      data-slot="app-main"
      className={cn("flex-1 px-4 py-page outline-none md:px-page", className)}
      {...props}
    />
  );
}

export function Sidebar({ className, "aria-label": ariaLabel, ...props }: ComponentProps<"nav">) {
  const collapsed = useSidebarCollapsed();
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return (
    <nav
      data-slot="sidebar"
      aria-label={ariaLabel ?? (ar ? "الرئيسية" : "Main")}
      data-collapsed={collapsed || undefined}
      className={cn("group/sidebar flex h-full flex-col gap-shell overflow-y-auto overflow-x-hidden p-shell", className)}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("flex shrink-0 flex-col gap-2", className)} {...props} />;
}

/**
 * The scrolling middle. Header and footer stay put, so on a short window the nav scrolls between them
 * instead of running under the account menu. `-mx-1 px-1` keeps edge focus rings inside the scroll box.
 */
export function SidebarContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        "-mx-1 flex min-h-0 flex-1 flex-col gap-[calc(var(--spacing-shell)+--spacing(1))] overflow-y-auto overflow-x-hidden overscroll-contain px-1 [scrollbar-width:thin]",
        className,
      )}
      {...props}
    />
  );
}

export interface SidebarGroupProps extends Omit<ComponentProps<"div">, "title"> {
  label?: ReactNode;
  /** An icon button at the inline end of the label, e.g. "New project". */
  action?: ReactNode;
  /** Lets the user fold the group away by its label. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function SidebarGroup({ label, action, collapsible = false, defaultOpen = true, className, children, ...props }: SidebarGroupProps) {
  const collapsed = useSidebarCollapsed();
  const labelRow =
    label && !collapsed ? (
      <div className="group/label flex h-[calc(var(--spacing-nav-row)-4px)] items-center gap-1 ps-2 pe-1">
        {collapsible ? (
          <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-1 text-caption font-medium text-muted-foreground rounded-[3px] text-start outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-3">
            <span className="truncate">{label}</span>
            <Icon
              icon={ChevronRight}
              directional
              className="opacity-0 transition-[rotate,opacity] duration-200 ease-nq group-hover/label:opacity-100 group-focus-within/label:opacity-100 group-data-open/group:rotate-90 rtl:group-data-open/group:-rotate-90"
            />
          </CollapsibleTrigger>
        ) : (
          <div className="min-w-0 flex-1 truncate text-caption font-medium text-muted-foreground">{label}</div>
        )}
        {action}
      </div>
    ) : null;
  const items = <div className="flex flex-col gap-0.5">{children}</div>;

  if (collapsible && !collapsed) {
    return (
      <Collapsible defaultOpen={defaultOpen} render={<div data-slot="sidebar-group" className={cn("group/group flex flex-col", className)} {...props} />}>
        {labelRow}
        <CollapsiblePanel>{items}</CollapsiblePanel>
      </Collapsible>
    );
  }
  return (
    <div data-slot="sidebar-group" role="group" aria-label={collapsed && typeof label === "string" ? label : undefined} className={cn("flex flex-col", collapsed && "border-t border-border pt-3 first:border-0 first:pt-0", className)} {...props}>
      {labelRow}
      {items}
    </div>
  );
}

/** A small icon button for a group label, e.g. "+" to create a project. Hidden on the collapsed rail. */
export function SidebarGroupAction({ className, ...props }: ComponentProps<typeof Button>) {
  return <Button variant="ghost" size="icon-sm" className={cn("size-6 text-muted-foreground [&_svg]:size-3.5", className as string)} {...props} />;
}

const itemClass = (active: boolean) =>
  cn(
    "relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] w-full items-center gap-2 rounded-control px-2 text-start text-body-sm text-sidebar-foreground",
    "transition-colors duration-150 ease-nq outline-none hover:bg-nq-hover hover:text-foreground",
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    "group-data-collapsed/sidebar:size-control group-data-collapsed/sidebar:justify-center group-data-collapsed/sidebar:px-0",
    active &&
      "bg-nq-selected font-medium text-foreground before:absolute before:inset-y-1.5 before:start-0 before:w-0.5 before:bg-nq-accent group-data-collapsed/sidebar:before:inset-y-2",
  );

export interface SidebarItemProps extends ComponentProps<"a"> {
  active?: boolean;
  icon?: ReactNode;
  /** Count or status at the inline end. Hidden on the collapsed rail. */
  trailing?: ReactNode;
  /**
   * Tooltip and accessible name on the collapsed rail. Defaults to the children when they are a
   * string; with non-string children pass `tooltip` (or `aria-label`), or the rail item has no name.
   */
  tooltip?: string;
}

/** Active state = gold accent rule at the inline start + stronger text, never colour alone. */
export function SidebarItem({ active = false, icon, trailing, tooltip, className, children, ...props }: SidebarItemProps) {
  const collapsed = useSidebarCollapsed();
  const label = tooltip ?? (typeof children === "string" ? children : undefined);
  const name = label ?? props["aria-label"];
  const link = (
    <a
      data-slot="sidebar-item"
      aria-current={active ? "page" : undefined}
      className={cn(itemClass(active), className)}
      {...props}
      aria-label={collapsed ? name : props["aria-label"]}
    >
      {icon}
      {collapsed ? null : <span className="min-w-0 flex-1 truncate">{children}</span>}
      {trailing && !collapsed ? <span className="ms-auto text-caption text-muted-foreground tabular-nums">{trailing}</span> : null}
    </a>
  );
  return collapsed && name ? (
    <Tooltip content={name} side="inline-end">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

export interface SidebarNestProps {
  label: string;
  icon?: ReactNode;
  /** Marks the parent when one of its children is the current page. */
  active?: boolean;
  defaultOpen?: boolean;
  /** SidebarSubItem elements. */
  children: ReactNode;
}

/** A parent item that expands to sub-items (shadcn NavMain). On the collapsed rail the icon opens a flyout with the sub-items. */
export function SidebarNest({ label, icon, active = false, defaultOpen = false, children }: SidebarNestProps) {
  const collapsed = useSidebarCollapsed();
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  if (collapsed) {
    // The rail has no room to expand in place, so the sub-items open in a flyout beside it.
    return (
      <Popover.Root open={flyoutOpen} onOpenChange={setFlyoutOpen}>
        <Popover.Trigger
          openOnHover
          delay={100}
          closeDelay={150}
          aria-label={label}
          data-slot="sidebar-nest"
          className={cn(itemClass(active), "data-popup-open:bg-nq-hover data-popup-open:text-foreground")}
        >
          {icon}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="inline-end" align="start" sideOffset={8} className="z-50 outline-none">
            <Popover.Popup
              data-slot="sidebar-nest-flyout"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) setFlyoutOpen(false);
              }}
              className={cn(
                "min-w-44 rounded-floating border border-border bg-popover p-1 text-popover-foreground shadow-floating outline-none",
                "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
              )}
            >
              <Popover.Title className="px-2 pt-1 pb-1.5 text-caption font-medium text-muted-foreground">{label}</Popover.Title>
              <div className="flex flex-col gap-0.5">{children}</div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    );
  }
  return (
    <Collapsible defaultOpen={defaultOpen || active} render={<div data-slot="sidebar-nest" className="group/nest flex flex-col" />}>
      <CollapsibleTrigger className={cn(itemClass(false), active && "font-medium text-foreground")}>
        {icon}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <Icon icon={ChevronRight} directional className="ms-auto size-3.5! text-muted-foreground transition-[rotate] duration-200 ease-nq group-data-open/nest:rotate-90 rtl:group-data-open/nest:-rotate-90" />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="ms-4 mt-0.5 flex flex-col gap-0.5 border-s border-border ps-2">{children}</div>
      </CollapsiblePanel>
    </Collapsible>
  );
}

export function SidebarSubItem({ active = false, className, ...props }: ComponentProps<"a"> & { active?: boolean }) {
  return (
    <a
      data-slot="sidebar-sub-item"
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[calc(var(--nq-nav-row)-4px)] min-h-[var(--nq-touch-min,0px)] items-center truncate rounded-control px-2 text-body-sm text-muted-foreground",
        "transition-colors duration-150 ease-nq outline-none hover:bg-nq-hover hover:text-foreground",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
        active && "bg-nq-selected font-medium text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("mt-auto flex shrink-0 flex-col gap-1 pt-2", className)} {...props} />;
}

/** Renders children only when the sidebar is expanded (or in the mobile sheet). */
export function SidebarExpandedOnly({ children }: { children: ReactNode }): ReactElement | null {
  return useSidebarCollapsed() ? null : <>{children}</>;
}
