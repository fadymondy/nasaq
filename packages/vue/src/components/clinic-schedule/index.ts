export { default as NqClinicSchedule } from "./NqClinicSchedule.vue";
export type { ClinicScheduleLabels } from "./NqClinicSchedule.vue";
export {
  CLINIC_STATUS_TONE,
  currentAppointment,
  findOverlaps,
  freeGaps,
  minutesLate,
  nextAppointment,
  summariseAppointments,
  utilisation,
  type AppointmentTone,
  type ClinicAppointment,
  type DaySummary,
  type FreeGap,
} from "./schedule-math";
