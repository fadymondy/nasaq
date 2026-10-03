import type { Component } from "vue";
import type { TagHue } from "../badge";
import type { GraphLinkStyle, GraphNodeShape } from "./graph-shapes";

export type GraphViewMode = "graph" | "grid" | "list" | "schema";
/** Where a node's label sits. The graph surface is left-to-right, so "right" is always on the physical right. */
export type GraphLabelPosition = "bottom" | "right" | "inside" | "none";

export interface GraphViewNode {
  id: string;
  label: string;
  /** Matches a `GraphViewKind` id. */
  kind: string;
  description?: string;
  tags?: string[];
  updatedAt?: Date | number | string;
  /** Overrides the shape of the node's kind. */
  shape?: GraphNodeShape;
  /** How important the node is. Sets its size instead of its number of links. */
  weight?: number;
  /** Overrides the icon of the node's kind (a lucide-vue-next icon). */
  icon?: Component;
  /** Overrides where the label goes for this node. */
  labelPosition?: GraphLabelPosition;
}

export interface GraphViewLink {
  source: string;
  target: string;
  /** How the source relates to the target ("part of", "cites"). */
  label?: string;
  /** Matches a `GraphViewLinkKind` id, for the line style. */
  kind?: string;
}

export interface GraphViewKind {
  id: string;
  label: string;
  /** Categorical colour. Kinds are also told apart by name in the legend, cards and list. */
  hue: TagHue;
  icon?: Component;
  /** The shape of this kind's nodes in the graph. Default `"circle"`. */
  shape?: GraphNodeShape;
  labelPosition?: GraphLabelPosition;
}

/** How one kind of relation is drawn. */
export interface GraphViewLinkKind {
  id: string;
  label?: string;
  /** `"flow"` is dashes moving from source to target (still under reduced motion). Default `"solid"`. */
  style?: GraphLinkStyle;
  /** Draw an arrowhead at the target. */
  arrow?: boolean;
  /** Colour of the line. Default the neutral line colour. */
  hue?: TagHue;
}

/** What the `node` slot receives to draw one node. Drawn inside an SVG group centred on the node. */
export interface GraphNodeRenderContext {
  node: GraphViewNode;
  kind: GraphViewKind | undefined;
  shape: GraphNodeShape;
  /** Size (radius) from links or `weight`. */
  radius: number;
  selected: boolean;
  /** Hovered, focused or next to the hovered node. */
  highlighted: boolean;
  /** Faded because something else is focused. */
  dimmed: boolean;
  pinned: boolean;
}

export interface GraphViewLabels {
  search: string;
  view: string;
  graph: string;
  grid: string;
  list: string;
  schema: string;
  kinds: string;
  counts: (nodes: string, links: string) => string;
  zoomIn: string;
  zoomOut: string;
  fit: string;
  graphHint: string;
  schemaHint: string;
  pinned: string;
  inspector: string;
  close: string;
  open: string;
  linksTo: string;
  linkedFrom: string;
  noLinks: string;
  updated: string;
  tags: string;
  connections: (n: string) => string;
  colName: string;
  colKind: string;
  colLinks: string;
  colUpdated: string;
  emptyTitle: string;
  emptyBody: string;
  clear: string;
}

export const GRAPH_STRINGS: { en: GraphViewLabels; ar: GraphViewLabels } = {
  en: {
    search: "Search the graph",
    view: "View",
    graph: "Graph",
    grid: "Grid",
    list: "List",
    schema: "Schema",
    kinds: "Filter by type",
    counts: (n, l) => `${n} items, ${l} links`,
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fit: "Fit to view",
    graphHint: "Drag a node to pin it, double-click to release it. Drag the background to pan, scroll to zoom.",
    schemaHint: "Hover a card to trace its links. Drag to pan, Ctrl and scroll to zoom.",
    pinned: "pinned",
    inspector: "Details",
    close: "Close",
    open: "Open",
    linksTo: "Links to",
    linkedFrom: "Linked from",
    noLinks: "Not connected to anything yet.",
    updated: "Updated",
    tags: "Tags",
    connections: (n) => `${n} links`,
    colName: "Name",
    colKind: "Type",
    colLinks: "Links",
    colUpdated: "Updated",
    emptyTitle: "Nothing matches",
    emptyBody: "Try a different search or clear the type filter.",
    clear: "Clear filters",
  },
  ar: {
    search: "ابحث في الرسم",
    view: "العرض",
    graph: "رسم",
    grid: "شبكة",
    list: "قائمة",
    schema: "مخطط",
    kinds: "تصفية حسب النوع",
    counts: (n, l) => `${n} عنصرًا، ${l} روابط`,
    zoomIn: "تكبير",
    zoomOut: "تصغير",
    fit: "ملاءمة العرض",
    graphHint: "اسحب عقدة لتثبيتها وانقر مرتين لتحريرها. اسحب الخلفية للتحريك ومرّر للتكبير.",
    schemaHint: "مرّر فوق بطاقة لتتبّع روابطها. اسحب للتحريك، وCtrl مع التمرير للتكبير.",
    pinned: "مثبّتة",
    inspector: "التفاصيل",
    close: "إغلاق",
    open: "فتح",
    linksTo: "يرتبط بـ",
    linkedFrom: "مرتبط من",
    noLinks: "غير مرتبط بشيء بعد.",
    updated: "آخر تحديث",
    tags: "الوسوم",
    connections: (n) => `${n} روابط`,
    colName: "الاسم",
    colKind: "النوع",
    colLinks: "الروابط",
    colUpdated: "آخر تحديث",
    emptyTitle: "لا نتائج مطابقة",
    emptyBody: "جرّب بحثًا آخر أو امسح تصفية النوع.",
    clear: "مسح التصفية",
  },
};

export const hueVar = (hue: TagHue | undefined) => (hue ? `var(--nq-tag-${hue})` : "var(--nq-line-strong)");

/** Cuts a label to `max` characters with an ellipsis. */
export function fitText(text: string, max: number): string {
  const chars = [...text];
  return chars.length <= Math.max(1, max) ? text : `${chars.slice(0, Math.max(1, max - 1)).join("")}…`;
}
