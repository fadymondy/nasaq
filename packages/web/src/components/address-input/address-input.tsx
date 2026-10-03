"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useCalendarLocale } from "../calendar";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "../combobox";
import { normalizeForSearch } from "../commands";
import { CountryFlag } from "../country-flag";
import { Field, FieldLabel, Input } from "../field";
import { PhoneInput } from "../phone-input";
import {
  createHubLocationsDataSource,
  type LocationArea,
  type LocationCity,
  type LocationCountry,
  type LocationsDataSource,
  placeName,
} from "./locations-data";

export {
  createHubLocationsDataSource,
  DEFAULT_HUB_URL,
  type HubLocationsDataSourceOptions,
  type LocationArea,
  type LocationCity,
  type LocationCountry,
  type LocationItem,
  type LocationSearchOptions,
  type LocationsDataSource,
  type LocationType,
  placeName,
} from "./locations-data";

/** A postal address. JSON-compatible; keys are snake_case so it can be posted to an API as is. */
export interface Address {
  country_id?: number;
  city_id?: number;
  area_id?: number;
  street: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  postal_code?: string;
  /** Passed through untouched. AddressInput has no map, so it never sets these. */
  lat?: number;
  lng?: number;
  /** E.164, for example `+966501234567`. */
  phone?: string;
}

export interface AddressInputLabels {
  country: string;
  city: string;
  area: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  landmark: string;
  postalCode: string;
  phone: string;
  selectCountry: string;
  selectCity: string;
  selectArea: string;
  empty: string;
  loading: string;
  loadError: string;
  clear: string;
  open: string;
}

const STRINGS: Record<"en" | "ar", AddressInputLabels> = {
  en: {
    country: "Country",
    city: "City",
    area: "Area",
    street: "Street",
    building: "Building",
    floor: "Floor",
    apartment: "Apartment",
    landmark: "Landmark",
    postalCode: "Postal code",
    phone: "Phone",
    selectCountry: "Select a country",
    selectCity: "Select a city",
    selectArea: "Select an area",
    empty: "No results.",
    loading: "Loading...",
    loadError: "Could not load the list.",
    clear: "Clear",
    open: "Open",
  },
  ar: {
    country: "الدولة",
    city: "المدينة",
    area: "المنطقة",
    street: "الشارع",
    building: "المبنى",
    floor: "الطابق",
    apartment: "الشقة",
    landmark: "أقرب معلم",
    postalCode: "الرمز البريدي",
    phone: "الهاتف",
    selectCountry: "اختر الدولة",
    selectCity: "اختر المدينة",
    selectArea: "اختر المنطقة",
    empty: "لا توجد نتائج.",
    loading: "جارٍ التحميل...",
    loadError: "تعذر تحميل القائمة.",
    clear: "مسح",
    open: "فتح",
  },
};

export interface AddressInputProps {
  /** Controlled address. */
  value?: Address;
  defaultValue?: Address;
  /** Called with the whole address on every change. Optional fields are left out when empty. */
  onValueChange?: (value: Address) => void;
  /** Where countries, cities and areas come from. Default: the CircleXO hub (`createHubLocationsDataSource()`). */
  dataSource?: LocationsDataSource;
  /** Show the phone field. Default true. */
  showPhone?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** Override any built-in string. */
  labels?: Partial<AddressInputLabels>;
  className?: string;
  locale?: string;
  dir?: "ltr" | "rtl";
}

interface Option {
  value: number;
  label: string;
  search: string;
  iso?: string;
}

type Load<T> = { key: number | undefined; status: "idle" | "loading" | "ready" | "error"; items: T[] };

let defaultSource: LocationsDataSource | undefined;
const getDefaultSource = () => (defaultSource ??= createHubLocationsDataSource());

/** Load a list that depends on `key`; stays `idle` (and empty) until `key` is set. */
function useList<T>(key: number | undefined, load: (key: number) => Promise<T[]>, source: LocationsDataSource): Load<T> {
  const [state, setState] = useState<Load<T>>({ key: undefined, status: "idle", items: [] });
  useEffect(() => {
    if (key === undefined) {
      setState({ key, status: "idle", items: [] });
      return;
    }
    let live = true;
    setState({ key, status: "loading", items: [] });
    load(key).then(
      (items) => live && setState({ key, status: "ready", items }),
      () => live && setState({ key, status: "error", items: [] }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, source]);
  return state;
}

interface PlaceSelectProps {
  label: string;
  placeholder: string;
  options: Option[];
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  disabled?: boolean;
  invalid?: boolean;
  status: Load<unknown>["status"];
  t: AddressInputLabels;
  locale: string;
  dir: "ltr" | "rtl";
  slot: string;
  flags?: boolean;
}

function PlaceSelect({ label, placeholder, options, value, onChange, disabled, invalid, status, t, locale, dir, slot, flags }: PlaceSelectProps) {
  const selected = options.find((o) => o.value === value) ?? null;
  return (
    <Field data-slot={slot} disabled={disabled}>
      <FieldLabel>{label}</FieldLabel>
      <Combobox
        items={options}
        value={selected}
        disabled={disabled}
        isItemEqualToValue={(a: Option, b: Option) => a.value === b.value}
        filter={(item: Option, query: string) => normalizeForSearch(item.search).includes(normalizeForSearch(query))}
        onValueChange={(next: Option | null) => onChange(next?.value)}
      >
        <ComboboxInput aria-invalid={invalid || undefined} placeholder={placeholder} clearLabel={t.clear} triggerLabel={t.open} />
        <ComboboxContent dir={dir} lang={locale}>
          <ComboboxList>
            {(item: Option) => (
              <ComboboxItem key={item.value} value={item}>
                {flags && item.iso ? (
                  <span className="flex items-center gap-2">
                    <CountryFlag code={item.iso} className="text-[1rem]" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </span>
                ) : (
                  item.label
                )}
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty>{status === "loading" ? t.loading : status === "error" ? t.loadError : t.empty}</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}

const TEXT_KEYS = ["building", "floor", "apartment", "landmark", "postal_code"] as const;

/**
 * Address form: country, city and area comboboxes that cascade (each is disabled until its parent is chosen and
 * resets when the parent changes), street and detail fields, and an optional phone field. Places come from a
 * `LocationsDataSource`, by default the CircleXO hub. No map: `lat` and `lng` pass through untouched.
 */
export function AddressInput({
  value: valueProp,
  defaultValue,
  onValueChange,
  dataSource,
  showPhone = true,
  disabled,
  invalid,
  labels,
  className,
  locale: localeProp,
  dir: dirProp,
}: AddressInputProps) {
  const { locale, dir } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const lang = locale.split("-")[0] === "ar" ? "ar" : "en";
  const t = useMemo(() => ({ ...STRINGS[lang], ...labels }), [lang, labels]);
  const source = dataSource ?? getDefaultSource();

  const [inner, setInner] = useState<Address>(defaultValue ?? { street: "" });
  const address = valueProp ?? inner;

  const update = (patch: Partial<Address>) => {
    const next: Address = { ...address, ...patch };
    for (const k of [...TEXT_KEYS, "phone"] as const) if (next[k] === "" || next[k] === undefined) delete next[k];
    for (const k of ["country_id", "city_id", "area_id"] as const) if (next[k] === undefined) delete next[k];
    setInner(next);
    onValueChange?.(next);
  };

  const countries = useList<LocationCountry>(0, () => source.countries(), source);
  const cities = useList<LocationCity>(address.country_id, (id) => source.cities(id), source);
  const areas = useList<LocationArea>(address.city_id, (id) => source.areas(id), source);

  const toOptions = <T extends { id: number; name_en: string; name_ar: string }>(list: T[]): Option[] =>
    list.map((p) => ({ value: p.id, label: placeName(p, lang), search: `${p.name_en} ${p.name_ar}`, iso: (p as unknown as LocationCountry).iso2 }));
  const countryOptions = useMemo(() => toOptions(countries.items), [countries.items, lang]);
  const cityOptions = useMemo(() => toOptions(cities.items), [cities.items, lang]);
  const areaOptions = useMemo(() => toOptions(areas.items), [areas.items, lang]);

  const text = (key: (typeof TEXT_KEYS)[number], label: string, extra?: { ltr?: boolean; autoComplete?: string }) => (
    <Field key={key} data-slot={`address-input-${key.replace("_", "-")}`} disabled={disabled}>
      <FieldLabel>{label}</FieldLabel>
      <Input ltr={extra?.ltr} autoComplete={extra?.autoComplete} disabled={disabled} value={address[key] ?? ""} onChange={(e) => update({ [key]: e.target.value })} />
    </Field>
  );

  return (
    <div data-slot="address-input" dir={dir} lang={locale} data-invalid={invalid ? "" : undefined} className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <PlaceSelect
        slot="address-input-country"
        label={t.country}
        placeholder={t.selectCountry}
        options={countryOptions}
        value={address.country_id}
        onChange={(id) => update({ country_id: id, city_id: undefined, area_id: undefined })}
        disabled={disabled}
        invalid={invalid}
        status={countries.status}
        t={t}
        locale={locale}
        dir={dir}
        flags
      />
      <PlaceSelect
        slot="address-input-city"
        label={t.city}
        placeholder={t.selectCity}
        options={cityOptions}
        value={address.city_id}
        onChange={(id) => update({ city_id: id, area_id: undefined })}
        disabled={disabled || address.country_id === undefined}
        invalid={invalid}
        status={cities.status}
        t={t}
        locale={locale}
        dir={dir}
      />
      <PlaceSelect
        slot="address-input-area"
        label={t.area}
        placeholder={t.selectArea}
        options={areaOptions}
        value={address.area_id}
        onChange={(id) => update({ area_id: id })}
        disabled={disabled || address.city_id === undefined}
        invalid={invalid}
        status={areas.status}
        t={t}
        locale={locale}
        dir={dir}
      />
      <Field data-slot="address-input-street" disabled={disabled} invalid={invalid} className="sm:col-span-2">
        <FieldLabel>{t.street}</FieldLabel>
        <Input autoComplete="address-line1" disabled={disabled} value={address.street} onChange={(e) => update({ street: e.target.value })} />
      </Field>
      {text("building", t.building)}
      {text("floor", t.floor)}
      {text("apartment", t.apartment)}
      {text("postal_code", t.postalCode, { ltr: true, autoComplete: "postal-code" })}
      <div className="sm:col-span-2">{text("landmark", t.landmark)}</div>
      {showPhone ? (
        <Field data-slot="address-input-phone" disabled={disabled} className="sm:col-span-2">
          <FieldLabel>{t.phone}</FieldLabel>
          <PhoneInput
            value={address.phone ?? ""}
            onValueChange={(phone) => update({ phone })}
            disabled={disabled}
            invalid={invalid}
            locale={locale}
            dir={dir}
            aria-label={t.phone}
          />
        </Field>
      ) : null}
    </div>
  );
}
