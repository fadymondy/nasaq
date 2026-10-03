import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import type { Severity } from "./vuln-format";

export const STRINGS = {
  en: {
    title: "Vulnerability report",
    description: "What the last scan found in your packages and images.",
    severity: { critical: "Critical", high: "High", medium: "Medium", low: "Low" } satisfies Record<Severity, string>,
    total: "Total findings",
    clean: "No vulnerabilities found",
    cleanBody: "The last scan came back clean.",
    top: "Top findings",
    topEmpty: "Nothing to fix.",
    pkg: "Package",
    installed: "Installed",
    fixedIn: "Fixed in",
    noFix: "No fix yet",
    cvss: "CVSS",
    history: "Scan history",
    historyLabel: (d: string, n: number) => `Scan on ${d}: ${n} findings`,
    scannedAt: "Last scan",
    scanNow: "Scan now",
    scanning: "Scanning",
    better: (n: number) => `${n} fewer than the previous scan`,
    worse: (n: number) => `${n} more than the previous scan`,
    same: "Same as the previous scan",
    showAll: "Show all findings",
    noScan: "No scan yet",
    noScanBody: "Run a scan to see what needs patching.",
    copyCve: (id: string) => `Copy ${id}`,
    genericError: "Something went wrong. Try again.",
  },
  ar: {
    title: "تقرير الثغرات",
    description: "ما وجده آخر فحص في حزمك وصورك.",
    severity: { critical: "حرجة", high: "عالية", medium: "متوسطة", low: "منخفضة" } satisfies Record<Severity, string>,
    total: "إجمالي النتائج",
    clean: "لا توجد ثغرات",
    cleanBody: "انتهى آخر فحص دون نتائج.",
    top: "أهم النتائج",
    topEmpty: "لا شيء يحتاج إصلاحًا.",
    pkg: "الحزمة",
    installed: "المثبّتة",
    fixedIn: "أُصلحت في",
    noFix: "لا إصلاح بعد",
    cvss: "CVSS",
    history: "سجل الفحوص",
    historyLabel: (d: string, n: number) => `فحص بتاريخ ${d}: ${n} نتيجة`,
    scannedAt: "آخر فحص",
    scanNow: "افحص الآن",
    scanning: "جارٍ الفحص",
    better: (n: number) => `أقل بـ ${n} من الفحص السابق`,
    worse: (n: number) => `أكثر بـ ${n} من الفحص السابق`,
    same: "مثل الفحص السابق",
    showAll: "عرض كل النتائج",
    noScan: "لا فحص بعد",
    noScanBody: "شغّل فحصًا لمعرفة ما يحتاج إلى ترقيع.",
    copyCve: (id: string) => `نسخ ${id}`,
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
  },
};
export type VulnReportStrings = typeof STRINGS.en;
export type VulnReportLabels = Partial<VulnReportStrings>;

export function useVulnLabels(override?: () => VulnReportLabels | undefined): { ar: ComputedRef<boolean>; t: ComputedRef<VulnReportStrings> } {
  const nq = useNasaq();
  const ar = computed(() => nq.locale.value.startsWith("ar"));
  return { ar, t: computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...override?.() })) };
}
