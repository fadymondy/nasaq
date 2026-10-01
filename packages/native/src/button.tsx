import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, View } from "react-native";
import { useHaptics } from "./haptics";
import { useNasaq } from "./provider";
import { Text } from "./text";
import { TOUCH_MIN } from "./theme";
import { toneColors } from "./tone";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  children: ReactNode;
  variant?: ButtonVariant;
  /** sm draws a shorter button and extends its hit area to the 44pt minimum; lg is 52pt for the main action of a screen. */
  size?: "md" | "sm" | "lg";
  /** Shows a spinner and blocks presses. */
  loading?: boolean;
  /** Leading icon; the row follows the layout direction. */
  icon?: ReactNode;
  /** Haptic on press when expo-haptics is installed. `true` (default) is a light impact; "success" is the success notification (accept, delivered, collect cash); false is silent. */
  haptic?: boolean | "impact" | "success";
  /** Stretch to the full width of the parent. */
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  icon,
  haptic = true,
  fullWidth = false,
  onPress,
  style,
  ...props
}: ButtonProps) {
  const nq = useNasaq();
  const haptics = useHaptics();
  const c = nq.colors;
  const success = toneColors(c, "success");
  const { fill, fg, border } = {
    primary: { fill: c.action, fg: c.onAction, border: c.action },
    secondary: { fill: c.surfaceRaised, fg: c.fg, border: c.line },
    ghost: { fill: "transparent", fg: c.fg, border: "transparent" },
    danger: { fill: c.dangerSolid, fg: c.onDanger, border: c.dangerSolid },
    success: { fill: success.solid, fg: success.onSolid, border: success.solid },
  }[variant];
  const height = size === "sm" ? nq.size["control-sm"] : size === "lg" ? Math.max(nq.size.control + 12, 52) : Math.max(nq.size.control, TOUCH_MIN);
  const slop = Math.max(0, Math.ceil((TOUCH_MIN - height) / 2));
  const inactive = !!disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      hitSlop={slop ? { top: slop, bottom: slop } : undefined}
      onPress={(e) => {
        if (haptic === "success") haptics.notify("success");
        else if (haptic) haptics.impact("light");
        onPress?.(e);
      }}
      style={(state) => [
        styles.base,
        {
          minHeight: height,
          paddingHorizontal: size === "sm" ? nq.space[3] : nq.size["control-pad"],
          alignSelf: fullWidth ? "stretch" : undefined,
          borderRadius: nq.radius.control,
          backgroundColor: fill,
          borderColor: border,
          opacity: disabled ? 0.5 : state.pressed ? 0.8 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <View>{icon}</View> : null}
      <Text variant="label" style={{ color: fg }} numberOfLines={1}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1 },
});
