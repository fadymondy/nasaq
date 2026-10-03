import { onBeforeUnmount, onMounted, ref, watchEffect, type Ref } from "vue";
import { isShake, motionDelta } from "./feedback-reporter-utils";

interface MotionPermissionEvent {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export interface ShakeToReportOptions {
  /** Listen for shakes. A plain value or a ref. Default true. */
  enabled?: boolean | Ref<boolean>;
  /** How hard a jolt must be, in m/s² between two readings. Default 18. */
  threshold?: number;
  /** Jolts needed inside about a second. Default 3. */
  jolts?: number;
  /** Called once per shake, then quiet for `cooldown` ms. */
  onShake: () => void;
  /** Quiet time after a shake, in ms. Default 3000. */
  cooldown?: number;
}

/**
 * Detects a shake of the phone with `devicemotion`. iOS asks for permission first: call `requestPermission()` from a tap.
 * `supported` is false where there is no motion sensor (most desktops). It counts jolts, not orientation, so walking does not trigger it.
 */
export function useShakeToReport({ enabled = true, threshold = 18, jolts = 3, onShake, cooldown = 3000 }: ShakeToReportOptions) {
  const supported = ref(false);
  const permission = ref<"unknown" | "granted" | "denied">("unknown");
  let stop: (() => void) | undefined;

  onMounted(() => {
    supported.value = typeof DeviceMotionEvent !== "undefined";
    const request = (globalThis.DeviceMotionEvent as unknown as MotionPermissionEvent | undefined)?.requestPermission;
    permission.value = request ? "unknown" : "granted";
  });

  async function requestPermission() {
    const request = (globalThis.DeviceMotionEvent as unknown as MotionPermissionEvent | undefined)?.requestPermission;
    if (!request) {
      permission.value = "granted";
      return "granted" as const;
    }
    const result = await request();
    permission.value = result;
    return result;
  }

  watchEffect((onCleanup) => {
    const on = typeof enabled === "boolean" ? enabled : enabled.value;
    if (!on || !supported.value || permission.value !== "granted") return;
    let last: { x: number; y: number; z: number } | null = null;
    let spikes: number[] = [];
    let quietUntil = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const now = Date.now();
      const next = { x: a.x, y: a.y, z: a.z };
      if (last && now >= quietUntil && motionDelta(last, next) > threshold) {
        spikes = [...spikes.filter((t) => now - t <= 1500), now];
        if (isShake(spikes, now, jolts)) {
          spikes = [];
          quietUntil = now + cooldown;
          onShake();
        }
      }
      last = next;
    };
    window.addEventListener("devicemotion", onMotion);
    stop = () => window.removeEventListener("devicemotion", onMotion);
    onCleanup(() => stop?.());
  });
  onBeforeUnmount(() => stop?.());

  return { supported, permission, requestPermission };
}
