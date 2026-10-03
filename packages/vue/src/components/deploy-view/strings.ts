import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import { DEFAULT_UNITS, type DeployStatus, type DurationUnits } from "./deploy-format";

export const DEPLOY_VIEW_STRINGS = {
  en: {
    title: "Deploy",
    steps: "Deploy steps",
    status: {
      pending: "Queued",
      running: "Running",
      success: "Succeeded",
      failed: "Failed",
      skipped: "Skipped",
      cancelled: "Cancelled",
    } as Record<DeployStatus, string>,
    progress: (done: number, total: number) => `${done} of ${total} steps`,
    duration: "Duration",
    cancel: "Cancel deploy",
    retry: "Retry step",
    retryFrom: "Retry from here",
    retrying: "Retrying",
    retryFailed: "Could not retry. Try again.",
    noLogs: "No output for this step.",
    waitingLogs: "Waiting for output...",
    jump: "Jump to latest",
    trimmed: (n: number) => (n === 1 ? "1 earlier line hidden" : `${n} earlier lines hidden`),
    logs: (step: string) => `Logs for ${step}`,
    units: DEFAULT_UNITS,
    stepLabel: (n: number, name: string, status: string) => `Step ${n}: ${name}, ${status}`,
  },
  ar: {
    title: "النشر",
    steps: "خطوات النشر",
    status: {
      pending: "في الانتظار",
      running: "قيد التنفيذ",
      success: "نجح",
      failed: "فشل",
      skipped: "تم تخطيه",
      cancelled: "أُلغي",
    } as Record<DeployStatus, string>,
    progress: (done: number, total: number) => `${done} من ${total} خطوات`,
    duration: "المدة",
    cancel: "إلغاء النشر",
    retry: "إعادة محاولة الخطوة",
    retryFrom: "إعادة المحاولة من هنا",
    retrying: "جارٍ إعادة المحاولة",
    retryFailed: "تعذرت إعادة المحاولة. حاول مرة أخرى.",
    noLogs: "لا توجد مخرجات لهذه الخطوة.",
    waitingLogs: "بانتظار المخرجات...",
    jump: "الانتقال إلى الأحدث",
    trimmed: (n: number) => (n === 1 ? "أُخفي سطر سابق واحد" : `أُخفيت ${n} أسطر سابقة`),
    logs: (step: string) => `سجلات ${step}`,
    units: { ms: "مث", s: "ث", m: "د", h: "س" } as DurationUnits,
    stepLabel: (n: number, name: string, status: string) => `الخطوة ${n}: ${name}، ${status}`,
  },
};

export type DeployViewLabels = (typeof DEPLOY_VIEW_STRINGS)["en"];

export function useDeployViewLabels(override?: () => Partial<DeployViewLabels> | undefined): ComputedRef<DeployViewLabels> {
  const nq = useNasaq();
  return computed(() => ({ ...DEPLOY_VIEW_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...override?.() }) as DeployViewLabels);
}
