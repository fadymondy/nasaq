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
