---
name: map-view
title: MapView
category: charts
status: stable
summary: A map of pins and routes without a map library, with layer toggles, a legend, zoom and pan by drag, wheel, buttons or keyboard, a location card and pin clustering; tiles come from a URL template you provide, and without one it draws a coordinate grid.
exports: [MapView, MapViewLabels, MapTone, MapPin, MapRoute, MapArea, MapLayer, MapClusterInfo, MapViewProps]
related: [geo-list, entity-list, context-menu, copy-button]
story: components-charts-maps-map-view
keywords: [map, pins, cluster, clustering, routes, fleet, location, tiles, layers, legend, gps, geo]
---

# MapView

Where things are. `MapView` draws pins and route lines over a base that is either your tile server or a quiet grid of
latitude and longitude lines. It has a legend with layer toggles, zoom and pan, a scale bar and a card for the
selected pin. There is no map library and no key: Nasaq does not ship a tile service, so set `tileUrl` to one you
are allowed to use, and show its credit with `attribution`.

## When to use

- A fleet, delivery, branch or field-team view where place matters more than the numbers.
- Next to a list: select a row and show its pin ([GeoList](../geo-list/README.md) is the ranked-table cousin).

## When not to use

- Turn-by-turn navigation, geocoding or address search: these need a routing service.
- Tens of thousands of pins: clustering is done in the browser on every zoom, and it is built for hundreds. Filter with layers or cluster on the server first.

## Import

```tsx
import { MapView, type MapPin, type MapLayer, type MapRoute } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { MapView } from "@fadymondy/nasaq/web";
import { Truck } from "lucide-react";

export function Fleet() {
  return (
    <MapView
      label="Fleet"
      layers={[{ id: "vans", label: "Vans", labelAr: "الشاحنات", tone: "info" }]}
      pins={[{ id: "v1", lat: 24.7136, lng: 46.6753, label: "Van 12", labelAr: "شاحنة 12", layer: "vans", tone: "info", icon: Truck, status: "Moving", statusAr: "تتحرك" }]}
      routes={[{ id: "r1", layer: "vans", label: "Route A", points: [{ lat: 24.71, lng: 46.67 }, { lat: 24.75, lng: 46.72 }] }]}
      tileUrl="https://tile.example.com/{z}/{x}/{y}.png"
      attribution="© Example maps"
    />
  );
}
```

## Anatomy

```
MapView                       data-slot="map-view"  dir="ltr"  role="group" (map)
├─ tiles (img) or grid (svg)  base
├─ svg                        areas (data-slot="map-areas"): one polygon each, data-area
├─ svg                        routes: casing + line + start and end dots
├─ button[data-pin]           one per visible pin, in a ContextMenuActions when pinActions is set
├─ button[data-cluster]       a count bubble for pins that are close together (see Clustering)
├─ legend                     layers panel (collapsed by default): toggles, zones, routes with their length
├─ [data-picked-point]        draggable pin while `pickedPoint` is set
├─ svg + [data-vertex]        dashed shape and draggable vertices while `editing` (data-slot="map-edit-shape")
├─ toolbar                    Remove last point, Finish shape (data-slot="map-edit-toolbar")
├─ zoom in, zoom out, fit     buttons at the inline end
├─ scale bar, attribution
├─ section                    location card of the selected pin
└─ section[data-slot=map-cluster-card]   list of the pins in a cluster at the max cluster zoom
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `pins` | `MapPin[]` | `[]` | `id`, `lat`, `lng`, `label`, `labelAr`, `detail`, `layer`, `tone`, `icon`, `live`, `status`, `meta`. `live` adds a soft pulse and a glide to each new position (a moving driver); the glide is off while dragging and under reduced motion. |
| `routes` | `MapRoute[]` | `[]` | `id`, `points`, `label`, `layer`, `tone`, `dashed`. |
| `areas` | `MapArea[]` | `[]` | Filled polygons for zones: `id`, `points` (a ring of 3 or more, closed for you), `label`, `labelAr`, `layer`, `tone`, `dashed`. Drawn under routes and pins, listed in the legend, included when the map fits. |
| `layers` | `MapLayer[]` | `[]` | `id`, `label`, `labelAr`, `tone`, `icon`, `defaultHidden`. |
| `visibleLayers` / `onVisibleLayersChange` | `string[]` | all shown | Controlled layer visibility. |
| `tileUrl` | `string` | none | Template with `{z}`, `{x}`, `{y}`. Only http, https and site paths are accepted. |
| `attribution` | `ReactNode` | none | Tile provider credit. |
| `selectedId` / `defaultSelectedId` / `onSelect` | `string \| null` | none | Selected pin. |
| `pinActions` | `(pin) => ContextMenuAction[]` | none | Buttons in the card and a context menu on the pin. |
| `renderCard` | `(pin) => ReactNode` | facts from `meta` | Body of the card. |
| `view` / `defaultView` / `onViewChange` | `{ center: {lat, lng}, zoom }` | fits the data | Without one, the map fits every visible pin and route until someone moves it. |
| `minZoom` / `maxZoom` | `number` | `1` / `19` | |
| `cluster` | `boolean` | on above 30 visible pins | Group close pins into count bubbles. Set `true` or `false` to force it. |
| `clusterRadius` | `number` | `60` | Distance in px under which pins share a bubble. |
| `renderCluster` | `(cluster: MapClusterInfo) => ReactNode` | the count | Contents of a bubble: `{ count, pins, lat, lng, size }`. The button, size, focus and click stay. |
| `legend` | `boolean` | `true` | Legacy switch; `false` is the same as `layersPanel="hidden"`. |
| `layersPanel` | `"collapsed" \| "expanded" \| "hidden"` | `"collapsed"` | The layers panel starts as a small button over the map; `expanded` opens it, `hidden` removes it. Behaviour change: it used to start open. |
| `onMapClick` | `(point: {lat, lng}) => void` | none | A tap on empty map (not a drag, pin, area or control). |
| `onAreaClick` | `(area: MapArea) => void` | none | A tap inside a zone, topmost first. Legend zone rows become buttons. |
| `onPinClick` | `(pin: MapPin) => void` | none | Fires on pin activation, next to `onSelect`. |
| `pickedPoint` / `defaultPickedPoint` / `onPickedPointChange` | `{lat, lng} \| null` | none | A draggable pin for choosing a location. Drag it, or focus it and use the arrow keys (Shift for larger steps). |
| `editing` | `boolean` | `false` | Area editing mode: a tap adds a vertex, vertices are draggable, a toolbar offers Remove last point and Finish shape. |
| `editPoints` / `defaultEditPoints` / `onAreaChange` / `onAreaDone` | `MapLatLng[]` | `[]` | The ring being edited. `onAreaChange` fires after every add, move or removal; `onAreaDone` from Finish shape (three points or more). |
| `editTone` | `MapTone` | `"brand"` | Tone of the shape being edited. |
| `label`, `locale`, `labels`, `className` | | | Height comes from `className` (default 28rem). |

### Clustering

Pins are grouped by their distance in px on the same Web Mercator projection the map draws with, so a bubble depends on
the zoom and never on where you have panned to. Zooming in pulls the pins apart and the bubbles split; zooming out
merges them again.

- A bubble shows the number of pins, grows with it (36 to 64 px) and uses the brand action colour.
- Click, or Enter or Space, zooms and centres so the pins of the bubble fit, at least one step in.
- From zoom 16 (`MAP_CLUSTER_MAX_ZOOM`, or `maxZoom` if lower) only pins on the same spot stay together, so pins with
  equal coordinates cannot cluster forever. Activating such a bubble lists its pins in the card; choose one to select it.
- The selected pin is never inside a bubble: it stays a pin, and the bubble count leaves it out.
- Pins that are hidden by a layer are not counted. Routes are not clustered.

```tsx
<MapView pins={manyPins} clusterRadius={80} renderCluster={(c) => <span className="text-caption">{c.count}</span>} />
```

### Geometry helpers (no React)

`mapProject`, `mapUnproject`, `mapToScreen`, `mapFromScreen`, `mapFit`, `mapPanBy`, `mapZoomAt`, `mapDistance`,
`mapPointInPolygon(point, ring)` (even-odd hit test), `mapRouteLength`, `mapFormatCoordinates`, `mapBounds`, and for clustering `mapCluster(pins, zoom, { radius, maxZoom,
selectedId })` and `mapClusterExpand(pins, view, size)` (the view to move to and whether to list the pins).

## Accessibility

| Key | Action |
| --- | --- |
| Arrow keys | Pan (map focused). |
| `+` / `-` | Zoom. |
| Home or `0` | Show everything. |
| Tab | Moves through the pins and cluster bubbles. Enter or Space selects a pin, or zooms into a bubble. |
| Escape | Clears the selection. |
| Arrow keys, Shift+arrows (pin or vertex focused) | Move the picked pin or a vertex by 8 px, or 32 px with Shift. |
| Delete, Backspace (vertex focused) | Removes the vertex. |
| Enter (map focused, `editing`) | Adds a vertex at the centre of the view. |
| Shift+F10, Menu key | Opens the pin's menu. |

- Every pin is a button named by its label; the selected one says so and has `aria-pressed`.
- Every bubble is a button named like "12 pins, zoom in" ("12 pins, show the list" at the max cluster zoom).
- Everything the map shows is also in the legend (counts, routes with length) and the card, as text.
- Zoom buttons and the fit button work without a pointer; wheel zoom only adds a shortcut.

## RTL & i18n

- The canvas is always `dir="ltr"`: a map does not mirror. The legend, the card and the buttons follow the page direction, and the buttons swap sides.
- Coordinates and lengths are Latin digits, isolated with `bdi`.
- Pins carry `labelAr`, `detailAr` and `statusAr`.

## Styling & tokens

Bubbles use the brand action colour with a card-colour border and a soft ring. Status tones use `nq-info`, `nq-success`, `nq-warning`, `nq-danger` and the brand action colour; route casing uses the card colour so lines stay readable on dark tiles.

## Do / Don't

- Do show the tile provider's credit.
- Do put the same information in a list next to the map for people who cannot use a pointer.
- Do keep a list next to a clustered map: a bubble is a shortcut to the pins, not the only way to them.
- Do not use colour alone: pins carry an icon and the card carries a status word.
- Do not point `tileUrl` at a service whose terms forbid your traffic.

## Related

- [GeoList](../geo-list/README.md)
- [EntityList](../entity-list/README.md)
- [ContextMenu](../context-menu/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-charts-maps-map-view--docs
