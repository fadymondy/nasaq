// Places data, the same API as the React package's locations-data.ts.
/** A country as the CircleXO hub returns it. `name_en` or `name_ar` may be an empty string. */
export interface LocationCountry {
  id: number;
  iso2: string;
  iso3?: string;
  name_en: string;
  name_ar: string;
  /** Calling code, with or without a plus, as stored by the hub. */
  phone_code?: string;
  emoji?: string;
  region?: string;
  lat?: number;
  lng?: number;
  currency_code?: string;
}

export interface LocationCity {
  id: number;
  country_id: number;
  name_en: string;
  name_ar: string;
  lat?: number;
  lng?: number;
  timezone?: string;
}

export interface LocationArea {
  id: number;
  city_id: number;
  name_en: string;
  name_ar: string;
}

export type LocationType = "country" | "city" | "area";
export type LocationItem = LocationCountry | LocationCity | LocationArea;

export interface LocationSearchOptions {
  type: LocationType;
  countryId?: number;
  cityId?: number;
  /** Maximum results. The hub default is 20. */
  limit?: number;
}

/** Where AddressInput and CountrySelect get their places from. Implement it to use your own API or a static list. */
export interface LocationsDataSource {
  countries(): Promise<LocationCountry[]>;
  cities(countryId: number): Promise<LocationCity[]>;
  areas(cityId: number): Promise<LocationArea[]>;
  /** Server-side search, for sources too large to filter in the browser. The built-in inputs filter client-side. */
  search?(q: string, options: LocationSearchOptions): Promise<LocationItem[]>;
}

export interface HubLocationsDataSourceOptions {
  /** Default `https://app.circlexo.com`. */
  baseUrl?: string;
  /** Default `globalThis.fetch`. */
  fetch?: typeof fetch;
}

export const DEFAULT_HUB_URL = "https://app.circlexo.com";

/**
 * Data source for the CircleXO hub public locations API (no auth). Results are cached in memory for the life of the
 * returned object; a failed request is not cached, so the next call retries.
 */
export function createHubLocationsDataSource({ baseUrl = DEFAULT_HUB_URL, fetch: fetchImpl }: HubLocationsDataSourceOptions = {}): LocationsDataSource {
  const base = baseUrl.replace(/\/+$/, "");
  const cache = new Map<string, Promise<unknown[]>>();

  const get = <T,>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T[]> => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    const query = qs.toString();
    const url = `${base}/api/locations/${path}${query ? `?${query}` : ""}`;
    const hit = cache.get(url);
    if (hit) return hit as Promise<T[]>;
    const run = (async () => {
      const res = await (fetchImpl ?? globalThis.fetch)(url, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`Locations request failed (${res.status})`);
      const body = (await res.json()) as { items?: T[] };
      return body.items ?? [];
    })();
    cache.set(url, run);
    run.catch(() => cache.delete(url));
    return run as Promise<T[]>;
  };

  return {
    countries: () => get<LocationCountry>("countries"),
    cities: (countryId) => get<LocationCity>("cities", { country_id: countryId }),
    areas: (cityId) => get<LocationArea>("areas", { city_id: cityId }),
    search: (q, { type, countryId, cityId, limit = 20 }) => get<LocationItem>("search", { q, type, country_id: countryId, city_id: cityId, limit }),
  };
}

/** The name in the active language, falling back to the other one when it is empty. */
export function placeName(item: { name_en: string; name_ar: string }, lang: "en" | "ar") {
  const [first, second] = lang === "ar" ? [item.name_ar, item.name_en] : [item.name_en, item.name_ar];
  return first || second || "";
}
