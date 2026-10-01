"use client";

import { type ClipboardEvent, type ComponentProps, type KeyboardEvent, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "../input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import {
  clampMoney,
  convertMinorDecimals,
  type CurrencyDigits,
  type CurrencyOverflow,
  currencyDecimals,
  currencySymbol,
  editableMoneyText,
  formatMinor,
  moneyInRange,
  minorToPlain,
  parseMoney,
  sanitizeMoneyText,
  symbolSide,
} from "./currency-input-logic";
import { useCurrency } from "../../provider/nasaq-provider";

const STRINGS = {
  en: { currency: "Currency", outOfRange: "Amount out of range" },
  ar: { currency: "العملة", outOfRange: "المبلغ خارج النطاق" },
} as const;
export type CurrencyInputLabels = Partial<(typeof STRINGS)["en"]>;

export interface CurrencyInputProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "children"> {
  /** The amount in minor units (cents, halalas, fils): 1999 is 19.99 USD. `null` is empty. Controlled. */
  value?: number | null;
  defaultValue?: number | null;
  /** Called with the amount in minor units on every edit, and `null` when the field is emptied. */
  onValueChange?: (minor: number | null) => void;
  /** ISO 4217 code. It sets the decimals (JPY 0, USD 2, KWD 3). Default USD, or SAR in Arabic. */
  currency?: string;
  /** Show a currency picker with these codes. Needs `onCurrencyChange`. The amount keeps its value when decimals differ. */
  currencies?: readonly string[];
  onCurrencyChange?: (currency: string, minor: number | null) => void;
  /** Lowest and highest allowed amount, in minor units. Outside them the field is marked invalid. */
  min?: number;
  max?: number;
  /** Pull an out-of-range amount back to `min` or `max` when the field loses focus. Default false. */
  clampOnBlur?: boolean;
  allowNegative?: boolean;
  /** Digit set shown: "latn" (0-9, the Nasaq default) or "arab" (٠-٩). Either set is accepted when typing. */
  numberingSystem?: CurrencyDigits;
  /** Locale for separators and symbol placement. Default the Nasaq locale. */
  locale?: string;
  /** How a pasted amount with too many decimals is handled. Default "round". */
  overflow?: CurrencyOverflow;
  /** The symbol next to the figure: "symbol" ($), "code" (USD) or "none". Default "symbol". */
  symbol?: "symbol" | "code" | "none";
  /** Keep ".00" on whole amounts when the field is not focused. Default true. */
  fixedDecimals?: boolean;
  /** Arrow keys change the amount by this many minor units; Shift multiplies by 10. Default one major unit. */
  step?: number;
  /** Form field name: a hidden input carries the amount in minor units ("1999"), "" when empty. */
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  id?: string;
  required?: boolean;
  "aria-label"?: string;
  labels?: CurrencyInputLabels;
}

/**
 * A money field. The value is an integer in minor units, so nothing rounds twice; the currency sets the decimals;
 * digits typed or pasted in any set (1250.5, ١٢٥٠٫٥) give the same amount. The symbol sits where the locale puts
 * it. While focused the field shows the plain number, and on blur it groups and pads it ("1,250.50").
 */
export function CurrencyInput({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  currency: currencyProp,
  currencies,
  onCurrencyChange,
  min,
  max,
  clampOnBlur = false,
  allowNegative = false,
  numberingSystem = "latn",
  locale: localeProp,
  overflow = "round",
  symbol = "symbol",
  fixedDecimals = true,
  step,
  name,
  placeholder,
  disabled,
  readOnly,
  invalid,
  id,
  required,
  labels,
  className,
  "aria-label": ariaLabel,
  ...rest
}: CurrencyInputProps) {
  const currency = useCurrency(currencyProp);
  const ctx = useOptionalNasaq();
  const locale = localeProp ?? ctx?.locale ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const uid = useId();
  const decimals = currencyDecimals(currency);
  const [inner, setInner] = useState<number | null>(defaultValue);
  const minor = valueProp !== undefined ? valueProp : inner;
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  const commit = (next: number | null) => {
    if (valueProp === undefined) setInner(next);
    onValueChange?.(next);
  };
  const plainOf = (m: number | null) => (m === null ? "" : minorToPlain(m, decimals));
  const shown = focused ? text : minor === null ? "" : formatMinor(minor, currency, locale, { digits: numberingSystem, fixed: fixedDecimals });
  const out = !moneyInRange(minor, min, max);
  const isInvalid = invalid || out;
  const side = symbolSide(currency, locale);
  const mark = symbol === "code" ? currency.toUpperCase() : symbol === "symbol" ? currencySymbol(currency, locale) : null;

  const edit = (raw: string) => {
    const clean = sanitizeMoneyText(raw, decimals, { locale, allowNegative });
    if (!clean) return;
    setText(editableMoneyText(clean.plain, locale, numberingSystem));
    if (clean.minor !== minor) commit(clean.minor);
  };
  const setAmount = (next: number | null) => {
    setText(next === null ? "" : editableMoneyText(plainOf(next), locale, numberingSystem));
    commit(next);
  };
  const paste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    const parsed = parseMoney(pasted, { currency, locale, paste: true, overflow });
    if (parsed === null && !/[0-9٠-٩۰-۹]/.test(pasted)) return;
    e.preventDefault();
    if (parsed !== null) setAmount(!allowNegative && parsed < 0 ? -parsed : parsed);
  };
  const key = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key !== "ArrowUp" && e.key !== "ArrowDown") || readOnly) return;
    e.preventDefault();
    const unit = (step ?? 10 ** decimals) * (e.shiftKey ? 10 : 1);
    const next = (minor ?? 0) + (e.key === "ArrowUp" ? unit : -unit);
    if (!Number.isSafeInteger(next) || (!allowNegative && next < 0)) return;
    setAmount(min !== undefined || max !== undefined ? clampMoney(next, min, max) : next);
  };

  const picker =
    currencies && currencies.length > 1 ? (
      <Select
        items={currencies.map((c) => ({ value: c, label: c }))}
        value={currency}
        disabled={disabled || readOnly}
        onValueChange={(next) => {
          if (typeof next !== "string" || next === currency) return;
          const converted = minor === null ? null : convertMinorDecimals(minor, currency, next);
          if (valueProp === undefined) setInner(converted);
          setText("");
          onCurrencyChange?.(next, converted);
        }}
      >
        <SelectTrigger aria-label={t.currency} className="h-full w-auto min-w-20 rounded-none border-0 border-s bg-nq-surface-soft focus-visible:outline-offset-[-2px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {currencies.map((c) => (
            <SelectItem key={c} value={c}>
              <bdi dir="ltr">{c}</bdi>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  const markNode = mark ? (
    <InputGroupAddon align={side} data-slot="currency-symbol">
      <InputGroupText>
        <bdi dir="ltr">{mark}</bdi>
      </InputGroupText>
    </InputGroupAddon>
  ) : null;

  return (
    <div data-slot="currency-input" data-currency={currency} className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...rest}>
      <InputGroup data-invalid={isInvalid || undefined} className={cn(picker && "pe-0")}>
        {markNode}
        <InputGroupInput
          id={id}
          ltr
          inputMode={decimals > 0 ? "decimal" : "numeric"}
          autoComplete="off"
          spellCheck={false}
          value={shown}
          placeholder={placeholder ?? withPlaceholder(decimals, numberingSystem, locale)}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-label={ariaLabel}
          aria-invalid={isInvalid || undefined}
          aria-describedby={out ? `${uid}-range` : undefined}
          onChange={(e) => edit(e.target.value)}
          onFocus={() => {
            setText(minor === null ? "" : editableMoneyText(plainOf(minor), locale, numberingSystem));
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
            if (clampOnBlur && minor !== null && !moneyInRange(minor, min, max)) commit(clampMoney(minor, min, max));
          }}
          onPaste={paste}
          onKeyDown={key}
          className="tabular-nums"
        />
        {picker}
      </InputGroup>
      {out ? (
        <span id={`${uid}-range`} className="sr-only">
          {t.outOfRange}
        </span>
      ) : null}
      {name ? <input type="hidden" name={name} value={minor === null ? "" : String(minor)} /> : null}
    </div>
  );
}

function withPlaceholder(decimals: number, digits: CurrencyDigits, locale: string) {
  return formatMinor(0, decimals === 0 ? "JPY" : decimals === 3 ? "KWD" : "USD", locale, { digits });
}
