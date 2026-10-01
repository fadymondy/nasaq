"use client";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Field as BaseField } from "@base-ui/react/field";
import { ChevronsUpDown } from "lucide-react";
import { type FocusEventHandler, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useCalendarLocale } from "../calendar";
import { ComboboxEmpty, ComboboxItem, ComboboxList } from "../combobox";
import { normalizeForSearch } from "../commands";
import { InputGroup, InputGroupInput } from "../input-group";
import { CountryFlag } from "../country-flag";
import { formatE164, formatNational, parsePhone, parsePhoneLenient, PHONE_COUNTRIES, toDigits, PHONE_PREFERRED, type PhoneCountry, phoneExample } from "./phone-data";

export {
  countryFlag,
  formatE164,
  formatNational,
  isValidE164,
  PHONE_COUNTRIES,
  PHONE_PREFERRED,
  type PhoneCountry,
  parsePhone,
  parsePhoneLenient,
  phoneCountryName,
  phoneExample,
} from "./phone-data";

const STRINGS = {
  en: { country: "Country", search: "Search countries", empty: "No country found.", placeholder: "Phone number" },
  ar: { country: "الدولة", search: "ابحث عن دولة", empty: "لا توجد دولة مطابقة.", placeholder: "رقم الهاتف" },
} as const;
const strings = (locale: string) => STRINGS[locale.split("-")[0] === "ar" ? "ar" : "en"];

const MAX_DIGITS = 15;

interface Item {
  value: string;
  label: string;
  country: PhoneCountry;
  search: string;
}

export interface PhoneInputProps {
  /**
   * Controlled E.164 value: `+966501234567`, or "" when empty. A local number such as `0591234567` is accepted too: it
   * is kept as national digits of `defaultCountry` (and `00966…` is read as `+966…`), never dropped. `onValueChange`
   * then reports E.164.
   */
  value?: string;
  defaultValue?: string;
  /** Called with the E.164 value ("" when the number is empty) and the selected country. */
  onValueChange?: (value: string, country: PhoneCountry) => void;
  /** ISO code selected when there is no value. Default "SA". */
  defaultCountry?: string;
  /** Replace the country list. Default `PHONE_COUNTRIES`. */
  countries?: readonly PhoneCountry[];
  /** ISO codes listed first. Default the Gulf and Arab eight: SA, AE, EG, KW, QA, BH, OM, JO. */
  preferred?: readonly string[];
  disabled?: boolean;
  invalid?: boolean;
  /** Form field name: a hidden input carries the E.164 value. */
  name?: string;
  id?: string;
  placeholder?: string;
  /** Focus and blur of the digits field, for form libraries that validate on blur. */
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  className?: string;
  locale?: string;
  dir?: "ltr" | "rtl";
  "aria-label"?: string;
}

/**
 * Phone number input: a country combobox (flag, dial code, name; Gulf and Arab countries first) and a
 * digits field, joined in one bordered group. The value is E.164. The digits field is a Field control.
 */
export function PhoneInput({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  defaultCountry = "SA",
  countries = PHONE_COUNTRIES,
  preferred = PHONE_PREFERRED,
  disabled,
  invalid,
  name,
  id,
  placeholder,
  onFocus,
  onBlur,
  className,
  locale: localeProp,
  dir: dirProp,
  "aria-label": ariaLabel,
}: PhoneInputProps) {
  const { locale, dir } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const t = strings(locale);
  const lang = locale.split("-")[0] === "ar" ? "ar" : "en";

  const items = useMemo<Item[]>(() => {
    const toItem = (c: PhoneCountry): Item => ({
      value: c.iso,
      label: c[lang],
      country: c,
      search: `${c.en} ${c.ar} ${c.iso} +${c.dial} ${c.dial}`,
    });
    const first = preferred.map((iso) => countries.find((c) => c.iso === iso)).filter((c): c is PhoneCountry => !!c);
    const rest = countries.filter((c) => !preferred.includes(c.iso)).sort((a, b) => a[lang].localeCompare(b[lang], locale));
    return [...first, ...rest].map(toItem);
  }, [countries, preferred, lang, locale]);

  const initial = parsePhoneLenient(valueProp ?? defaultValue, countries, defaultCountry);
  const fallback = countries.find((c) => c.iso === defaultCountry) ?? countries[0]!;
  const [country, setCountry] = useState<PhoneCountry>(initial?.country ?? fallback);
  const [national, setNational] = useState(initial?.national ?? "");
  const e164 = formatE164(country, national);

  // A controlled value that differs from what is shown (reset, load from the server) replaces the state.
  useEffect(() => {
    if (valueProp === undefined || valueProp === e164) return;
    const parsed = parsePhoneLenient(valueProp, countries, defaultCountry);
    if (parsed) {
      setCountry(parsed.country);
      setNational(parsed.national);
    } else if (valueProp === "") setNational("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueProp]);

  const emit = (c: PhoneCountry, n: string) => {
    setCountry(c);
    setNational(n);
    onValueChange?.(formatE164(c, n), c);
  };

  const [group, setGroup] = useState<HTMLDivElement | null>(null);
  const digitsRef = useRef<HTMLInputElement>(null);
  const shown = formatNational(country, national);
  // Grouping adds spaces as you type; keep the caret after the same digit instead of jumping to the end.
  const caretDigits = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = digitsRef.current;
    const want = caretDigits.current;
    caretDigits.current = null;
    if (!el || want === null || document.activeElement !== el) return;
    let pos = 0;
    for (let seen = 0; pos < shown.length && seen < want; pos++) if (/\d/.test(shown[pos]!)) seen++;
    el.setSelectionRange(pos, pos);
  }, [shown]);
  const selected = items.find((i) => i.value === country.iso) ?? null;

  const onDigits = (text: string) => {
    // A pasted or autofilled "+9665…" picks the country from its calling code.
    if (text.trim().startsWith("+")) {
      const parsed = parsePhone(text, countries);
      if (parsed) return emit(parsed.country, parsed.national.slice(0, MAX_DIGITS - parsed.country.dial.length));
    }
    emit(country, toDigits(text).slice(0, MAX_DIGITS - country.dial.length));
  };

  return (
    <InputGroup ref={setGroup} data-slot="phone-input" data-invalid={invalid ? "" : undefined} className={className}>
      {/* Its own Field scope, so the country list does not take the outer Field's label or become its control. */}
      <BaseField.Root render={<div />} className="contents">
        <BaseCombobox.Root
          items={items}
          value={selected}
          disabled={disabled}
          isItemEqualToValue={(a: Item, b: Item) => a.value === b.value}
          filter={(item: Item, query: string) => normalizeForSearch(item.search).includes(normalizeForSearch(query.replace(/^\+/, "")))}
          onValueChange={(next: Item | null) => {
            if (!next) return;
            emit(next.country, national);
            digitsRef.current?.focus();
          }}
        >
          <BaseCombobox.Trigger
            data-slot="phone-input-country"
            aria-label={`${t.country}: ${country[lang]} +${country.dial}`}
            className={cn(
              "order-first flex h-full shrink-0 cursor-default items-center gap-1.5 border-e border-input ps-3 pe-2 text-body-sm text-foreground outline-none",
              "transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:bg-nq-hover data-popup-open:bg-nq-hover",
              "disabled:cursor-not-allowed",
            )}
          >
            <CountryFlag code={country.iso} className="text-[1.125rem]" />
            <bdi dir="ltr" className="tabular-nums">
              +{country.dial}
            </bdi>
            <ChevronsUpDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
          </BaseCombobox.Trigger>
          <BaseCombobox.Portal>
            <BaseCombobox.Positioner anchor={group} side="bottom" align="start" sideOffset={4} className="z-50 outline-none">
              <BaseCombobox.Popup
                dir={dir}
                lang={locale}
                data-slot="phone-input-content"
                className={cn(
                  "w-[max(var(--anchor-width),18rem)] max-w-[var(--available-width)] overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating outline-none",
                  "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
                )}
              >
                <div className="border-b border-border p-1.5">
                  <BaseCombobox.Input
                    data-slot="phone-input-search"
                    aria-label={t.search}
                    placeholder={t.search}
                    className="h-control-sm w-full min-w-0 rounded-control border-0 bg-transparent px-2 text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto p-1.5">
                  <ComboboxList>
                    {(item: Item) => (
                      <ComboboxItem key={item.value} value={item}>
                        <span className="flex items-center gap-2">
                          <CountryFlag code={item.country.iso} className="text-[1rem]" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          <bdi dir="ltr" className="shrink-0 text-muted-foreground tabular-nums">
                            +{item.country.dial}
                          </bdi>
                        </span>
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                  <ComboboxEmpty>{t.empty}</ComboboxEmpty>
                </div>
              </BaseCombobox.Popup>
            </BaseCombobox.Positioner>
          </BaseCombobox.Portal>
        </BaseCombobox.Root>
      </BaseField.Root>
      <InputGroupInput
        ref={digitsRef}
        ltr
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        placeholder={placeholder ?? (phoneExample(country) || t.placeholder)}
        onFocus={onFocus}
        onBlur={onBlur}
        value={shown}
        onChange={(e) => {
          const el = e.target;
          const end = el.selectionStart ?? el.value.length;
          caretDigits.current = end >= el.value.length ? null : toDigits(el.value.slice(0, end)).length;
          onDigits(el.value);
        }}
      />
      {name ? <input type="hidden" name={name} value={e164} /> : null}
    </InputGroup>
  );
}
