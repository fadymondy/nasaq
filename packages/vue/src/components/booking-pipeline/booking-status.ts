import { CalendarCheck, CheckCheck, Clock, LogIn, Stethoscope, UserX, XCircle } from "lucide-vue-next";
import type { Component } from "vue";
import { useNasaq } from "../../provider";
import type { BadgeVariants } from "../badge/variants";
import type { BookingStatus } from "./booking-math";

/** Names of the seven booking statuses, in English and Arabic. Other booking and clinic components reuse them. */
export const BOOKING_STATUS_LABELS: Record<"en" | "ar", Record<BookingStatus, string>> = {
  en: { requested: "Requested", confirmed: "Confirmed", checked_in: "Checked in", in_visit: "In visit", done: "Done", no_show: "No-show", cancelled: "Cancelled" },
  ar: { requested: "مطلوب", confirmed: "مؤكد", checked_in: "تم تسجيل الوصول", in_visit: "في الزيارة", done: "منتهي", no_show: "لم يحضر", cancelled: "ملغى" },
};

export const STATUS_ICONS: Record<BookingStatus, Component> = {
  requested: Clock,
  confirmed: CalendarCheck,
  checked_in: LogIn,
  in_visit: Stethoscope,
  done: CheckCheck,
  no_show: UserX,
  cancelled: XCircle,
};

export const STATUS_VARIANT: Record<BookingStatus, NonNullable<BadgeVariants["variant"]>> = {
  requested: "warning",
  confirmed: "neutral",
  checked_in: "info",
  in_visit: "brand",
  done: "success",
  no_show: "danger",
  cancelled: "outline",
};

/** The status name in the active language: `const label = useBookingStatusLabel(); label("checked_in")`. */
export function useBookingStatusLabel(): (status: BookingStatus) => string {
  const nq = useNasaq();
  return (status) => BOOKING_STATUS_LABELS[nq.locale.value.startsWith("ar") ? "ar" : "en"][status];
}
