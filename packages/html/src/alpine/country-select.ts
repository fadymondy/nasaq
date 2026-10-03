// nqCountrySelect: a searchable country combobox with flags, names in English or Arabic; the value is the ISO 3166-1
// alpha-2 code. The markup is the React CountrySelect's (see the Blade component), the state lives here and the
// typeahead is a nested nqPlaceSelect.
//
//   <div data-slot="country-select" x-data="nqCountrySelect('SA', { locale: 'en' })" x-modelable="iso" class="contents">
//     <div x-data="nqPlaceSelect({ options: () => items(), value: () => code(), set: (v) => pickCountry(v), empty: () => emptyText() })" class="contents">
//       <div data-slot="combobox-input-group" x-ref="anchor">…<input data-slot="combobox-input" x-bind="input">…</div>
//       <template x-teleport="body"><div data-slot="combobox-content" x-bind="popup" …>…<div data-slot="combobox-item" x-bind="item(o)">…</div></div></template>
//     </div>
//     <input type="hidden" name="country" :value="code()">
//   </div>
//
// `iso` is x-modelable (x-model="$wire.country"); "" is no choice. Each change dispatches "country-change" ({ value })
// from the root. Options: locale, invalid, countries (a list of { iso, en, ar }, default every dialling country),
// hub (true or a base URL: load the countries from a CircleXO-style locations API), dataSource (an object with an
// async countries() that returns items with an iso2; plain HTML pages that load Alpine themselves can pass one).

import { hubLocationsSource, placeName, type LocationCountry, type LocationsDataSource } from "./locations-logic";
import { PHONE_COUNTRIES, type PhoneCountry } from "./phone-input-logic";
import { registerPlaceSelect, type PlaceOption } from "./place-select-logic";
import type { Magics, Register } from "./types";

const STRINGS = {
  en: { empty: "No country found.", loading: "Loading..." },
  ar: { empty: "لا توجد دولة مطابقة.", loading: "جارٍ التحميل..." },
} as const;

interface CountryState extends Magics {
  iso: string;
  lang: "en" | "ar";
  locale: string;
  remote: LocationCountry[] | null;
  source: LocationsDataSource | null;
  list: readonly PhoneCountry[];
  root: HTMLElement | null;
  code(): string;
  items(): PlaceOption[];
  emptyText(): string;
  pickCountry(value: string | number | undefined): void;
}

export const countrySelect: Register = (Alpine) => {
  registerPlaceSelect(Alpine);
  Alpine.data(
    "nqCountrySelect",
    (initial = "", options: { locale?: string; invalid?: boolean; countries?: PhoneCountry[]; hub?: boolean | string; dataSource?: LocationsDataSource } = {}) => {
      // The list is sorted once per language and source, not on every row of every render.
      let memo: { remote: LocationCountry[] | null; lang: string; items: PlaceOption[] } | null = null;
      return {
        iso: String(initial ?? "").toUpperCase(),
        locale: options.locale ?? "en",
        lang: String(options.locale ?? "en").split("-")[0] === "ar" ? "ar" : "en",
        remote: null as LocationCountry[] | null,
        source: options.dataSource ?? (options.hub ? hubLocationsSource(options.hub) : null),
        list: options.countries ?? PHONE_COUNTRIES,
        root: null as HTMLElement | null,
        init(this: CountryState) {
          this.root = this.$el;
          const source = this.source;
          if (!source) return;
          source.countries().then(
            (list) => (this.remote = list),
            () => (this.remote = []),
          );
        },
        code(this: CountryState) {
          return String(this.iso ?? "").toUpperCase();
        },
        items(this: CountryState): PlaceOption[] {
          if (memo && memo.remote === this.remote && memo.lang === this.lang) return memo.items;
          const list: LocationCountry[] = this.source
            ? (this.remote ?? [])
            : this.list.map((c) => ({ id: 0, iso2: c.iso, name_en: c.en, name_ar: c.ar }));
          const items = list
            .filter((c) => c.iso2)
            .map((c) => ({ value: c.iso2.toUpperCase(), label: placeName(c, this.lang), search: `${c.name_en} ${c.name_ar} ${c.iso2}` }))
            .sort((a, b) => a.label.localeCompare(b.label, this.locale));
          memo = { remote: this.remote, lang: this.lang, items };
          return items;
        },
        emptyText(this: CountryState) {
          return this.source && this.remote === null ? STRINGS[this.lang].loading : STRINGS[this.lang].empty;
        },
        pickCountry(this: CountryState, value: string | number | undefined) {
          this.iso = String(value ?? "").toUpperCase();
          this.root?.dispatchEvent(new CustomEvent("country-change", { bubbles: true, detail: { value: this.iso } }));
        },
      };
    },
  );
};
