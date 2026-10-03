import type { MapLatLng } from "./map-geo";

export type MapAlertSeverity = "critical" | "high" | "medium" | "low";

/** Most severe first. */
export const MAP_ALERT_SEVERITIES: readonly MapAlertSeverity[] = ["critical", "high", "medium", "low"];

/** Something happening at a place: an incident, an outage, a warning. */
export interface MapAlert extends MapLatLng {
  id: string;
  title: string;
  titleAr?: string;
  /** Default `"medium"`. */
  severity?: MapAlertSeverity;
  /** When it happened or was last updated: a Date, epoch milliseconds or an ISO string. */
  at: Date | number | string;
  /** A short second line ("Road closed", "3 units on site"). */
  detail?: string;
  detailAr?: string;
  /** A `MapLayer` id, so the layer toggles hide it with the rest. */
  layer?: string;
}

/** A named place to jump to: a country, a city, a site. */
export interface MapRegionPreset {
  id: string;
  label: string;
  labelAr?: string;
  center: MapLatLng;
  zoom: number;
}

/** A recency filter. `ms: null` keeps everything. */
export interface MapTimeRange {
  id: string;
  ms: number | null;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const DEFAULT_MAP_TIME_RANGES: readonly MapTimeRange[] = [
  { id: "24h", ms: DAY },
  { id: "7d", ms: 7 * DAY },
  { id: "30d", ms: 30 * DAY },
  { id: "all", ms: null },
];

export const mapAlertSeverity = (alert: Pick<MapAlert, "severity">): MapAlertSeverity => alert.severity ?? "medium";

/** Epoch milliseconds of `at`, or `NaN` when it cannot be read. */
export const mapAlertTime = (at: MapAlert["at"]): number => (at instanceof Date ? at.getTime() : typeof at === "number" ? at : Date.parse(at));

/**
 * The alerts inside a time range, most severe first and newest first within a severity. An alert with an unreadable
 * time only shows under "all".
 */
export function filterMapAlerts<T extends MapAlert>(alerts: readonly T[], ms: number | null, now: number = Date.now()): T[] {
  const cutoff = ms === null ? null : now - ms;
  return alerts
    .filter((a) => {
      if (cutoff === null) return true;
      const t = mapAlertTime(a.at);
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort((a, b) => {
      const s = MAP_ALERT_SEVERITIES.indexOf(mapAlertSeverity(a)) - MAP_ALERT_SEVERITIES.indexOf(mapAlertSeverity(b));
      if (s) return s;
      return (mapAlertTime(b.at) || 0) - (mapAlertTime(a.at) || 0);
    });
}

export function countMapAlerts(alerts: readonly MapAlert[]): Record<MapAlertSeverity, number> {
  const out: Record<MapAlertSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of alerts) out[mapAlertSeverity(a)] += 1;
  return out;
}

/** True when a view sits on a region (so its preset stays highlighted until the map is moved away). */
export function isMapRegionView(view: { center: MapLatLng; zoom: number } | null | undefined, region: MapRegionPreset, tolerance = 1e-6): boolean {
  if (!view) return false;
  return Math.abs(view.zoom - region.zoom) < 1e-3 && Math.abs(view.center.lat - region.center.lat) < tolerance && Math.abs(view.center.lng - region.center.lng) < tolerance;
}
