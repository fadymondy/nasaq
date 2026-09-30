import { chrome as tokens } from "@nasaq/tokens";

export type DesktopPlatform = "darwin" | "win32" | "linux";
/** inset: macOS hiddenInset traffic lights. overlay: Windows titleBarOverlay. native: OS frame. custom: frameless, app draws WindowControls. */
export type ChromeKind = "inset" | "overlay" | "native" | "custom";
export type ChromeMaterial = "vibrancy" | "mica" | "none";
export type WindowKind = "main" | "panel" | "settings";

/** What the renderer needs to lay out its title bar. Plain JSON so it crosses the preload bridge. */
export interface ChromeInfo {
  platform: DesktopPlatform;
  chrome: ChromeKind;
  material: ChromeMaterial;
  /** Title bar height in px. */
  titlebar: number;
  /** Width in px the OS caption buttons take, 0 when the page draws none. */
  inset: number;
}

export const ARG_PREFIX = "--nasaq-chrome=";

export function isDesktopPlatform(p: unknown): p is DesktopPlatform {
  return p === "darwin" || p === "win32" || p === "linux";
}

/** The chrome each platform gets by default. */
export function defaultChrome(platform: DesktopPlatform): ChromeKind {
  return platform === "darwin" ? "inset" : platform === "win32" ? "overlay" : "native";
}

export function describeChrome(platform: DesktopPlatform, chrome = defaultChrome(platform), material: ChromeMaterial = "none"): ChromeInfo {
  return {
    platform,
    chrome,
    material,
    titlebar: tokens.titlebar[platform],
    inset: chrome === "native" ? 0 : tokens.inset[platform],
  };
}

/**
 * Which physical edge the caption buttons sit on. Windows keeps them on the right in every language;
 * macOS moves the traffic lights to the right in RTL; drawn Linux controls follow the reading end.
 */
export function controlsSide(platform: DesktopPlatform, direction: "ltr" | "rtl"): "left" | "right" {
  if (platform === "win32") return "right";
  if (platform === "darwin") return direction === "rtl" ? "right" : "left";
  return direction === "rtl" ? "left" : "right";
}
