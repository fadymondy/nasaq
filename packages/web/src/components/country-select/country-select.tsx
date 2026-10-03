"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { type LocationCountry, type LocationsDataSource, placeName } from "../address-input/locations-data";
import { useCalendarLocale } from "../calendar";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "../combobox";
import { normalizeForSearch } from "../commands";
import { CountryFlag } from "../country-flag";
import { PHONE_COUNTRIES, type PhoneCountry } from "../phone-input";

const STRINGS = {
  en: { placeholder: "Select a country", empty: "No country found.", loading: "Loading...", clear: "Clear", open: "Open" },
  ar: { placeholder: "اختر الدولة", empty: "لا توجد دولة مطابقة.", loading: "جارٍ التحميل...", clear: "مسح", open: "فتح" },
} as const;

interface Option {
  value: string;
  label: string;
  search: string;
}

export interface CountrySelectProps {
  /** Controlled ISO 3166-1 alpha-2 code ("SA"), or "" for none. */
  value?: string;
  defaultValue?: string;
  /** Called with the ISO code ("" when cleared). */
  onValueChange?: (iso: string) => void;
  /** The list to offer. Default `PHONE_COUNTRIES`. Ignored when `dataSource` is set. */
  countries?: readonly PhoneCountry[];
  /** Load countries from a locations source instead (hub, or your own). Items need an `iso2`. */
  dataSource?: LocationsDataSource;
  disabled?: boolean;
  invalid?: boolean;
  /** Form field name: a hidden input carries the ISO code. */
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  locale?: string;
  dir?: "ltr" | "rtl";
  "aria-label"?: string;
}

const fromPhone = (c: PhoneCountry): LocationCountry => ({ id: 0, iso2: c.iso, name_en: c.en, name_ar: c.ar });

/** Searchable country combobox with SVG flags and names in English or Arabic. The value is the ISO 3166-1 alpha-2 code. */
export function CountrySelect({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  countries = PHONE_COUNTRIES,
  dataSource,
  disabled,
  invalid,
  name,
  id,
  placeholder,
  className,
  locale: localeProp,
  dir: dirProp,
  "aria-label": ariaLabel,
}: CountrySelectProps) {
  const { locale, dir } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const lang = locale.split("-")[0] === "ar" ? "ar" : "en";
  const t = STRINGS[lang];

  const [inner, setInner] = useState(defaultValue);
  const iso = (valueProp ?? inner).toUpperCase();

  const [remote, setRemote] = useState<LocationCountry[] | null>(null);
  useEffect(() => {
    if (!dataSource) return;
    let live = true;
    setRemote(null);
    dataSource.countries().then(
      (list) => live && setRemote(list),
      () => live && setRemote([]),
    );
    return () => {
      live = false;
    };
  }, [dataSource]);

  const items = useMemo<Option[]>(() => {
    const list = dataSource ? (remote ?? []) : countries.map(fromPhone);
    return list
      .filter((c) => c.iso2)
      .map((c) => ({ value: c.iso2.toUpperCase(), label: placeName(c, lang), search: `${c.name_en} ${c.name_ar} ${c.iso2}` }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [dataSource, remote, countries, lang, locale]);

  const selected = items.find((i) => i.value === iso) ?? null;

  return (
    <div data-slot="country-select" className={cn("contents", className)}>
      <Combobox
        items={items}
        value={selected}
        disabled={disabled}
        isItemEqualToValue={(a: Option, b: Option) => a.value === b.value}
        filter={(item: Option, query: string) => normalizeForSearch(item.search).includes(normalizeForSearch(query))}
        onValueChange={(next: Option | null) => {
          const code = next?.value ?? "";
          setInner(code);
          onValueChange?.(code);
        }}
      >
        <ComboboxInput id={id} aria-label={ariaLabel} aria-invalid={invalid || undefined} placeholder={placeholder ?? t.placeholder} clearLabel={t.clear} triggerLabel={t.open} />
        <ComboboxContent dir={dir} lang={locale}>
          <ComboboxList>
            {(item: Option) => (
              <ComboboxItem key={item.value} value={item}>
                <span className="flex items-center gap-2">
                  <CountryFlag code={item.value} className="text-[1rem]" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty>{dataSource && remote === null ? t.loading : t.empty}</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
      {name ? <input type="hidden" name={name} value={iso} /> : null}
    </div>
  );
}
