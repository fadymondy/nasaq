import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, View, type ViewStyle } from "react-native";
import { useHaptics } from "./haptics";
import { Icon, type IconName } from "./icons";
import { badgeCountLabel } from "./logic";
import { useNasaq } from "./provider";
import { Text } from "./text";
import { TOUCH_MIN } from "./theme";

export interface IconButtonProps extends Omit<PressableProps, "children" | "style"> {
  /** Required: an icon-only control has no visible name. */
  accessibilityLabel: string;
  /** A glyph the kit draws (`bell`, `close`, ...). Pass `children` for your own icon. */
  icon?: IconName;
  /** Your own icon node (lucide, an SVG). Takes the place of `icon`. */
  children?: ReactNode;
  /** A count badge at the end-top corner (unread notifications). Hidden at 0. */
  count?: number;
  /** Counts above this show as "99+". Default 99. */
  maxCount?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A 44pt icon-only button with an optional count badge, e.g. the notification bell in `AppHeader trailing`.
 * The badge sits at the end-top corner, so it follows the layout direction, and the count joins the spoken label.
 */
export function IconButton({ accessibilityLabel, icon = "bell", children, count = 0, maxCount = 99, size = 22, onPress, disabled, style, ...props }: IconButtonProps) {
  const nq = useNasaq();
  const haptics = useHaptics();
  const c = nq.colors;
  const ar = nq.script === "arabic";
  const text = badgeCountLabel(count, maxCount, ar);
  const spoken = text ? `${accessibilityLabel}, ${ar ? `${text} غير مقروء` : `${text} unread`}` : accessibilityLabel;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      disabled={disabled}
      hitSlop={4}
      onPress={(e) => {
        haptics.impact();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        { minWidth: TOUCH_MIN, minHeight: TOUCH_MIN, alignItems: "center", justifyContent: "center", borderRadius: nq.radius.control, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
        style as ViewStyle,
      ]}
      {...props}
    >
      {children ?? <Icon name={icon} size={size} color={c.fg} />}
      {text ? (
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          style={{ position: "absolute", top: 4, end: 4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: c.dangerSolid }}
        >
          <Text variant="caption" style={{ color: c.onDanger, fontSize: 11, lineHeight: 14, fontWeight: "500", fontVariant: ["tabular-nums"] }}>
            {text}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
