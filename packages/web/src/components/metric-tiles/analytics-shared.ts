"use client";
import { useOptionalNasaq } from "../../provider/nasaq-provider";

/** True when the active locale is Arabic. Works outside a NasaqProvider (English). */
export function useAnalyticsAr(): boolean {
  return useOptionalNasaq()?.locale.startsWith("ar") ?? false;
}

/** The component's own English or Arabic strings, with the host's `labels` on top. */
export function useAnalyticsLabels<T extends object>(strings: { en: T; ar: T }, override?: Partial<T>): T {
  const ar = useAnalyticsAr();
  return { ...strings[ar ? "ar" : "en"], ...override };
}

export * from "./analytics-math";
