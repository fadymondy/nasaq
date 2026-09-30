import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { useNasaq } from "./provider";
import { MAX_FONT_SCALE, type Script, textMetrics, type TextVariant } from "./theme";

export type TextTone = "default" | "body" | "muted" | "accent" | "success" | "warning" | "danger" | "info";

export interface TextProps extends RNTextProps {
  /** Type role. Sizes and line heights differ per script: Arabic runs larger and looser. */
  variant?: TextVariant;
  tone?: TextTone;
  /** Defaults to the locale's script. Set it for a string in the other script. */
  script?: Script;
}

const HEADINGS = new Set<TextVariant>(["display", "h1", "h2", "h3"]);

export function Text({ variant = "body", tone, script, style, maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }: TextProps) {
  const nq = useNasaq();
  const s = script ?? nq.script;
  const c = nq.colors;
  const color = {
    default: c.fg,
    body: c.fgBody,
    muted: c.fgMuted,
    accent: c.accentText,
    success: c.successText,
    warning: c.warningText,
    danger: c.dangerText,
    info: c.infoText,
  }[tone ?? (HEADINGS.has(variant) || variant === "label" ? "default" : "body")];
  const fontFamily = variant === "code" ? nq.fonts.mono : s === "arabic" ? nq.fonts.arabic : nq.fonts.latin;
  // Latin eyebrows are tracked uppercase; Arabic has no case and is never tracked.
  const upper = variant === "eyebrow" && s === "latin";

  return (
    <RNText
      accessibilityRole={HEADINGS.has(variant) ? "header" : undefined}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        textMetrics(variant, s),
        { color, textAlign: "auto" },
        fontFamily ? { fontFamily } : null,
        upper ? { textTransform: "uppercase" } : null,
        style,
      ]}
      {...props}
    />
  );
}
