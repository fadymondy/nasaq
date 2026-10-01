import type { ReactNode } from "react";
import { Pressable, type StyleProp, View, type ViewStyle } from "react-native";
import { useHaptics } from "./haptics";
import { useNasaq } from "./provider";
import { Text } from "./text";
import { TOUCH_MIN } from "./theme";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  /** Accessible name of the group (language, appearance, filter). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Pick one of a few options (language, appearance, role preview, filters). Segments share the width. */
export function SegmentedControl<T extends string>({ value, onChange, options, accessibilityLabel, style }: SegmentedControlProps<T>) {
  const nq = useNasaq();
  const haptics = useHaptics();
  const c = nq.colors;
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[{ flexDirection: "row", padding: 3, gap: 2, borderRadius: nq.radius.control + 3, backgroundColor: c.surfaceSoft }, style]}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active, disabled: !!o.disabled }}
            disabled={o.disabled}
            onPress={() => {
              if (active) return;
              haptics.selection();
              onChange(o.value);
            }}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: nq.space[1],
              minHeight: TOUCH_MIN - 6,
              paddingHorizontal: nq.space[2],
              borderRadius: nq.radius.control,
              backgroundColor: active ? c.surfaceRaised : "transparent",
              borderWidth: 1,
              borderColor: active ? c.line : "transparent",
              opacity: o.disabled ? 0.5 : 1,
            }}
          >
            {o.icon}
            <Text variant="label" tone={active ? "default" : "muted"} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
