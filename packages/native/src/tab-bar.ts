import type { NasaqColors } from "./theme";
import { useNasaq } from "./provider";
import { TOUCH_MIN } from "./theme";

/**
 * Tab-bar styling as plain data, shaped for expo-router / React Navigation bottom tabs
 * (`<Tabs screenOptions={...} />`). Nasaq does not import the router: spread the result.
 */
export interface NasaqTabBarOptions {
  headerShown: false;
  tabBarActiveTintColor: string;
  tabBarInactiveTintColor: string;
  tabBarStyle: { backgroundColor: string; borderTopColor: string; borderTopWidth: number; minHeight: number };
  tabBarLabelStyle: { fontSize: number; fontWeight: "500"; fontFamily?: string };
  tabBarItemStyle: { minHeight: number };
}

export function tabBarOptions(colors: NasaqColors, fontFamily?: string): NasaqTabBarOptions {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.action,
    tabBarInactiveTintColor: colors.fgMuted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: 1, minHeight: 56 },
    tabBarLabelStyle: { fontSize: 11, fontWeight: "500", ...(fontFamily ? { fontFamily } : {}) },
    tabBarItemStyle: { minHeight: TOUCH_MIN },
  };
}

/** `screenOptions` for expo-router Tabs: active/inactive tint, surface and hairline from the current theme and font. */
export function useTabBarOptions(): NasaqTabBarOptions {
  const nq = useNasaq();
  return tabBarOptions(nq.colors, nq.script === "arabic" ? nq.fonts.arabic : nq.fonts.latin);
}

/** "light" over a dark ground, "dark" over a light one: the value for expo-status-bar's `style`. */
export function useNasaqStatusBarStyle(): "light" | "dark" {
  return useNasaq().scheme === "dark" ? "light" : "dark";
}
