import { themes } from "@nasaq/tokens";
import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { ARG_PREFIX, type ChromeInfo, type DesktopPlatform, describeChrome, isDesktopPlatform, type WindowKind } from "./shared";

export * from "./shared";

type Theme = "light" | "dark";

export interface WindowChromeOptions {
  /** Defaults to process.platform. */
  platform?: string;
  theme?: Theme;
  kind?: WindowKind;
  /** Windows 11 gets Mica; older Windows a solid ground. Defaults to detecting build 22000+. */
  windows11?: boolean;
  /** Override the default size of the window kind (any of these keys; the rest keep their defaults). */
  size?: Pick<BrowserWindowConstructorOptions, "width" | "height" | "minWidth" | "minHeight" | "maxWidth" | "maxHeight" | "maximizable" | "fullscreenable" | "resizable">;
  /** Extra BrowserWindow options merged last. `webPreferences` is merged key by key so the chrome argument survives. */
  overrides?: BrowserWindowConstructorOptions;
}

declare const process: { platform: string; getSystemVersion?: () => string };

const TRANSPARENT = "rgba(0, 0, 0, 0)";

const SIZES: Record<WindowKind, BrowserWindowConstructorOptions> = {
  main: { width: 1280, height: 820, minWidth: 960, minHeight: 600 },
  panel: { width: 420, height: 640, minWidth: 360, minHeight: 480 },
  settings: { width: 760, height: 580, minWidth: 640, minHeight: 480, maximizable: false, fullscreenable: false },
};

function platformOf(p?: string): DesktopPlatform {
  const value = p ?? process.platform;
  return isDesktopPlatform(value) ? value : "linux";
}

function isWindows11(): boolean {
  const build = Number(process.getSystemVersion?.().split(".")[2] ?? 0);
  return build >= 22000;
}

/** The chrome description for the renderer, matching what windowChrome() builds. */
export function chromeInfo({ platform, windows11 }: Pick<WindowChromeOptions, "platform" | "windows11"> = {}): ChromeInfo {
  const os = platformOf(platform);
  if (os === "darwin") return describeChrome(os, "inset", "vibrancy");
  if (os === "win32") return describeChrome(os, "overlay", (windows11 ?? isWindows11()) ? "mica" : "none");
  return describeChrome(os, "native");
}

function overlay(info: ChromeInfo, theme: Theme) {
  return { color: TRANSPARENT, symbolColor: themes[theme].fg, height: info.titlebar };
}

/**
 * BrowserWindow options for Nasaq chrome. macOS: hiddenInset traffic lights over sidebar vibrancy.
 * Windows: hidden title bar with the native caption overlay (never frame: false, so snap layouts and
 * the system menu keep working) over Mica on Windows 11. Linux: the OS frame.
 * The chrome info is passed to the preload as a process argument; read it there with exposeChrome().
 */
export function windowChrome({ size, overrides, ...options }: WindowChromeOptions = {}): BrowserWindowConstructorOptions {
  const result = chromeOptions(options, size);
  if (!overrides) return result;
  return { ...result, ...overrides, webPreferences: { ...result.webPreferences, ...overrides.webPreferences } };
}

function chromeOptions({ platform, theme = "light", kind = "main", windows11 }: Omit<WindowChromeOptions, "size" | "overrides">, size?: WindowChromeOptions["size"]): BrowserWindowConstructorOptions {
  const info = chromeInfo({ platform, windows11 });
  const base: BrowserWindowConstructorOptions = {
    ...SIZES[kind],
    ...size,
    show: false,
    webPreferences: { additionalArguments: [ARG_PREFIX + JSON.stringify(info)] },
  };
  if (info.platform === "darwin") {
    return {
      ...base,
      titleBarStyle: "hiddenInset",
      // Traffic lights are 14px tall; centre them in the title bar.
      trafficLightPosition: { x: 20, y: Math.round((info.titlebar - 14) / 2) },
      vibrancy: "sidebar",
      visualEffectState: "followWindow",
      backgroundColor: TRANSPARENT,
    };
  }
  if (info.platform === "win32") {
    return {
      ...base,
      titleBarStyle: "hidden",
      titleBarOverlay: overlay(info, theme),
      ...(info.material === "mica" ? { backgroundMaterial: "mica", backgroundColor: TRANSPARENT } : { backgroundColor: themes[theme].bg }),
    };
  }
  return { ...base, autoHideMenuBar: true, backgroundColor: themes[theme].bg };
}

/** Re-colour the Windows caption buttons after a theme change. A no-op elsewhere. */
export function updateTitleBarOverlay(win: BrowserWindow, theme: Theme, platform?: string): void {
  const info = chromeInfo({ platform, windows11: true });
  if (info.platform === "win32") win.setTitleBarOverlay(overlay(info, theme));
}
