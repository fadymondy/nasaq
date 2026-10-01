import type { ReactNode } from "react";
import { Pressable, type StyleProp, View, type ViewStyle } from "react-native";
import { Badge } from "./badge";
import { Icon } from "./icons";
import { routeSummary, type StopKind, type StopStatus } from "./logic";
import { useNasaq } from "./provider";
import { Text } from "./text";

export interface RouteStop {
  id?: string;
  kind: StopKind;
  /** Who or what: the vendor or the customer. */
  label: string;
  address?: string;
  /** Shorthand for status "done". */
  done?: boolean;
  status?: StopStatus;
  /** Cash to collect here, minor units. Shown only for the summary maths; render it with `renderActions`. */
  cashMinor?: number;
}

export interface RouteStopsProps {
  stops: readonly RouteStop[];
  /** Shows a navigate control on the stop being driven to; receives that stop. */
  onNavigate?: (stop: RouteStop) => void;
  /** Extra content under a stop (buttons, notes). */
  renderActions?: (stop: RouteStop, state: { current: boolean }) => ReactNode;
  labels?: { pickup?: string; dropoff?: string; navigate?: string; done?: string; next?: string };
  style?: StyleProp<ViewStyle>;
}

const EN = { pickup: "Pickup", dropoff: "Drop-off", navigate: "Navigate", done: "Done", next: "Next" };
const AR = { pickup: "استلام", dropoff: "تسليم", navigate: "ابدأ التنقل", done: "تم", next: "التالي" };
const DOT = 28;

/**
 * A trip as a vertical list of stops joined by a connector on the start edge. The first pending stop is the
 * current one and carries the navigate action. Uses the same progress logic as the web RouteStops.
 */
export function RouteStops({ stops, onNavigate, renderActions, labels, style }: RouteStopsProps) {
  const nq = useNasaq();
  const c = nq.colors;
  const t = { ...(nq.script === "arabic" ? AR : EN), ...labels };
  const normalised = stops.map((s, i) => ({ ...s, id: s.id ?? String(i), status: (s.status ?? (s.done ? "done" : "pending")) as StopStatus }));
  const { currentId } = routeSummary(normalised);
  return (
    <View style={style}>
      {normalised.map((s, i) => {
        const current = s.id === currentId;
        const last = i === normalised.length - 1;
        const done = s.status === "done";
        const failed = s.status === "failed";
        const dot = done ? c.action : failed ? c.danger : current ? c.action : c.lineStrong;
        const kind = s.kind === "pickup" ? t.pickup : t.dropoff;
        return (
          <View key={s.id} accessible accessibilityLabel={`${kind}: ${s.label}${s.address ? `, ${s.address}` : ""}${done ? `, ${t.done}` : current ? `, ${t.next}` : ""}`} style={{ flexDirection: "row", gap: nq.space[3] }}>
            <View style={{ alignItems: "center", width: DOT }}>
              <View
                style={{
                  width: DOT,
                  height: DOT,
                  borderRadius: DOT / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: dot,
                  backgroundColor: done ? c.action : c.surface,
                }}
              >
                {done ? <Icon name="check" size={14} color={c.onAction} strokeWidth={3} /> : failed ? <Icon name="close" size={14} color={c.danger} strokeWidth={3} /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.kind === "pickup" ? dot : "transparent", borderWidth: 2, borderColor: dot }} />}
              </View>
              {last ? null : <View style={{ flex: 1, width: 2, minHeight: nq.space[4], backgroundColor: done ? c.action : c.line }} />}
            </View>
            <View style={{ flex: 1, gap: nq.space[1], paddingBottom: last ? 0 : nq.space[4] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: nq.space[2] }}>
                <Badge tone={s.kind === "pickup" ? "info" : "success"} variant="outline">
                  {kind}
                </Badge>
                {failed ? <Badge tone="danger">!</Badge> : null}
              </View>
              <Text variant="label">
                {s.label}
              </Text>
              {s.address ? (
                <Text variant="body-sm" tone="muted">
                  {s.address}
                </Text>
              ) : null}
              {current && onNavigate ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t.navigate}: ${s.label}`}
                  onPress={() => onNavigate(s)}
                  style={{ flexDirection: "row", alignItems: "center", gap: nq.space[1], alignSelf: "flex-start", minHeight: 44 }}
                >
                  <Icon name="navigate" size={16} color={c.accentText} />
                  <Text variant="label" tone="accent">
                    {t.navigate}
                  </Text>
                </Pressable>
              ) : null}
              {renderActions?.(s, { current })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
