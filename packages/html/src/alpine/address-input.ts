// nqAddressInput: an address form. Country, city and area are comboboxes that cascade (each is disabled until its parent
// is chosen and resets when the parent changes), then street and detail fields and an optional phone field. The markup is
// the React AddressInput's (see the Blade component), the state lives here; each combobox is a nested nqPlaceSelect.
//
//   <div data-slot="address-input" x-data="nqAddressInput({ street: '' }, { locale: 'en', hub: true })" x-modelable="address" …>
//     <div x-data="nqPlaceSelect({ options: () => placeOptions('country'), value: () => address.country_id, set: (v) => setPlace('country', v),
//                                  disabled: () => placeDisabled('country'), empty: () => placeEmpty('country') })" class="contents"> … </div>
//     <input data-slot="input" x-model="address.street"> … <x-nq::phone-input x-model="address.phone">
//   </div>
//
// `address` is the value, x-modelable (x-model="$wire.address"): { country_id, city_id, area_id, street, building, floor,
// apartment, landmark, postal_code, phone (E.164), lat, lng } with snake_case keys, as the React Address. Empty optional
// keys are left out; lat and lng pass through untouched. Each change dispatches "address-change" ({ value }) from the root.
// Options: locale, hub (true, or a base URL; the default source is the CircleXO hub), dataSource (an object with async
// countries(), cities(countryId), areas(cityId); for pages that load Alpine themselves), labels (override any string), disabled.

import { hubLocationsSource, placeName, type LocationsDataSource } from "./locations-logic";
import { registerPlaceSelect, type PlaceOption } from "./place-select-logic";
import type { Magics, Register } from "./types";

type Kind = "country" | "city" | "area";
type Status = "idle" | "loading" | "ready" | "error";
interface Place {
  id: number;
  name_en: string;
  name_ar: string;
  iso2?: string;
}
interface List {
  status: Status;
  items: Place[];
}

const STRINGS = {
  en: { empty: "No results.", loading: "Loading...", loadError: "Could not load the list." },
  ar: { empty: "لا توجد نتائج.", loading: "جارٍ التحميل...", loadError: "تعذر تحميل القائمة." },
} as const;

const OPTIONAL_TEXT = ["building", "floor", "apartment", "landmark", "postal_code", "phone"] as const;
const IDS = ["country_id", "city_id", "area_id"] as const;
type Address = Record<string, unknown>;

/** The address with empty optional keys left out, as the React `update`. */
function clean(address: Address | null | undefined): Address {
  const out: Address = { ...address };
  out.street = String(out.street ?? "");
  for (const k of OPTIONAL_TEXT) if (out[k] === "" || out[k] === undefined || out[k] === null) delete out[k];
  for (const k of IDS) if (out[k] === undefined || out[k] === null || out[k] === "") delete out[k];
  return out;
}

interface AddressState extends Magics {
  address: Address;
  lang: "en" | "ar";
  locale: string;
  source: LocationsDataSource;
  lists: Record<Kind, List>;
  root: HTMLElement | null;
  labels: Record<string, string>;
  disabled: boolean;
  load(kind: Kind): void;
  normalize(): void;
  placeOptions(kind: Kind): PlaceOption[];
  placeDisabled(kind: Kind): boolean;
  placeEmpty(kind: Kind): string;
  setPlace(kind: Kind, id: number | string | undefined): void;
}

const PARENT: Record<Kind, (typeof IDS)[number] | null> = { country: null, city: "country_id", area: "city_id" };

export const addressInput: Register = (Alpine) => {
  registerPlaceSelect(Alpine);
  Alpine.data(
    "nqAddressInput",
    (initial: Address | null = null, options: { locale?: string; hub?: boolean | string; dataSource?: LocationsDataSource; labels?: Record<string, string>; disabled?: boolean } = {}) => {
      // Rows ask for the options many times per render; rebuild them only when the list or the language changes.
      const memo: Partial<Record<Kind, { items: Place[]; lang: string; options: PlaceOption[] }>> = {};
      // A late answer for a parent that has since changed is dropped.
      const ticket: Record<Kind, number> = { country: 0, city: 0, area: 0 };
      return {
        address: clean(initial),
        locale: options.locale ?? "en",
        lang: String(options.locale ?? "en").split("-")[0] === "ar" ? "ar" : "en",
        source: options.dataSource ?? hubLocationsSource(options.hub ?? true),
        lists: { country: { status: "idle", items: [] }, city: { status: "idle", items: [] }, area: { status: "idle", items: [] } } as Record<Kind, List>,
        labels: options.labels ?? {},
        disabled: Boolean(options.disabled),
        root: null as HTMLElement | null,
        init(this: AddressState) {
          this.root = this.$el;
          this.load("country");
          this.load("city");
          this.load("area");
          this.$watch("address.country_id", () => this.load("city"));
          this.$watch("address.city_id", () => this.load("area"));
          this.$watch("address", () => this.normalize());
        },
        /** Keeps the value in the React shape and tells the host. */
        normalize(this: AddressState) {
          const next = clean(this.address);
          if (JSON.stringify(next) !== JSON.stringify(this.address)) {
            this.address = next;
            return;
          }
          this.root?.dispatchEvent(new CustomEvent("address-change", { bubbles: true, detail: { value: next } }));
        },
        load(this: AddressState, kind: Kind) {
          const parent = PARENT[kind];
          const key = parent ? (this.address[parent] as number | undefined) : 0;
          const mine = ++ticket[kind];
          if (key === undefined) {
            this.lists[kind] = { status: "idle", items: [] };
            return;
          }
          this.lists[kind] = { status: "loading", items: [] };
          const request: Promise<Place[]> =
            kind === "country" ? this.source.countries() : kind === "city" ? this.source.cities(key) : this.source.areas(key);
          request.then(
            (items) => mine === ticket[kind] && (this.lists[kind] = { status: "ready", items }),
            () => mine === ticket[kind] && (this.lists[kind] = { status: "error", items: [] }),
          );
        },
        placeOptions(this: AddressState, kind: Kind): PlaceOption[] {
          const items = this.lists[kind].items;
          const hit = memo[kind];
          if (hit && hit.items === items && hit.lang === this.lang) return hit.options;
          const list = items.map((p) => ({
            value: p.id,
            label: placeName(p, this.lang),
            search: `${p.name_en} ${p.name_ar}`,
            ...(kind === "country" && p.iso2 ? { iso: p.iso2 } : {}),
          }));
          memo[kind] = { items, lang: this.lang, options: list };
          return list;
        },
        placeDisabled(this: AddressState, kind: Kind) {
          const parent = PARENT[kind];
          return this.disabled || (parent !== null && this.address[parent] === undefined);
        },
        placeEmpty(this: AddressState, kind: Kind) {
          const t = { ...STRINGS[this.lang], ...this.labels };
          const status = this.lists[kind].status;
          return status === "loading" ? t.loading : status === "error" ? t.loadError : t.empty;
        },
        setPlace(this: AddressState, kind: Kind, id: number | string | undefined) {
          const value = id === undefined ? undefined : Number(id);
          const next: Address = { ...this.address };
          if (kind === "country") Object.assign(next, { country_id: value, city_id: undefined, area_id: undefined });
          else if (kind === "city") Object.assign(next, { city_id: value, area_id: undefined });
          else next.area_id = value;
          this.address = clean(next);
        },
      };
    },
  );
};
