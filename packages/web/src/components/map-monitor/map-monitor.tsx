"use client";

import { Bell, CircleAlert, Info, type LucideIcon, OctagonAlert, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ElementType, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import type { MapView as MapViewState } from "../map-view/map-geo";
import { type MapPin, type MapTone, MapView, type MapViewProps } from "../map-view/map-view";
import { formatNumber, formatRelativeTime } from "../numeric";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  countMapAlerts,
  DEFAULT_MAP_TIME_RANGES,
  filterMapAlerts,
  isMapRegionView,
  MAP_ALERT_SEVERITIES,
  type MapAlert,
  type MapAlertSeverity,
  mapAlertSeverity,
  type MapRegionPreset,
  type MapTimeRange,
} from "./map-monitor-logic";

export * from "./map-monitor-logic";

const STRINGS = {
  en: {
    title: "Live map",
    regions: "Region",
    timeRange: "Time range",
    ranges: { "24h": "24h", "7d": "7 days", "30d": "30 days", all: "All" } as Record<string, string>,
    alerts: "Alerts",
    alertsList: "Current alerts",
    showAlerts: "Show alerts",
    hideAlerts: "Hide alerts",
    noAlerts: "No alerts in this time range.",
    when: "When",
    severity: { critical: "Critical", high: "High", medium: "Medium", low: "Low" } as Record<MapAlertSeverity, string>,
    summary: (count: string) => `${count} alerts`,
  },
  ar: {
    title: "الخريطة المباشرة",
    regions: "المنطقة",
    timeRange: "النطاق الزمني",
    ranges: { "24h": "24 ساعة", "7d": "7 أيام", "30d": "30 يومًا", all: "الكل" } as Record<string, string>,
    alerts: "التنبيهات",
    alertsList: "التنبيهات الحالية",
    showAlerts: "عرض التنبيهات",
    hideAlerts: "إخفاء التنبيهات",
    noAlerts: "لا توجد تنبيهات في هذا النطاق الزمني.",
    when: "الوقت",
    severity: { critical: "حرج", high: "مرتفع", medium: "متوسط", low: "منخفض" } as Record<MapAlertSeverity, string>,
    summary: (count: string) => `${count} تنبيهات`,
  },
};

export type MapMonitorLabels = Omit<(typeof STRINGS)["en"], "ranges" | "severity"> & {
  ranges: Record<string, string>;
  severity: Record<MapAlertSeverity, string>;
};

const SEVERITY_TONE: Record<MapAlertSeverity, MapTone> = { critical: "danger", high: "warning", medium: "info", low: "neutral" };
const SEVERITY_ICON: Record<MapAlertSeverity, LucideIcon> = { critical: OctagonAlert, high: TriangleAlert, medium: CircleAlert, low: Info };
const SEVERITY_BADGE: Record<MapAlertSeverity, "danger" | "warning" | "info" | "neutral"> = { critical: "danger", high: "warning", medium: "info", low: "neutral" };
const SEVERITY_RULE: Record<MapAlertSeverity, string> = {
  critical: "border-s-nq-danger",
  high: "border-s-nq-warning",
  medium: "border-s-nq-info",
  low: "border-s-border",
};

type PassThrough = Omit<MapViewProps, "className" | "labels" | "view" | "defaultView" | "selectedId" | "defaultSelectedId" | "label">;

export interface MapMonitorProps extends PassThrough, Omit<ComponentProps<"section">, keyof PassThrough | "title" | "onSelect"> {
  /** Shown as pins (tone and icon by severity) and listed in the alerts panel. Ids must not clash with `pins`. */
  alerts?: readonly MapAlert[];
  /** Places to jump to. The first is not applied on its own: the map fits its content until one is chosen. */
  regions?: readonly MapRegionPreset[];
  defaultRegion?: string;
  onRegionChange?: (id: string) => void;
  /** Default 24 hours, 7 days, 30 days and All. Name custom ids through `labels.ranges`. */
  timeRanges?: readonly MapTimeRange[];
  range?: string;
  /** Default `"all"`, or the last range. */
  defaultRange?: string;
  onRangeChange?: (id: string) => void;
  /** Fires with the alerts left after the time filter, e.g. for a count elsewhere. */
  onVisibleAlertsChange?: (alerts: MapAlert[]) => void;
  /** The alerts panel. Default open. */
  alertsOpen?: boolean;
  defaultAlertsOpen?: boolean;
  onAlertsOpenChange?: (open: boolean) => void;
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  /** "Now" for the time filter and relative times. Default the current time. */
  now?: number;
  /** `null` hides the heading. */
  title?: ReactNode;
  headingAs?: ElementType;
  /** More controls at the end of the toolbar. */
  actions?: ReactNode;
  /** Classes for the map itself, mainly its height. Default `h-[30rem]`. */
  mapClassName?: string;
  labels?: Partial<MapMonitorLabels>;
}

/**
 * A map for watching what is happening: region presets to jump between places, a time-range filter, and a list of
 * alerts by severity that stays in step with the pins.
 */
export function MapMonitor({
  alerts = [],
  regions = [],
  defaultRegion,
  onRegionChange,
  timeRanges = DEFAULT_MAP_TIME_RANGES,
  range: rangeProp,
  defaultRange,
  onRangeChange,
  onVisibleAlertsChange,
  alertsOpen: openProp,
  defaultAlertsOpen = true,
  onAlertsOpenChange,
  selectedId: selectedProp,
  defaultSelectedId = null,
  onSelect,
  now: nowProp,
  title,
  headingAs: Heading = "h2",
  actions,
  mapClassName,
  labels,
  pins = [],
  onViewChange,
  className,
  // MapView pass-through
  routes,
  areas,
  layers,
  visibleLayers,
  onVisibleLayersChange,
  tileUrl,
  attribution,
  pinActions,
  renderCard,
  minZoom,
  maxZoom,
  cluster,
  clusterRadius,
  renderCluster,
  legend,
  layersPanel,
  onMapClick,
  onAreaClick,
  onPinClick,
  pickedPoint,
  defaultPickedPoint,
  onPickedPointChange,
  editing,
  editPoints,
  defaultEditPoints,
  onAreaChange,
  onAreaDone,
  editTone,
  locale: localeProp,
  ...props
}: MapMonitorProps) {
  const ambient = useOptionalNasaq()?.locale;
  const locale = localeProp ?? ambient ?? "en";
  const ar = locale.startsWith("ar");
  const base = STRINGS[ar ? "ar" : "en"];
  const t: MapMonitorLabels = { ...base, ...labels, ranges: { ...base.ranges, ...labels?.ranges }, severity: { ...base.severity, ...labels?.severity } };
  const n = (v: number) => formatNumber(v, locale);
  const id = useId();
  const now = nowProp ?? Date.now();

  const [ownRange, setOwnRange] = useState(defaultRange ?? timeRanges.find((r) => r.ms === null)?.id ?? timeRanges.at(-1)?.id ?? "all");
  const rangeId = rangeProp ?? ownRange;
  const range = timeRanges.find((r) => r.id === rangeId) ?? null;

  const [ownOpen, setOwnOpen] = useState(defaultAlertsOpen);
  const open = openProp ?? ownOpen;
  const setOpen = (next: boolean) => {
    setOwnOpen(next);
    onAlertsOpenChange?.(next);
  };

  const [ownSelected, setOwnSelected] = useState<string | null>(defaultSelectedId);
  const selected = selectedProp !== undefined ? selectedProp : ownSelected;
  const select = (next: string | null) => {
    setOwnSelected(next);
    onSelect?.(next);
  };

  const initialRegion = regions.find((r) => r.id === defaultRegion);
  const [view, setView] = useState<MapViewState | null>(initialRegion ? { center: initialRegion.center, zoom: initialRegion.zoom } : null);
  const activeRegion = regions.find((r) => isMapRegionView(view, r))?.id;

  const visible = useMemo(() => filterMapAlerts(alerts, range?.ms ?? null, now), [alerts, range?.ms, now]);
  const visibleKey = visible.map((a) => a.id).join("|");
  const [reported, setReported] = useState<string | null>(null);
  if (onVisibleAlertsChange && reported !== visibleKey) {
    setReported(visibleKey);
    onVisibleAlertsChange(visible);
  }
  const counts = countMapAlerts(visible);

  const titleOf = (a: MapAlert) => (ar && a.titleAr ? a.titleAr : a.title);
  const detailOf = (a: MapAlert) => (ar && a.detailAr ? a.detailAr : a.detail);
  const when = (a: MapAlert) => {
    try {
      return formatRelativeTime(a.at, locale, { now });
    } catch {
      return "";
    }
  };

  const alertPins: MapPin[] = visible.map((a) => {
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
      tone: SEVERITY_TONE[severity],
      icon: SEVERITY_ICON[severity],
      status: STRINGS.en.severity[severity],
      statusAr: STRINGS.ar.severity[severity],
      meta: [{ label: STRINGS.en.when, labelAr: STRINGS.ar.when, value: when(a) }],
    };
  });

  const goTo = (region: MapRegionPreset) => {
    setView({ center: region.center, zoom: region.zoom });
    onRegionChange?.(region.id);
  };

  const focusAlert = (a: MapAlert) => {
    select(a.id);
    setView((v) => ({ center: { lat: a.lat, lng: a.lng }, zoom: Math.max(v?.zoom ?? 0, 10) }));
  };

  const heading = title === undefined ? t.title : title;

  return (
    <section
      data-slot="map-monitor"
      aria-labelledby={heading ? `${id}-title` : undefined}
      className={cn("flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card", className)}
      {...props}
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3">
        {heading ? (
          <Heading id={`${id}-title`} className="me-auto text-h4 text-foreground">
            {heading}
          </Heading>
        ) : null}
        {regions.length ? (
          <ToggleGroup aria-label={t.regions} value={activeRegion ? [activeRegion] : []} onValueChange={(v: unknown[]) => {
            const region = regions.find((r) => r.id === v[0]);
            if (region) goTo(region);
          }}>
            {regions.map((r) => (
              <Toggle key={r.id} value={r.id} data-region={r.id}>
                {ar && r.labelAr ? r.labelAr : r.label}
              </Toggle>
            ))}
          </ToggleGroup>
        ) : null}
        {timeRanges.length > 1 ? (
          <ToggleGroup aria-label={t.timeRange} value={range ? [range.id] : []} onValueChange={(v: unknown[]) => {
            if (!v[0]) return;
            setOwnRange(String(v[0]));
            onRangeChange?.(String(v[0]));
          }}>
            {timeRanges.map((r) => (
              <Toggle key={r.id} value={r.id} data-range={r.id}>
                {t.ranges[r.id] ?? r.id}
              </Toggle>
            ))}
          </ToggleGroup>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          aria-expanded={open}
          aria-controls={`${id}-alerts`}
          aria-label={`${open ? t.hideAlerts : t.showAlerts}, ${t.summary(n(visible.length))}`}
          onClick={() => setOpen(!open)}
        >
          <Bell aria-hidden />
          {t.alerts}
          <Badge variant={counts.critical ? "danger" : visible.length ? "warning" : "neutral"}>{n(visible.length)}</Badge>
        </Button>
        {actions}
      </header>

      <div className="flex min-w-0 flex-col lg:flex-row">
        <MapView
          label={typeof heading === "string" ? heading : t.title}
          className={cn("h-[30rem] min-w-0 flex-1 rounded-none border-0", mapClassName)}
          pins={[...pins, ...alertPins]}
          view={view ?? undefined}
          onViewChange={(v) => {
            setView(v);
            onViewChange?.(v);
          }}
          selectedId={selected}
          onSelect={select}
          locale={locale}
          {...{ routes, areas, layers, visibleLayers, onVisibleLayersChange, tileUrl, attribution, pinActions, renderCard, minZoom, maxZoom, cluster, clusterRadius, renderCluster, legend, layersPanel, onMapClick, onAreaClick, onPinClick, pickedPoint, defaultPickedPoint, onPickedPointChange, editing, editPoints, defaultEditPoints, onAreaChange, onAreaDone, editTone }}
        />
        <aside
          id={`${id}-alerts`}
          data-slot="map-monitor-alerts"
          hidden={!open}
          aria-labelledby={`${id}-alerts-title`}
          className="flex max-h-[30rem] min-w-0 flex-col border-t border-border lg:w-80 lg:border-s lg:border-t-0"
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <h3 id={`${id}-alerts-title`} className="me-auto text-label text-foreground">
              {t.alertsList}
            </h3>
            {MAP_ALERT_SEVERITIES.filter((s) => counts[s]).map((s) => (
              <Badge key={s} variant={SEVERITY_BADGE[s]} title={t.severity[s]}>
                <span className="sr-only">{t.severity[s]}: </span>
                {n(counts[s])}
              </Badge>
            ))}
          </div>
          {visible.length ? (
            <ul className="flex flex-col overflow-y-auto">
              {visible.map((a) => {
                const severity = mapAlertSeverity(a);
                const SeverityIcon = SEVERITY_ICON[severity];
                const active = a.id === selected;
                return (
                  <li key={a.id} data-slot="map-monitor-alert" data-alert={a.id} data-severity={severity}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => focusAlert(a)}
                      className={cn(
                        "flex w-full items-start gap-2.5 border-b border-s-2 border-b-border px-4 py-3 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
                        SEVERITY_RULE[severity],
                        active && "bg-nq-selected",
                      )}
                    >
                      <SeverityIcon aria-hidden className={cn("mt-0.5 size-4 shrink-0", severity === "critical" ? "text-nq-danger-text" : severity === "high" ? "text-nq-warning-text" : severity === "medium" ? "text-nq-info-text" : "text-muted-foreground")} />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span dir="auto" className="line-clamp-2 text-label text-foreground">
                          {titleOf(a)}
                        </span>
                        {detailOf(a) ? (
                          <span dir="auto" className="truncate text-caption text-muted-foreground">
                            {detailOf(a)}
                          </span>
                        ) : null}
                        <span className="text-caption text-muted-foreground">
                          {t.severity[severity]} · {when(a)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-body-sm text-muted-foreground">{t.noAlerts}</p>
          )}
        </aside>
      </div>
    </section>
  );
}
