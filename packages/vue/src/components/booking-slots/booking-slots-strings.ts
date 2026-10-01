export const STRINGS = {
  en: {
    available: "Available",
    full: "Full",
    held: "Held",
    heldHint: "Someone is booking this time right now. It may free up in a few minutes.",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    timesOn: (day: string) => `Times on ${day}`,
    openCount: (n: number) => `${n} ${n === 1 ? "time" : "times"} available`,
    dayFull: "This day is fully booked.",
    dayClosed: "No times on this day.",
    nextDay: "Go to the next day with a free time",
    legend: "Legend",
    slotLabel: (time: string, state: string) => `${time}, ${state}`,
    noneAhead: "Nothing is free in the coming weeks.",
  },
  ar: {
    available: "متاح",
    full: "محجوز",
    held: "محجوز مؤقتًا",
    heldHint: "شخص آخر يحجز هذا الموعد الآن. قد يتوفر بعد دقائق.",
    morning: "صباحًا",
    afternoon: "بعد الظهر",
    evening: "مساءً",
    timesOn: (day: string) => `المواعيد يوم ${day}`,
    openCount: (n: number) => (n === 1 ? "موعد واحد متاح" : n === 2 ? "موعدان متاحان" : `${n} مواعيد متاحة`),
    dayFull: "هذا اليوم محجوز بالكامل.",
    dayClosed: "لا مواعيد في هذا اليوم.",
    nextDay: "الانتقال إلى أقرب يوم به موعد متاح",
    legend: "دليل الألوان",
    slotLabel: (time: string, state: string) => `${time}، ${state}`,
    noneAhead: "لا يوجد موعد متاح في الأسابيع القادمة.",
  },
};
export const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type Strings = typeof STRINGS.en;
export type Labels = Partial<Strings>;
