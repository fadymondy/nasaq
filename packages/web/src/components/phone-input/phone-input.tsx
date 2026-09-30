"use client";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Field as BaseField } from "@base-ui/react/field";
import { ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useCalendarLocale } from "../calendar";
import { ComboboxEmpty, ComboboxItem, ComboboxList } from "../combobox";
import { normalizeForSearch } from "../commands";
import { InputGroup, InputGroupInput } from "../input-group";

/** One dialling country. Kept inline so the component has no dependency; not a full numbering plan. */
export interface PhoneCountry {
  /** ISO 3166-1 alpha-2, upper case. */
  iso: string;
  /** Country calling code without the plus: "966". */
  dial: string;
  en: string;
  ar: string;
}

/** The Arab League plus about 30 major countries. Order matters for shared codes: the first entry for a code wins when parsing (`+1` is the United States). */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { iso: "SA", dial: "966", en: "Saudi Arabia", ar: "السعودية" },
  { iso: "AE", dial: "971", en: "United Arab Emirates", ar: "الإمارات" },
  { iso: "EG", dial: "20", en: "Egypt", ar: "مصر" },
  { iso: "KW", dial: "965", en: "Kuwait", ar: "الكويت" },
  { iso: "QA", dial: "974", en: "Qatar", ar: "قطر" },
  { iso: "BH", dial: "973", en: "Bahrain", ar: "البحرين" },
  { iso: "OM", dial: "968", en: "Oman", ar: "عمان" },
  { iso: "JO", dial: "962", en: "Jordan", ar: "الأردن" },
  { iso: "LB", dial: "961", en: "Lebanon", ar: "لبنان" },
  { iso: "SY", dial: "963", en: "Syria", ar: "سوريا" },
  { iso: "IQ", dial: "964", en: "Iraq", ar: "العراق" },
  { iso: "YE", dial: "967", en: "Yemen", ar: "اليمن" },
  { iso: "PS", dial: "970", en: "Palestine", ar: "فلسطين" },
  { iso: "LY", dial: "218", en: "Libya", ar: "ليبيا" },
  { iso: "SD", dial: "249", en: "Sudan", ar: "السودان" },
  { iso: "TN", dial: "216", en: "Tunisia", ar: "تونس" },
  { iso: "DZ", dial: "213", en: "Algeria", ar: "الجزائر" },
  { iso: "MA", dial: "212", en: "Morocco", ar: "المغرب" },
  { iso: "MR", dial: "222", en: "Mauritania", ar: "موريتانيا" },
  { iso: "SO", dial: "252", en: "Somalia", ar: "الصومال" },
  { iso: "DJ", dial: "253", en: "Djibouti", ar: "جيبوتي" },
  { iso: "KM", dial: "269", en: "Comoros", ar: "جزر القمر" },
  { iso: "US", dial: "1", en: "United States", ar: "الولايات المتحدة" },
  { iso: "CA", dial: "1", en: "Canada", ar: "كندا" },
  { iso: "GB", dial: "44", en: "United Kingdom", ar: "المملكة المتحدة" },
  { iso: "FR", dial: "33", en: "France", ar: "فرنسا" },
  { iso: "DE", dial: "49", en: "Germany", ar: "ألمانيا" },
  { iso: "ES", dial: "34", en: "Spain", ar: "إسبانيا" },
  { iso: "IT", dial: "39", en: "Italy", ar: "إيطاليا" },
  { iso: "NL", dial: "31", en: "Netherlands", ar: "هولندا" },
  { iso: "SE", dial: "46", en: "Sweden", ar: "السويد" },
  { iso: "CH", dial: "41", en: "Switzerland", ar: "سويسرا" },
  { iso: "TR", dial: "90", en: "Türkiye", ar: "تركيا" },
  { iso: "RU", dial: "7", en: "Russia", ar: "روسيا" },
  { iso: "IR", dial: "98", en: "Iran", ar: "إيران" },
  { iso: "IN", dial: "91", en: "India", ar: "الهند" },
  { iso: "PK", dial: "92", en: "Pakistan", ar: "باكستان" },
  { iso: "BD", dial: "880", en: "Bangladesh", ar: "بنغلاديش" },
  { iso: "CN", dial: "86", en: "China", ar: "الصين" },
  { iso: "JP", dial: "81", en: "Japan", ar: "اليابان" },
  { iso: "KR", dial: "82", en: "South Korea", ar: "كوريا الجنوبية" },
  { iso: "ID", dial: "62", en: "Indonesia", ar: "إندونيسيا" },
  { iso: "MY", dial: "60", en: "Malaysia", ar: "ماليزيا" },
  { iso: "SG", dial: "65", en: "Singapore", ar: "سنغافورة" },
  { iso: "PH", dial: "63", en: "Philippines", ar: "الفلبين" },
  { iso: "AU", dial: "61", en: "Australia", ar: "أستراليا" },
  { iso: "BR", dial: "55", en: "Brazil", ar: "البرازيل" },
  { iso: "MX", dial: "52", en: "Mexico", ar: "المكسيك" },
  { iso: "NG", dial: "234", en: "Nigeria", ar: "نيجيريا" },
  { iso: "ZA", dial: "27", en: "South Africa", ar: "جنوب أفريقيا" },
];

/** Listed first in the country list, in this order. */
export const PHONE_PREFERRED = ["SA", "AE", "EG", "KW", "QA", "BH", "OM", "JO"] as const;

const MAX_DIGITS = 15;
/** Countries whose national numbers legitimately begin with 0. Every other leading 0 is a trunk prefix and is dropped. */
const KEEPS_LEADING_ZERO = new Set(["IT"]);

const STRINGS = {
  en: { country: "Country", search: "Search countries", empty: "No country found.", placeholder: "Phone number" },
  ar: { country: "الدولة", search: "ابحث عن دولة", empty: "لا توجد دولة مطابقة.", placeholder: "رقم الهاتف" },
} as const;
const strings = (locale: string) => STRINGS[locale.split("-")[0] === "ar" ? "ar" : "en"];

/** Flag emoji from an ISO code (regional indicator letters). Platforms without flag glyphs show the two letters. */
export function countryFlag(iso: string) {
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Splits an E.164 string into its country (longest matching calling code) and national digits. Null when nothing matches. */
export function parsePhone(value: string, countries: readonly PhoneCountry[] = PHONE_COUNTRIES): { country: PhoneCountry; national: string } | null {
  const digits = value.replace(/\D/g, "");
  if (!value.trim().startsWith("+") || !digits) return null;
  let best: PhoneCountry | null = null;
  for (const country of countries) {
    if (digits.startsWith(country.dial) && (!best || country.dial.length > best.dial.length)) best = country;
  }
  return best ? { country: best, national: digits.slice(best.dial.length) } : null;
}

/** Country plus typed digits as E.164 (`+9665…`), or "" when there are no digits. A trunk 0 is dropped. */
export function formatE164(country: PhoneCountry, national: string) {
  let digits = national.replace(/\D/g, "");
  if (!KEEPS_LEADING_ZERO.has(country.iso)) digits = digits.replace(/^0+/, "");
  return digits ? `+${country.dial}${digits}` : "";
}

interface Item {
  value: string;
  label: string;
  country: PhoneCountry;
  search: string;
}

export interface PhoneInputProps {
  /** Controlled E.164 value: `+966501234567`, or "" when empty. */
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

  const initial = parsePhone(valueProp ?? defaultValue, countries);
  const fallback = countries.find((c) => c.iso === defaultCountry) ?? countries[0]!;
  const [country, setCountry] = useState<PhoneCountry>(initial?.country ?? fallback);
  const [national, setNational] = useState(initial?.national ?? "");
  const e164 = formatE164(country, national);

  // A controlled value that differs from what is shown (reset, load from the server) replaces the state.
  useEffect(() => {
    if (valueProp === undefined || valueProp === e164) return;
    const parsed = parsePhone(valueProp, countries);
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
  const selected = items.find((i) => i.value === country.iso) ?? null;

  const onDigits = (text: string) => {
    // A pasted or autofilled "+9665…" picks the country from its calling code.
    if (text.trim().startsWith("+")) {
      const parsed = parsePhone(text, countries);
      if (parsed) return emit(parsed.country, parsed.national.slice(0, MAX_DIGITS - parsed.country.dial.length));
    }
    emit(country, text.replace(/\D/g, "").slice(0, MAX_DIGITS - country.dial.length));
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
            <span aria-hidden="true" className="text-[1.125rem] leading-none">
              {countryFlag(country.iso)}
            </span>
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
                          <span aria-hidden="true" className="text-[1.125rem] leading-none">
                            {countryFlag(item.country.iso)}
                          </span>
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
        placeholder={placeholder ?? t.placeholder}
        value={national}
        onChange={(e) => onDigits(e.target.value)}
      />
      {name ? <input type="hidden" name={name} value={e164} /> : null}
    </InputGroup>
  );
}
