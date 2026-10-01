// The flag SVGs (country-flag-icons, 3:2). The React component imports the whole set as one lazy chunk; this
// package takes no extra dependency, so each flag is fetched once from the package's CDN copy and cached.
// Override the base with `setFlagBase()` to self-host (the same files as `country-flag-icons/3x2/*.svg`).

let base = "https://cdn.jsdelivr.net/npm/country-flag-icons@1/3x2/";
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | undefined>>();

/** Where the 3x2 SVGs are served from (must end with a slash). */
export function setFlagBase(url: string) {
  base = url.endsWith("/") ? url : `${url}/`;
}

/** A flag already fetched, or undefined. */
export function peekFlag(code: string): string | undefined {
  return cache.get(code.toUpperCase());
}

/** Fetches the SVG markup for an ISO 3166-1 alpha-2 code; undefined for unknown codes or when offline. */
export function flagSvg(code: string): Promise<string | undefined> {
  const key = code.toUpperCase();
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  if (!/^[A-Z]{2}$/.test(key) || typeof fetch !== "function") return Promise.resolve(undefined);
  let p = pending.get(key);
  if (!p) {
    p = fetch(`${base}${key}.svg`)
      .then((r) => (r.ok ? r.text() : undefined))
      .then((text) => {
        if (text && text.includes("<svg")) cache.set(key, text);
        return cache.get(key);
      })
      .catch(() => undefined)
      .finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return p;
}
