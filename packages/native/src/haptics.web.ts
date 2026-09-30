// Web build (react-native-web, picked by the .web.ts extension): the browser has no haptics engine, and
// keeping expo-haptics out of this file keeps it out of web bundles.
type Impact = "light" | "medium" | "heavy";
type Notice = "success" | "warning" | "error";

export interface Haptics {
  /** False on web and when expo-haptics is not installed; every call is then a no-op. */
  available: boolean;
  impact(style?: Impact): void;
  notify(type: Notice): void;
  selection(): void;
}

const NOOP: Haptics = { available: false, impact() {}, notify() {}, selection() {} };

export function useHaptics(): Haptics {
  return NOOP;
}
