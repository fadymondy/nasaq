"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import { useRender } from "@base-ui/react/use-render";
import { ChevronRight, ChevronsUpDown, Ellipsis, PanelLeft } from "lucide-react";
import {
  Children,
  type ComponentProps,
  createContext,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useModHotkey } from "../../lib/hotkey";
import { useNasaq, useOptionalNasaq } from "../../provider/nasaq-provider";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "../drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../dropdown-menu";
import { CommandProvider, CommandRegistry, useCommandRegistry } from "../commands";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../collapsible";
import { Icon } from "../icon";
import { ProductLogo, ProductMark } from "../product-mark";
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
  /**
   * Rendered as a column at md+ (collapsible to an icon rail) and inside a sheet below md.
   * Leave it out for top navigation: `AppHeader` with `AppBreadcrumbs`, then `AppNav` tabs under it.
   */
  sidebar?: ReactNode;
  /**
   * `plain` (default): the page fills the space beside the sidebar.
   * `inset`: the page sits on its own rounded panel, inset from the sidebar's surface (md+).
   */
  variant?: "plain" | "inset";
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
  /**
   * Height taken from above the shell, such as an Electron title bar: a number is px, a string any CSS length. It
   * sets `--nasaq-shell-offset`, which the shell subtracts from its `100dvh` (and the sidebar sticks below). Set the
   * variable yourself in CSS to get the same result. Default 0. The sticky page header (`AppHeader`) stays at the top
   * of its scroll container.
   */
  offset?: number | string;
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
  variant = "plain",
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  resizable = true,
  defaultWidth = 256,
  minWidth = 208,
  maxWidth = 420,
  resizeLabel,
  offset,
  style,
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
    if (!sidebar) return;
    if (window.matchMedia(DESKTOP_QUERY).matches) setCollapsed(!collapsed);
    else setMobileOpen(!mobileOpen);
  }, [sidebar, collapsed, mobileOpen, setCollapsed]);

  useModHotkey("b", toggleSidebar, { ignoreEditable: true });
  const inset = variant === "inset";
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
      <div
        data-slot="app-shell"
        data-variant={variant}
        data-navigation={sidebar ? "sidebar" : "top"}
        style={offset === undefined ? style : ({ ...style, "--nasaq-shell-offset": typeof offset === "number" ? `${offset}px` : offset } as CSSProperties)}
        className={cn(
          "flex min-h-[calc(100dvh_-_var(--nasaq-shell-offset,0px))] bg-background text-foreground",
          "has-data-[slot=app-nav-bar]:max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]",
          inset && "md:bg-sidebar",
          className,
        )}
        {...props}
      >
        <a
          href="#app-main"
          className="sr-only rounded-control border border-border bg-popover text-label text-foreground shadow-md focus:not-sr-only focus:fixed focus:start-3 focus:top-2 focus:z-50 focus:px-3 focus:py-2 focus-visible:outline-2 focus-visible:outline-nq-focus"
        >
          {ar ? "تخطَّ إلى المحتوى" : "Skip to content"}
        </a>
        {sidebar ? (
        <aside
          data-slot="app-sidebar"
          data-collapsed={collapsed || undefined}
          data-resizing={resizing || undefined}
          style={{ "--nq-sidebar-width": `${width}px` } as CSSProperties}
          className={cn(
            "sticky top-[var(--nasaq-shell-offset,0px)] hidden h-[calc(100dvh_-_var(--nasaq-shell-offset,0px))] shrink-0 border-e border-border bg-sidebar transition-[width] duration-200 ease-nq md:block",
            inset && "md:border-e-0",
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
        ) : null}
        {sidebar ? (
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
        ) : null}
        {inset ? (
          // The panel scrolls by itself, so the sticky header stays inside its rounded corners.
          <div data-slot="app-shell-panel-frame" className="flex min-w-0 flex-1 flex-col md:h-[calc(100dvh_-_var(--nasaq-shell-offset,0px))] md:py-2 md:pe-2">
            <div
              data-slot="app-shell-panel"
              className="flex min-w-0 flex-1 flex-col bg-background md:overflow-y-auto md:rounded-xl md:border md:border-border md:shadow-xs"
            >
              {children}
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        )}
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
        "in-data-[slot=app-shell-panel]:md:rounded-t-xl",
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

export interface SidebarProps extends ComponentProps<"nav"> {
  /**
   * `always` (default): item icons show everywhere.
   * `mobile`: a text-only list on the desktop column; icons return in the phone sheet, where they help
   * scanning, and on the collapsed rail, where they are all there is.
   */
  icons?: "always" | "mobile";
}

export function Sidebar({ icons = "always", className, "aria-label": ariaLabel, ...props }: SidebarProps) {
  const collapsed = useSidebarCollapsed();
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return (
    <nav
      data-slot="sidebar"
      aria-label={ariaLabel ?? (ar ? "الرئيسية" : "Main")}
      data-collapsed={collapsed || undefined}
      data-icons={icons}
      className={cn(
        "group/sidebar flex h-full flex-col gap-shell overflow-y-auto overflow-x-hidden p-shell",
        // The desktop column and the phone sheet share this element; md+ is only ever the column.
        icons === "mobile" && !collapsed && "md:[&_[data-slot=sidebar-icon]]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export interface SidebarBrandProps extends ComponentProps<"a"> {
  /** Brand for the default logo. Default: the provider's brand. */
  brand?: string;
  /** What shows when the sidebar is expanded. Default: the brand's `ProductLogo` (mark and name). */
  logo?: ReactNode;
  /** What shows when the sidebar is collapsed to a rail. Default: the brand's `ProductMark`. */
  mark?: ReactNode;
  /** The link's name while only the mark shows, and its tooltip. Default: the brand's name. */
  label?: string;
}

/**
 * The product logo at the top of the sidebar, usually a link home. Put it first in `SidebarHeader`.
 * Expanded it shows the mark and the name; collapsed, the mark alone, with the name in a tooltip.
 */
export function SidebarBrand({ brand, logo, mark, label, className, href = "/", ...props }: SidebarBrandProps) {
  const collapsed = useSidebarCollapsed();
  const nasaq = useOptionalNasaq();
  const manifest = nasaq?.brand;
  const ar = nasaq?.locale.startsWith("ar") ?? false;
  const name = label ?? (manifest && !brand ? (ar && manifest.name.ar) || manifest.name.en : undefined);
  const link = (
    <a
      data-slot="sidebar-brand"
      href={href}
      className={cn(
        "flex h-control shrink-0 items-center gap-2 rounded-control px-2 outline-none",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
        "group-data-collapsed/sidebar:size-control group-data-collapsed/sidebar:justify-center group-data-collapsed/sidebar:px-0",
        className,
      )}
      {...props}
      aria-label={collapsed ? name : props["aria-label"]}
    >
      {collapsed ? (mark ?? <ProductMark brand={brand} size={20} title="" />) : (logo ?? <ProductLogo brand={brand} size={20} />)}
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
    active && "bg-nq-selected font-medium text-foreground",
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
  /**
   * Render another element instead of the `<a>`, so a router link keeps its client-side navigation: pass
   * `render={<Link href="/orders" />}` (Next.js, react-router) or a function `(props) => <Link {...props} to="/orders" />`.
   * Nasaq merges its classes, `aria-current`, `data-slot` and children into it.
   */
  render?: ReactElement | ((props: ComponentProps<"a">) => ReactElement);
}

/** An item's icon, tagged so `<Sidebar icons="mobile">` can hide it on the desktop column. */
function SidebarIcon({ children }: { children: ReactNode }) {
  return children ? (
    <span data-slot="sidebar-icon" className="contents">
      {children}
    </span>
  ) : null;
}

/** Active state = gold accent rule at the inline start + stronger text, never colour alone. */
export function SidebarItem({ active = false, icon, trailing, tooltip, render, className, children, ...props }: SidebarItemProps) {
  const collapsed = useSidebarCollapsed();
  const label = tooltip ?? (typeof children === "string" ? children : undefined);
  const name = label ?? props["aria-label"];
  const link = useRender({
    defaultTagName: "a",
    render,
    props: {
      "data-slot": "sidebar-item",
      "aria-current": active ? "page" : undefined,
      className: cn(itemClass(active), className),
      ...props,
      "aria-label": collapsed ? name : props["aria-label"],
      children: (
        <>
          <SidebarIcon>{icon}</SidebarIcon>
          {collapsed ? null : <span className="min-w-0 flex-1 truncate">{children}</span>}
          {trailing && !collapsed ? <span className="ms-auto text-caption text-muted-foreground tabular-nums">{trailing}</span> : null}
        </>
      ),
    },
  });
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
        <SidebarIcon>{icon}</SidebarIcon>
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

// ── Top navigation ────────────────────────────────────────────────────────────

/** Where you are, as a path: organisation / project / environment. Put it in `AppHeader`. Below md only the last step shows. */
export function AppBreadcrumbs({ className, children, "aria-label": ariaLabel, ...props }: ComponentProps<"nav">) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const items = Children.toArray(children).filter(Boolean);
  return (
    <nav data-slot="app-breadcrumbs" aria-label={ariaLabel ?? (ar ? "المسار" : "Breadcrumb")} className={cn("min-w-0", className)} {...props}>
      <ol className="flex min-w-0 items-center gap-1">
        {items.map((child, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: crumbs are positional
          <li key={i} className={cn("flex min-w-0 items-center gap-1", i < items.length - 1 && "max-md:hidden")}>
            {i > 0 ? (
              <span aria-hidden className="select-none px-0.5 text-body text-nq-line-strong max-md:hidden">
                /
              </span>
            ) : null}
            {child}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface AppCrumbProps {
  /** A mark, avatar or initials shown before the name. */
  icon?: ReactNode;
  /** A short tag after the name: the plan ("Free"), the environment ("Production"). */
  tag?: ReactNode;
  tagVariant?: ComponentProps<typeof Badge>["variant"];
  /** Links the name. The current step is not a link. */
  href?: string;
  current?: boolean;
  /** The switcher: menu items for the ⇅ button beside the name (other organisations, projects, branches…). */
  menu?: ReactNode;
  /** Accessible name of the switcher button. Default "Switch {name}". */
  menuLabel?: string;
  children: ReactNode;
  className?: string;
}

/** One step of the path: an optional mark, the name, a tag and a switcher. */
export function AppCrumb({ icon, tag, tagVariant = "outline", href, current, menu, menuLabel, children, className }: AppCrumbProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const name = typeof children === "string" ? children : "";
  const body = (
    <>
      {icon ? <span className="inline-flex shrink-0 [&_svg]:size-4">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </>
  );
  const labelClass = cn(
    "flex h-8 min-w-0 items-center gap-2 rounded-control px-1.5 text-label text-foreground outline-none",
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
  );
  return (
    <span data-slot="app-crumb" className={cn("flex min-w-0 items-center gap-1", className)}>
      {href && !current ? (
        <a href={href} className={cn(labelClass, "transition-colors duration-150 ease-nq hover:bg-nq-hover")}>
          {body}
        </a>
      ) : (
        <span aria-current={current ? "page" : undefined} className={labelClass}>
          {body}
        </span>
      )}
      {tag ? (
        <Badge variant={tagVariant} className="shrink-0 uppercase">
          {tag}
        </Badge>
      ) : null}
      {menu ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={menuLabel ?? (ar ? `تبديل ${name}` : `Switch ${name}`.trim())}
            className={cn(
              "inline-flex size-6 shrink-0 items-center justify-center rounded-control text-muted-foreground outline-none",
              "transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground data-popup-open:bg-nq-selected",
              "focus-visible:outline-2 focus-visible:outline-nq-focus",
            )}
          >
            <ChevronsUpDown aria-hidden className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {menu}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </span>
  );
}

type AppNavPlacement = "tabs" | "bar" | "sheet";
const AppNavContext = createContext<{ placement: AppNavPlacement; onNavigate?: () => void; icons?: boolean }>({ placement: "tabs" });

export interface AppNavProps extends ComponentProps<"nav"> {
  /** Below md the tabs become a bottom bar. This many items fit on it; the rest open behind the "More" button. Default 4. */
  mobileItems?: number;
  /** Label of the bar's overflow button. Default "More" / "المزيد". */
  moreLabel?: string;
  /** `always` (default), or `mobile`: text-only tabs on desktop, icons only on the phone bar and its drawer. */
  icons?: "always" | "mobile";
}

/**
 * Section tabs under the header, for apps without a sidebar. Below md they move to a bottom bar
 * (thumb reach): the first `mobileItems` sit on it and the rest open in a drawer behind "More".
 */
export function AppNav({ className, children, mobileItems = 4, moreLabel, icons = "always", "aria-label": ariaLabel, ...props }: AppNavProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const [moreOpen, setMoreOpen] = useState(false);
  const label = ariaLabel ?? (ar ? "الأقسام" : "Sections");
  const more = moreLabel ?? (ar ? "المزيد" : "More");
  const items = Children.toArray(children).filter(isValidElement);
  // With exactly one extra item, show it instead of a "More" that hides a single link.
  const fits = items.length <= mobileItems + 1;
  const onBar = fits ? items : items.slice(0, mobileItems);
  const overflow = fits ? [] : items.slice(mobileItems);
  const overflowActive = overflow.some((item) => (item.props as { active?: boolean }).active);
  return (
    <>
      <nav
        data-slot="app-nav"
        aria-label={label}
        className={cn("shrink-0 border-b border-border bg-background max-md:hidden", className)}
        {...props}
      >
        <div className="flex items-center gap-1 overflow-x-auto px-2 [scrollbar-width:none]">
          <AppNavContext.Provider value={{ placement: "tabs", icons: icons === "always" }}>{children}</AppNavContext.Provider>
        </div>
      </nav>
      <nav
        data-slot="app-nav-bar"
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        <div className="flex items-stretch px-1">
          <AppNavContext.Provider value={{ placement: "bar" }}>{onBar}</AppNavContext.Provider>
          {overflow.length ? (
            <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
              <DrawerTrigger
                data-slot="app-nav-more"
                data-active={overflowActive || undefined}
                className={cn(APP_NAV_BAR_ITEM, overflowActive && "font-medium text-foreground")}
              >
                <Ellipsis aria-hidden />
                <span className="max-w-full truncate">{more}</span>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>{more}</DrawerTitle>
                </DrawerHeader>
                <DrawerBody>
                  <div className="grid gap-0.5 pb-2">
                    <AppNavContext.Provider value={{ placement: "sheet", onNavigate: () => setMoreOpen(false) }}>
                      {overflow}
                    </AppNavContext.Provider>
                  </div>
                </DrawerBody>
              </DrawerContent>
            </Drawer>
          ) : null}
        </div>
      </nav>
    </>
  );
}

const APP_NAV_BAR_ITEM = cn(
  "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-control px-1 py-1.5 text-caption text-muted-foreground outline-none",
  "transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-5",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
);

export interface AppNavItemProps extends ComponentProps<"a"> {
  active?: boolean;
  /** Shown on the mobile bar and in its "More" drawer; give every item one. */
  icon?: ReactNode;
  /** A count or "New" after the label. On the mobile bar it becomes a dot on the icon. */
  trailing?: ReactNode;
}

/** A tab: the current one gets a solid underline and stronger text, never colour alone. */
export function AppNavItem({ active = false, icon, trailing, className, children, onClick, ...props }: AppNavItemProps) {
  const { placement, onNavigate, icons = true } = useContext(AppNavContext);
  const handleClick: AppNavItemProps["onClick"] = (event) => {
    onClick?.(event);
    onNavigate?.();
  };
  if (placement === "bar") {
    return (
      <a
        data-slot="app-nav-item"
        data-active={active || undefined}
        aria-current={active ? "page" : undefined}
        className={cn(APP_NAV_BAR_ITEM, active && "font-medium text-foreground", className)}
        onClick={handleClick}
        {...props}
      >
        <span className="relative inline-flex">
          {icon}
          {trailing ? <span aria-hidden className="absolute -end-1 -top-0.5 size-2 rounded-full bg-nq-accent ring-2 ring-background" /> : null}
        </span>
        <span className="max-w-full truncate">{children}</span>
      </a>
    );
  }
  if (placement === "sheet") {
    return (
      <a
        data-slot="app-nav-item"
        data-active={active || undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-11 items-center gap-3 rounded-control px-3 text-body text-foreground outline-none",
          "transition-colors duration-150 ease-nq hover:bg-nq-hover [&_svg]:size-5 [&_svg]:text-muted-foreground",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
          active && "bg-nq-selected font-medium",
          className,
        )}
        onClick={handleClick}
        {...props}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {trailing ? <span className="text-caption text-muted-foreground tabular-nums">{trailing}</span> : null}
      </a>
    );
  }
  return (
    <a
      data-slot="app-nav-item"
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-11 shrink-0 items-center gap-2 px-2 text-body-sm whitespace-nowrap text-muted-foreground outline-none",
        "transition-colors duration-150 ease-nq hover:text-foreground [&_svg]:size-4",
        "after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent",
        "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-nq-focus",
        active && "font-medium text-foreground after:bg-foreground",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {icons ? icon : null}
      {children}
      {trailing ? <span className="text-caption text-muted-foreground tabular-nums">{trailing}</span> : null}
    </a>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export interface AppPageHeaderProps extends Omit<ComponentProps<"div">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /** A mark or avatar before the title (the project, the organisation). */
  icon?: ReactNode;
  /** Controls at the inline end: a time range, filters, the page's main action. */
  actions?: ReactNode;
}

/** The page's title row: a big title, an optional line under it, and the page's controls at the end. */
export function AppPageHeader({ title, description, icon, actions, className, children, ...props }: AppPageHeaderProps) {
  return (
    <div data-slot="app-page-header" className={cn("flex flex-wrap items-center gap-x-4 gap-y-3", className)} {...props}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
        <div className="grid min-w-0 gap-1">
          <h1 className="truncate text-h2 text-foreground">{title}</h1>
          {description ? <div className="text-body-sm text-muted-foreground">{description}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      {children}
    </div>
  );
}

/** The quiet last row of a top-navigation app: copyright or status at the start, links at the end. */
export function AppFooter({ start, className, children, ...props }: ComponentProps<"footer"> & { start?: ReactNode }) {
  return (
    <footer
      data-slot="app-footer"
      className={cn(
        "mt-auto flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-t border-border px-4 py-3 text-caption text-muted-foreground md:px-page",
        className,
      )}
      {...props}
    >
      {start ? <div className="flex min-w-0 items-center gap-2">{start}</div> : null}
      <div className="ms-auto flex flex-wrap items-center gap-x-5 gap-y-1">{children}</div>
    </footer>
  );
}

export function AppFooterLink({ className, ...props }: ComponentProps<"a">) {
  return (
    <a
      data-slot="app-footer-link"
      className={cn("rounded-xs outline-none transition-colors duration-150 ease-nq hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus", className)}
      {...props}
    />
  );
}

// ── Sidebar status ────────────────────────────────────────────────────────────

const STATUS_DOT = { success: "bg-nq-success", warning: "bg-nq-warning", danger: "bg-nq-danger", info: "bg-nq-info" } as const;

export interface SidebarStatusProps extends Omit<ComponentProps<"a">, "children"> {
  tone?: keyof typeof STATUS_DOT;
  /** The status in words, e.g. "All systems normal". Also the rail's tooltip. */
  children: string;
}

/** The service status line at the foot of the sidebar, usually a link to the status page. On the rail it is a dot with a tooltip. */
export function SidebarStatus({ tone = "success", className, children, ...props }: SidebarStatusProps) {
  const collapsed = useSidebarCollapsed();
  const link = (
    <a
      data-slot="sidebar-status"
      data-tone={tone}
      aria-label={collapsed ? children : undefined}
      className={cn(
        "flex h-nav-row items-center gap-2 rounded-control px-2 text-caption text-muted-foreground outline-none",
        "transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
        "group-data-collapsed/sidebar:size-control group-data-collapsed/sidebar:justify-center group-data-collapsed/sidebar:px-0",
        className,
      )}
      {...props}
    >
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[tone], tone !== "success" && "animate-pulse motion-reduce:animate-none")} />
      {collapsed ? null : <span className="min-w-0 flex-1 truncate">{children}</span>}
    </a>
  );
  return collapsed ? (
    <Tooltip content={children} side="inline-end">
      {link}
    </Tooltip>
  ) : (
    link
  );
}
