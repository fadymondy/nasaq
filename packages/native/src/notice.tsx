import type { ReactNode } from "react";
import { Pressable, type StyleProp, View, type ViewStyle } from "react-native";
import { Icon } from "./icons";
import type { Tone } from "./logic";
import { useNasaq } from "./provider";
import { Text } from "./text";
import { toneColors } from "./tone";

export interface NoticeProps {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  /** Shows a close control. */
  onDismiss?: () => void;
  /** Accessible name of the close control. Defaults by script. */
  dismissLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** An inline message: auth errors, mutation errors, "reset link sent". Errors are announced as alerts. */
export function Notice({ tone = "info", title, children, onDismiss, dismissLabel, style }: NoticeProps) {
  const nq = useNasaq();
  const t = toneColors(nq.colors, tone);
  const label = dismissLabel ?? (nq.script === "arabic" ? "إغلاق" : "Dismiss");
  return (
    <View
      accessibilityRole={tone === "danger" ? "alert" : undefined}
      accessibilityLiveRegion={tone === "danger" || tone === "warning" ? "assertive" : "polite"}
      style={[
        {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: nq.space[3],
          padding: nq.space[3],
          borderRadius: nq.radius.control,
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: t.soft,
        },
        style,
      ]}
    >
      {tone === "danger" || tone === "warning" ? <Icon name="alert" size={20} color={t.text} /> : null}
      <View style={{ flex: 1, gap: nq.space[1] }}>
        {title ? <Text variant="label" style={{ color: t.text }}>{title}</Text> : null}
        {typeof children === "string" ? <Text variant="body-sm" style={{ color: t.text }}>{children}</Text> : children}
      </View>
      {onDismiss ? (
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onDismiss} hitSlop={12} style={{ minWidth: 24, minHeight: 24, alignItems: "center", justifyContent: "center" }}>
          <Icon name="close" size={18} color={t.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

export { Notice as Alert };
export type { NoticeProps as AlertProps };
