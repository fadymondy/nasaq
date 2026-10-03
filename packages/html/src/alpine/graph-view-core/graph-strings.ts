// The graph view strings, English and Arabic (the same as the React and Vue GRAPH_STRINGS).

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
