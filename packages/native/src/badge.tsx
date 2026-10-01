import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import type { Tone } from "./logic";
import { useNasaq } from "./provider";
import { Text } from "./text";
import { toneColors } from "./tone";

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  /** soft = tinted fill (default); outline = line only. */
  variant?: "soft" | "outline";
  /** Leading glyph. State is never colour-only: pair the tone with a word or an icon. */
  icon?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** A small status label: driver status, order status, countdown, "default" address. */
export function Badge({ children, tone = "neutral", variant = "soft", icon, accessibilityLabel, style }: BadgeProps) {
  const nq = useNasaq();
  const t = toneColors(nq.colors, tone);
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: nq.space[1],
          paddingHorizontal: nq.space[2],
          paddingVertical: 2,
          borderRadius: nq.radius.control,
          borderWidth: 1,
          borderColor: variant === "outline" ? t.border : "transparent",
          backgroundColor: variant === "outline" ? "transparent" : t.soft,
        },
        style,
      ]}
    >
      {icon}
      <Text variant="caption" style={{ color: t.text, fontWeight: "500" }}>
        {children}
      </Text>
    </View>
  );
}
