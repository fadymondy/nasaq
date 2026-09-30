import { useMemo } from "react";
import { Platform } from "react-native";

type Impact = "light" | "medium" | "heavy";
type Notice = "success" | "warning" | "error";

interface ExpoHaptics {
  impactAsync(style: string): Promise<void>;
  notificationAsync(type: string): Promise<void>;
  selectionAsync(): Promise<void>;
}

export interface Haptics {
  /** False on web and when expo-haptics is not installed; every call is then a no-op. */
  available: boolean;
  impact(style?: Impact): void;
  notify(type: Notice): void;
  selection(): void;
}

declare const require: (id: string) => unknown;
let loaded: ExpoHaptics | null | undefined;

function load(): ExpoHaptics | null {
  if (loaded !== undefined) return loaded;
  loaded = null;
  if (Platform.OS === "web") return loaded;
  try {
    // Optional peer. Metro turns a missing module inside try/catch into a runtime throw, not a build error.
    loaded = require("expo-haptics") as ExpoHaptics;
  } catch {
    loaded = null;
  }
  return loaded;
}

const swallow = (p: Promise<void>) => void p.catch(() => {});

/** Haptic feedback through expo-haptics when the app has it; a silent no-op otherwise. */
export function useHaptics(): Haptics {
  return useMemo(() => {
    const h = load();
    return {
      available: !!h,
      impact: (style = "light") => void (h && swallow(h.impactAsync(style))),
      notify: (type) => void (h && swallow(h.notificationAsync(type))),
      selection: () => void (h && swallow(h.selectionAsync())),
    };
  }, []);
}
