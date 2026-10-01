// nqCountryFlag: fetches a country's 3:2 SVG (country-flag-icons) and exposes it as `svg` for x-html.
// The markup and classes are the React CountryFlag's; the React build bundles the set, this runtime fetches
// one flag per code from the package's CDN copy and caches it. Self-host with `window.NQ_FLAG_BASE = "/flags/"`.
//
//   <span data-slot="country-flag" x-data="nqCountryFlag('SA')" x-html="svg" class="…"></span>

import type { Register } from "./types";

const DEFAULT_BASE = "https://cdn.jsdelivr.net/npm/country-flag-icons@1/3x2/";
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function base(): string {
  const b = (globalThis as { NQ_FLAG_BASE?: string }).NQ_FLAG_BASE ?? DEFAULT_BASE;
  return b.endsWith("/") ? b : `${b}/`;
}

/** The SVG markup for an ISO 3166-1 alpha-2 code; "" for unknown codes or when the fetch fails. */
export function loadFlag(code: string): Promise<string> {
  const key = code.toUpperCase();
  const hit = cache.get(key);
  if (hit !== undefined) return Promise.resolve(hit);
  if (!/^[A-Z]{2}$/.test(key) || typeof fetch !== "function") return Promise.resolve("");
  let p = pending.get(key);
  if (!p) {
    p = fetch(`${base()}${key}.svg`)
      .then((r) => (r.ok ? r.text() : ""))
      .then((text) => {
        const svg = text.includes("<svg") ? text : "";
        if (svg) cache.set(key, svg);
        return svg;
      })
      .catch(() => "")
      .finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return p;
}

export const countryFlag: Register = (Alpine) => {
  Alpine.data("nqCountryFlag", (code = "") => ({
    code,
    svg: cache.get(String(code).toUpperCase()) ?? "",
    async init(this: { code: string; svg: string }) {
      this.svg = await loadFlag(this.code);
    },
  }));
};
