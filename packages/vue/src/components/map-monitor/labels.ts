import type { MapAlertSeverity } from "./map-monitor-logic";

export const MAP_MONITOR_STRINGS = {
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

export type MapMonitorLabels = Omit<(typeof MAP_MONITOR_STRINGS)["en"], "ranges" | "severity"> & {
  ranges: Record<string, string>;
  severity: Record<MapAlertSeverity, string>;
};
