// nqMapMonitor: a map for watching what is happening. Region presets jump between places, a time-range filter narrows to recent
// events, and an alerts panel lists them by severity in step with the pins. The markup is the React MapMonitor's (see the Blade
// component); the map inside is an nqMapView that this component drives through Alpine.$data.
//
//   <section data-slot="map-monitor" x-data="nqMapMonitor({ alerts, regions, labels, icons })" x-id="['nq-map-monitor']">
//     <div x-model="regionValue"> … </div> <div x-model="rangeValue"> … </div> <button x-on:click="toggleAlerts()">
//     <div data-slot="map-view" x-data="nqMapView({ … })"></div>
//     <aside data-slot="map-monitor-alerts"> <template x-for="a in visible"> … <button x-on:click="focusAlert(a)"> </template> </aside>
//   </section>
//
// Options: alerts ({ id, lat, lng, title, titleAr?, severity?, at (epoch ms or ISO), detail?, detailAr?, layer? }), pins (the map's own pins),
// regions ({ id, label, labelAr?, center, zoom }), defaultRegion, timeRanges ({ id, ms | null }), defaultRange, defaultAlertsOpen, selectedId,
// now (epoch ms; default the browser clock), locale, labels (strings with "{n}"; ranges and severity are objects), icons (severity name to SVG
// markup, from the Blade file).
// Events (bubbling, from the section): "map-monitor-region" ({ id }), "map-monitor-range" ({ id }), "map-monitor-alerts" ({ open }),
// "map-monitor-visible" ({ alerts }). The map's own nq-map-select and nq-map-view events bubble too.

import {
  countMapAlerts,
  DEFAULT_MAP_TIME_RANGES,
  filterMapAlerts,
  isMapRegionView,
  MAP_ALERT_SEVERITIES,
  mapAlertSeverity,
  type MapAlert,
  type MapAlertSeverity,
  type MapRegionPreset,
  type MapTimeRange,
} from "./map-monitor-logic";
import type { MapLatLng } from "./map-geo";
import type { Magics, Register } from "./types";

interface Labels {
  title: string;
  alerts: string;
  showAlerts: string;
  hideAlerts: string;
  summary: string;
  when: string;
  ranges: Record<string, string>;
  severity: Record<MapAlertSeverity, string>;
  [key: string]: unknown;
}

interface Options {
  alerts?: MapAlert[];
  pins?: Record<string, unknown>[];
  regions?: MapRegionPreset[];
  defaultRegion?: string;
  timeRanges?: MapTimeRange[];
  defaultRange?: string;
  defaultAlertsOpen?: boolean;
  selectedId?: string | null;
  now?: number;
  locale?: string;
  labels?: Partial<Labels>;
  icons?: Record<string, string>;
}

type View = { center: MapLatLng; zoom: number };

interface MonitorState extends Magics {
  alerts: MapAlert[];
  pins: Record<string, unknown>[];
  regions: MapRegionPreset[];
  timeRanges: MapTimeRange[];
  rangeId: string;
  open: boolean;
  selected: string | null;
  mapView: View | null;
  nowOpt: number | undefined;
  locale: string;
  labels: Labels;
  icons: Record<string, string>;
  cleared: boolean;
  release(): void;
  visible: MapAlert[];
  counts: Record<MapAlertSeverity, number>;
  activeRegion: string | undefined;
  clock(): number;
  num(n: number): string;
  emit(name: string, detail: unknown): void;
  mapData(): Record<string, unknown> | null;
  push(): void;
  goTo(region: MapRegionPreset): void;
  when(a: MapAlert): string;
  sev(lang: "en" | "ar", severity: MapAlertSeverity): string;
  detailOf(a: MapAlert): string;
  fill(text: string, n: string): string;
  count(severity: string): number;
}

const TONE: Record<MapAlertSeverity, string> = { critical: "danger", high: "warning", medium: "info", low: "neutral" };
const ICON: Record<MapAlertSeverity, string> = { critical: "octagon-alert", high: "triangle-alert", medium: "circle-alert", low: "info" };
const RULE: Record<MapAlertSeverity, string> = { critical: "border-s-nq-danger", high: "border-s-nq-warning", medium: "border-s-nq-info", low: "border-s-border" };
const TEXT: Record<MapAlertSeverity, string> = { critical: "text-nq-danger-text", high: "text-nq-warning-text", medium: "text-nq-info-text", low: "text-muted-foreground" };
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];
const toMs = (at: MapAlert["at"]) => (at instanceof Date ? at.getTime() : typeof at === "number" ? at : Date.parse(at));

export const mapMonitor: Register = (Alpine) => {
  Alpine.data("nqMapMonitor", (options: Options = {}) => {
    // Kept out of the reactive state: Alpine would wrap the element in a proxy.
    let rootEl: HTMLElement | null = null;
    return {
    alerts: (options.alerts ?? []) as MapAlert[],
    pins: (options.pins ?? []) as Record<string, unknown>[],
    regions: (options.regions ?? []) as MapRegionPreset[],
    timeRanges: (options.timeRanges ?? DEFAULT_MAP_TIME_RANGES) as MapTimeRange[],
    rangeId: (options.defaultRange ?? (options.timeRanges ?? DEFAULT_MAP_TIME_RANGES).find((r) => r.ms === null)?.id ?? (options.timeRanges ?? DEFAULT_MAP_TIME_RANGES).at(-1)?.id ?? "all") as string,
    open: options.defaultAlertsOpen !== false,
    selected: (options.selectedId ?? null) as string | null,
    mapView: (() => {
      const r = (options.regions ?? []).find((x) => x.id === options.defaultRegion);
      return r ? { center: r.center, zoom: r.zoom } : null;
    })() as View | null,
    nowOpt: options.now as number | undefined,
    locale: options.locale ?? (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en"),
    labels: (options.labels ?? {}) as Labels,
    icons: (options.icons ?? {}) as Record<string, string>,
    cleared: false,

    init(this: MonitorState) {
      rootEl = this.$el;
      let last = "";
      // The map's own data is a nested Alpine scope: push the pins, the selection and the view into it whenever they change.
      this.$watch("snapshot", () => this.push());
      this.$watch("visibleKey", (key: string) => {
        if (key === last) return;
        last = key;
        this.emit("map-monitor-visible", { alerts: this.visible });
      });
      last = (this as unknown as { visibleKey: string }).visibleKey;
      this.emit("map-monitor-visible", { alerts: this.visible });
      void this.$nextTick(() => this.push());
    },

    // ---- text ----
    get ar(): boolean {
      return (this as unknown as MonitorState).locale.startsWith("ar");
    },
    clock(this: MonitorState): number {
      return this.nowOpt ?? Date.now();
    },
    num(this: MonitorState, n: number): string {
      return new Intl.NumberFormat(this.locale.startsWith("ar") ? "ar-u-nu-latn" : this.locale).format(n);
    },
    emit(this: MonitorState, name: string, detail: unknown) {
      rootEl?.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    },
    fill(text: string, n: string): string {
      return text.replace("{n}", n);
    },

    // ---- derived ----
    get range(): MapTimeRange | null {
      const s = this as unknown as MonitorState;
      return s.timeRanges.find((r) => r.id === s.rangeId) ?? null;
    },
    get visible(): MapAlert[] {
      const s = this as unknown as MonitorState & { range: MapTimeRange | null };
      return filterMapAlerts(s.alerts, s.range?.ms ?? null, s.clock());
    },
    get visibleKey(): string {
      return (this as unknown as MonitorState).visible.map((a) => a.id).join("|");
    },
    get counts(): Record<MapAlertSeverity, number> {
      return countMapAlerts((this as unknown as MonitorState).visible);
    },
    get activeRegion(): string | undefined {
      const s = this as unknown as MonitorState;
      return s.regions.find((r) => isMapRegionView(s.mapView, r))?.id;
    },
    get snapshot(): string {
      const s = this as unknown as MonitorState;
      return JSON.stringify([s.visible, s.selected, s.mapView]);
    },

    // ---- the toggle groups ----
    // x-model on the groups: pressing the pressed item clears a group, so the setters show [] for one tick (the group and the model agree) and then put the value back.
    get regionValue(): string[] {
      const s = this as unknown as MonitorState;
      if (s.cleared) return [];
      return s.activeRegion ? [s.activeRegion] : [];
    },
    set regionValue(value: string[]) {
      const s = this as unknown as MonitorState;
      const region = s.regions.find((r) => r.id === value?.[0]);
      if (region) s.goTo(region);
      else s.release();
    },
    get rangeValue(): string[] {
      const s = this as unknown as MonitorState & { range: MapTimeRange | null };
      if (s.cleared) return [];
      return s.range ? [s.range.id] : [];
    },
    set rangeValue(value: string[]) {
      const s = this as unknown as MonitorState;
      const id = value?.[0];
      if (!id) {
        s.release();
        return;
      }
      if (id === s.rangeId) return;
      s.rangeId = id;
      s.emit("map-monitor-range", { id });
    },

    release(this: MonitorState) {
      this.cleared = true;
      void this.$nextTick(() => {
        this.cleared = false;
      });
    },

    // ---- actions ----
    goTo(this: MonitorState, region: MapRegionPreset) {
      this.mapView = { center: region.center, zoom: region.zoom };
      this.emit("map-monitor-region", { id: region.id });
    },
    toggleAlerts(this: MonitorState) {
      this.open = !this.open;
      this.emit("map-monitor-alerts", { open: this.open });
    },
    focusAlert(this: MonitorState, a: MapAlert) {
      this.selected = a.id;
      this.mapView = { center: { lat: a.lat, lng: a.lng }, zoom: Math.max(this.mapView?.zoom ?? 0, 10) };
    },
    /** The map fired nq-map-view (bubbles to the section). */
    onMapView(this: MonitorState, event: CustomEvent<{ view: View }>) {
      this.mapView = event.detail.view;
    },
    /** The map fired nq-map-select (bubbles to the section). */
    onMapSelect(this: MonitorState, event: CustomEvent<{ id: string | null }>) {
      this.selected = event.detail.id;
    },
    mapData(this: MonitorState) {
      const el = rootEl?.querySelector<HTMLElement>('[data-slot="map-view"]');
      return el ? ((Alpine as unknown as { $data(el: Element): Record<string, unknown> }).$data(el)) : null;
    },
    pinsOf(this: MonitorState): Record<string, unknown>[] {
      const when = (a: MapAlert) => this.when(a);
      const alertPins = this.visible.map((a) => {
        const severity = mapAlertSeverity(a);
        return {
          id: a.id,
          lat: a.lat,
          lng: a.lng,
          label: a.title,
          labelAr: a.titleAr,
          detail: a.detail,
          detailAr: a.detailAr,
          layer: a.layer,
          tone: TONE[severity],
          icon: ICON[severity],
          status: this.sev("en", severity),
          statusAr: this.sev("ar", severity),
          meta: [{ label: "When", labelAr: "الوقت", value: when(a) }],
        };
      });
      return [...this.pins, ...alertPins];
    },
    sev(this: MonitorState, lang: "en" | "ar", severity: MapAlertSeverity): string {
      const en = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
      const ar = { critical: "حرج", high: "مرتفع", medium: "متوسط", low: "منخفض" };
      return (lang === "ar" ? ar : en)[severity];
    },
    push(this: MonitorState) {
      const map = this.mapData();
      if (!map) return;
      map.icons = {
        ...(map.icons as Record<string, string>),
        ...Object.fromEntries(MAP_ALERT_SEVERITIES.map((s) => [ICON[s], this.icons[s] ?? ""])),
      };
      map.pins = (this as unknown as { pinsOf(): Record<string, unknown>[] }).pinsOf();
      map.selectedId = this.selected;
      map.own = this.mapView;
    },

    // ---- alert rows ----
    severity(a: MapAlert): MapAlertSeverity {
      return mapAlertSeverity(a);
    },
    titleOf(this: MonitorState, a: MapAlert): string {
      return this.locale.startsWith("ar") && a.titleAr ? a.titleAr : a.title;
    },
    detailOf(this: MonitorState, a: MapAlert): string {
      return (this.locale.startsWith("ar") && a.detailAr ? a.detailAr : a.detail) ?? "";
    },
    when(this: MonitorState, a: MapAlert): string {
      const t = toMs(a.at);
      if (!Number.isFinite(t)) return "";
      const seconds = (t - this.clock()) / 1000;
      const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? UNITS[UNITS.length - 1]!;
      return new Intl.RelativeTimeFormat(this.locale.startsWith("ar") ? "ar-u-nu-latn" : this.locale, { numeric: "auto" }).format(Math.round(seconds / size), unit);
    },
    sub(this: MonitorState, a: MapAlert): string {
      return `${this.labels.severity[mapAlertSeverity(a)]} · ${this.when(a)}`;
    },
    isSelected(this: MonitorState, a: MapAlert): boolean {
      return a.id === this.selected;
    },
    rowClass(this: MonitorState, a: MapAlert): string {
      return `${RULE[mapAlertSeverity(a)]}${a.id === this.selected ? " bg-nq-selected" : ""}`;
    },
    iconClass(a: MapAlert): string {
      return TEXT[mapAlertSeverity(a)];
    },
    iconOf(this: MonitorState, a: MapAlert): string {
      return this.icons[mapAlertSeverity(a)] ?? "";
    },
    hasDetail(this: MonitorState, a: MapAlert): boolean {
      return this.detailOf(a) !== "";
    },

    // ---- header ----
    totalText(this: MonitorState): string {
      return this.num(this.visible.length);
    },
    alertsLabel(this: MonitorState): string {
      return `${this.open ? this.labels.hideAlerts : this.labels.showAlerts}, ${this.fill(this.labels.summary, this.num(this.visible.length))}`;
    },
    /** True when the Alerts badge has this tone: danger (a critical alert), warning (any alerts) or neutral. */
    badgeIs(this: MonitorState, tone: string): boolean {
      const c = this.counts;
      return (c.critical ? "danger" : this.visible.length ? "warning" : "neutral") === tone;
    },
    count(this: MonitorState, severity: string): number {
      return this.counts[severity as MapAlertSeverity] ?? 0;
    },
    countText(this: MonitorState, severity: string): string {
      return this.num(this.count(severity));
    },
    uid(this: MonitorState, part: string): string {
      return this.$id("nq-map-monitor", part);
    },
  };
  });
};
