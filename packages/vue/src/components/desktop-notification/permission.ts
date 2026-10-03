import { onMounted, ref } from "vue";

export type DesktopPlatform = "macos" | "windows";

export interface DesktopNotificationAction {
  id: string;
  label: string;
}

export type DesktopPermission = "default" | "granted" | "denied" | "unsupported";

/** The step of the permission flow to show. `asking` is the wait while the system dialog is open. */
export type DesktopPermissionStep = "ask" | "asking" | "granted" | "denied" | "unsupported";

/** Maps the permission and whether the system dialog is open to the step of the flow. Pure. */
export function permissionStep(permission: DesktopPermission, asking: boolean): DesktopPermissionStep {
  if (permission === "unsupported") return "unsupported";
  if (permission === "granted") return "granted";
  if (permission === "denied") return "denied";
  return asking ? "asking" : "ask";
}

/**
 * The browser or Electron notification permission, kept in a ref. `request` opens the system dialog. It is safe to
 * render on the server: the permission reads `default` until the client mounts.
 */
export function useNotificationPermission() {
  const permission = ref<DesktopPermission>("default");
  onMounted(() => {
    permission.value = typeof Notification === "undefined" ? "unsupported" : (Notification.permission as DesktopPermission);
  });
  async function request(): Promise<DesktopPermission> {
    if (typeof Notification === "undefined") return "unsupported";
    const result = (await Notification.requestPermission()) as DesktopPermission;
    permission.value = result;
    return result;
  }
  return { permission, request };
}
