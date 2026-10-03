import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import type { ClinicDoctorStatus, ClinicRoomStatus } from "./clinic-math";

export const CLINIC_DASHBOARD_STRINGS = {
  en: {
    title: "Clinic today",
    waiting: "Waiting now",
    longest: "Longest wait",
    average: (n: number) => `Average ${n} min`,
    minutes: (n: number) => `${n} min`,
    onDuty: "Doctors on duty",
    ofTotal: (n: number) => `of ${n}`,
    occupancy: "Rooms in use",
    rooms: "Rooms",
    roomsHint: (free: number, busy: number) => `${free} free, ${busy} in use`,
    doctors: "Doctors on duty",
    noDoctors: "No doctor is on duty right now.",
    noRooms: "No rooms set up.",
    waitingFor: (n: number) => (n === 0 ? "No one waiting" : `${n} waiting`),
    inRoom: (r: string) => `Room ${r}`,
    since: (n: number) => `${n} min`,
    room: { free: "Free", busy: "In use", cleaning: "Cleaning", closed: "Closed" } as Record<ClinicRoomStatus, string>,
    doctor: { available: "Available", in_visit: "In a visit", break: "On a break", off: "Off" } as Record<ClinicDoctorStatus, string>,
    shift: "Shift",
  },
  ar: {
    title: "العيادة اليوم",
    waiting: "في الانتظار الآن",
    longest: "أطول انتظار",
    average: (n: number) => `المتوسط ${n} دقيقة`,
    minutes: (n: number) => `${n} دقيقة`,
    onDuty: "الأطباء المناوبون",
    ofTotal: (n: number) => `من ${n}`,
    occupancy: "الغرف المستخدمة",
    rooms: "الغرف",
    roomsHint: (free: number, busy: number) => `${free} فارغة، ${busy} مستخدمة`,
    doctors: "الأطباء المناوبون",
    noDoctors: "لا يوجد طبيب مناوب الآن.",
    noRooms: "لا توجد غرف.",
    waitingFor: (n: number) => (n === 0 ? "لا أحد ينتظر" : n === 1 ? "مريض ينتظر" : `${n} ينتظرون`),
    inRoom: (r: string) => `الغرفة ${r}`,
    since: (n: number) => `${n} د`,
    room: { free: "فارغة", busy: "مستخدمة", cleaning: "قيد التنظيف", closed: "مغلقة" } as Record<ClinicRoomStatus, string>,
    doctor: { available: "متاح", in_visit: "في زيارة", break: "في استراحة", off: "خارج الدوام" } as Record<ClinicDoctorStatus, string>,
    shift: "الدوام",
  },
};

export type ClinicDashboardLabels = (typeof CLINIC_DASHBOARD_STRINGS)["en"];

export function useClinicDashboardLabels(override?: () => Partial<ClinicDashboardLabels> | undefined): ComputedRef<ClinicDashboardLabels> {
  const nq = useNasaq();
  return computed(() => ({ ...CLINIC_DASHBOARD_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...override?.() }) as ClinicDashboardLabels);
}
