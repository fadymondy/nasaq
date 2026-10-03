import type { Component } from "vue";
import type { MapLatLng } from "./map-geo";

export type MapTone = "brand" | "info" | "success" | "warning" | "danger" | "neutral";

export interface MapPin extends MapLatLng {
  id: string;
  label: string;
  labelAr?: string;
  /** Second line in the card: an address, a driver, a status sentence. */
  detail?: string;
  detailAr?: string;
  /** A `MapLayer` id. Pins without one are always shown. */
  layer?: string;
  tone?: MapTone;
  /** A lucide-vue-next icon component. */
  icon?: Component;
  /** A moving thing, such as a driver: a soft pulse and a glide to each new position. Off while dragging and under reduced motion. */
  live?: boolean;
  /** A short status word for a badge in the card ("Moving", "Idle"). */
  status?: string;
  statusAr?: string;
  /** Facts for the card: speed, battery, last seen. */
  meta?: readonly { label: string; labelAr?: string; value: string | number }[];
}

export interface MapRoute {
  id: string;
  points: readonly MapLatLng[];
  label: string;
  labelAr?: string;
  layer?: string;
  tone?: MapTone;
  dashed?: boolean;
}

/** A filled polygon: a delivery zone, a service area, a no-go region. */
export interface MapArea {
  id: string;
  /** Ring of at least three points. It is closed for you. */
  points: readonly MapLatLng[];
  label: string;
  labelAr?: string;
  layer?: string;
  tone?: MapTone;
  /** Draw the outline dashed. */
  dashed?: boolean;
}

export interface MapLayer {
  id: string;
  label: string;
  labelAr?: string;
  tone?: MapTone;
  icon?: Component;
  /** Start hidden. */
  defaultHidden?: boolean;
}

/** What the `cluster` slot receives. */
export interface MapClusterInfo {
  count: number;
  pins: readonly MapPin[];
  lat: number;
  lng: number;
  /** Diameter of the bubble in px, grown with the count. */
  size: number;
}
