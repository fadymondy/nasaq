import { deliveryMoney, signTone, toArabicIndic } from "./logic";
import { useNasaq } from "./provider";
import { Text, type TextProps, type TextTone } from "./text";

export interface MoneyTextProps extends Omit<TextProps, "children" | "tone"> {
  /** Integer minor units (agorot, cents). Money is never a float. */
  cents: number;
  /** ISO 4217 code. Default ILS. */
  currency?: string;
  /** Colour by sign: positive success, negative danger, zero muted. Or a fixed tone. Default none (body colour). */
  tone?: "sign" | TextTone;
  /** Prefix a plus on positive amounts (a negative always shows its minus). */
  showPlus?: boolean;
  /** Arabic-Indic digits (٠١٢). Default follows the locale: Latin digits, as the web kit shows money. */
  arabicIndic?: boolean;
}

/** An amount in integer minor units with tabular numerals. The currency symbol stays isolated beside Arabic text. */
export function MoneyText({ cents, currency, tone, showPlus, arabicIndic, style, variant = "body", ...props }: MoneyTextProps) {
  const nq = useNasaq();
  let text = deliveryMoney(cents, currency, nq.locale);
  if (showPlus && cents > 0) text = `+${text}`;
  if (arabicIndic) text = toArabicIndic(text);
  const resolved: TextTone | undefined = tone === "sign" ? ({ success: "success", danger: "danger", neutral: "muted" } as const)[signTone(cents)] : tone;
  return (
    <Text variant={variant} tone={resolved} style={[{ fontVariant: ["tabular-nums"] }, style]} {...props}>
      {text}
    </Text>
  );
}
