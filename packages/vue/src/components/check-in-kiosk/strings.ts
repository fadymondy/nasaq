import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import type { KioskBooking, QueueEntry } from "../waiting-screen";

export const CHECK_IN_KIOSK_STRINGS = {
  en: {
    title: "Check in",
    subtitle: "Scan your booking code or type your phone number.",
    modeScan: "Scan code",
    modePhone: "Phone number",
    scanLabel: "Booking code",
    scanHint: "Hold your ticket's QR code to the scanner, or type the code, such as BK-7F3Q9K.",
    scanPlaceholder: "Scan or type the code",
    phoneLabel: "Mobile number",
    keypad: "Number pad",
    backspace: "Delete last digit",
    clear: "Clear",
    find: "Find my booking",
    finding: "Looking",
    checkingIn: "Checking you in",
    multiple: "We found more than one booking. Which one is yours?",
    none: "We could not find a booking for that.",
    noneWalkIn: "You can still join the line without a booking.",
    walkIn: "Join the line without a booking",
    tooEarly: (time: string, opens: string) => `Your visit is at ${time}. You can check in from ${opens}.`,
    back: "Try again",
    ticketTitle: "You are checked in",
    ticketNumber: "Your ticket",
    ahead: (n: number) => (n <= 0 ? "You are next." : `${n} ${n === 1 ? "person is" : "people are"} ahead of you.`),
    wait: (n: number) => (n <= 0 ? "You will be called any moment." : `Estimated wait: about ${n} min.`),
    watch: "Watch the screen for your number. We will call you.",
    done: "Done",
    autoReset: (s: number) => `This screen resets in ${s} s`,
    failed: "We could not check you in. Please ask reception.",
    bookingLine: (name: string, time: string) => `${name}, ${time}`,
    invalidPhone: "Enter at least 9 digits.",
    walkInName: "Your name (optional)",
    qrLabel: "QR code of your ticket",
  },
  ar: {
    title: "تسجيل الوصول",
    subtitle: "امسح رمز حجزك أو اكتب رقم هاتفك.",
    modeScan: "مسح الرمز",
    modePhone: "رقم الهاتف",
    scanLabel: "رمز الحجز",
    scanHint: "قرّب رمز QR من قارئ الباركود، أو اكتب الرمز مثل BK-7F3Q9K.",
    scanPlaceholder: "امسح الرمز أو اكتبه",
    phoneLabel: "رقم الجوال",
    keypad: "لوحة الأرقام",
    backspace: "حذف آخر رقم",
    clear: "مسح",
    find: "ابحث عن حجزي",
    finding: "جارٍ البحث",
    checkingIn: "جارٍ تسجيل وصولك",
    multiple: "وجدنا أكثر من حجز. أيها حجزك؟",
    none: "لم نجد حجزًا بهذه البيانات.",
    noneWalkIn: "يمكنك الانضمام إلى الصف بدون حجز.",
    walkIn: "الانضمام إلى الصف بدون حجز",
    tooEarly: (time: string, opens: string) => `موعدك الساعة ${time}. يمكنك تسجيل الوصول من الساعة ${opens}.`,
    back: "حاول مجددًا",
    ticketTitle: "تم تسجيل وصولك",
    ticketNumber: "تذكرتك",
    ahead: (n: number) => (n <= 0 ? "أنت التالي." : n === 1 ? "شخص واحد قبلك." : n === 2 ? "شخصان قبلك." : `${n} أشخاص قبلك.`),
    wait: (n: number) => (n <= 0 ? "سننادي عليك في أي لحظة." : `وقت الانتظار المتوقع: حوالي ${n} دقيقة.`),
    watch: "تابع الشاشة لرؤية رقمك. سننادي عليك.",
    done: "تم",
    autoReset: (s: number) => `تُعاد الشاشة خلال ${s} ثانية`,
    failed: "تعذّر تسجيل وصولك. اسأل الاستقبال.",
    bookingLine: (name: string, time: string) => `${name}، ${time}`,
    invalidPhone: "أدخل 9 أرقام على الأقل.",
    walkInName: "اسمك (اختياري)",
    qrLabel: "رمز QR لتذكرتك",
  },
};

export type CheckInKioskLabels = (typeof CHECK_IN_KIOSK_STRINGS)["en"];

export interface CheckInRequest {
  /** The matched booking, when there is one. */
  booking?: KioskBooking;
  /** The phone number typed, for a walk-in. */
  phone?: string;
}

export interface CheckInResult {
  entry: QueueEntry;
  /** Place in line (1 = next). */
  position?: number;
  /** Estimated minutes to be called. */
  waitMinutes?: number;
}

export function useCheckInKioskLabels(override?: () => Partial<CheckInKioskLabels> | undefined): ComputedRef<CheckInKioskLabels> {
  const nq = useNasaq();
  return computed(() => ({ ...CHECK_IN_KIOSK_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...override?.() }) as CheckInKioskLabels);
}
