import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import type { MonitorStatus, OverallStatus } from "../uptime-monitors";

export const STATUS_PAGE_STRINGS = {
  en: {
    overall: { operational: "All systems operational", degraded: "Degraded performance", "partial-outage": "Partial outage", "major-outage": "Major outage", maintenance: "Maintenance in progress" } satisfies Record<OverallStatus, string>,
    updated: "Updated",
    services: "Services",
    status: { up: "Operational", degraded: "Degraded", down: "Outage", paused: "Paused", unknown: "No data" } satisfies Record<MonitorStatus, string>,
    uptime90: (n: number) => `${n}-day uptime`,
    daysAgo: (n: number) => `${n} days ago`,
    today: "Today",
    active: "Active incidents",
    past: "Past incidents",
    noIncidents: "No incidents reported.",
    maintenance: "Scheduled maintenance",
    maintenanceEmpty: "No maintenance is scheduled.",
    from: "From",
    until: "Until",
    group: "Service group",
    footer: "Powered by Nasaq",
    history: (name: string) => `${name}, daily status`,
  },
  ar: {
    overall: { operational: "كل الأنظمة تعمل", degraded: "أداء متدهور", "partial-outage": "انقطاع جزئي", "major-outage": "انقطاع كبير", maintenance: "صيانة جارية" } satisfies Record<OverallStatus, string>,
    updated: "آخر تحديث",
    services: "الخدمات",
    status: { up: "تعمل", degraded: "متدهورة", down: "متوقفة", paused: "موقوفة", unknown: "لا بيانات" } satisfies Record<MonitorStatus, string>,
    uptime90: (n: number) => `وقت التشغيل خلال ${n} يومًا`,
    daysAgo: (n: number) => `قبل ${n} يومًا`,
    today: "اليوم",
    active: "حوادث جارية",
    past: "حوادث سابقة",
    noIncidents: "لا توجد حوادث مُبلَّغ عنها.",
    maintenance: "صيانة مجدولة",
    maintenanceEmpty: "لا توجد صيانة مجدولة.",
    from: "من",
    until: "إلى",
    group: "مجموعة خدمات",
    footer: "بدعم من نسق",
    history: (name: string) => `${name}، الحالة اليومية`,
  },
};
export type StatusPageStrings = typeof STATUS_PAGE_STRINGS.en;
export type StatusPageLabels = Partial<StatusPageStrings>;

export function useStatusPageStrings(labels: () => StatusPageLabels | undefined): ComputedRef<StatusPageStrings> {
  const nasaq = useNasaq();
  return computed(() => ({ ...STATUS_PAGE_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...labels() }));
}
