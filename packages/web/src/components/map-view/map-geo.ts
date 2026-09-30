// Web Mercator math for a map without a map library. Pure: no runtime imports, testable with node --test.

export interface MapLatLng {
  lat: number;
  lng: number;
}

export interface MapView {
  center: MapLatLng;
  /** Fractional zoom. World size in px is 256 * 2^zoom. */
  zoom: number;
}

export interface MapSize {
  width: number;
  height: number;
}

export const MAP_TILE_SIZE = 256;
export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 19;
const MAX_LAT = 85.0511287798;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const world = (zoom: number) => MAP_TILE_SIZE * 2 ** zoom;

/** Wraps a longitude into [-180, 180). */
export const mapWrapLng = (lng: number): number => ((((lng + 180) % 360) + 360) % 360) - 180;

/** A point in world pixels at a zoom: x grows east, y grows south, both from the top-left of the world. */
export function mapProject({ lat, lng }: MapLatLng, zoom: number): { x: number; y: number } {
  const size = world(zoom);
  const sin = Math.sin((clamp(lat, -MAX_LAT, MAX_LAT) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

/** The inverse of `mapProject`. */
export function mapUnproject(point: { x: number; y: number }, zoom: number): MapLatLng {
  const size = world(zoom);
  const n = Math.PI - (2 * Math.PI * point.y) / size;
  return { lat: (180 / Math.PI) * Math.atan(Math.sinh(n)), lng: (point.x / size) * 360 - 180 };
}

/** Where a coordinate lands on screen, in px from the top-left of a viewport `size` centred on `view`. */
export function mapToScreen(point: MapLatLng, view: MapView, size: MapSize): { x: number; y: number } {
  const c = mapProject(view.center, view.zoom);
  const p = mapProject(point, view.zoom);
  // Take the shorter way round the antimeridian.
  const half = world(view.zoom) / 2;
  let dx = p.x - c.x;
  if (dx > half) dx -= world(view.zoom);
  else if (dx < -half) dx += world(view.zoom);
  return { x: size.width / 2 + dx, y: size.height / 2 + (p.y - c.y) };
}

/** The coordinate under a screen point. */
export function mapFromScreen(screen: { x: number; y: number }, view: MapView, size: MapSize): MapLatLng {
  const c = mapProject(view.center, view.zoom);
  const ll = mapUnproject({ x: c.x + screen.x - size.width / 2, y: c.y + screen.y - size.height / 2 }, view.zoom);
  return { lat: ll.lat, lng: mapWrapLng(ll.lng) };
}

/** Moves the view by screen pixels (a drag). */
export function mapPanBy(view: MapView, dx: number, dy: number): MapView {
  const c = mapProject(view.center, view.zoom);
  const size = world(view.zoom);
  const next = mapUnproject({ x: c.x - dx, y: clamp(c.y - dy, 0, size) }, view.zoom);
  return { zoom: view.zoom, center: { lat: clamp(next.lat, -MAX_LAT, MAX_LAT), lng: mapWrapLng(next.lng) } };
}

/** Changes zoom by `delta` keeping the coordinate under `anchor` (screen px) where it is. */
export function mapZoomAt(view: MapView, delta: number, anchor: { x: number; y: number }, size: MapSize, limits: { min?: number; max?: number } = {}): MapView {
  const zoom = clamp(view.zoom + delta, limits.min ?? MAP_MIN_ZOOM, limits.max ?? MAP_MAX_ZOOM);
  if (zoom === view.zoom) return view;
  const under = mapFromScreen(anchor, view, size);
  const p = mapProject(under, zoom);
  const next = mapUnproject({ x: p.x - (anchor.x - size.width / 2), y: p.y - (anchor.y - size.height / 2) }, zoom);
  return { zoom, center: { lat: clamp(next.lat, -MAX_LAT, MAX_LAT), lng: mapWrapLng(next.lng) } };
}

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** The box around some points, or null when there are none. Does not cross the antimeridian. */
export function mapBounds(points: readonly MapLatLng[]): MapBounds | null {
  if (!points.length) return null;
  let south = 90;
  let north = -90;
  let west = 180;
  let east = -180;
  for (const p of points) {
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
  }
  return { south, west, north, east };
}

export interface MapFitOptions {
  /** Empty space around the points, px. Default 48. */
  padding?: number;
  /** Zoom used for one point or points on top of each other. Default 14. */
  singleZoom?: number;
  maxZoom?: number;
  minZoom?: number;
}

/** The view that shows all points with some room around them. */
export function mapFit(points: readonly MapLatLng[], size: MapSize, { padding = 48, singleZoom = 14, maxZoom = 17, minZoom = MAP_MIN_ZOOM }: MapFitOptions = {}): MapView {
  const box = mapBounds(points);
  if (!box) return { center: { lat: 20, lng: 20 }, zoom: minZoom };
  const nw = mapProject({ lat: box.north, lng: box.west }, 0);
  const se = mapProject({ lat: box.south, lng: box.east }, 0);
  const spanX = se.x - nw.x;
  const spanY = se.y - nw.y;
  const center = mapUnproject({ x: (nw.x + se.x) / 2, y: (nw.y + se.y) / 2 }, 0);
  if (spanX < 1e-9 && spanY < 1e-9) return { center, zoom: clamp(singleZoom, minZoom, maxZoom) };
  const availX = Math.max(1, size.width - padding * 2);
  const availY = Math.max(1, size.height - padding * 2);
  const zx = spanX > 1e-9 ? Math.log2(availX / spanX) : Number.POSITIVE_INFINITY;
  const zy = spanY > 1e-9 ? Math.log2(availY / spanY) : Number.POSITIVE_INFINITY;
  return { center, zoom: clamp(Math.min(zx, zy), minZoom, maxZoom) };
}

const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle distance between two coordinates in metres. */
export function mapDistance(a: MapLatLng, b: MapLatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Length of a route in metres. */
export function mapRouteLength(points: readonly MapLatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += mapDistance(points[i - 1] as MapLatLng, points[i] as MapLatLng);
  return total;
}

/** "24.7136° N, 46.6753° E": always the same shape, so it can be compared and copied. */
export function mapFormatCoordinates({ lat, lng }: MapLatLng, digits = 5): string {
  const part = (value: number, pos: string, neg: string) => `${Math.abs(value).toFixed(digits)}° ${value >= 0 ? pos : neg}`;
  return `${part(lat, "N", "S")}, ${part(mapWrapLng(lng), "E", "W")}`;
}

/** True for a usable coordinate. */
export const mapIsLatLng = (value: unknown): value is MapLatLng => {
  const v = value as MapLatLng | null;
  return !!v && Number.isFinite(v.lat) && Number.isFinite(v.lng) && Math.abs(v.lat) <= 90 && Math.abs(v.lng) <= 180;
};

/**
 * Fills a tile URL template ("https://tiles.example/{z}/{x}/{y}.png"). Refuses anything that is not http(s) or a
 * path on this site, so a template cannot become a `javascript:` URL.
 */
export function mapTileUrl(template: string, x: number, y: number, z: number): string | null {
  if (!/^(https?:\/\/|\/)/i.test(template.trim())) return null;
  return template
    .trim()
    .replace(/\{z\}/g, String(z))
    .replace(/\{x\}/g, String(x))
    .replace(/\{y\}/g, String(y));
}

export interface MapTile {
  key: string;
  x: number;
  y: number;
  z: number;
  /** Screen position of the tile's top-left corner, px. */
  left: number;
  top: number;
  size: number;
}

/** Tiles that cover the viewport. The tile zoom is the whole zoom nearest to `view.zoom`; tiles are scaled to fit. */
export function mapVisibleTiles(view: MapView, size: MapSize): MapTile[] {
  const z = clamp(Math.round(view.zoom), 0, MAP_MAX_ZOOM);
  const scale = 2 ** (view.zoom - z);
  const tile = MAP_TILE_SIZE * scale;
  const count = 2 ** z;
  const c = mapProject(view.center, z);
  // Top-left of the viewport in tile-zoom pixels.
  const left = c.x - size.width / 2 / scale;
  const top = c.y - size.height / 2 / scale;
  const x0 = Math.floor(left / MAP_TILE_SIZE);
  const y0 = Math.floor(top / MAP_TILE_SIZE);
  const x1 = Math.floor((left + size.width / scale) / MAP_TILE_SIZE);
  const y1 = Math.floor((top + size.height / scale) / MAP_TILE_SIZE);
  const tiles: MapTile[] = [];
  for (let y = y0; y <= y1; y++) {
    if (y < 0 || y >= count) continue;
    for (let x = x0; x <= x1; x++) {
      const wrapped = ((x % count) + count) % count;
      tiles.push({
        key: `${z}/${wrapped}/${y}@${x}`,
        x: wrapped,
        y,
        z,
        left: (x * MAP_TILE_SIZE - left) * scale,
        top: (y * MAP_TILE_SIZE - top) * scale,
        size: tile,
      });
    }
  }
  return tiles;
}

const STEPS = [90, 45, 30, 15, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.025, 0.01, 0.005, 0.0025, 0.001];

/** Degrees between graticule lines so they stay at least `minPx` apart. */
export function mapGraticuleStep(zoom: number, minPx = 72): number {
  const pxPerDeg = world(zoom) / 360;
  // STEPS run from large to small: take the smallest step that is still far enough apart.
  return [...STEPS].reverse().find((step) => step * pxPerDeg >= minPx) ?? (STEPS[0] as number);
}

/** Meters shown by a scale bar and the pixels it takes, for a target width. */
export function mapScaleBar(view: MapView, targetPx = 80): { meters: number; px: number } {
  const metersPerPx = (Math.cos((view.center.lat * Math.PI) / 180) * 2 * Math.PI * 6_378_137) / world(view.zoom);
  const raw = metersPerPx * targetPx;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const lead = raw / pow;
  const nice = lead >= 5 ? 5 : lead >= 2 ? 2 : 1;
  const meters = nice * pow;
  return { meters, px: meters / metersPerPx };
}

// ------------------------------------------------------------------------------------------ clustering
// Pins are grouped by distance in Web Mercator pixels at the current zoom, so clusters depend on zoom only, never on
// where the map is panned to. Zooming in pulls the pixels apart, so clusters split.

/** Screen distance in px under which two pins share a cluster. */
export const MAP_CLUSTER_RADIUS = 60;
/** From this zoom on, only pins at (nearly) the same spot cluster: they can never be told apart by zooming. */
export const MAP_CLUSTER_MAX_ZOOM = 16;
/** More visible pins than this turns clustering on when `cluster` is not set. */
export const MAP_CLUSTER_THRESHOLD = 30;
/** Pins closer than this many px at the max cluster zoom are treated as the same spot. */
const SAME_SPOT_PX = 2;

export interface MapClusterOptions {
  /** Cluster distance in px. Default 60. */
  radius?: number;
  /** Zoom from which only same-spot pins cluster. Default 16. */
  maxZoom?: number;
  /** This pin is never put in a cluster. */
  selectedId?: string | null;
}

export type MapClusterItem<T> =
  | { type: "pin"; pin: T }
  | {
      type: "cluster";
      /** Stable while the same pins cluster: the first pin id and the count. */
      id: string;
      count: number;
      pins: T[];
      /** The centre of the pins. */
      lat: number;
      lng: number;
    };

/** Groups pins into clusters and single pins for a zoom. Order follows the input; the selected pin is always single. */
export function mapCluster<T extends MapLatLng & { id: string }>(pins: readonly T[], zoom: number, { radius = MAP_CLUSTER_RADIUS, maxZoom = MAP_CLUSTER_MAX_ZOOM, selectedId = null }: MapClusterOptions = {}): MapClusterItem<T>[] {
  const reach = Math.max(0, zoom >= maxZoom ? Math.min(radius, SAME_SPOT_PX) : radius);
  const points = pins.map((pin) => ({ pin, ...mapProject(pin, zoom) }));
  const cell = Math.max(1, reach);
  const buckets = new Map<string, number[]>();
  const key = (cx: number, cy: number) => `${cx}:${cy}`;
  points.forEach((point, i) => {
    if (point.pin.id === selectedId) return;
    const k = key(Math.floor(point.x / cell), Math.floor(point.y / cell));
    const list = buckets.get(k);
    if (list) list.push(i);
    else buckets.set(k, [i]);
  });
  const taken = new Set<number>();
  const items: MapClusterItem<T>[] = [];
  points.forEach((seed, i) => {
    if (seed.pin.id === selectedId) {
      items.push({ type: "pin", pin: seed.pin });
      return;
    }
    if (taken.has(i)) return;
    taken.add(i);
    const members = [i];
    const cx = Math.floor(seed.x / cell);
    const cy = Math.floor(seed.y / cell);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const j of buckets.get(key(cx + dx, cy + dy)) ?? []) {
          if (taken.has(j)) continue;
          const other = points[j] as (typeof points)[number];
          if (Math.hypot(other.x - seed.x, other.y - seed.y) <= reach) {
            taken.add(j);
            members.push(j);
          }
        }
      }
    }
    if (members.length === 1) {
      items.push({ type: "pin", pin: seed.pin });
      return;
    }
    members.sort((a, b) => a - b);
    const group = members.map((m) => (points[m] as (typeof points)[number]).pin);
    // The centre is the mean of the pins in world space at zoom 0, so it does not depend on the zoom.
    let sx = 0;
    let sy = 0;
    for (const pin of group) {
      const w = mapProject(pin, 0);
      sx += w.x;
      sy += w.y;
    }
    const centre = mapUnproject({ x: sx / group.length, y: sy / group.length }, 0);
    items.push({ type: "cluster", id: `cluster:${seed.pin.id}:${group.length}`, count: group.length, pins: group, lat: centre.lat, lng: centre.lng });
  });
  return items;
}

export interface MapClusterExpand {
  /** Where to move the map. */
  view: MapView;
  /** True when the pins cannot be told apart by zooming any further: show them as a list. */
  list: boolean;
}

/**
 * What a click on a cluster does: zoom and centre so its pins fit, at least one step in and never past the max cluster
 * zoom. `list` is true when the pins still form one cluster at that zoom (the same spot).
 */
export function mapClusterExpand<T extends MapLatLng & { id: string }>(
  pins: readonly T[],
  view: MapView,
  size: MapSize,
  { radius = MAP_CLUSTER_RADIUS, maxZoom = MAP_CLUSTER_MAX_ZOOM, minZoom = MAP_MIN_ZOOM, limit = MAP_MAX_ZOOM, padding = 64 }: MapClusterOptions & { minZoom?: number; limit?: number; padding?: number } = {},
): MapClusterExpand {
  const cap = Math.min(maxZoom, limit);
  const fit = mapFit(pins, size, { padding, singleZoom: cap, maxZoom: cap, minZoom });
  const zoom = view.zoom >= cap ? view.zoom : Math.min(cap, Math.max(fit.zoom, view.zoom + 1));
  const next = { center: fit.center, zoom };
  const again = mapCluster(pins, zoom, { radius, maxZoom });
  return { view: next, list: again.length === 1 && again[0]?.type === "cluster" };
}
