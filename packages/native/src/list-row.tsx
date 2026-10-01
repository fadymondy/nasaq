import type { ReactNode } from "react";
import { Pressable, type StyleProp, View, type ViewStyle } from "react-native";
import { useHaptics } from "./haptics";
import { Icon } from "./icons";
import { useNasaq } from "./provider";
import { Text } from "./text";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Node at the start edge (an avatar, an icon, a status dot). */
  leading?: ReactNode;
  /** Node at the end edge (an amount, a badge). Sits before the chevron. */
  trailing?: ReactNode;
  /** Shows a forward chevron; it mirrors in RTL. Implied by `onPress` unless set to false. */
  chevron?: boolean;
  onPress?: () => void;
  /** Draws a hairline under the row. Use `Separator` between rows instead when rows are in a Card. */
  divider?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** A list row: balance, orders, notifications, cash ledger. Min height follows the density and is never under 44pt. */
export function ListRow({ title, subtitle, leading, trailing, chevron, onPress, divider, accessibilityLabel, style }: ListRowProps) {
  const nq = useNasaq();
  const haptics = useHaptics();
  const showChevron = chevron ?? !!onPress;
  const body = (
    <>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" tone="default" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body-sm" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron ? (
        <View style={nq.flip}>
          <Icon name="chevron-right" size={18} color={nq.colors.fgMuted} />
        </View>
      ) : null}
    </>
  );
  const box: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: nq.space[3],
    minHeight: Math.max(nq.size.row, 44),
    paddingVertical: nq.space[2],
    borderBottomWidth: divider ? 1 : 0,
    borderBottomColor: nq.colors.line,
  };
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel} style={[box, style]}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [box, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      {body}
    </Pressable>
  );
}

/** A hairline between rows. */
export function Separator({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const nq = useNasaq();
  return <View accessibilityElementsHidden style={[{ height: 1, marginStart: inset, backgroundColor: nq.colors.line }, style]} />;
}
