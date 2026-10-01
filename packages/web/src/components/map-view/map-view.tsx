"use client";

import { Check, Crosshair, Layers, MapPin as MapPinIcon, Minus, Plus, Undo2, X, type LucideIcon } from "lucide-react";
import { type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { ContextMenuActions, type ContextMenuAction } from "../context-menu";
import { CopyButton } from "../copy-button";
import {
  MAP_CLUSTER_MAX_ZOOM,
  MAP_CLUSTER_RADIUS,
  MAP_CLUSTER_THRESHOLD,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  type MapLatLng,
  type MapSize,
  type MapView as MapViewState,
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
} from "./map-geo";

const clusterCount = (n: number) => (n === 2 ? "مكانان" : n <= 10 ? `${n} أماكن` : `${n} مكانًا`);

const STRINGS = {
  en: {
    map: "Map",
    layers: "Layers",
    routes: "Routes",
    areas: "Areas",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fit: "Show everything",
    close: "Close",
    copyCoordinates: "Copy coordinates",
    coordinates: "Coordinates",
    hint: "Drag to move. Use the arrow keys to pan, plus and minus to zoom, Home to show everything.",
    pins: (n: number) => (n === 1 ? "1 place" : `${n} places`),
    routeLength: (km: string) => `${km} km`,
    showLayer: (name: string) => `Show ${name}`,
    noPins: "Nothing to show on the map",
    selected: (name: string) => `${name}, selected`,
    clusterZoom: (n: number) => `${n} pins, zoom in`,
    clusterList: (n: number) => `${n} pins, show the list`,
    clusterPins: (n: number) => `${n} pins`,
    clusterHint: "These pins share one spot. Choose one to see it.",
    pickedPoint: "Chosen location",
    pickedHint: "Drag to move. Arrow keys nudge it, Shift for bigger steps.",
    vertex: (n: number) => `Point ${n}`,
    vertexHint: "Drag to move. Arrow keys nudge it. Delete removes it.",
    shape: "Shape being edited",
    removeLast: "Remove last point",
    finishShape: "Finish shape",
    editHint: "Click the map, or press Enter, to add a point.",
  },
  ar: {
    map: "الخريطة",
    layers: "الطبقات",
    routes: "المسارات",
    areas: "المناطق",
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    fit: "عرض كل شيء",
    close: "إغلاق",
    copyCoordinates: "نسخ الإحداثيات",
    coordinates: "الإحداثيات",
    hint: "اسحب للتحريك. استخدم الأسهم للتنقل، وعلامتي الزائد والناقص للتكبير، وHome لعرض كل شيء.",
    pins: (n: number) => (n === 1 ? "مكان واحد" : n === 2 ? "مكانان" : n <= 10 ? `${n} أماكن` : `${n} مكانًا`),
    routeLength: (km: string) => `${km} كم`,
    showLayer: (name: string) => `إظهار ${name}`,
    noPins: "لا شيء لعرضه على الخريطة",
    selected: (name: string) => `${name}، محدد`,
    clusterZoom: (n: number) => `${clusterCount(n)}، كبّر للتفصيل`,
    clusterList: (n: number) => `${clusterCount(n)}، عرض القائمة`,
    clusterPins: (n: number) => clusterCount(n),
    clusterHint: "هذه الأماكن في نقطة واحدة. اختر مكانًا لعرضه.",
    pickedPoint: "الموقع المختار",
    pickedHint: "اسحب للتحريك. الأسهم تحرّكه خطوة خطوة، ومع Shift خطوة أكبر.",
    vertex: (n: number) => `النقطة ${n}`,
    vertexHint: "اسحب للتحريك. الأسهم تحرّكها. Delete يحذفها.",
    shape: "الشكل قيد التعديل",
    removeLast: "حذف آخر نقطة",
    finishShape: "إنهاء الشكل",
    editHint: "انقر على الخريطة، أو اضغط Enter، لإضافة نقطة.",
  },
};
export type MapViewLabels = Partial<(typeof STRINGS)["en"]>;

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
  icon?: LucideIcon;
  /**
   * A moving thing, such as a driver: shows a soft pulse and glides to each new position instead of jumping. The
   * glide is off while the map is being dragged and when the user prefers reduced motion.
   */
  live?: boolean;
  /** A short status word for a badge in the card ("Moving", "Idle"). */
  status?: string;
  statusAr?: string;
  /** Facts for the card: speed, battery, last seen. */
  meta?: readonly { label: string; labelAr?: string; value: ReactNode }[];
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
  icon?: LucideIcon;
  /** Start hidden. */
  defaultHidden?: boolean;
}

/** What `renderCluster` receives. */
export interface MapClusterInfo {
  count: number;
  pins: readonly MapPin[];
  lat: number;
  lng: number;
  /** Diameter of the bubble in px, grown with the count. */
  size: number;
}

export interface MapViewProps {
  pins?: readonly MapPin[];
  routes?: readonly MapRoute[];
  /** Filled polygons drawn under the routes and pins, for zones. */
  areas?: readonly MapArea[];
  layers?: readonly MapLayer[];
  /** Visible layer ids. Controlled when set. Default: every layer that is not `defaultHidden`. */
  visibleLayers?: readonly string[];
  onVisibleLayersChange?: (ids: string[]) => void;
  /**
   * Tile URL template with `{z}`, `{x}` and `{y}`, for example "https://tile.example.com/{z}/{x}/{y}.png". Nasaq ships
   * no tile service and no key. Without it the map draws a quiet grid of latitude and longitude lines.
   */
  tileUrl?: string;
  /** Credit for the tile provider. Required by most of them: show it when you set `tileUrl`. */
  attribution?: ReactNode;
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Actions of a pin. They fill the card and open as a context menu on the pin (context-click, Shift+F10, Menu key). */
  pinActions?: (pin: MapPin) => ContextMenuAction[];
  /** Replaces the body of the location card. The title, close button and coordinates stay. */
  renderCard?: (pin: MapPin) => ReactNode;
  /** Centre and zoom. Controlled when set. Without it the map fits every visible pin and route until someone moves it. */
  view?: MapViewState;
  defaultView?: MapViewState;
  onViewChange?: (view: MapViewState) => void;
  minZoom?: number;
  maxZoom?: number;
  /**
   * Group nearby pins into count bubbles that split as you zoom in. Default: on when more than 30 pins are visible.
   * The selected pin is never inside a bubble. Click, Enter or Space on a bubble zooms to fit its pins; at the max
   * cluster zoom it lists them in the card.
   */
  cluster?: boolean;
  /** Distance in px under which pins share a bubble. Default 60. */
  clusterRadius?: number;
  /** Replaces what is inside a bubble (the count by default). The button, size and behaviour stay. */
  renderCluster?: (cluster: MapClusterInfo) => ReactNode;
  /** Legend of layers and routes. Default true. */
  legend?: boolean;
  /**
   * The layers and legend panel: "collapsed" (default) shows only the Layers button, "expanded" opens it at first,
   * "hidden" removes it. `legend={false}` also hides it.
   */
  layersPanel?: "collapsed" | "expanded" | "hidden";
  /** Fires on a tap or click on the map itself (not on a pin or a control) with the place under it. */
  onMapClick?: (point: MapLatLng) => void;
  /** Fires when an area is clicked (or chosen in the legend). Areas under the click are tested topmost first. */
  onAreaClick?: (area: MapArea) => void;
  /** Fires when a pin is clicked, besides selecting it. */
  onPinClick?: (pin: MapPin) => void;
  /**
   * A chosen place with a draggable pin, for picking an address. Controlled when set (`null` shows none); drag it,
   * or focus it and use the arrow keys. Pair it with `onMapClick` to place it by clicking.
   */
  pickedPoint?: MapLatLng | null;
  defaultPickedPoint?: MapLatLng | null;
  onPickedPointChange?: (point: MapLatLng) => void;
  /**
   * Area editing mode: clicking the map (or Enter on the focused map) adds a vertex to `editPoints`, vertices drag
   * and nudge with the arrow keys, Delete removes the focused one, and a toolbar removes the last point or finishes.
   */
  editing?: boolean;
  /** The ring being edited. Controlled when set. */
  editPoints?: readonly MapLatLng[];
  defaultEditPoints?: readonly MapLatLng[];
  /** Fires with the new ring after every add, move or removal. */
  onAreaChange?: (points: MapLatLng[]) => void;
  /** Fires from the Finish shape button (enabled from three points) with the ring. */
  onAreaDone?: (points: MapLatLng[]) => void;
  /** Tone of the shape being edited. Default brand. */
  editTone?: MapTone;
  /** Accessible name of the map. */
  label?: string;
  locale?: string;
  labels?: MapViewLabels;
  className?: string;
}

const PIN_TONE: Record<MapTone, string> = {
  brand: "border-primary bg-primary text-primary-foreground",
  info: "border-nq-info bg-nq-info-soft text-nq-info-text",
  success: "border-nq-success bg-nq-success-soft text-nq-success-text",
  warning: "border-nq-warning bg-nq-warning-soft text-nq-warning-text",
  danger: "border-nq-danger bg-nq-danger-soft text-nq-danger-text",
  neutral: "border-nq-line-strong bg-secondary text-foreground",
};
const STROKE: Record<MapTone, string> = {
  brand: "stroke-primary",
  info: "stroke-nq-info",
  success: "stroke-nq-success",
  warning: "stroke-nq-warning",
  danger: "stroke-nq-danger",
  neutral: "stroke-muted-foreground",
};
const FILL: Record<MapTone, string> = {
  brand: "fill-primary/15",
  info: "fill-nq-info/15",
  success: "fill-nq-success/15",
  warning: "fill-nq-warning/15",
  danger: "fill-nq-danger/15",
  neutral: "fill-muted-foreground/15",
};
const SWATCH: Record<MapTone, string> = {
  brand: "bg-primary",
  info: "bg-nq-info",
  success: "bg-nq-success",
  warning: "bg-nq-warning",
  danger: "bg-nq-danger",
  neutral: "bg-muted-foreground",
};
const BADGE: Record<MapTone, "brand" | "info" | "success" | "warning" | "danger" | "neutral"> = { brand: "brand", info: "info", success: "success", warning: "warning", danger: "danger", neutral: "neutral" };

/** A focusable handle that drags with the pointer or nudges with the arrow keys. Coordinates are canvas px. */
function MapHandle({
  x,
  y,
  label,
  hint,
  onMove,
  onRemove,
  className,
  children,
  data,
  canvas,
}: {
  x: number;
  y: number;
  label: string;
  hint: string;
  onMove: (screen: { x: number; y: number }) => void;
  onRemove?: () => void;
  className?: string;
  children?: ReactNode;
  data: Record<string, string>;
  canvas: RefObject<HTMLDivElement | null>;
}) {
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const rel = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = canvas.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  };
  return (
    <button
      type="button"
      data-map-control=""
      {...data}
      aria-label={label}
      title={hint}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const at = rel(event);
        grab.current = { dx: x - at.x, dy: y - at.y };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!grab.current) return;
        const at = rel(event);
        onMove({ x: at.x + grab.current.dx, y: at.y + grab.current.dy });
      }}
      onPointerUp={(event) => {
        grab.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        grab.current = null;
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 32 : 8;
        const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        const d = move[event.key];
        if (d) {
          onMove({ x: x + d[0], y: y + d[1] });
        } else if (onRemove && (event.key === "Delete" || event.key === "Backspace")) {
          onRemove();
        } else {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      }}
      className={cn("absolute z-20 flex cursor-move touch-none items-center justify-center outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus", className)}
      style={{ left: x, top: y }}
    >
      {children}
    </button>
  );
}

const pick = (en: string | undefined, ar: string | undefined, isAr: boolean) => (isAr ? ar || en : en || ar) ?? "";
const EMPTY_SIZE: MapSize = { width: 0, height: 0 };

/**
 * A map of places and routes without a map library. Pins, route lines, layer toggles, a legend, zoom and pan by drag,
 * wheel, buttons or keyboard, and a location card for the selected pin. Tiles come from a URL template you provide;
 * without one it draws a latitude and longitude grid, so it works offline. The canvas is always left to right.
 */
export function MapView({
  pins = [],
  routes = [],
  areas = [],
  layers = [],
  visibleLayers,
  onVisibleLayersChange,
  tileUrl,
  attribution,
  selectedId: selectedProp,
  defaultSelectedId = null,
  onSelect,
  pinActions,
  renderCard,
  view: viewProp,
  defaultView,
  onViewChange,
  minZoom = MAP_MIN_ZOOM,
  maxZoom = MAP_MAX_ZOOM,
  cluster,
  clusterRadius = MAP_CLUSTER_RADIUS,
  renderCluster,
  legend = true,
  layersPanel = "collapsed",
  onMapClick,
  onAreaClick,
  onPinClick,
  pickedPoint: pickedProp,
  defaultPickedPoint = null,
  onPickedPointChange,
  editing = false,
  editPoints: editProp,
  defaultEditPoints,
  onAreaChange,
  onAreaDone,
  editTone = "brand",
  label,
  locale: localeProp,
  labels,
  className,
}: MapViewProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const canvas = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<MapSize>(EMPTY_SIZE);
  const [own, setOwn] = useState<MapViewState | null>(defaultView ?? null);
  const [innerSelected, setInnerSelected] = useState<string | null>(defaultSelectedId);
  const [innerLayers, setInnerLayers] = useState<string[]>(() => layers.filter((l) => !l.defaultHidden).map((l) => l.id));
  const [legendOpen, setLegendOpen] = useState<boolean | null>(null);
  const [innerPicked, setInnerPicked] = useState<MapLatLng | null>(defaultPickedPoint);
  const [innerEdit, setInnerEdit] = useState<MapLatLng[]>(() => [...(defaultEditPoints ?? [])]);
  const [drag, setDrag] = useState(false);
  const [clusterList, setClusterList] = useState<string[] | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  const picked = pickedProp === undefined ? innerPicked : pickedProp;
  const editRing: readonly MapLatLng[] = editProp ?? innerEdit;
  const selectedId = selectedProp === undefined ? innerSelected : selectedProp;
  const shown = visibleLayers ?? innerLayers;
  const isShown = useCallback((layer?: string) => !layer || !layers.some((l) => l.id === layer) || shown.includes(layer), [layers, shown]);
  const visiblePins = useMemo(() => pins.filter((p) => isShown(p.layer)), [pins, isShown]);
  const visibleRoutes = useMemo(() => routes.filter((r) => isShown(r.layer)), [routes, isShown]);
  const visibleAreas = useMemo(() => areas.filter((a) => isShown(a.layer)), [areas, isShown]);

  useEffect(() => {
    const el = canvas.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const read = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fitted = useMemo(() => {
    const points: MapLatLng[] = [...visiblePins, ...visibleRoutes.flatMap((r) => r.points), ...visibleAreas.flatMap((a) => a.points)];
    return mapFit(points, size, { minZoom, maxZoom });
  }, [visiblePins, visibleRoutes, visibleAreas, size, minZoom, maxZoom]);
  const view = viewProp ?? own ?? fitted;
  const ready = size.width > 0 && size.height > 0;

  const setView = useCallback(
    (next: MapViewState) => {
      if (viewProp === undefined) setOwn(next);
      onViewChange?.(next);
    },
    [viewProp, onViewChange],
  );

  const select = (id: string | null) => {
    if (selectedProp === undefined) setInnerSelected(id);
    setClusterList(null);
    onSelect?.(id);
  };

  const clustering = cluster ?? visiblePins.length > MAP_CLUSTER_THRESHOLD;
  const clusterMax = Math.min(MAP_CLUSTER_MAX_ZOOM, maxZoom);
  const items = useMemo(
    () => (clustering ? mapCluster(visiblePins, view.zoom, { radius: clusterRadius, maxZoom: clusterMax, selectedId }) : visiblePins.map((pin) => ({ type: "pin" as const, pin }))),
    [clustering, visiblePins, view.zoom, clusterRadius, clusterMax, selectedId],
  );
  const expandCluster = (pins: readonly MapPin[]) => {
    const next = mapClusterExpand(pins, view, size, { radius: clusterRadius, maxZoom: clusterMax, minZoom, limit: maxZoom });
    setView(next.view);
    setClusterList(next.list ? pins.map((p) => p.id) : null);
    // The bubble unmounts as it splits: keep keyboard focus on the map instead of losing it to the page.
    canvas.current?.focus({ preventScroll: true });
  };

  const zoomBy = useCallback(
    (delta: number, anchor?: { x: number; y: number }) => setView(mapZoomAt(view, delta, anchor ?? { x: size.width / 2, y: size.height / 2 }, size, { min: minZoom, max: maxZoom })),
    [view, size, setView, minZoom, maxZoom],
  );

  // Wheel zoom needs a non-passive listener to stop the page from scrolling.
  const wheelRef = useRef({ zoomBy });
  wheelRef.current = { zoomBy };
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      wheelRef.current.zoomBy(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0025), { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("[data-map-control]")) return;
    last.current = { x: event.clientX, y: event.clientY };
    moved.current = false;
    setDrag(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!last.current) return;
    const dx = event.clientX - last.current.x;
    const dy = event.clientY - last.current.y;
    if (!moved.current && Math.hypot(dx, dy) < 3) return;
    moved.current = true;
    last.current = { x: event.clientX, y: event.clientY };
    setView(mapPanBy(view, dx, dy));
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!last.current) return;
    last.current = null;
    setDrag(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    // A tap on empty ground clears the selection and reports the place.
    if (!moved.current && event.type === "pointerup" && !(event.target as HTMLElement).closest("[data-map-control]")) {
      const rect = event.currentTarget.getBoundingClientRect();
      const at = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const point = mapFromScreen(at, view, size);
      if (editing) {
        changeRing([...editRing, point]);
        return;
      }
      select(null);
      if (onAreaClick) {
        const hit = [...visibleAreas].reverse().find((a) => mapPointInPolygon(at, a.points.map((pt) => mapToScreen(pt, view, size))));
        if (hit) onAreaClick(hit);
      }
      onMapClick?.(point);
    }
  };

  const changeRing = (next: MapLatLng[]) => {
    if (editProp === undefined) setInnerEdit(next);
    onAreaChange?.(next);
  };
  const movePicked = (screen: { x: number; y: number }) => {
    const next = mapFromScreen(screen, view, size);
    if (pickedProp === undefined) setInnerPicked(next);
    onPickedPointChange?.(next);
  };
  const moveVertex = (index: number, screen: { x: number; y: number }) => changeRing(editRing.map((pt, i) => (i === index ? mapFromScreen(screen, view, size) : pt)));

  const fit = () => {
    if (viewProp === undefined) setOwn(null);
    onViewChange?.(fitted);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      if (event.key === "Escape" && selectedId) {
        select(null);
        canvas.current?.focus();
      }
      return;
    }
    const step = 80;
    switch (event.key) {
      case "ArrowLeft":
        setView(mapPanBy(view, step, 0));
        break;
      case "ArrowRight":
        setView(mapPanBy(view, -step, 0));
        break;
      case "ArrowUp":
        setView(mapPanBy(view, 0, step));
        break;
      case "ArrowDown":
        setView(mapPanBy(view, 0, -step));
        break;
      case "+":
      case "=":
        zoomBy(1);
        break;
      case "-":
      case "_":
        zoomBy(-1);
        break;
      case "Home":
      case "0":
        fit();
        break;
      case "Escape":
        select(null);
        break;
      case "Enter":
        if (!editing) return;
        changeRing([...editRing, view.center]);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const toggleLayer = (id: string, on: boolean) => {
    const next = on ? [...shown, id] : shown.filter((x) => x !== id);
    if (visibleLayers === undefined) setInnerLayers(next);
    onVisibleLayersChange?.(next);
  };

  // A cluster list only makes sense at the zoom it was opened at: zooming out closes it.
  const listed = useMemo(() => (clusterList && view.zoom >= clusterMax ? visiblePins.filter((p) => clusterList.includes(p.id)) : []), [clusterList, view.zoom, clusterMax, visiblePins]);
  const selected = selectedId ? pins.find((p) => p.id === selectedId) : undefined;
  const legendVisible = legendOpen ?? layersPanel === "expanded";
  const fmtKm = (m: number) => new Intl.NumberFormat(ar ? "ar-u-nu-latn" : "en", { maximumFractionDigits: 1 }).format(m / 1000);

  const tiles = useMemo(() => (ready && tileUrl ? mapVisibleTiles(view, size) : []), [ready, tileUrl, view, size]);
  const grid = useMemo(() => {
    if (!ready || tileUrl) return null;
    const step = mapGraticuleStep(view.zoom);
    const nw = mapFromScreen({ x: 0, y: 0 }, view, size);
    const se = mapFromScreen({ x: size.width, y: size.height }, view, size);
    const lngs: number[] = [];
    const lats: number[] = [];
    const west = Math.min(nw.lng, se.lng);
    const east = Math.max(nw.lng, se.lng);
    if (east - west < 360) for (let v = Math.ceil(west / step) * step; v <= east && lngs.length < 60; v += step) lngs.push(v);
    for (let v = Math.ceil(Math.min(nw.lat, se.lat) / step) * step; v <= Math.max(nw.lat, se.lat) && lats.length < 60; v += step) lats.push(v);
    return {
      x: lngs.map((lng) => mapToScreen({ lat: view.center.lat, lng }, view, size).x),
      y: lats.map((lat) => mapToScreen({ lat, lng: view.center.lng }, view, size).y),
    };
  }, [ready, tileUrl, view, size]);
  const scale = useMemo(() => mapScaleBar(view), [view]);

  const layerCount = (id: string) => pins.filter((p) => p.layer === id).length;
  const scaleText = scale.meters >= 1000 ? `${scale.meters / 1000} km` : `${scale.meters} m`;
  const cardActions = selected ? (pinActions?.(selected) ?? []) : [];

  return (
    <div
      ref={canvas}
      dir="ltr"
      role="group"
      aria-roledescription="map"
      aria-label={label ?? t.map}
      aria-describedby={undefined}
      tabIndex={0}
      data-slot="map-view"
      data-dragging={drag || undefined}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest("[data-map-control]")) return;
        const rect = event.currentTarget.getBoundingClientRect();
        zoomBy(1, { x: event.clientX - rect.left, y: event.clientY - rect.top });
      }}
      title={t.hint}
      className={cn(
        "relative isolate h-[28rem] min-h-64 w-full touch-none select-none overflow-hidden rounded-card border border-border bg-secondary outline-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
        drag ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
    >
      {ready ? (
        <>
          {tiles.length > 0 && tileUrl ? (
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              {tiles.map((tile) => {
                const src = mapTileUrl(tileUrl, tile.x, tile.y, tile.z);
                return src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={tile.key}
                    src={src}
                    alt=""
                    draggable={false}
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                    className="absolute max-w-none"
                    style={{ left: tile.left, top: tile.top, width: tile.size + 0.5, height: tile.size + 0.5 }}
                  />
                ) : null;
              })}
            </div>
          ) : null}
          {grid ? (
            <svg aria-hidden className="pointer-events-none absolute inset-0 size-full stroke-border" data-slot="map-grid">
              {grid.x.map((x) => (
                <line key={`x${x}`} x1={x} x2={x} y1={0} y2={size.height} strokeWidth={1} />
              ))}
              {grid.y.map((y) => (
                <line key={`y${y}`} x1={0} x2={size.width} y1={y} y2={y} strokeWidth={1} />
              ))}
            </svg>
          ) : null}
          {visibleAreas.length > 0 ? (
            <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" data-slot="map-areas">
              {visibleAreas.map((area) => {
                if (area.points.length < 3) return null;
                const d = area.points.map((pt) => mapToScreen(pt, view, size)).map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");
                const tone = area.tone ?? "brand";
                return <polygon key={area.id} data-area={area.id} points={d} strokeWidth={2} strokeLinejoin="round" strokeDasharray={area.dashed ? "6 6" : undefined} className={cn(FILL[tone], STROKE[tone])} />;
              })}
            </svg>
          ) : null}
          <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" data-slot="map-routes">
            {visibleRoutes.map((route) => {
              const pts = route.points.map((p) => mapToScreen(p, view, size));
              if (pts.length < 2) return null;
              const d = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
              const first = pts[0];
              const end = pts[pts.length - 1];
              const tone = route.tone ?? "info";
              return (
                <g key={route.id} data-route={route.id}>
                  <polyline points={d} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={7} className="stroke-card" opacity={0.85} />
                  <polyline points={d} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} strokeDasharray={route.dashed ? "2 9" : undefined} className={STROKE[tone]} />
                  {first ? <circle cx={first.x} cy={first.y} r={4.5} strokeWidth={2} className={cn("fill-card", STROKE[tone])} /> : null}
                  {end ? <circle cx={end.x} cy={end.y} r={4.5} strokeWidth={2} className={cn("fill-primary", "stroke-card")} /> : null}
                </g>
              );
            })}
          </svg>
          {editing && editRing.length > 0 ? (
            <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" data-slot="map-edit-shape">
              {editRing.length >= 3 ? (
                <polygon points={editRing.map((pt) => mapToScreen(pt, view, size)).map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ")} strokeWidth={2} strokeLinejoin="round" strokeDasharray="6 6" className={cn(FILL[editTone], STROKE[editTone])} />
              ) : (
                <polyline points={editRing.map((pt) => mapToScreen(pt, view, size)).map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ")} fill="none" strokeWidth={2} strokeDasharray="6 6" className={STROKE[editTone]} />
              )}
            </svg>
          ) : null}
          {items.map((item) => {
            if (item.type === "cluster") {
              const c = mapToScreen(item, view, size);
              if (c.x < -64 || c.y < -64 || c.x > size.width + 64 || c.y > size.height + 64) return null;
              const diameter = Math.round(Math.min(64, 36 + Math.log2(item.count) * 6));
              const canList = view.zoom >= clusterMax;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-map-control=""
                  data-cluster={item.id}
                  data-count={item.count}
                  aria-label={canList ? t.clusterList(item.count) : t.clusterZoom(item.count)}
                  onClick={() => expandCluster(item.pins)}
                  className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-card bg-primary text-label tabular-nums text-primary-foreground shadow-md ring-4 ring-primary/25 outline-none transition-transform duration-150 ease-nq hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
                  style={{ left: c.x, top: c.y, width: diameter, height: diameter }}
                >
                  {renderCluster ? renderCluster({ count: item.count, pins: item.pins, lat: item.lat, lng: item.lng, size: diameter }) : <bdi>{item.count}</bdi>}
                </button>
              );
            }
            const pin = item.pin;
            const p = mapToScreen(pin, view, size);
            if (p.x < -48 || p.y < -48 || p.x > size.width + 48 || p.y > size.height + 96) return null;
            const Icon = pin.icon ?? MapPinIcon;
            const tone = pin.tone ?? "brand";
            const isSelected = pin.id === selectedId;
            const name = pick(pin.label, pin.labelAr, ar);
            const button = (
              <button
                key={pin.id}
                type="button"
                data-map-control=""
                data-pin={pin.id}
                data-selected={isSelected || undefined}
                data-live={pin.live || undefined}
                aria-label={isSelected ? t.selected(name) : name}
                aria-pressed={isSelected}
                onClick={() => {
                  select(isSelected ? null : pin.id);
                  onPinClick?.(pin);
                }}
                className={cn(
                  "absolute flex -translate-x-1/2 -translate-y-full cursor-pointer flex-col items-center outline-none",
                  "focus-visible:[&>span:first-child]:outline-2 focus-visible:[&>span:first-child]:outline-offset-2 focus-visible:[&>span:first-child]:outline-nq-focus",
                  isSelected ? "z-20" : "z-10",
                  pin.live && !drag && "motion-safe:transition-[left,top] motion-safe:duration-1000 motion-safe:ease-linear",
                )}
                style={{ left: p.x, top: p.y }}
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full border-2 shadow-sm transition-transform duration-150 ease-nq [&_svg]:size-4",
                    isSelected ? "size-10 scale-110 ring-4 ring-nq-focus/30" : "size-8",
                    PIN_TONE[tone],
                  )}
                >
                  <Icon aria-hidden />
                </span>
                {pin.live ? <span aria-hidden className={cn("pointer-events-none absolute top-0 rounded-full motion-safe:animate-ping", isSelected ? "size-10" : "size-8", SWATCH[tone], "opacity-25")} /> : null}
                <span aria-hidden className={cn("-mt-0.5 h-2 w-0.5", SWATCH[tone])} />
                {isSelected ? (
                  <bdi dir="auto" className="pointer-events-none absolute top-full mt-0.5 max-w-40 truncate rounded-[4px] border border-border bg-card px-1.5 text-caption text-foreground shadow-sm">
                    {name}
                  </bdi>
                ) : null}
              </button>
            );
            const actions = pinActions?.(pin) ?? [];
            return actions.length ? <ContextMenuActions key={pin.id} actions={actions} render={button} /> : button;
          })}
          {editing
            ? editRing.map((pt, i) => {
                const q = mapToScreen(pt, view, size);
                return (
                  <MapHandle
                    key={i}
                    canvas={canvas}
                    x={q.x}
                    y={q.y}
                    label={t.vertex(i + 1)}
                    hint={t.vertexHint}
                    data={{ "data-vertex": String(i) }}
                    onMove={(screen) => moveVertex(i, screen)}
                    onRemove={() => changeRing(editRing.filter((_, k) => k !== i))}
                    className={cn("size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-sm", SWATCH[editTone])}
                  />
                );
              })
            : null}
          {picked
            ? (() => {
                const q = mapToScreen(picked, view, size);
                return (
                  <MapHandle
                    canvas={canvas}
                    x={q.x}
                    y={q.y}
                    label={t.pickedPoint}
                    hint={t.pickedHint}
                    data={{ "data-picked-point": "" }}
                    onMove={movePicked}
                    className="-translate-x-1/2 -translate-y-full flex-col"
                  >
                    <span className="flex size-10 items-center justify-center rounded-full border-2 border-primary bg-primary text-primary-foreground shadow-md ring-4 ring-nq-focus/30 [&_svg]:size-5">
                      <MapPinIcon aria-hidden />
                    </span>
                    <span aria-hidden className="-mt-0.5 h-2 w-0.5 bg-primary" />
                  </MapHandle>
                );
              })()
            : null}
          {pins.length === 0 && routes.length === 0 && areas.length === 0 && !editing && !picked ? (
            <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-body-sm text-muted-foreground">{t.noPins}</p>
          ) : null}
        </>
      ) : null}

      {legend && layersPanel !== "hidden" && (layers.length > 0 || visibleRoutes.length > 0 || visibleAreas.length > 0) ? (
        <div data-map-control="" data-slot="map-legend" className="absolute start-3 top-3 z-30 flex max-w-[calc(100%-6rem)] cursor-default flex-col items-start gap-1.5" dir={ar ? "rtl" : "ltr"}>
          <Button type="button" variant="secondary" size="sm" aria-expanded={legendVisible} onClick={() => setLegendOpen(!legendVisible)} className="shadow-sm">
            <Layers aria-hidden />
            {t.layers}
          </Button>
          {legendVisible ? (
            <div className="flex w-56 max-w-full flex-col gap-2 rounded-card border border-border bg-card p-3 text-body-sm shadow-md">
              {layers.length > 0 ? (
                <ul role="list" className="flex flex-col gap-1.5">
                  {layers.map((layer) => {
                    const name = pick(layer.label, layer.labelAr, ar);
                    const Icon = layer.icon;
                    return (
                      <li key={layer.id}>
                        <label className="flex cursor-pointer items-center gap-2">
                          <Checkbox checked={shown.includes(layer.id)} onCheckedChange={(on) => toggleLayer(layer.id, on)} aria-label={t.showLayer(name)} />
                          {Icon ? <Icon aria-hidden className="size-3.5 text-muted-foreground" /> : <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", SWATCH[layer.tone ?? "brand"])} />}
                          <span className="min-w-0 flex-1 truncate text-foreground">{name}</span>
                          <span className="text-caption tabular-nums text-muted-foreground">{layerCount(layer.id)}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {visibleAreas.length > 0 ? (
                <div className={cn("flex flex-col gap-1.5", layers.length > 0 && "border-t border-border pt-2")}>
                  <span className="text-caption text-muted-foreground">{t.areas}</span>
                  <ul role="list" className="flex flex-col gap-1.5">
                    {visibleAreas.map((area) => (
                      <li key={area.id}>
                        {onAreaClick ? (
                          <button type="button" data-area-item={area.id} onClick={() => onAreaClick(area)} className="flex w-full cursor-pointer items-center gap-2 rounded-control text-start outline-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <span aria-hidden className={cn("size-3 shrink-0 rounded-[3px] opacity-70", SWATCH[area.tone ?? "brand"])} />
                            <span className="min-w-0 flex-1 truncate text-foreground">{pick(area.label, area.labelAr, ar)}</span>
                          </button>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span aria-hidden className={cn("size-3 shrink-0 rounded-[3px] opacity-70", SWATCH[area.tone ?? "brand"])} />
                            <span className="min-w-0 flex-1 truncate text-foreground">{pick(area.label, area.labelAr, ar)}</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {visibleRoutes.length > 0 ? (
                <div className={cn("flex flex-col gap-1.5", (layers.length > 0 || visibleAreas.length > 0) && "border-t border-border pt-2")}>
                  <span className="text-caption text-muted-foreground">{t.routes}</span>
                  <ul role="list" className="flex flex-col gap-1.5">
                    {visibleRoutes.map((route) => (
                      <li key={route.id} className="flex items-center gap-2">
                        <span aria-hidden className={cn("h-0.5 w-4 shrink-0 rounded-full", SWATCH[route.tone ?? "info"], route.dashed && "opacity-60")} />
                        <span className="min-w-0 flex-1 truncate text-foreground">{pick(route.label, route.labelAr, ar)}</span>
                        <bdi className="text-caption tabular-nums text-muted-foreground">{t.routeLength(fmtKm(mapRouteLength(route.points)))}</bdi>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div data-map-control="" dir={ar ? "rtl" : "ltr"} className="absolute end-3 top-3 z-30 flex cursor-default flex-col gap-1.5">
        <Button type="button" variant="secondary" size="icon" aria-label={t.zoomIn} title={t.zoomIn} disabled={view.zoom >= maxZoom} onClick={() => zoomBy(1)} className="shadow-sm">
          <Plus aria-hidden />
        </Button>
        <Button type="button" variant="secondary" size="icon" aria-label={t.zoomOut} title={t.zoomOut} disabled={view.zoom <= minZoom} onClick={() => zoomBy(-1)} className="shadow-sm">
          <Minus aria-hidden />
        </Button>
        <Button type="button" variant="secondary" size="icon" aria-label={t.fit} title={t.fit} onClick={fit} className="shadow-sm">
          <Crosshair aria-hidden />
        </Button>
      </div>

      {editing ? (
        <div data-map-control="" data-slot="map-edit-toolbar" role="toolbar" aria-label={t.shape} dir={ar ? "rtl" : "ltr"} className="absolute inset-x-0 top-3 z-30 mx-auto flex w-fit max-w-[calc(100%-9rem)] cursor-default flex-wrap items-center justify-center gap-1.5 rounded-card border border-border bg-card p-1.5 shadow-md">
          <span className="px-1.5 text-caption text-muted-foreground">{t.editHint}</span>
          <Button type="button" size="sm" variant="secondary" disabled={editRing.length === 0} onClick={() => changeRing(editRing.slice(0, -1))}>
            <Undo2 aria-hidden />
            {t.removeLast}
          </Button>
          <Button type="button" size="sm" disabled={editRing.length < 3} onClick={() => onAreaDone?.([...editRing])}>
            <Check aria-hidden />
            {t.finishShape}
          </Button>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-3 bottom-2 z-10 flex items-end justify-between gap-3 text-caption text-muted-foreground">
        <span aria-hidden className={cn("flex flex-col items-start gap-0.5", selected && "max-sm:invisible")}>
          <span className="h-1.5 border-x border-b border-foreground/60" style={{ width: scale.px }} />
          <span className="tabular-nums">{scaleText}</span>
        </span>
        {attribution ? <span className="pointer-events-auto max-w-[70%] rounded-[4px] bg-card/80 px-1.5 text-end">{attribution}</span> : null}
      </div>

      {listed.length > 0 && !selected ? (
        <section
          data-map-control=""
          data-slot="map-cluster-card"
          aria-label={t.clusterPins(listed.length)}
          dir={ar ? "rtl" : "ltr"}
          className="absolute inset-x-3 bottom-8 z-30 flex max-h-[70%] cursor-default flex-col gap-2 overflow-auto rounded-card border border-border bg-card p-4 shadow-lg sm:inset-x-auto sm:bottom-8 sm:start-3 sm:w-80"
        >
          <header className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-label text-foreground">{t.clusterPins(listed.length)}</span>
              <span className="text-body-sm text-muted-foreground">{t.clusterHint}</span>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t.close} onClick={() => setClusterList(null)}>
              <X aria-hidden />
            </Button>
          </header>
          <ul role="list" className="flex flex-col gap-1">
            {listed.map((pin) => {
              const Icon = pin.icon ?? MapPinIcon;
              return (
                <li key={pin.id}>
                  <button
                    type="button"
                    data-cluster-pin={pin.id}
                    onClick={() => select(pin.id)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-start text-body-sm text-foreground outline-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-nq-focus"
                  >
                    <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border [&_svg]:size-3.5", PIN_TONE[pin.tone ?? "brand"])}>
                      <Icon aria-hidden />
                    </span>
                    <bdi dir="auto" className="min-w-0 flex-1 truncate">
                      {pick(pin.label, pin.labelAr, ar)}
                    </bdi>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {selected ? (
        <section
          data-map-control=""
          data-slot="map-card"
          aria-label={pick(selected.label, selected.labelAr, ar)}
          dir={ar ? "rtl" : "ltr"}
          className="absolute inset-x-3 bottom-8 z-30 flex max-h-[70%] cursor-default flex-col gap-3 overflow-auto rounded-card border border-border bg-card p-4 shadow-lg sm:inset-x-auto sm:bottom-8 sm:start-3 sm:w-80"
        >
          <header className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <bdi dir="auto" className="truncate text-label text-foreground">
                {pick(selected.label, selected.labelAr, ar)}
              </bdi>
              {selected.detail || selected.detailAr ? (
                <bdi dir="auto" className="text-body-sm text-muted-foreground">
                  {pick(selected.detail, selected.detailAr, ar)}
                </bdi>
              ) : null}
            </div>
            {selected.status || selected.statusAr ? <Badge variant={BADGE[selected.tone ?? "neutral"]}>{pick(selected.status, selected.statusAr, ar)}</Badge> : null}
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t.close} onClick={() => select(null)}>
              <X aria-hidden />
            </Button>
          </header>
          {renderCard ? (
            renderCard(selected)
          ) : selected.meta?.length ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
              {selected.meta.map((m, i) => (
                <div key={i} className="contents">
                  <dt className="text-muted-foreground">{pick(m.label, m.labelAr, ar)}</dt>
                  <dd className="min-w-0 text-foreground"><bdi dir="auto">{m.value}</bdi></dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="flex items-center gap-1 text-caption text-muted-foreground">
            <span className="sr-only">{t.coordinates}</span>
            <bdi dir="ltr" className="tabular-nums">
              {mapFormatCoordinates(selected)}
            </bdi>
            <CopyButton value={mapFormatCoordinates(selected, 6)} label={t.copyCoordinates} size="icon-sm" />
          </div>
          {cardActions.length ? (
            <div className="flex flex-wrap gap-2">
              {cardActions.map((action) => {
                const Icon = action.icon as LucideIcon | undefined;
                return (
                  <Button key={action.id} type="button" size="sm" variant={action.danger ? "danger" : "secondary"} disabled={action.disabled} onClick={action.onSelect}>
                    {Icon && typeof Icon !== "object" ? <Icon aria-hidden /> : null}
                    {action.label}
                  </Button>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
