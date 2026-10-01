import type { ReactNode } from "react";
import { Pressable, type StyleProp, View, type ViewProps, type ViewStyle } from "react-native";
import { useHaptics } from "./haptics";
import { useNasaq } from "./provider";
import { Text } from "./text";
import { toneColors } from "./tone";

export interface CardProps extends Omit<ViewProps, "children"> {
  children?: ReactNode;
  /** A coloured start edge and tinted ground. Default is the plain raised surface. */
  tone?: "default" | "success" | "warning" | "danger";
  /** Inner padding (the density's card padding). Default true; turn off for edge-to-edge media or lists. */
  padded?: boolean;
  /** Makes the whole card a button. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** A raised surface. With `onPress` it is one pressable (min 44pt) with a light haptic. */
export function Card({ children, tone = "default", padded = true, onPress, accessibilityLabel, style, ...props }: CardProps) {
  const nq = useNasaq();
  const haptics = useHaptics();
  const t = tone === "default" ? null : toneColors(nq.colors, tone);
  const box: ViewStyle = {
    backgroundColor: t ? t.soft : nq.colors.surfaceRaised,
    borderColor: t ? t.border : nq.colors.line,
    borderWidth: 1,
    borderRadius: nq.radius.card,
    padding: padded ? nq.space[4] : 0,
    gap: nq.space[3],
    overflow: "hidden",
  };
  if (!onPress) return <View style={[box, style]} accessibilityLabel={accessibilityLabel} {...props}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.impact("light");
        onPress();
      }}
      style={({ pressed }) => [box, { minHeight: 44, opacity: pressed ? 0.85 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

export interface CardHeaderProps {
  title?: string;
  description?: string;
  /** Sits at the end of the row (a badge, a button). */
  action?: ReactNode;
  children?: ReactNode;
}

export function CardHeader({ title, description, action, children }: CardHeaderProps) {
  const nq = useNasaq();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: nq.space[3] }}>
      <View style={{ flex: 1, gap: nq.space[1] }}>
        {title ? <Text variant="h3" accessibilityRole="header">{title}</Text> : null}
        {description ? <Text variant="body-sm" tone="muted">{description}</Text> : null}
        {children}
      </View>
      {action}
    </View>
  );
}

export function CardContent({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const nq = useNasaq();
  return <View style={[{ gap: nq.space[2] }, style]}>{children}</View>;
}

/** Actions row at the foot of a card; children share the width. */
export function CardFooter({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const nq = useNasaq();
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: nq.space[2] }, style]}>{children}</View>;
}
