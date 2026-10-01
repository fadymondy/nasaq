import { Pressable, type StyleProp, View, type ViewStyle } from "react-native";
import { useHaptics } from "./haptics";
import { useNasaq } from "./provider";
import { Text } from "./text";

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Visible label at the start; also the accessible name. */
  label?: string;
  description?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const TRACK_W = 48;
const TRACK_H = 28;
const KNOB = 22;

/** A labelled toggle. The knob slides to the end edge, so it follows RTL without a manual flip. */
export function Switch({ value, onValueChange, label, description, disabled, accessibilityLabel, style }: SwitchProps) {
  const nq = useNasaq();
  const haptics = useHaptics();
  const c = nq.colors;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        haptics.selection();
        onValueChange(!value);
      }}
      style={[{ flexDirection: "row", alignItems: "center", gap: nq.space[3], minHeight: 44, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {label || description ? (
        <View style={{ flex: 1, gap: 2 }}>
          {label ? <Text variant="label">{label}</Text> : null}
          {description ? <Text variant="caption" tone="muted">{description}</Text> : null}
        </View>
      ) : null}
      <View
        style={{
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: TRACK_H / 2,
          backgroundColor: value ? c.action : c.surfaceSoft,
          borderWidth: 1,
          borderColor: value ? c.action : c.lineStrong,
          justifyContent: "center",
          alignItems: value ? "flex-end" : "flex-start",
          paddingHorizontal: 2,
        }}
      >
        <View style={{ width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: value ? c.onAction : c.fgMuted, shadowColor: c.fg, shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }} />
      </View>
    </Pressable>
  );
}
