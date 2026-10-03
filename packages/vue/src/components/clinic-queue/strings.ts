import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";

export type ClinicQueueAction = "call-next" | "call" | "recall" | "skip" | "start" | "finish" | "no-show";

export const CLINIC_QUEUE_STRINGS = {
  en: {
    title: "Patient queue",
    callNext: "Call next",
    nextIs: (t: string) => `Next in line: ${t}`,
    empty: "Nobody is waiting.",
    serving: "With you now",
    nothingServing: "No one has been called.",
    table: "Patients in the queue",
    ticket: "Ticket",
    patient: "Patient",
    status: "Status",
    priority: "Priority",
    waited: "Waiting",
    min: (n: number) => `${n} min`,
    st: { waiting: "Waiting", called: "Called", serving: "In visit", done: "Done", skipped: "Skipped", no_show: "No-show", left: "Left" } as Record<string, string>,
    pr: { normal: "Walk-in", appointment: "Appointment", urgent: "Urgent" } as Record<string, string>,
    actions: { "call-next": "Call next", call: "Call now", recall: "Call again", skip: "Skip", start: "Start visit", finish: "Finish visit", "no-show": "Mark no-show" } as Record<ClinicQueueAction, string>,
    putBack: "Put back in line",
    overdue: (t: string, m: number) => `${t} has not answered for ${m} min. Call again or skip.`,
    recalled: (n: number) => `Called ${n} ${n === 1 ? "time" : "times"}`,
    failed: "That did not work. Try again.",
    room: (r: string) => `Room ${r}`,
    rowLabel: (t: string) => t,
  },
  ar: {
    title: "طابور المرضى",
    callNext: "نداء التالي",
    nextIs: (t: string) => `التالي في الصف: ${t}`,
    empty: "لا أحد في الانتظار.",
    serving: "معك الآن",
    nothingServing: "لم يُنادَ على أحد.",
    table: "المرضى في الطابور",
    ticket: "التذكرة",
    patient: "المريض",
    status: "الحالة",
    priority: "الأولوية",
    waited: "الانتظار",
    min: (n: number) => `${n} دقيقة`,
    st: { waiting: "ينتظر", called: "تم النداء", serving: "في الزيارة", done: "انتهى", skipped: "تم التخطي", no_show: "لم يحضر", left: "غادر" } as Record<string, string>,
    pr: { normal: "بدون موعد", appointment: "بموعد", urgent: "عاجل" } as Record<string, string>,
    actions: { "call-next": "نداء التالي", call: "نداء الآن", recall: "نداء مجددًا", skip: "تخطي", start: "بدء الزيارة", finish: "إنهاء الزيارة", "no-show": "تسجيل عدم الحضور" } as Record<ClinicQueueAction, string>,
    putBack: "إعادة إلى الصف",
    overdue: (t: string, m: number) => `لم يردّ ${t} منذ ${m} دقيقة. نادِ مجددًا أو تخطَّ.`,
    recalled: (n: number) => (n === 1 ? "نودي مرة واحدة" : n === 2 ? "نودي مرتين" : `نودي ${n} مرات`),
    failed: "لم تنجح العملية. حاول مجددًا.",
    room: (r: string) => `الغرفة ${r}`,
    rowLabel: (t: string) => t,
  },
};

export type ClinicQueueLabels = (typeof CLINIC_QUEUE_STRINGS)["en"];

export function useClinicQueueLabels(override?: () => Partial<ClinicQueueLabels> | undefined): ComputedRef<ClinicQueueLabels> {
  const nq = useNasaq();
  return computed(() => ({ ...CLINIC_QUEUE_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...override?.() }) as ClinicQueueLabels);
}
