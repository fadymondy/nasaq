import { useEffect, useRef } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card } from "./card";
import { useHaptics } from "./haptics";
import { clockLabel, countdownTone, deliveryDistance, deliveryDuration } from "./logic";
import { MoneyText } from "./money-text";
import { useNasaq } from "./provider";
import { Text } from "./text";
import { toneColors } from "./tone";

export interface OfferCountdownProps {
  /** Whole seconds left. Drive it from the offer's expiry time so it survives a re-render. */
  seconds: number;
  /** The offer's full window in seconds. */
  total: number;
  /** Called once when `seconds` reaches 0. */
  onExpire?: () => void;
  /** ring (default) shows the seconds inside a circle; bar is a thin progress line with the time beside it. */
  variant?: "ring" | "bar";
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Offer time left. Primary, then warning in the last quarter, danger at 10 seconds or fewer. Read out as a timer. */
export function OfferCountdown({ seconds, total, onExpire, variant = "ring", size = 56, style }: OfferCountdownProps) {
  const nq = useNasaq();
  const tone = countdownTone(seconds, total);
  const color = tone === "danger" ? toneColors(nq.colors, "danger").text : tone === "warning" ? toneColors(nq.colors, "warning").text : nq.colors.action;
  const fraction = total > 0 ? Math.min(1, Math.max(0, seconds / total)) : 0;
  const fired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  useEffect(() => {
    if (seconds > 0) fired.current = false;
    else if (!fired.current) {
      fired.current = true;
      onExpireRef.current?.();
    }
  }, [seconds]);
  const ar = nq.script === "arabic";
  const label = ar ? `${Math.max(0, Math.ceil(seconds))} ثانية متبقية` : `${Math.max(0, Math.ceil(seconds))} seconds left`;

  if (variant === "bar") {
    return (
      <View accessible accessibilityRole="timer" accessibilityLabel={label} style={[{ flexDirection: "row", alignItems: "center", gap: nq.space[2] }, style]}>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: nq.colors.surfaceSoft, overflow: "hidden", alignItems: "flex-start" }}>
          <View style={{ width: `${fraction * 100}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
        </View>
        <Text variant="label" style={{ color, fontVariant: ["tabular-nums"] }}>
          {clockLabel(seconds)}
        </Text>
      </View>
    );
  }
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View accessible accessibilityRole="timer" accessibilityLabel={label} style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={nq.colors.surfaceSoft} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference * fraction} ${circumference}`}
        />
      </Svg>
      <Text variant="label" style={{ color, fontVariant: ["tabular-nums"], textAlign: "center" }}>
        {Math.max(0, Math.ceil(seconds))}
      </Text>
    </View>
  );
}

export interface OfferCardProps {
  pickup: string;
  dropoff: string;
  zone?: string;
  /** Delivery fee the courier earns, integer minor units. */
  feeCents: number;
  currency?: string;
  distanceMeters?: number;
  etaSeconds?: number;
  seconds: number;
  total: number;
  onExpire?: () => void;
  onAccept: () => void;
  onDecline: () => void;
  /** Blocks both buttons and spins the accept button while the answer is in flight. */
  loading?: boolean;
  labels?: { pickup?: string; dropoff?: string; accept?: string; decline?: string; title?: string };
  style?: StyleProp<ViewStyle>;
}

const EN = { pickup: "Pickup", dropoff: "Drop-off", accept: "Accept", decline: "Decline", title: "New delivery offer" };
const AR = { pickup: "الاستلام", dropoff: "التسليم", accept: "قبول", decline: "رفض", title: "عرض توصيل جديد" };

/** An incoming dispatch offer: route, zone, fee, distance and time, the countdown, and accept / decline. */
export function OfferCard({
  pickup,
  dropoff,
  zone,
  feeCents,
  currency,
  distanceMeters,
  etaSeconds,
  seconds,
  total,
  onExpire,
  onAccept,
  onDecline,
  loading,
  labels,
  style,
}: OfferCardProps) {
  const nq = useNasaq();
  const haptics = useHaptics();
  const t = { ...(nq.script === "arabic" ? AR : EN), ...labels };
  const expired = seconds <= 0;
  return (
    <Card style={style} accessibilityLabel={t.title}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: nq.space[3] }}>
        <View style={{ flex: 1, gap: nq.space[1] }}>
          <Text variant="label" tone="muted">
            {t.title}
          </Text>
          <MoneyText cents={feeCents} currency={currency} variant="h2" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: nq.space[1] }}>
            {zone ? <Badge tone="info">{zone}</Badge> : null}
            {distanceMeters != null ? <Badge>{deliveryDistance(distanceMeters, nq.locale)}</Badge> : null}
            {etaSeconds != null ? <Badge>{deliveryDuration(etaSeconds, nq.locale)}</Badge> : null}
          </View>
        </View>
        <OfferCountdown seconds={seconds} total={total} onExpire={onExpire} />
      </View>
      <View style={{ gap: nq.space[2] }}>
        <View style={{ gap: 2 }}>
          <Text variant="caption" tone="muted">
            {t.pickup}
          </Text>
          <Text variant="body">{pickup}</Text>
        </View>
        <View style={{ gap: 2 }}>
          <Text variant="caption" tone="muted">
            {t.dropoff}
          </Text>
          <Text variant="body">{dropoff}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: nq.space[2] }}>
        <Button variant="secondary" size="lg" style={{ flex: 1 }} disabled={loading || expired} onPress={onDecline}>
          {t.decline}
        </Button>
        <Button
          variant="success"
          size="lg"
          style={{ flex: 1 }}
          haptic={false}
          loading={loading}
          disabled={expired}
          onPress={() => {
            haptics.notify("success");
            onAccept();
          }}
        >
          {t.accept}
        </Button>
      </View>
    </Card>
  );
}
