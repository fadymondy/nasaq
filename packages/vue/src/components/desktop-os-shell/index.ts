export { default as NqDesktopShell } from "./NqDesktopShell.vue";
export { default as NqDesktopAppIcon } from "./NqDesktopAppIcon.vue";
export { default as NqDesktopMenuBar } from "./NqDesktopMenuBar.vue";
export { default as NqDesktopDock } from "./NqDesktopDock.vue";
export { default as NqDesktopLaunchpad } from "./NqDesktopLaunchpad.vue";
export type { DesktopApp, DesktopMenu, DesktopMenuItem, DesktopShellApi, DesktopShellLabels } from "./strings";
export type { DesktopBounds, DesktopRect, DesktopSnap, DesktopWindowState } from "./desktop-math";
export {
  DESKTOP_POWER_ACTIONS,
  DESKTOP_POWER_CONFIRMED,
  desktopPowerConfirm,
  desktopPowerLabels,
  desktopPowerMenu,
  type DesktopPowerActionId,
  type DesktopPowerConfirm,
  type DesktopPowerMenu,
  type DesktopPowerMenuItem,
  type DesktopPowerMenuLabels,
  type DesktopPowerMenuOptions,
} from "./desktop-power-menu";
