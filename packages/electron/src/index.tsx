import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { type ChromeInfo, controlsSide, defaultChrome, describeChrome, isDesktopPlatform } from "./shared";

export * from "./shared";

declare global {
  interface Window {
    /** Set by exposeChrome() in the preload. */
    nasaqChrome?: ChromeInfo;
  }
}

const ATTRS = ["data-platform", "data-chrome", "data-material", "dir"];

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ATTRS });
  return () => observer.disconnect();
}

const snapshot = () => {
  const d = document.documentElement.dataset;
  return `${d.platform ?? ""}|${d.chrome ?? ""}|${d.material ?? ""}`;
};

/**
 * Writes <html data-platform data-chrome data-material> from the preload's chrome info (or the one given),
 * so CSS (--nq-window-titlebar, --nq-window-inset) and shortcut labels follow the desktop platform.
 */
export function useWindowChrome(info: ChromeInfo | null | undefined = typeof window === "undefined" ? undefined : window.nasaqChrome) {
  useLayoutEffect(() => {
    if (!info) return;
    const d = document.documentElement.dataset;
    d.platform = info.platform;
    d.chrome = info.chrome;
    d.material = info.material;
  }, [info]);
  return info ?? null;
}

/** The chrome the page is laid out for, read from <html>. Null outside a desktop platform. */
export function useChromeInfo(): ChromeInfo | null {
  const key = useSyncExternalStore(subscribe, snapshot, () => "||");
  const [platform, chrome, material] = key.split("|");
  if (!isDesktopPlatform(platform)) return null;
  const kind = (["inset", "overlay", "native", "custom"] as const).find((k) => k === chrome) ?? defaultChrome(platform);
  return describeChrome(platform, kind, material === "mica" || material === "vibrancy" ? material : "none");
}

function useDirection<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = getComputedStyle(el).direction === "rtl" ? "rtl" : "ltr";
    if (next !== dir) setDir(next);
  });
  return [ref, dir] as const;
}

const TitleBarContext = createContext<{ info: ChromeInfo | null; dir: "ltr" | "rtl" }>({ info: null, dir: "ltr" });

/** A region that moves the window. Buttons, links and inputs inside it stay clickable. */
export function DragRegion({ ...props }: ComponentProps<"div">) {
  return <div data-nq-drag="" {...props} />;
}

/** Opts a non-interactive element out of the surrounding drag region. */
export function NoDrag({ ...props }: ComponentProps<"div">) {
  return <div data-nq-no-drag="" {...props} />;
}

/**
 * Reserves the width of the OS caption buttons on one edge. Place one at the start and one at the end
 * of a title bar row; only the edge the controls actually sit on renders. RTL-aware: macOS traffic lights
 * move to the right in RTL, the Windows caption overlay stays on the right.
 */
export function WindowControlsInset({ edge, style, ...props }: { edge: "start" | "end" } & ComponentProps<"div">) {
  const { info, dir } = useContext(TitleBarContext);
  if (!info || info.inset === 0 || info.chrome === "custom") return null;
  const side = controlsSide(info.platform, dir);
  const startSide = dir === "rtl" ? "right" : "left";
  if ((side === startSide) !== (edge === "start")) return null;
  return <div aria-hidden data-nq-controls-inset={side} style={{ flex: "none", width: info.inset, alignSelf: "stretch", ...style }} {...props} />;
}

export interface WindowTitleBarProps extends Omit<ComponentProps<"header">, "title"> {
  /** Centred window title. */
  title?: ReactNode;
  /** Override what <html> says, e.g. to preview another platform. */
  chrome?: ChromeInfo | null;
  /** Rendered in place of the OS buttons when the chrome is "custom" (frameless windows). */
  controls?: ReactNode;
}

/**
 * The window's title bar: platform height, a drag region, and room for the OS caption buttons on the
 * correct edge. Children are the toolbar; interactive children stay clickable.
 */
export function WindowTitleBar({ title, chrome, controls, children, style, ...props }: WindowTitleBarProps) {
  const fromHtml = useChromeInfo();
  const info = chrome === undefined ? fromHtml : chrome;
  const [ref, dir] = useDirection<HTMLElement>();
  const custom = info?.chrome === "custom";
  const bar: CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: info?.titlebar ?? 44,
    paddingInline: 8,
    borderBlockEnd: "1px solid var(--nq-line)",
    background: info?.material && info.material !== "none" ? "transparent" : "var(--nq-surface)",
    color: "var(--nq-fg)",
    ...style,
  };
  return (
    <TitleBarContext.Provider value={{ info, dir }}>
      <header ref={ref} data-nq-drag="" data-nq-titlebar={info?.platform ?? "web"} style={bar} {...props}>
        <WindowControlsInset edge="start" />
        {children}
        {title != null && (
          <div
            style={{
              position: "absolute",
              insetInline: 0,
              textAlign: "center",
              pointerEvents: "none",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--nq-fg-muted)",
            }}
          >
            {title}
          </div>
        )}
        <span style={{ flex: 1 }} />
        {custom && controls}
        <WindowControlsInset edge="end" />
      </header>
    </TitleBarContext.Provider>
  );
}

export interface WindowControlsProps extends ComponentProps<"div"> {
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  maximized?: boolean;
  labels?: { minimize: string; maximize: string; restore: string; close: string };
}

const EN = { minimize: "Minimize", maximize: "Maximize", restore: "Restore", close: "Close" };

/** Drawn minimize, maximize and close for frameless windows (Linux custom chrome, floating panels). */
export function WindowControls({ onMinimize, onMaximize, onClose, maximized, labels = EN, style, ...props }: WindowControlsProps) {
  const button: CSSProperties = {
    display: "grid",
    placeItems: "center",
    width: 28,
    height: 28,
    borderRadius: 999,
    border: 0,
    background: "var(--nq-hover)",
    color: "var(--nq-fg)",
    cursor: "default",
  };
  const icon = (d: string) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <path d={d} />
    </svg>
  );
  return (
    <div style={{ display: "flex", gap: 8, ...style }} {...props}>
      {onMinimize && (
        <button type="button" aria-label={labels.minimize} title={labels.minimize} style={button} onClick={onMinimize}>
          {icon("M1.5 5h7")}
        </button>
      )}
      {onMaximize && (
        <button type="button" aria-label={maximized ? labels.restore : labels.maximize} title={maximized ? labels.restore : labels.maximize} style={button} onClick={onMaximize}>
          {icon(maximized ? "M2.5 3.5h4v4h-4zM3.5 2.5h4v4" : "M1.5 1.5h7v7h-7z")}
        </button>
      )}
      {onClose && (
        <button type="button" aria-label={labels.close} title={labels.close} style={button} onClick={onClose}>
          {icon("M2 2l6 6M8 2l-6 6")}
        </button>
      )}
    </div>
  );
}

