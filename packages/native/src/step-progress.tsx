import { type StyleProp, View, type ViewStyle } from "react-native";
import { Icon } from "./icons";
import { stepState } from "./logic";
import { useNasaq } from "./provider";
import { Text } from "./text";

export interface StepProgressProps {
  /** Step labels in order (pickup, delivery, cash). */
  steps: readonly string[];
  /** Index of the current step. Pass steps.length when everything is done. */
  current: number;
  style?: StyleProp<ViewStyle>;
}

const DOT = 24;

/** Where a multi-step job stands. Steps run from the start edge to the end edge, so RTL reads right to left. */
export function StepProgress({ steps, current, style }: StepProgressProps) {
  const nq = useNasaq();
  const c = nq.colors;
  const ar = nq.script === "arabic";
  const total = steps.length;
  const now = Math.min(Math.max(current, 0), total);
  const summary = now >= total ? (ar ? "اكتملت جميع الخطوات" : "All steps done") : ar ? `الخطوة ${now + 1} من ${total}: ${steps[now]}` : `Step ${now + 1} of ${total}: ${steps[now]}`;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={summary} accessibilityValue={{ min: 0, max: total, now }} style={[{ flexDirection: "row" }, style]}>
      {steps.map((label, i) => {
        const state = stepState(i, now);
        const filled = state !== "upcoming";
        return (
          <View key={`${i}-${label}`} style={{ flex: 1, alignItems: "center", gap: nq.space[1] }}>
            <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "stretch" }}>
              <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? "transparent" : filled ? c.action : c.line }} />
              <View
                style={{
                  width: DOT,
                  height: DOT,
                  borderRadius: DOT / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: filled ? c.action : c.lineStrong,
                  backgroundColor: state === "done" ? c.action : c.surface,
                }}
              >
                {state === "done" ? <Icon name="check" size={14} color={c.onAction} strokeWidth={3} /> : <Text variant="caption" tone={state === "current" ? "default" : "muted"} style={{ fontWeight: "500" }}>{String(i + 1)}</Text>}
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: i === total - 1 ? "transparent" : state === "done" ? c.action : c.line }} />
            </View>
            <Text variant="caption" tone={state === "current" ? "default" : "muted"} style={{ textAlign: "center", fontWeight: state === "current" ? "500" : "400" }} numberOfLines={2}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
