import { useEffect, useState } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { Button } from "./button";
import { Card } from "./card";
import { Input } from "./input";
import { cashBreakdown, formatAmountInput, parseAmountMinor } from "./logic";
import { MoneyText } from "./money-text";
import { useNasaq } from "./provider";
import { Text } from "./text";

export interface CashLine {
  label: string;
  /** Integer minor units. */
  cents: number;
}

export interface CashCollectProps {
  /** What the courier must collect, minor units. */
  amountDue: number;
  /** Lines that make up the amount (order total, delivery fee, prepaid as a negative). */
  breakdown?: readonly CashLine[];
  /** Cash received so far, minor units, or null when nothing is entered. Controlled. */
  value: number | null;
  onChange: (cents: number | null) => void;
  onConfirm: () => void;
  currency?: string;
  /** Blocks confirm and spins it while the request is in flight. */
  loading?: boolean;
  /** Allow confirming less than the amount due (partial collection). Default false. */
  allowShort?: boolean;
  labels?: {
    due?: string;
    received?: string;
    exact?: string;
    confirm?: string;
    change?: string;
    shortBy?: string;
  };
  style?: StyleProp<ViewStyle>;
}

const EN = { due: "Amount due", received: "Cash received", exact: "Exact amount", confirm: "Confirm cash collected", change: "Change to return", shortBy: "Still owed" };
const AR = { due: "المبلغ المستحق", received: "المبلغ المستلم", exact: "المبلغ كاملًا", confirm: "تأكيد استلام النقد", change: "الباقي للعميل", shortBy: "المتبقي" };

/**
 * Cash on delivery: the amount due, how it adds up, a field for what was handed over, and the change or the
 * shortfall. The maths is the web CashCollect's `cashBreakdown`, so both surfaces agree to the minor unit.
 */
export function CashCollect({ amountDue, breakdown, value, onChange, onConfirm, currency = "ILS", loading, allowShort = false, labels, style }: CashCollectProps) {
  const nq = useNasaq();
  const t = { ...(nq.script === "arabic" ? AR : EN), ...labels };
  const result = cashBreakdown({ orderTotal: amountDue, deliveryFee: 0, collected: value });
  const [text, setText] = useState(formatAmountInput(value, currency));
  // Follow the value when the parent changes it (the exact-amount shortcut, a reset), not while typing.
  useEffect(() => {
    if (parseAmountMinor(text, currency) !== value) setText(formatAmountInput(value, currency));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, currency]);
  const canConfirm = result.state === "exact" || result.state === "over" || (allowShort && result.state === "short");

  return (
    <Card style={style}>
      <View style={{ gap: nq.space[1] }}>
        <Text variant="label" tone="muted">
          {t.due}
        </Text>
        <MoneyText cents={result.due} currency={currency} variant="display" />
      </View>
      {breakdown?.length ? (
        <View style={{ gap: nq.space[1] }}>
          {breakdown.map((l) => (
            <View key={l.label} style={{ flexDirection: "row", justifyContent: "space-between", gap: nq.space[3] }}>
              <Text variant="body-sm" tone="muted" style={{ flex: 1 }}>
                {l.label}
              </Text>
              <MoneyText cents={l.cents} currency={currency} variant="body-sm" />
            </View>
          ))}
        </View>
      ) : null}
      <Input
        label={t.received}
        value={text}
        keyboardType="decimal-pad"
        inputMode="decimal"
        onChangeText={(next) => {
          setText(next);
          onChange(parseAmountMinor(next, currency));
        }}
        trailing={
          <Text variant="label" tone="muted" script="latin">
            {currency}
          </Text>
        }
      />
      <Button
        variant="secondary"
        onPress={() => {
          setText(formatAmountInput(result.due, currency));
          onChange(result.due);
        }}
      >
        {t.exact}
      </Button>
      {result.state === "over" ? (
        <View accessible accessibilityLiveRegion="polite" style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="label" tone="warning">
            {t.change}
          </Text>
          <MoneyText cents={result.change} currency={currency} variant="label" tone="warning" />
        </View>
      ) : result.state === "short" ? (
        <View accessible accessibilityLiveRegion="polite" style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="label" tone="danger">
            {t.shortBy}
          </Text>
          <MoneyText cents={result.shortBy} currency={currency} variant="label" tone="danger" />
        </View>
      ) : null}
      <Button variant="success" size="lg" fullWidth haptic="success" loading={loading} disabled={!canConfirm} onPress={onConfirm}>
        {t.confirm}
      </Button>
    </Card>
  );
}
