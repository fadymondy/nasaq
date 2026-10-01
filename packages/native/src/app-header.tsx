import type { ReactNode } from "react";
import { Pressable, type StyleProp, View, type ViewStyle } from "react-native";
import { Icon } from "./icons";
import { useNasaq } from "./provider";
import { Text } from "./text";

export interface AppHeaderProps {
  title?: string;
  /** Your own logo (an Image, an SVG) at the start, instead of or beside the title. The kit draws no brand mark here. */
  logo?: ReactNode;
  /** Shows the back control at the start edge. */
  canGoBack?: boolean;
  onBack?: () => void;
  backLabel?: string;
  /** Node(s) at the end edge: a bell, a menu. */
  trailing?: ReactNode;
  /** Safe-area top inset (`useSafeAreaInsets().top`). */
  topInset?: number;
  /** Centre the title (default: at the start, next to the back control). */
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The nav bar for tab and stack screens. The back chevron points toward the start edge, so it points left in
 * LTR and right in RTL. Height follows the density's `header` token.
 */
export function AppHeader({ title, logo, canGoBack, onBack, backLabel, trailing, topInset = 0, centered, style }: AppHeaderProps) {
  const nq = useNasaq();
  const c = nq.colors;
  const label = backLabel ?? (nq.script === "arabic" ? "رجوع" : "Back");
  // chevron-right is drawn pointing to the end; mirror it in LTR so "back" points to the start.
  const back = { transform: [{ scaleX: nq.isRtl ? 1 : -1 }] };
  return (
    <View
      style={[
        {
          paddingTop: topInset,
          backgroundColor: c.surface,
          borderBottomWidth: 1,
          borderBottomColor: c.line,
        },
        style,
      ]}
    >
      <View style={{ minHeight: Math.max(nq.size.header, 48), flexDirection: "row", alignItems: "center", paddingHorizontal: nq.space[2], gap: nq.space[1] }}>
        {canGoBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onBack} hitSlop={4} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
            <View style={back}>
              <Icon name="chevron-right" size={24} color={c.fg} />
            </View>
          </Pressable>
        ) : (
          <View style={{ width: nq.space[2] }} />
        )}
        {logo}
        <Text variant="h3" numberOfLines={1} style={{ flex: 1, textAlign: centered ? "center" : nq.isRtl ? "right" : "left" }}>
          {title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", minWidth: centered ? 44 : undefined }}>{trailing}</View>
      </View>
    </View>
  );
}
