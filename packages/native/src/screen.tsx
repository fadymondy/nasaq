import type { ReactNode } from "react";
import { ScrollView, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { useNasaq } from "./provider";

export interface ScreenProps {
  children: ReactNode;
  /** Wrap the content in a ScrollView. */
  scroll?: boolean;
  /** Safe-area insets (react-native-safe-area-context `useSafeAreaInsets()`), added to the page padding. */
  insets?: { top?: number; bottom?: number; left?: number; right?: number };
  /** Drop the page padding (full-bleed lists, maps). */
  bleed?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A page: the ground colour, the density's page padding and the safe-area insets. */
export function Screen({ children, scroll = false, insets = {}, bleed = false, style }: ScreenProps) {
  const nq = useNasaq();
  const pad = bleed ? 0 : nq.size["page-pad"];
  const box: ViewStyle = {
    paddingTop: pad + (insets.top ?? 0),
    paddingBottom: pad + (insets.bottom ?? 0),
    paddingLeft: pad + (insets.left ?? 0),
    paddingRight: pad + (insets.right ?? 0),
    gap: nq.space[4],
  };
  const ground = { backgroundColor: nq.colors.bg };
  return scroll ? (
    <ScrollView style={[styles.fill, ground]} contentContainerStyle={[box, style]}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, ground, box, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
