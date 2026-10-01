import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./icons";
import { useNasaq } from "./provider";
import { Text } from "./text";

export interface EmptyStateProps {
  /** A node, or the name of one of the kit's glyphs. Defaults to an inbox. */
  icon?: ReactNode | IconName;
  title: string;
  description?: string;
  /** Usually a Button. */
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const NAMES = new Set<string>(["chevron-right", "chevron-down", "close", "check", "eye", "eye-off", "navigate", "alert", "inbox", "clock"]);

/** Orders, offers, notifications, balance: what to show when there is nothing yet, and what to do about it. */
export function EmptyState({ icon = "inbox", title, description, action, style }: EmptyStateProps) {
  const nq = useNasaq();
  const glyph = typeof icon === "string" && NAMES.has(icon) ? <Icon name={icon as IconName} size={28} color={nq.colors.fgMuted} /> : icon;
  return (
    <View accessible accessibilityRole="summary" style={[{ alignItems: "center", gap: nq.space[3], padding: nq.space[6] }, style]}>
      <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: nq.colors.surfaceSoft }}>{glyph}</View>
      <Text variant="h3" style={{ textAlign: "center" }}>
        {title}
      </Text>
      {description ? (
        <Text variant="body-sm" tone="muted" style={{ textAlign: "center", maxWidth: 320 }}>
          {description}
        </Text>
      ) : null}
      {action}
    </View>
  );
}
