// nqMapView: a map of places and routes without a map library: pins, route lines, zones, layer toggles, zoom and pan by drag, wheel,
// buttons or keyboard, pin clustering and a location card. Tiles come from a URL template; without one a latitude / longitude grid is
// drawn, so it works offline. The markup is the React MapView's (see the Blade component); the data comes from the options.
//
//   <div data-slot="map-view" x-data="nqMapView({ pins: [{ id: 'v1', lat: 24.71, lng: 46.67, label: 'Van 12' }], routes: [], tileUrl: '…/{z}/{x}/{y}.png' })" x-ref="canvas"> … </div>
//
// Options: pins, routes, areas, layers, visibleLayers, tileUrl, attribution, selectedId, view ({ center, zoom }), minZoom, maxZoom, cluster,
// clusterRadius, picked ({ lat, lng }), editing, editPoints, editTone, locale, labels (strings with "{n}", "{name}", "{km}"), classes
// (tone class maps from the Blade file), icons (name to SVG markup, "default" for the pin without an icon).
// Events (bubbling): nq-map-select { id }, nq-map-pin-click { pin }, nq-map-click { point }, nq-map-area-click { area },
// nq-map-view { view }, nq-map-layers { visible }, nq-map-picked { point }, nq-map-area-change { points }, nq-map-area-done { points },
// nq-map-action { pin, action } (pin.actions: [{ id, label, danger }]). The pin context menu of the other stacks is not ported.

import {
  MAP_CLUSTER_MAX_ZOOM,
  MAP_CLUSTER_RADIUS,
  MAP_CLUSTER_THRESHOLD,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  mapCluster,
  mapClusterExpand,
  mapFit,
  mapFormatCoordinates,
  mapFromScreen,
  mapGraticuleStep,
  mapPanBy,
  mapPointInPolygon,
  mapRouteLength,
  mapScaleBar,
  mapTileUrl,
  mapToScreen,
  mapVisibleTiles,
  mapZoomAt,
  type MapLatLng,
  type MapSize,
  type MapView,
} from "./map-geo";
import type { Magics, Register } from "./types";

type Tone = "brand" | "info" | "success" | "warning" | "danger" | "neutral";
interface Pin extends MapLatLng {
  id: string;
  label: string;
  labelAr?: string;
  detail?: string;
  detailAr?: string;
  layer?: string;
  tone?: Tone;
  icon?: string;
  live?: boolean;
  status?: string;
  statusAr?: string;
  meta?: { label: string; labelAr?: string; value: string | number }[];
  actions?: { id: string; label: string; danger?: boolean }[];
}
interface Route {
  id: string;
  points: MapLatLng[];
  label: string;
  labelAr?: string;
  layer?: string;
  tone?: Tone;
  dashed?: boolean;
}
interface Area {
  id: string;
  points: MapLatLng[];
  label: string;
  labelAr?: string;
  layer?: string;
  tone?: Tone;
  dashed?: boolean;
}
interface Layer {
  id: string;
  label: string;
  labelAr?: string;
  tone?: Tone;
  defaultHidden?: boolean;
}
interface Options {
  pins?: Pin[];
  routes?: Route[];
  areas?: Area[];
  layers?: Layer[];
  visibleLayers?: string[];
  tileUrl?: string;
  attribution?: string;
  selectedId?: string | null;
  view?: MapView;
  minZoom?: number;
  maxZoom?: number;
  cluster?: boolean;
  clusterRadius?: number;
  picked?: MapLatLng | null;
  editing?: boolean;
  editPoints?: MapLatLng[];
  editTone?: Tone;
  locale?: string;
  labels?: Record<string, string>;
  classes?: Record<string, Record<string, string>>;
  icons?: Record<string, string>;
}

const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const arCount = (n: number) => (n === 2 ? "مكانان" : n <= 10 ? `${n} أماكن` : `${n} مكانًا`);

interface State extends Magics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: any;
}

export const mapView: Register = (Alpine) => {
  Alpine.data("nqMapView", (options: Options = {}) => ({
    pins: (options.pins ?? []).map((p) => ({ ...p })) as Pin[],
    routes: (options.routes ?? []) as Route[],
    areas: (options.areas ?? []) as Area[],
    layers: (options.layers ?? []) as Layer[],
    shown: [...(options.visibleLayers ?? (options.layers ?? []).filter((l) => !l.defaultHidden).map((l) => l.id))] as string[],
    tileUrl: options.tileUrl ?? "",
    minZoom: options.minZoom ?? MAP_MIN_ZOOM,
    maxZoom: options.maxZoom ?? MAP_MAX_ZOOM,
    clusterOpt: options.cluster as boolean | undefined,
    radius: options.clusterRadius ?? MAP_CLUSTER_RADIUS,
    selectedId: (options.selectedId ?? null) as string | null,
    own: (options.view ?? null) as MapView | null,
    size: { width: 0, height: 0 } as MapSize,
    drag: false,
    legendOpen: false,
    picked: (options.picked ?? null) as MapLatLng | null,
    editing: options.editing === true,
    ring: [...(options.editPoints ?? [])] as MapLatLng[],
    editTone: (options.editTone ?? "brand") as Tone,
    clusterIds: null as string[] | null,
    locale: options.locale ?? (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en"),
    labels: (options.labels ?? {}) as Record<string, string>,
    classes: (options.classes ?? {}) as Record<string, Record<string, string>>,
    icons: (options.icons ?? {}) as Record<string, string>,
    last: null as { x: number; y: number } | null,
    moved: false,
    grab: null as { dx: number; dy: number } | null,
    observer: null as ResizeObserver | null,
    wheel: null as ((e: WheelEvent) => void) | null,

    init(this: State) {
      const el = this.$refs.canvas ?? this.$el;
      const read = () => {
        this.size = { width: el.clientWidth, height: el.clientHeight };
      };
      read();
      if (typeof ResizeObserver !== "undefined") {
        this.observer = new ResizeObserver(read);
        this.observer.observe(el);
      }
      this.wheel = (event: WheelEvent) => {
        event.preventDefault();
        const rect = el.getBoundingClientRect();
        this.zoomBy(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0025), { x: event.clientX - rect.left, y: event.clientY - rect.top });
      };
      el.addEventListener("wheel", this.wheel, { passive: false });
    },
    destroy(this: State) {
      this.observer?.disconnect();
      if (this.wheel) (this.$refs.canvas ?? this.$el).removeEventListener("wheel", this.wheel);
    },

    // ---- text ----
    get ar(): boolean {
      return (this as unknown as State).locale.startsWith("ar");
    },
    pick(this: State, en?: string, arabic?: string): string {
      return (this.ar ? arabic || en : en || arabic) ?? "";
    },
    name(this: State, x: { label: string; labelAr?: string }): string {
      return this.pick(x.label, x.labelAr);
    },
    str(this: State, key: string, vars: Record<string, string | number> = {}): string {
      return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), this.labels[key] ?? key);
    },
    countText(this: State, n: number): string {
      return this.ar ? arCount(n) : `${n} pins`;
    },
    emit(this: State, name: string, detail: unknown) {
      this.$el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    },

    // ---- derived ----
    isShown(this: State, layer?: string): boolean {
      return !layer || !this.layers.some((l: Layer) => l.id === layer) || this.shown.includes(layer);
    },
    get vPins(): Pin[] {
      const s = this as unknown as State;
      return s.pins.filter((p: Pin) => s.isShown(p.layer));
    },
    get vRoutes(): Route[] {
      const s = this as unknown as State;
      return s.routes.filter((r: Route) => s.isShown(r.layer));
    },
    get vAreas(): Area[] {
      const s = this as unknown as State;
      return s.areas.filter((a: Area) => s.isShown(a.layer));
    },
    get ready(): boolean {
      const s = this as unknown as State;
      return s.size.width > 0 && s.size.height > 0;
    },
    get fitted(): MapView {
      const s = this as unknown as State;
      const pts: MapLatLng[] = [...s.vPins, ...s.vRoutes.flatMap((r: Route) => r.points), ...s.vAreas.flatMap((a: Area) => a.points)];
      return mapFit(pts, s.size, { minZoom: s.minZoom, maxZoom: s.maxZoom });
    },
    get view(): MapView {
      const s = this as unknown as State;
      return s.own ?? s.fitted;
    },
    at(this: State, pt: MapLatLng) {
      return mapToScreen(pt, this.view, this.size);
    },
    get clustering(): boolean {
      const s = this as unknown as State;
      return s.clusterOpt ?? s.vPins.length > MAP_CLUSTER_THRESHOLD;
    },
    get clusterMax(): number {
      const s = this as unknown as State;
      return Math.min(MAP_CLUSTER_MAX_ZOOM, s.maxZoom);
    },
    get items(): any[] {
      const s = this as unknown as State;
      return s.clustering
        ? mapCluster(s.vPins, s.view.zoom, { radius: s.radius, maxZoom: s.clusterMax, selectedId: s.selectedId })
        : s.vPins.map((pin: Pin) => ({ type: "pin", pin, lat: pin.lat, lng: pin.lng }));
    },
    onScreen(this: State, pt: MapLatLng, pad: number): boolean {
      const p = this.at(pt);
      return p.x >= -pad && p.y >= -pad && p.x <= this.size.width + pad && p.y <= this.size.height + pad * 2;
    },
    get pinItems(): { key: string; pin: Pin; x: number; y: number }[] {
      const s = this as unknown as State;
      if (!s.ready) return [];
      return s.items
        .filter((i: { type: string }) => i.type === "pin")
        .filter((i: { pin: Pin }) => s.onScreen(i.pin, 48))
        .map((i: { pin: Pin }) => ({ key: i.pin.id, pin: i.pin, ...s.at(i.pin) }));
    },
    get clusterItems(): { key: string; id: string; count: number; pins: Pin[]; x: number; y: number; d: number }[] {
      const s = this as unknown as State;
      if (!s.ready) return [];
      return s.items
        .filter((i: { type: string }) => i.type === "cluster")
        .filter((i: MapLatLng) => s.onScreen(i, 64))
        .map((i: { id: string; count: number; pins: Pin[]; lat: number; lng: number }) => ({
          key: i.id,
          id: i.id,
          count: i.count,
          pins: i.pins,
          ...s.at(i),
          d: Math.round(Math.min(64, 36 + Math.log2(i.count) * 6)),
        }));
    },
    get selected(): Pin | undefined {
      const s = this as unknown as State;
      return s.selectedId ? s.pins.find((p: Pin) => p.id === s.selectedId) : undefined;
    },
    get listed(): Pin[] {
      const s = this as unknown as State;
      return s.clusterIds && s.view.zoom >= s.clusterMax ? s.vPins.filter((p: Pin) => s.clusterIds.includes(p.id)) : [];
    },
    get tiles() {
      const s = this as unknown as State;
      if (!s.ready || !s.tileUrl) return [];
      return mapVisibleTiles(s.view, s.size).flatMap((t) => {
        const src = mapTileUrl(s.tileUrl, t.x, t.y, t.z);
        return src ? [{ ...t, src, style: `left:${t.left}px;top:${t.top}px;width:${t.size + 0.5}px;height:${t.size + 0.5}px` }] : [];
      });
    },
    ptsOf(this: State, points: readonly MapLatLng[]): string {
      return points
        .map((p) => this.at(p))
        .map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`)
        .join(" ");
    },
    cls(this: State, group: string, tone?: string): string {
      return this.classes[group]?.[tone ?? "brand"] ?? "";
    },
    get gridSvg(): string {
      const s = this as unknown as State;
      if (!s.ready || s.tileUrl) return "";
      const v = s.view;
      const step = mapGraticuleStep(v.zoom);
      const nw = mapFromScreen({ x: 0, y: 0 }, v, s.size);
      const se = mapFromScreen({ x: s.size.width, y: s.size.height }, v, s.size);
      let out = "";
      const west = Math.min(nw.lng, se.lng);
      const east = Math.max(nw.lng, se.lng);
      let n = 0;
      if (east - west < 360)
        for (let x = Math.ceil(west / step) * step; x <= east && n < 60; x += step, n++) {
          const px = mapToScreen({ lat: v.center.lat, lng: x }, v, s.size).x;
          out += `<line x1="${px}" x2="${px}" y1="0" y2="${s.size.height}" stroke-width="1"/>`;
        }
      n = 0;
      for (let y = Math.ceil(Math.min(nw.lat, se.lat) / step) * step; y <= Math.max(nw.lat, se.lat) && n < 60; y += step, n++) {
        const py = mapToScreen({ lat: y, lng: v.center.lng }, v, s.size).y;
        out += `<line x1="0" x2="${s.size.width}" y1="${py}" y2="${py}" stroke-width="1"/>`;
      }
      return out;
    },
    get areasSvg(): string {
      const s = this as unknown as State;
      if (!s.ready) return "";
      return s.vAreas
        .filter((a: Area) => a.points.length >= 3)
        .map(
          (a: Area) =>
            `<polygon data-area="${esc(a.id)}" points="${s.ptsOf(a.points)}" stroke-width="2" stroke-linejoin="round"${a.dashed ? ' stroke-dasharray="6 6"' : ""} class="${esc(s.cls("fill", a.tone))} ${esc(s.cls("stroke", a.tone ?? "brand"))}"/>`,
        )
        .join("");
    },
    get routesSvg(): string {
      const s = this as unknown as State;
      if (!s.ready) return "";
      return s.vRoutes
        .filter((r: Route) => r.points.length >= 2)
        .map((r: Route) => {
          const pts = s.ptsOf(r.points);
          const a = s.at(r.points[0]!);
          const b = s.at(r.points[r.points.length - 1]!);
          const stroke = esc(s.cls("stroke", r.tone ?? "info"));
          return (
            `<g data-route="${esc(r.id)}"><polyline points="${pts}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="7" class="stroke-card" opacity="0.85"/>` +
            `<polyline points="${pts}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"${r.dashed ? ' stroke-dasharray="2 9"' : ""} class="${stroke}"/>` +
            `<circle cx="${a.x}" cy="${a.y}" r="4.5" stroke-width="2" class="fill-card ${stroke}"/>` +
            `<circle cx="${b.x}" cy="${b.y}" r="4.5" stroke-width="2" class="fill-primary stroke-card"/></g>`
          );
        })
        .join("");
    },
    get editSvg(): string {
      const s = this as unknown as State;
      if (!s.editing || s.ring.length === 0 || !s.ready) return "";
      const stroke = esc(s.cls("stroke", s.editTone));
      return s.ring.length >= 3
        ? `<polygon points="${s.ptsOf(s.ring)}" stroke-width="2" stroke-linejoin="round" stroke-dasharray="6 6" class="${esc(s.cls("fill", s.editTone))} ${stroke}"/>`
        : `<polyline points="${s.ptsOf(s.ring)}" fill="none" stroke-width="2" stroke-dasharray="6 6" class="${stroke}"/>`;
    },
    get vertices(): { i: number; x: number; y: number }[] {
      const s = this as unknown as State;
      return s.editing && s.ready ? s.ring.map((p: MapLatLng, i: number) => ({ i, ...s.at(p) })) : [];
    },
    get pickedAt(): { x: number; y: number } {
      const s = this as unknown as State;
      return s.picked && s.ready ? s.at(s.picked) : { x: 0, y: 0 };
    },
    get scale(): { meters: number; px: number } {
      return mapScaleBar((this as unknown as State).view);
    },
    get scaleText(): string {
      const m = (this as unknown as State).scale.meters;
      return m >= 1000 ? `${m / 1000} km` : `${m} m`;
    },
    get empty(): boolean {
      const s = this as unknown as State;
      return s.pins.length === 0 && s.routes.length === 0 && s.areas.length === 0 && !s.editing && !s.picked;
    },
    get hasLegend(): boolean {
      const s = this as unknown as State;
      return s.layers.length > 0 || s.vRoutes.length > 0 || s.vAreas.length > 0;
    },
    icon(this: State, pin: Pin): string {
      return this.icons[pin.icon ?? "default"] ?? this.icons.default ?? "";
    },
    fmtKm(this: State, points: MapLatLng[]): string {
      return new Intl.NumberFormat(this.ar ? "ar-u-nu-latn" : "en", { maximumFractionDigits: 1 }).format(mapRouteLength(points) / 1000);
    },
    layerCount(this: State, id: string): number {
      return this.pins.filter((p: Pin) => p.layer === id).length;
    },
    coords(this: State, digits?: number): string {
      return this.selected ? mapFormatCoordinates(this.selected, digits) : "";
    },
    copyCoords(this: State) {
      void navigator.clipboard?.writeText(this.coords(6));
    },

    // ---- actions ----
    setView(this: State, next: MapView) {
      this.own = next;
      this.emit("nq-map-view", { view: next });
    },
    select(this: State, id: string | null) {
      this.selectedId = id;
      this.clusterIds = null;
      this.emit("nq-map-select", { id });
    },
    pinClick(this: State, pin: Pin) {
      this.select(pin.id === this.selectedId ? null : pin.id);
      this.emit("nq-map-pin-click", { pin });
    },
    runAction(this: State, action: { id: string }) {
      if (this.selected) this.emit("nq-map-action", { pin: this.selected, action });
    },
    zoomBy(this: State, delta: number, anchor?: { x: number; y: number }) {
      this.setView(mapZoomAt(this.view, delta, anchor ?? { x: this.size.width / 2, y: this.size.height / 2 }, this.size, { min: this.minZoom, max: this.maxZoom }));
    },
    fit(this: State) {
      this.own = null;
      this.emit("nq-map-view", { view: this.fitted });
    },
    expand(this: State, c: { pins: Pin[] }) {
      const next = mapClusterExpand(c.pins, this.view, this.size, { radius: this.radius, maxZoom: this.clusterMax, minZoom: this.minZoom, limit: this.maxZoom });
      this.setView(next.view);
      this.clusterIds = next.list ? c.pins.map((p) => p.id) : null;
      (this.$refs.canvas ?? this.$el).focus({ preventScroll: true });
    },
    toggleLayer(this: State, id: string, on: boolean) {
      this.shown = on ? [...this.shown, id] : this.shown.filter((x: string) => x !== id);
      this.emit("nq-map-layers", { visible: [...this.shown] });
    },
    isOn(this: State, id: string): boolean {
      return this.shown.includes(id);
    },
    areaClick(this: State, area: Area) {
      this.emit("nq-map-area-click", { area });
    },
    changeRing(this: State, next: MapLatLng[]) {
      this.ring = next;
      this.emit("nq-map-area-change", { points: next });
    },
    done(this: State) {
      this.emit("nq-map-area-done", { points: [...this.ring] });
    },

    // ---- pointer and keyboard ----
    isControl(event: Event): boolean {
      return !!(event.target as HTMLElement).closest("[data-map-control]");
    },
    pointerDown(this: State, event: PointerEvent) {
      if (event.button !== 0 || this.isControl(event)) return;
      this.last = { x: event.clientX, y: event.clientY };
      this.moved = false;
      this.drag = true;
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    },
    pointerMove(this: State, event: PointerEvent) {
      if (!this.last) return;
      const dx = event.clientX - this.last.x;
      const dy = event.clientY - this.last.y;
      if (!this.moved && Math.hypot(dx, dy) < 3) return;
      this.moved = true;
      this.last = { x: event.clientX, y: event.clientY };
      this.setView(mapPanBy(this.view, dx, dy));
    },
    pointerUp(this: State, event: PointerEvent) {
      if (!this.last) return;
      this.last = null;
      this.drag = false;
      const el = event.currentTarget as HTMLElement;
      if (el.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId);
      if (!this.moved && event.type === "pointerup" && !this.isControl(event)) {
        const rect = el.getBoundingClientRect();
        const at = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const point = mapFromScreen(at, this.view, this.size);
        if (this.editing) {
          this.changeRing([...this.ring, point]);
          return;
        }
        this.select(null);
        const hit = [...this.vAreas].reverse().find((a: Area) =>
          mapPointInPolygon(
            at,
            a.points.map((p) => mapToScreen(p, this.view, this.size)),
          ),
        );
        if (hit) this.areaClick(hit);
        this.emit("nq-map-click", { point });
      }
    },
    dblClick(this: State, event: MouseEvent) {
      if (this.isControl(event)) return;
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.zoomBy(1, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    },
    keyDown(this: State, event: KeyboardEvent) {
      if (event.target !== event.currentTarget) {
        if (event.key === "Escape" && this.selectedId) {
          this.select(null);
          (event.currentTarget as HTMLElement).focus();
        }
        return;
      }
      const step = 80;
      const v = this.view;
      switch (event.key) {
        case "ArrowLeft":
          this.setView(mapPanBy(v, step, 0));
          break;
        case "ArrowRight":
          this.setView(mapPanBy(v, -step, 0));
          break;
        case "ArrowUp":
          this.setView(mapPanBy(v, 0, step));
          break;
        case "ArrowDown":
          this.setView(mapPanBy(v, 0, -step));
          break;
        case "+":
        case "=":
          this.zoomBy(1);
          break;
        case "-":
        case "_":
          this.zoomBy(-1);
          break;
        case "Home":
        case "0":
          this.fit();
          break;
        case "Escape":
          this.select(null);
          break;
        case "Enter":
          if (!this.editing) return;
          this.changeRing([...this.ring, v.center]);
          break;
        default:
          return;
      }
      event.preventDefault();
    },

    // ---- draggable handles (picked point, vertices) ----
    handleRel(this: State, event: PointerEvent) {
      const rect = (this.$refs.canvas ?? this.$el).getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    },
    handleDown(this: State, event: PointerEvent, x: number, y: number) {
      if (event.button !== 0) return;
      const at = this.handleRel(event);
      this.grab = { dx: x - at.x, dy: y - at.y };
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    },
    handleMove(this: State, event: PointerEvent, kind: string, index: number) {
      if (!this.grab) return;
      const at = this.handleRel(event);
      this.moveHandle(kind, index, { x: at.x + this.grab.dx, y: at.y + this.grab.dy });
    },
    handleUp(this: State, event: PointerEvent) {
      this.grab = null;
      const el = event.currentTarget as HTMLElement;
      if (el.hasPointerCapture?.(event.pointerId)) el.releasePointerCapture(event.pointerId);
    },
    handleKey(this: State, event: KeyboardEvent, kind: string, index: number, x: number, y: number) {
      const step = event.shiftKey ? 32 : 8;
      const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const d = delta[event.key];
      if (d) this.moveHandle(kind, index, { x: x + d[0], y: y + d[1] });
      else if (kind === "vertex" && (event.key === "Delete" || event.key === "Backspace")) this.changeRing(this.ring.filter((_: MapLatLng, k: number) => k !== index));
      else return;
      event.preventDefault();
      event.stopPropagation();
    },
    moveHandle(this: State, kind: string, index: number, screen: { x: number; y: number }) {
      const next = mapFromScreen(screen, this.view, this.size);
      if (kind === "picked") {
        this.picked = next;
        this.emit("nq-map-picked", { point: next });
      } else this.changeRing(this.ring.map((p: MapLatLng, i: number) => (i === index ? next : p)));
    },
  }));
};
