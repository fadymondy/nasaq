// The gauge's own words, en and ar, copied from the React WebVitalGauge.
import type { VitalRating, WebVitalId } from "./web-vitals-math";

export const STRINGS = {
  en: {
    names: {
      LCP: "Largest Contentful Paint",
      INP: "Interaction to Next Paint",
      CLS: "Cumulative Layout Shift",
      FCP: "First Contentful Paint",
      TTFB: "Time to First Byte",
    } as Record<WebVitalId, string>,
    hints: {
      LCP: "How fast the main content appears",
      INP: "How quickly the page responds to input",
      CLS: "How much the layout jumps while loading",
      FCP: "How fast anything first appears",
      TTFB: "How fast the server starts to answer",
    } as Record<WebVitalId, string>,
    rating: { good: "Good", "needs-improvement": "Needs improvement", poor: "Poor" } as Record<VitalRating, string>,
    p75: "75th percentile",
    core: "Core",
    good: "Good",
    needs: "Needs improvement",
    poorLabel: "Poor",
    distribution: "Page loads by rating",
    band: (from: string, to: string) => `${from} to ${to}`,
    atMost: (v: string) => `up to ${v}`,
    over: (v: string) => `over ${v}`,
    vsPrevious: "vs previous period",
    noData: "No data",
    gaugeLabel: (name: string, value: string, rating: string) => `${name}: ${value}, ${rating}`,
  },
  ar: {
    names: {
      LCP: "رسم أكبر محتوى",
      INP: "التفاعل حتى الرسم التالي",
      CLS: "الإزاحة التراكمية للتخطيط",
      FCP: "أول رسم للمحتوى",
      TTFB: "زمن وصول أول بايت",
    } as Record<WebVitalId, string>,
    hints: {
      LCP: "سرعة ظهور المحتوى الرئيسي",
      INP: "سرعة استجابة الصفحة للإدخال",
      CLS: "مقدار قفز التخطيط أثناء التحميل",
      FCP: "سرعة ظهور أي محتوى أولًا",
      TTFB: "سرعة بدء الخادم في الرد",
    } as Record<WebVitalId, string>,
    rating: { good: "جيد", "needs-improvement": "يحتاج تحسينًا", poor: "ضعيف" } as Record<VitalRating, string>,
    p75: "المئين 75",
    core: "أساسي",
    good: "جيد",
    needs: "يحتاج تحسينًا",
    poorLabel: "ضعيف",
    distribution: "تحميلات الصفحة حسب التقييم",
    band: (from: string, to: string) => `من ${from} إلى ${to}`,
    atMost: (v: string) => `حتى ${v}`,
    over: (v: string) => `أكثر من ${v}`,
    vsPrevious: "مقارنة بالفترة السابقة",
    noData: "لا بيانات",
    gaugeLabel: (name: string, value: string, rating: string) => `${name}: ${value}، ${rating}`,
  },
};

export type WebVitalGaugeLabels = typeof STRINGS.en;
