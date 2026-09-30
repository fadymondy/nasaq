/*
 * Shared demo data for batch S stories: reports, KPIs, pipeline, support, trends and dashboard widgets.
 * Deterministic, no network. Names and figures are invented.
 */
import { useNasaq } from "@nasaq/web";

export const useAr = () => useNasaq().locale.startsWith("ar");

/** Pick English or Arabic text. */
export const t = (ar: boolean, en: string, arText: string) => (ar ? arText : en);

/** A steady pseudo-random series, so charts do not change between renders. */
export function series(n: number, base: number, wobble: number, seed = 1): number[] {
  let s = seed * 9301 + 49297;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    out.push(Math.max(0, Math.round(base + (s / 233280 - 0.5) * wobble + i * (wobble / n) * 0.3)));
  }
  return out;
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------------------------------- chart extras */

export const channelSegments = (ar: boolean) => [
  { id: "organic", label: t(ar, "Organic search", "بحث طبيعي"), value: 4200 },
  { id: "paid", label: t(ar, "Paid", "إعلانات مدفوعة"), value: 2100 },
  { id: "referral", label: t(ar, "Referral", "إحالات"), value: 900 },
  { id: "direct", label: t(ar, "Direct", "مباشر"), value: 1500 },
];

export const funnelSteps = (ar: boolean) => [
  { id: "visit", label: t(ar, "Visited", "زاروا الموقع"), count: 12000, detail: "page_view" },
  { id: "signup", label: t(ar, "Signed up", "سجّلوا"), count: 3400, detail: "sign_up" },
  { id: "trial", label: t(ar, "Started trial", "بدأوا التجربة"), count: 2100, detail: "trial_start" },
  { id: "paid", label: t(ar, "Paid", "دفعوا"), count: 910, detail: "purchase" },
];

export const trendRows = (ar: boolean) => [
  { id: "r1", name: t(ar, "Riyadh", "الرياض"), revenue: 184000, change: 0.124, weeks: series(8, 20, 12, 2) },
  { id: "r2", name: t(ar, "Jeddah", "جدة"), revenue: 121500, change: -0.061, weeks: series(8, 18, 10, 3) },
  { id: "r3", name: t(ar, "Dammam", "الدمام"), revenue: 64200, change: 0.018, weeks: series(8, 9, 6, 4) },
  { id: "r4", name: t(ar, "Abha", "أبها"), revenue: 21800, change: 0.302, weeks: series(8, 4, 4, 5) },
];

/* ------------------------------------------------------------------------------------------- report filters */

export const REPORT_NOW = new Date("2026-09-30T09:30:00Z");

export interface DealRow {
  id: string;
  name: string;
  owner: "sara" | "omar" | "lina";
  status: "open" | "won" | "lost";
  channel: "inbound" | "outbound";
  amount: number;
  /** Days before REPORT_NOW. */
  daysAgo: number;
}

export const DEAL_ROWS: DealRow[] = [
  { id: "d1", name: "Al Noor Logistics", owner: "sara", status: "won", channel: "inbound", amount: 48000, daysAgo: 1 },
  { id: "d2", name: "Baraka Foods", owner: "omar", status: "open", channel: "outbound", amount: 22500, daysAgo: 3 },
  { id: "d3", name: "Cedar Clinics", owner: "lina", status: "won", channel: "inbound", amount: 31200, daysAgo: 6 },
  { id: "d4", name: "Desert Rose Hotels", owner: "sara", status: "lost", channel: "outbound", amount: 67000, daysAgo: 9 },
  { id: "d5", name: "Ejada Consulting", owner: "omar", status: "won", channel: "inbound", amount: 15400, daysAgo: 12 },
  { id: "d6", name: "Farah Retail", owner: "lina", status: "open", channel: "inbound", amount: 9800, daysAgo: 17 },
  { id: "d7", name: "Ghaith Motors", owner: "sara", status: "open", channel: "outbound", amount: 54000, daysAgo: 21 },
  { id: "d8", name: "Hikma Pharma Dist.", owner: "omar", status: "lost", channel: "inbound", amount: 28700, daysAgo: 26 },
  { id: "d9", name: "Ibtikar Labs", owner: "lina", status: "won", channel: "outbound", amount: 19900, daysAgo: 33 },
  { id: "d10", name: "Jood Bakeries", owner: "sara", status: "won", channel: "inbound", amount: 12300, daysAgo: 41 },
  { id: "d11", name: "Kunuz Jewellery", owner: "omar", status: "open", channel: "inbound", amount: 41000, daysAgo: 47 },
  { id: "d12", name: "Lamsa Studio", owner: "lina", status: "lost", channel: "outbound", amount: 8600, daysAgo: 55 },
];

export const DEAL_NAMES_AR: Record<string, string> = {
  d1: "النور للخدمات اللوجستية",
  d2: "بركة للأغذية",
  d3: "عيادات الأرز",
  d4: "فنادق وردة الصحراء",
  d5: "إجادة للاستشارات",
  d6: "فرح للتجزئة",
  d7: "غيث للسيارات",
  d8: "حكمة لتوزيع الأدوية",
  d9: "ابتكار لابس",
  d10: "جود للمخابز",
  d11: "كنوز للمجوهرات",
  d12: "لمسة ستوديو",
};

export const dealFields = (ar: boolean) => [
  {
    id: "status",
    kind: "multi" as const,
    label: t(ar, "Status", "الحالة"),
    options: [
      { value: "open", label: t(ar, "Open", "مفتوحة") },
      { value: "won", label: t(ar, "Won", "مكسوبة") },
      { value: "lost", label: t(ar, "Lost", "خاسرة") },
    ],
  },
  {
    id: "owner",
    kind: "select" as const,
    label: t(ar, "Owner", "المسؤول"),
    options: [
      { value: "sara", label: t(ar, "Sara", "سارة") },
      { value: "omar", label: t(ar, "Omar", "عمر") },
      { value: "lina", label: t(ar, "Lina", "لينا") },
    ],
  },
  {
    id: "channel",
    kind: "toggle" as const,
    label: t(ar, "Channel", "القناة"),
    options: [
      { value: "inbound", label: t(ar, "Inbound", "وارد") },
      { value: "outbound", label: t(ar, "Outbound", "صادر") },
    ],
  },
];
