import { useRef, useState } from "react";
import { Pressable, type StyleProp, TextInput, View, type ViewStyle } from "react-native";
import { pinFocusIndex, sanitizePin } from "./logic";
import { useNasaq } from "./provider";
import { Text } from "./text";

export interface PinInputProps {
  value: string;
  /** Required unless `readOnly`. */
  onChange?: (value: string) => void;
  /** Number of digits. Default 4. */
  length?: number;
  error?: string | null;
  /** Called once when the last digit is entered. */
  onComplete?: (value: string) => void;
  /** Show dots instead of digits. Default false (a delivery PIN is read aloud by the customer). */
  secure?: boolean;
  /** Read-only display, for showing a PIN to the customer. */
  readOnly?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A numeric PIN as separate boxes over one hidden field, so paste, autofill (one-time codes) and the keyboard's
 * own editing all work. Boxes advance as you type. Digits and boxes run left to right in every language, as a
 * PIN is read: the row is forced to LTR.
 */
export function PinInput({ value, onChange, length = 4, error, onComplete, secure, readOnly, autoFocus, accessibilityLabel, style }: PinInputProps) {
  const nq = useNasaq();
  const c = nq.colors;
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const active = pinFocusIndex(value, length);
  const label = accessibilityLabel ?? (nq.script === "arabic" ? "رمز التحقق" : "PIN");
  return (
    <View style={[{ gap: nq.space[1], alignItems: "stretch" }, style]}>
      <Pressable accessible={false} onPress={() => ref.current?.focus()} disabled={readOnly}>
        <View accessible={!!readOnly} accessibilityLabel={readOnly ? `${label}: ${value.split("").join(" ")}` : undefined} style={{ flexDirection: "row", direction: "ltr", gap: nq.space[2], justifyContent: "center" }}>
          {Array.from({ length }, (_, i) => {
            const ch = value[i];
            const isActive = !readOnly && focused && i === active;
            return (
              <View
                key={i}
                style={{
                  width: 52,
                  minHeight: 56,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: nq.radius.control,
                  borderWidth: isActive ? 2 : 1,
                  borderColor: error ? c.danger : isActive ? c.focus : c.line,
                  backgroundColor: readOnly ? c.surfaceSoft : c.surface,
                }}
              >
                <Text variant="h2" script="latin" style={{ textAlign: "center", fontVariant: ["tabular-nums"] }}>
                  {ch ? (secure ? "•" : ch) : ""}
                </Text>
              </View>
            );
          })}
        </View>
      </Pressable>
      {readOnly ? null : (
        <TextInput
          ref={ref}
          value={value}
          autoFocus={autoFocus}
          keyboardType="number-pad"
          inputMode="numeric"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={length}
          caretHidden
          accessibilityLabel={label}
          accessibilityHint={error ?? undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={(text) => {
            const next = sanitizePin(text, length);
            onChange?.(next);
            if (next.length === length && value.length < length) onComplete?.(next);
          }}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
        />
      )}
      {error ? (
        <Text variant="caption" tone="danger" style={{ textAlign: "center", writingDirection: nq.isRtl ? "rtl" : "ltr" }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
