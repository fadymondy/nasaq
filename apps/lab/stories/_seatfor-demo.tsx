/* Shared demo data for the booking, queue and clinic stories (a clinic on the SeatFor model). Fixed dates keep stories steady; queue data is built from the real clock so timers look alive. */
import {
  advance,
  type Availability,
  type BookingLocation,
  type BookingProvider,
  type BookingRecord,
  type BookingService,
  type BookingSlot,
  type BookingSlotQuery,
  type BookingTransition,
  type ClinicAppointment,
  type ClinicDoctor,
  type ClinicRoom,
  type KioskBooking,
  checkIn,
  callNext,
  callTicket,
  finishVisit,
  generateSlots,
  makeWeek,
  markNoShow,
  type QueueEntry,
  recallTicket,
  skipTicket,
  startVisit,
  useNasaq,
  type VisitHistoryItem,
  type VisitPatient,
  type VisitPrescription,
  leaveQueue,
} from "@nasaq/web";
import { useCallback, useRef, useState } from "react";

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export const useAr = () => useNasaq().locale.startsWith("ar");

/** A Wednesday morning. Booking and schedule stories treat this as "now". */
export const NOW_DATE = new Date(2026, 8, 30, 10, 0, 0, 0);
export const NOW = NOW_DATE.getTime();
const MIN = 60000;
const at = (h: number, m = 0, dayOffset = 0) => new Date(2026, 8, 30 + dayOffset, h, m, 0, 0);

/** Pick the right string for the language. */
export const tr = (ar: boolean, en: string, arText: string) => (ar ? arText : en);

/* ------------------------------------------------------------------ catalogue */

export function useCatalogue() {
  const ar = useAr();
  const locations: BookingLocation[] = [
    { id: "maadi", name: tr(ar, "Maadi branch", "فرع المعادي"), address: tr(ar, "12 Road 9, Maadi, Cairo", "12 شارع 9، المعادي، القاهرة"), phone: "+20 2 2358 0000" },
    { id: "newcairo", name: tr(ar, "New Cairo branch", "فرع القاهرة الجديدة"), address: tr(ar, "South 90th Street, New Cairo", "التسعين الجنوبي، القاهرة الجديدة"), phone: "+20 2 2758 0000" },
  ];
  const services: BookingService[] = [
    { id: "consult", name: tr(ar, "General consultation", "كشف عام"), description: tr(ar, "A check-up and advice with a doctor.", "فحص ونصيحة مع الطبيب."), durationMinutes: 30, price: 400, category: tr(ar, "General", "عام") },
    { id: "followup", name: tr(ar, "Follow-up visit", "زيارة متابعة"), description: tr(ar, "For patients seen in the last 30 days.", "للمرضى الذين زاروا خلال آخر 30 يومًا."), durationMinutes: 20, price: 250, category: tr(ar, "General", "عام") },
    { id: "clean", name: tr(ar, "Teeth cleaning", "تنظيف الأسنان"), description: tr(ar, "Scaling and polishing.", "إزالة الجير والتلميع."), durationMinutes: 45, price: 600, category: tr(ar, "Dental", "الأسنان") },
    { id: "filling", name: tr(ar, "Filling", "حشو"), durationMinutes: 60, price: 900, category: tr(ar, "Dental", "الأسنان") },
    { id: "skin", name: tr(ar, "Skin check", "فحص البشرة"), description: tr(ar, "A full skin review.", "مراجعة كاملة للبشرة."), durationMinutes: 30, price: 500, category: tr(ar, "Skin", "الجلدية") },
  ];
  const providers: BookingProvider[] = [
    { id: "d1", name: tr(ar, "Dr. Mona Adel", "د. منى عادل"), specialty: tr(ar, "Family medicine", "طب الأسرة"), rating: 4.9, reviews: 212, serviceIds: ["consult", "followup"] },
    { id: "d2", name: tr(ar, "Dr. Karim Nabil", "د. كريم نبيل"), specialty: tr(ar, "Dentist", "طبيب أسنان"), rating: 4.7, reviews: 148, serviceIds: ["clean", "filling", "consult"] },
    { id: "d3", name: tr(ar, "Dr. Salma Hany", "د. سلمى هاني"), specialty: tr(ar, "Dermatology", "الأمراض الجلدية"), rating: 4.8, reviews: 96, serviceIds: ["skin", "followup"], locationIds: ["newcairo"] },
    { id: "d4", name: tr(ar, "Dr. Omar Fathy", "د. عمر فتحي"), specialty: tr(ar, "Family medicine", "طب الأسرة"), rating: 4.5, reviews: 61, serviceIds: ["consult", "followup"], locationIds: ["maadi"] },
  ];
  return { ar, locations, services, providers };
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Deterministic slots for the next three weeks: closed on Fridays, lunch break, some full and some held. */
export function makeGetSlots(services: readonly BookingService[]) {
  return async (query: Pick<BookingSlotQuery, "serviceId" | "providerId"> & { locationId?: string | null }): Promise<BookingSlot[]> => {
    await wait(350);
    const service = services.find((s) => s.id === query.serviceId) ?? services[0]!;
    const seed = hash(`${query.providerId}${query.locationId ?? ""}${service.id}`);
    const out: BookingSlot[] = [];
    for (let d = 0; d < 21; d++) {
      const day = at(0, 0, d);
      if (day.getDay() === 5) continue;
      const busy = [];
      const count = query.providerId === "any" ? 3 : 4 + ((seed + d) % 4);
      for (let i = 0; i < count; i++) {
        const start = 9 * 60 + ((seed + d * 13 + i * 97) % 14) * 30;
        const from = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, start);
        busy.push({ start: from, end: new Date(from.getTime() + service.durationMinutes * MIN), held: (seed + i + d) % 4 === 0 });
      }
      // A whole day that is fully booked, so the calendar shows a disabled day.
      if ((seed + d) % 9 === 4) busy.push({ start: at(9, 0, d), end: at(17, 0, d) });
      out.push(...generateSlots({ day, hours: [{ start: "09:00", end: "17:00" }], breaks: [{ start: "13:00", end: "14:00" }], durationMinutes: service.durationMinutes, stepMinutes: 30, busy, now: NOW_DATE, leadMinutes: 60 }));
    }
    return out;
  };
}

/* ------------------------------------------------------------------ bookings */

export function useDemoBooking(status: BookingRecord["status"] = "confirmed"): BookingRecord {
  const ar = useAr();
  let history: BookingTransition[] = [];
  const steps: BookingRecord["status"][] = ["requested", "confirmed", "checked_in", "in_visit", "done"];
  const target = steps.indexOf(status);
  steps.slice(0, target < 0 ? 2 : target + 1).forEach((s, i) => {
    history = advance(history, s, new Date(NOW_DATE.getTime() - (5 - i) * 3600000), i === 0 ? undefined : tr(ar, "Reception", "الاستقبال")).history;
  });
  return {
    id: "bk-1",
    code: "BK-7F3Q9K",
    status,
    start: at(11, 30, 2),
    end: at(12, 0, 2),
    service: tr(ar, "General consultation", "كشف عام"),
    provider: tr(ar, "Dr. Mona Adel", "د. منى عادل"),
    location: tr(ar, "Maadi branch", "فرع المعادي"),
    address: tr(ar, "12 Road 9, Maadi, Cairo", "12 شارع 9، المعادي، القاهرة"),
    patient: tr(ar, "Nour Hassan", "نور حسن"),
    phone: "+20 100 123 4567",
    price: 400,
    currency: ar ? "SAR" : "USD",
    payment: "visit",
    notes: tr(ar, "Persistent cough for two weeks.", "سعال مستمر منذ أسبوعين."),
    history,
  };
}

const PEOPLE = [
  ["Nour Hassan", "نور حسن"],
  ["Ahmed Samir", "أحمد سمير"],
  ["Laila Farouk", "ليلى فاروق"],
  ["Youssef Adel", "يوسف عادل"],
  ["Mariam Tarek", "مريم طارق"],
  ["Hassan Ali", "حسن علي"],
  ["Dina Mostafa", "دينا مصطفى"],
  ["Tamer Zaki", "تامر زكي"],
  ["Rana Ashraf", "رنا أشرف"],
  ["Sherif Wahba", "شريف وهبة"],
] as const;
const person = (ar: boolean, i: number) => PEOPLE[i % PEOPLE.length]![ar ? 1 : 0];

/** Bookings for the pipeline board, spread over every stage. */
export function useStaffBookings(): BookingRecord[] {
  const ar = useAr();
  const statuses: BookingRecord["status"][] = ["requested", "requested", "confirmed", "confirmed", "confirmed", "checked_in", "checked_in", "in_visit", "done", "done", "no_show"];
  const services = [tr(ar, "General consultation", "كشف عام"), tr(ar, "Teeth cleaning", "تنظيف الأسنان"), tr(ar, "Skin check", "فحص البشرة"), tr(ar, "Follow-up visit", "زيارة متابعة")];
  return statuses.map((status, i) => ({
    id: `sb-${i}`,
    code: `BK-${(1000 + i * 37).toString(36).toUpperCase()}`,
    status,
    start: at(9 + Math.floor(i / 2), (i % 2) * 30),
    end: at(9 + Math.floor(i / 2), (i % 2) * 30 + 30),
    service: services[i % services.length]!,
    provider: tr(ar, "Dr. Mona Adel", "د. منى عادل"),
    patient: person(ar, i),
    phone: `+20 100 ${200 + i} 45${i}${i}`,
    price: 400,
    currency: ar ? "SAR" : "USD",
    payment: i % 3 === 0 ? "online" : "visit",
    history: [{ status, at: at(8, 30 + i) }],
  }));
}

/* ------------------------------------------------------------------ queue */

/** A queue built around the real clock, so timers and waits look right whenever the story opens. */
export function seedQueue(now = Date.now(), ar = false): QueueEntry[] {
  const p = (i: number) => person(ar, i);
  const e = (n: number, name: string, status: QueueEntry["status"], minutesAgo: number, extra: Partial<QueueEntry> = {}): QueueEntry => ({
    id: `q-${n}`,
    ticket: `A-${String(n).padStart(3, "0")}`,
    number: n,
    name,
    status,
    priority: "normal",
    providerId: "d1",
    checkedInAt: now - minutesAgo * MIN,
    queuedAt: now - minutesAgo * MIN,
    ...extra,
  });
  return [
    e(40, p(0), "done", 70, { room: "1", calledAt: now - 62 * MIN, startedAt: now - 60 * MIN, endedAt: now - 45 * MIN }),
    e(41, p(1), "done", 58, { room: "2", calledAt: now - 44 * MIN, startedAt: now - 42 * MIN, endedAt: now - 30 * MIN, providerId: "d2" }),
    e(42, p(2), "serving", 40, { room: "1", calledAt: now - 9 * MIN, startedAt: now - 7 * MIN }),
    e(43, p(3), "called", 34, { room: "2", calledAt: now - 1 * MIN, providerId: "d2" }),
    e(44, p(4), "waiting", 26, { priority: "appointment" }),
    e(45, p(5), "waiting", 22),
    e(46, p(6), "waiting", 17, { priority: "urgent" }),
    e(47, p(7), "waiting", 12, { priority: "appointment", providerId: "d2" }),
    e(48, p(8), "waiting", 8),
    e(49, p(9), "waiting", 4),
    e(39, p(3 + 5), "skipped", 50, { skips: 1 }),
  ];
}

export type DemoQueueAction = "call-next" | "call" | "recall" | "skip" | "start" | "finish" | "no-show" | "leave";

/** The queue as a host would keep it: every action goes through the pure `queue-math` rules, after a short fake delay. */
export function useDemoQueue(room = "1") {
  const ar = useAr();
  const [entries, setEntries] = useState<QueueEntry[]>(() => seedQueue(Date.now(), ar));
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const ref = useRef(entries);
  ref.current = entries;
  const apply = useCallback((change: { entries: QueueEntry[]; entry?: QueueEntry }) => {
    setEntries(change.entries);
    setUpdatedAt(Date.now());
    return change.entry;
  }, []);
  const act = useCallback(
    async (action: DemoQueueAction, id?: string) => {
      await wait(300);
      const now = Date.now();
      setEntries((list) => {
        const target = id ? list.find((x) => x.id === id) : undefined;
        const roomFor = target?.room ?? room;
        const change =
          action === "call-next" ? callNext(list, { room, at: now })
          : action === "call" && id ? callTicket(list, id, { room: roomFor, at: now })
          : action === "recall" && id ? recallTicket(list, id, now)
          : action === "skip" && id ? skipTicket(list, id)
          : action === "start" && id ? startVisit(list, id, now)
          : action === "finish" && id ? finishVisit(list, id, now)
          : action === "no-show" && id ? markNoShow(list, id)
          : action === "leave" && id ? leaveQueue(list, id)
          : { entries: list };
        return change.entries;
      });
      setUpdatedAt(now);
    },
    [room],
  );
  const join = useCallback((name: string, priority: QueueEntry["priority"] = "normal") => {
    const now = Date.now();
    const change = checkIn(ref.current, { id: `q-new-${ref.current.length}`, name, priority, at: now, providerId: "d1" });
    ref.current = change.entries;
    setEntries(change.entries);
    setUpdatedAt(now);
    return change.entry;
  }, []);
  return { entries, setEntries, act, join, apply, updatedAt };
}

export function useKioskBookings(): KioskBooking[] {
  const ar = useAr();
  const now = Date.now();
  return [
    { id: "kb-1", code: "BK-7F3Q9K", phone: "+20 100 123 4567", name: person(ar, 0), startsAt: now + 10 * MIN },
    { id: "kb-2", code: "BK-2H8M4P", phone: "+20 111 555 0123", name: person(ar, 1), startsAt: now + 25 * MIN },
    { id: "kb-3", code: "BK-9D2X5C", phone: "+20 111 555 0123", name: person(ar, 2), startsAt: now + 40 * MIN },
    { id: "kb-4", code: "BK-4T6R1N", phone: "+20 122 987 6543", name: person(ar, 3), startsAt: now + 5 * 60 * MIN },
  ];
}

/* ------------------------------------------------------------------ clinic */

export function useClinicRooms(): ClinicRoom[] {
  const ar = useAr();
  const now = Date.now();
  return [
    { id: "r1", name: tr(ar, "Room 1", "الغرفة 1"), status: "busy", doctorId: "d1", ticket: "A-042", since: now - 7 * MIN },
    { id: "r2", name: tr(ar, "Room 2", "الغرفة 2"), status: "busy", doctorId: "d2", ticket: "A-043", since: now - 1 * MIN },
    { id: "r3", name: tr(ar, "Room 3", "الغرفة 3"), status: "free" },
    { id: "r4", name: tr(ar, "Dental chair", "كرسي الأسنان"), status: "cleaning" },
    { id: "r5", name: tr(ar, "Lab", "المعمل"), status: "closed" },
  ];
}

export function useClinicDoctors(): ClinicDoctor[] {
  const ar = useAr();
  return [
    { id: "d1", name: tr(ar, "Dr. Mona Adel", "د. منى عادل"), specialty: tr(ar, "Family medicine", "طب الأسرة"), status: "in_visit", roomId: "r1", shift: { start: "00:00", end: "23:59" }, waiting: 5 },
    { id: "d2", name: tr(ar, "Dr. Karim Nabil", "د. كريم نبيل"), specialty: tr(ar, "Dentist", "طبيب أسنان"), status: "in_visit", roomId: "r2", shift: { start: "00:00", end: "23:59" }, waiting: 2 },
    { id: "d3", name: tr(ar, "Dr. Salma Hany", "د. سلمى هاني"), specialty: tr(ar, "Dermatology", "الأمراض الجلدية"), status: "break", shift: { start: "00:00", end: "23:59" }, waiting: 0 },
    { id: "d4", name: tr(ar, "Dr. Omar Fathy", "د. عمر فتحي"), specialty: tr(ar, "Family medicine", "طب الأسرة"), status: "off", waiting: 0 },
  ];
}

export function useClinicAppointments(): ClinicAppointment[] {
  const ar = useAr();
  const svc = (i: number) => [tr(ar, "General consultation", "كشف عام"), tr(ar, "Follow-up visit", "زيارة متابعة"), tr(ar, "Skin check", "فحص البشرة")][i % 3]!;
  const rows: [number, number, number, ClinicAppointment["status"]][] = [
    [9, 0, 30, "done"],
    [9, 30, 30, "done"],
    [10, 0, 30, "in_visit"],
    [10, 30, 20, "checked_in"],
    [11, 0, 30, "confirmed"],
    [11, 30, 30, "confirmed"],
    [12, 0, 20, "requested"],
    [14, 0, 30, "confirmed"],
    [14, 30, 30, "no_show"],
    [15, 0, 30, "confirmed"],
  ];
  return rows.map(([h, m, len, status], i) => ({
    id: `ap-${i}`,
    patient: person(ar, i),
    service: svc(i),
    start: at(h, m),
    end: at(h, m + len),
    status,
    room: i % 2 ? "1" : "2",
    followUp: i % 3 === 1,
  }));
}

export function useVisitPatient(): { patient: VisitPatient; history: VisitHistoryItem[]; prescriptions: VisitPrescription[] } {
  const ar = useAr();
  return {
    patient: { id: "p1", name: tr(ar, "Nour Hassan", "نور حسن"), age: 34, gender: tr(ar, "Female", "أنثى"), phone: "+20 100 123 4567", allergies: [tr(ar, "Penicillin", "البنسلين")], conditions: [tr(ar, "Asthma", "الربو"), tr(ar, "Vitamin D deficiency", "نقص فيتامين د")] },
    history: [
      { id: "h1", date: new Date(2026, 7, 12), title: tr(ar, "Chest infection", "التهاب في الصدر"), summary: tr(ar, "Antibiotics for seven days. Recovered.", "مضاد حيوي لسبعة أيام. تعافت.") },
      { id: "h2", date: new Date(2026, 4, 3), title: tr(ar, "Routine check-up", "فحص دوري"), summary: tr(ar, "Vitamin D supplement started.", "بدأت مكمل فيتامين د.") },
      { id: "h3", date: new Date(2025, 10, 20), title: tr(ar, "Asthma review", "مراجعة الربو") },
    ],
    prescriptions: [{ id: "rx-1", drug: tr(ar, "Vitamin D3", "فيتامين د3"), dose: "50000 IU", frequency: tr(ar, "Once a week", "مرة أسبوعيًا"), days: 28 }],
  };
}

export function useDemoAvailability(): Availability {
  const ar = useAr();
  const base = makeWeek([6, 0, 1, 2, 3, 4], [{ start: "09:00", end: "17:00" }], [{ start: "13:00", end: "14:00" }]);
  return { weekly: base, vacations: [{ id: "v1", from: "2026-10-18", to: "2026-10-22", reason: tr(ar, "Medical conference", "مؤتمر طبي") }] };
}
