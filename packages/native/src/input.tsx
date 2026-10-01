import { type ReactNode, type Ref, useState } from "react";
import { Pressable, TextInput, type TextInputProps, View } from "react-native";
import { Icon } from "./icons";
import { useNasaq } from "./provider";
import { Text } from "./text";
import { TOUCH_MIN } from "./theme";

export interface InputProps extends Omit<TextInputProps, "placeholderTextColor"> {
  label?: string;
  /** Error text; also turns the border to danger and is read out with the field. */
  error?: string | null;
  hint?: string;
  /** Node at the start edge inside the field (an icon, a country code). */
  leading?: ReactNode;
  /** Node at the end edge inside the field (a unit, a button). */
  trailing?: ReactNode;
  /** With `secureTextEntry`, adds the show/hide control. Default true. */
  secureToggle?: boolean;
  showLabel?: string;
  hideLabel?: string;
  ref?: Ref<TextInput>;
}

/**
 * A labelled text field. Text, caret and placeholder follow the layout direction (`writingDirection` plus
 * start/end alignment), so a hot language switch aligns correctly. At least 44pt tall; multiline grows.
 */
export function Input({
  label,
  error,
  hint,
  leading,
  trailing,
  secureTextEntry,
  secureToggle = true,
  showLabel,
  hideLabel,
  multiline,
  onFocus,
  onBlur,
  style,
  editable = true,
  ref,
  ...props
}: InputProps) {
  const nq = useNasaq();
  const c = nq.colors;
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const ar = nq.script === "arabic";
  const showText = showLabel ?? (ar ? "إظهار كلمة المرور" : "Show password");
  const hideText = hideLabel ?? (ar ? "إخفاء كلمة المرور" : "Hide password");
  const toggle = !!secureTextEntry && secureToggle;
  const minHeight = multiline ? 96 : Math.max(nq.size.control, TOUCH_MIN);
  const family = ar ? nq.fonts.arabic : nq.fonts.latin;

  return (
    <View style={{ gap: nq.space[1] }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          gap: nq.space[2],
          minHeight,
          borderRadius: nq.radius.control,
          borderWidth: focused ? 2 : 1,
          borderColor: error ? c.danger : focused ? c.focus : c.line,
          backgroundColor: editable ? c.surface : c.surfaceSoft,
          paddingHorizontal: nq.size["control-pad"],
        }}
      >
        {leading}
        <TextInput
          ref={ref}
          editable={editable}
          multiline={multiline}
          secureTextEntry={toggle ? !shown : secureTextEntry}
          placeholderTextColor={c.fgMuted}
          maxFontSizeMultiplier={1.4}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={error ?? hint}
          accessibilityState={{ disabled: !editable }}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              minHeight: multiline ? 88 : minHeight - 2,
              paddingVertical: multiline ? nq.space[3] : 0,
              color: c.fg,
              fontSize: 16,
              writingDirection: nq.direction,
              textAlign: nq.isRtl ? "right" : "left",
              textAlignVertical: multiline ? "top" : "center",
            },
            family ? { fontFamily: family } : null,
            style,
          ]}
          {...props}
        />
        {toggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown ? hideText : showText}
            onPress={() => setShown((v) => !v)}
            hitSlop={8}
            style={{ minWidth: 28, minHeight: 28, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name={shown ? "eye-off" : "eye"} size={20} color={c.fgMuted} />
          </Pressable>
        ) : null}
        {trailing}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
