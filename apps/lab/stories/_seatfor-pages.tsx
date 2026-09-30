/* The Booking and Clinic page screens, shared by their Default, Arabic and Mobile stories. */
import {
  Alert,
  AvailabilityEditor,
  BOOKING_STATUSES,
  BookingFlow,
  BookingManage,
  BookingPipeline,
  BookingStatusBadge,
  type BookingRecord,
  type BookingStatus,
  Button,
  canTransition,
  CheckInKiosk,
  ClinicDashboard,
  ClinicQueue,
  ClinicSchedule,
  CurrentVisit,
  estimateWaitMinutes,
  KanbanBoard,
  type KanbanCardData,
  LobbyDisplay,
  nextStatuses,
  positionInQueue,
  WaitingScreen,
  type QueueConnection,
} from "@nasaq/web";
import { useMemo, useState } from "react";
import {
  makeGetSlots,
  NOW_DATE,
  tr,
  useAr,
  useCatalogue,
  useClinicAppointments,
  useClinicDoctors,
  useClinicRooms,
  useDemoAvailability,
  useDemoBooking,
  useDemoQueue,
  useKioskBookings,
  useStaffBookings,
  useVisitPatient,
  wait,
} from "./_seatfor-demo";

const Frame = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => <div className={`mx-auto w-full p-4 sm:p-8 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>{children}</div>;

function Header({ title, text }: { title: string; text: string }) {
  return (
    <header className="mb-6 flex flex-col gap-1">
      <h1 className="text-h1 text-foreground">{title}</h1>
      <p className="text-body text-muted-foreground">{text}</p>
    </header>
  );
}

/* ------------------------------------------------------------------ booking */

export function OnlineBookingPage() {
  const { ar, locations, services, providers } = useCatalogue();
  const getSlots = useMemo(() => makeGetSlots(services), [services]);
  return (
    <Frame>
      <Header title={tr(ar, "Book a visit", "احجز موعدًا")} text={tr(ar, "Pick a time that suits you. It takes about a minute.", "اختر الوقت المناسب لك. يستغرق الأمر دقيقة تقريبًا.")} />
      <BookingFlow
        locations={locations}
        services={services}
        providers={providers}
        getSlots={(q) => getSlots(q)}
        now={NOW_DATE}
        taxRate={0.14}
        onSubmit={async () => {
          await wait(700);
          return { code: "BK-7F3Q9K" };
        }}
      />
    </Frame>
  );
}

export function ManageBookingPage() {
  const { ar, services } = useCatalogue();
  const initial = useDemoBooking("confirmed");
  const [booking, setBooking] = useState<BookingRecord>(initial);
  const getSlots = useMemo(() => makeGetSlots(services), [services]);
  return (
    <Frame>
      <Header title={tr(ar, "Your booking", "حجزك")} text={tr(ar, "Show the code at reception, or move the visit if your plans changed.", "أظهر الرمز في الاستقبال، أو غيّر الموعد إذا تغيرت خططك.")} />
      <BookingManage
        booking={booking}
        policy={{ cancelHours: 24, rescheduleHours: 12, lateFeePercent: 50 }}
        now={NOW_DATE}
        getSlots={() => getSlots({ serviceId: "consult", providerId: "d1", locationId: "maadi" })}
        onReschedule={async (start) => {
          await wait(500);
          setBooking((b) => ({ ...b, start, end: new Date(start.getTime() + (b.end.getTime() - b.start.getTime())) }));
        }}
        onCancel={async () => {
          await wait(500);
          setBooking((b) => ({ ...b, status: "cancelled" }));
        }}
      />
    </Frame>
  );
}

const COLUMNS: BookingStatus[] = [...BOOKING_STATUSES, "no_show"];

export function StaffPipelinePage() {
  const ar = useAr();
  const initial = useStaffBookings();
  const [bookings, setBookings] = useState<BookingRecord[]>(initial);
  const [selectedId, setSelectedId] = useState(initial[2]!.id);
  const [notice, setNotice] = useState<string | null>(null);
  const names: Record<BookingStatus, string> = {
    requested: tr(ar, "Requested", "طلب جديد"),
    confirmed: tr(ar, "Confirmed", "مؤكد"),
    checked_in: tr(ar, "Checked in", "وصل"),
    in_visit: tr(ar, "In visit", "في الزيارة"),
    done: tr(ar, "Done", "انتهى"),
    no_show: tr(ar, "No-show", "لم يحضر"),
    cancelled: tr(ar, "Cancelled", "ملغى"),
  };
  const move = (id: string, to: BookingStatus) => {
    const b = bookings.find((x) => x.id === id);
    if (!b || b.status === to) return;
    if (!canTransition(b.status, to)) {
      setNotice(tr(ar, `${b.patient} cannot go from "${names[b.status]}" to "${names[to]}".`, `لا يمكن نقل ${b.patient} من "${names[b.status]}" إلى "${names[to]}".`));
      return;
    }
    setNotice(null);
    setBookings((list) => list.map((x) => (x.id === id ? { ...x, status: to, history: [...(x.history ?? []), { status: to, at: new Date() }] } : x)));
  };
  const cards: KanbanCardData[] = bookings
    .filter((b) => COLUMNS.includes(b.status))
    .map((b) => ({ id: b.id, columnId: b.status, title: `${b.patient} · ${b.service}`, labels: [{ label: b.start.toLocaleTimeString(ar ? "ar-EG-u-nu-latn" : "en", { hour: "numeric", minute: "2-digit" }) }] }));
  const selected = bookings.find((b) => b.id === selectedId) ?? bookings[0]!;
  return (
    <Frame wide>
      <Header title={tr(ar, "Today's bookings", "حجوزات اليوم")} text={tr(ar, "Drag a booking to the next stage, or context-click it for the moves that are allowed.", "اسحب الحجز إلى المرحلة التالية، أو افتح قائمته للحركات المسموحة.")} />
      {notice ? (
        <Alert tone="warning" className="mb-4">
          {notice}
        </Alert>
      ) : null}
      <KanbanBoard
        label={tr(ar, "Booking pipeline", "مسار الحجوزات")}
        columns={COLUMNS.map((c) => ({ id: c, title: names[c] }))}
        cards={cards}
        onMove={(id, to) => move(id, to as BookingStatus)}
        cardActions={(card) => {
          const b = bookings.find((x) => x.id === card.id)!;
          return [
            { id: "open", label: tr(ar, "Open details", "فتح التفاصيل"), onSelect: () => setSelectedId(b.id) },
            ...nextStatuses(b.status).map((to) => ({ id: to, label: tr(ar, `Move to ${names[to]}`, `نقل إلى ${names[to]}`), group: "move", danger: to === "cancelled" || to === "no_show", onSelect: () => move(b.id, to) })),
          ];
        }}
        columnClassName="w-64"
      />
      <section aria-label={tr(ar, "Selected booking", "الحجز المحدد")} className="mt-8 flex flex-col gap-3 rounded-card border border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-h3">{selected.patient}</h2>
          <BookingStatusBadge status={selected.status} />
          <span className="text-body-sm text-muted-foreground">
            {selected.service} · <bdi dir="ltr">{selected.code}</bdi>
          </span>
        </div>
        <BookingPipeline
          status={selected.status}
          history={selected.history}
          onAdvance={async (to) => {
            await wait(300);
            move(selected.id, to);
          }}
        />
      </section>
    </Frame>
  );
}

/* ------------------------------------------------------------------ queue */

export function WaitingPage() {
  const ar = useAr();
  const { entries, act, updatedAt } = useDemoQueue();
  const [connection, setConnection] = useState<QueueConnection>("live");
  const me = "q-46";
  return (
    <Frame>
      <WaitingScreen
        entries={entries}
        entryId={me}
        rooms={2}
        clinic={tr(ar, "Nasaq Family Clinic", "عيادة نسق للأسرة")}
        connection={connection}
        updatedAt={updatedAt}
        onLeave={async () => {
          await act("leave", me);
        }}
      />
      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <span className="text-caption text-muted-foreground">{tr(ar, "Demo controls", "أدوات العرض")}</span>
        <Button size="sm" variant="secondary" onClick={() => void act("call-next")}>
          {tr(ar, "Call the next patient", "نداء المريض التالي")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConnection((c) => (c === "live" ? "reconnecting" : "live"))}>
          {connection === "live" ? tr(ar, "Drop the connection", "قطع الاتصال") : tr(ar, "Restore the connection", "استعادة الاتصال")}
        </Button>
      </div>
    </Frame>
  );
}

export function LobbyPage({ large = false }: { large?: boolean }) {
  const ar = useAr();
  const { entries, act, updatedAt } = useDemoQueue("1");
  const [room, setRoom] = useState(1);
  const rooms = ["1", "2", "3"];
  return (
    <div className={large ? "h-[1080px] w-[1920px]" : "flex min-h-screen flex-col"}>
      <LobbyDisplay className={large ? "h-full" : "flex-1"} entries={entries} rooms={rooms} clinic={tr(ar, "Nasaq Family Clinic", "عيادة نسق للأسرة")} connection="live" />
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-card p-2" data-updated={updatedAt}>
        <span className="text-caption text-muted-foreground">{tr(ar, "Operator demo", "أداة المشغّل")}</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            const target = entries.find((e) => e.room === String(room) && (e.status === "called" || e.status === "serving"));
            if (target) await act("finish", target.id).catch(() => undefined);
            await act("call-next");
            setRoom((r) => (r % rooms.length) + 1);
          }}
        >
          {tr(ar, `Call next to room ${room}`, `نداء التالي إلى الغرفة ${room}`)}
        </Button>
      </div>
    </div>
  );
}

export function KioskPage() {
  const ar = useAr();
  const bookings = useKioskBookings();
  const { entries, join } = useDemoQueue();
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center p-4 sm:p-8">
      <CheckInKiosk
        bookings={bookings}
        resetSeconds={0}
        onCheckIn={async (request) => {
          await wait(600);
          const entry = join(request.booking?.name ?? tr(ar, "Walk-in", "بدون موعد"), request.booking ? "appointment" : "normal");
          if (!entry) return { error: tr(ar, "Try again.", "حاول مجددًا.") };
          const next = [...entries, entry];
          return { entry, position: positionInQueue(next, entry.id), waitMinutes: estimateWaitMinutes(next, entry.id, { averageMinutes: 10, rooms: 2 }) };
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ clinic */

export function SchedulePage() {
  const ar = useAr();
  const appointments = useClinicAppointments();
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <Frame wide>
      <Header title={tr(ar, "My day", "يومي")} text={tr(ar, "Every appointment by status, and who is next.", "كل موعد بحسب حالته، ومن هو التالي.")} />
      <ClinicSchedule appointments={appointments} defaultDate={NOW_DATE} now={NOW_DATE} onSelect={(a) => setPicked(`${a.patient} · ${a.service}`)} />
      {picked ? (
        <p className="mt-4 text-body-sm text-muted-foreground" role="status">
          {tr(ar, "Opened: ", "تم فتح: ")}
          {picked}
        </p>
      ) : null}
    </Frame>
  );
}

export function QueuePage() {
  const ar = useAr();
  const { entries, act, updatedAt } = useDemoQueue("1");
  return (
    <Frame wide>
      <Header title={tr(ar, "Live queue", "الطابور المباشر")} text={tr(ar, "Call the next patient, call again, or set someone aside.", "نادِ المريض التالي، أو أعد النداء، أو ضع أحدًا جانبًا.")} />
      <ClinicQueue entries={entries} updatedAt={updatedAt} onAction={async (action, id) => act(action, id)} />
    </Frame>
  );
}

export function CurrentVisitPage() {
  const ar = useAr();
  const { patient, history, prescriptions } = useVisitPatient();
  const [started] = useState(() => Date.now() - 6 * 60000 - 20000);
  return (
    <Frame wide>
      <Header title={tr(ar, "Current visit", "الزيارة الحالية")} text={tr(ar, "Notes, prescriptions and the follow-up, then finish the visit.", "الملاحظات والوصفة والمتابعة، ثم أنهِ الزيارة.")} />
      <CurrentVisit
        patient={patient}
        service={tr(ar, "General consultation", "كشف عام")}
        room="1"
        startedAt={started}
        history={history}
        defaultPrescriptions={[]}
        defaultNotes=""
        workingWeekdays={[6, 0, 1, 2, 3, 4]}
        onFinish={async () => {
          await wait(600);
        }}
      />
      <span className="sr-only">{prescriptions.length}</span>
    </Frame>
  );
}

export function AvailabilityPage() {
  const ar = useAr();
  const value = useDemoAvailability();
  return (
    <Frame>
      <Header title={tr(ar, "My availability", "أوقات عملي")} text={tr(ar, "Set the hours patients can book, your breaks and your time away.", "حدّد الساعات التي يمكن للمرضى الحجز فيها، واستراحاتك وأيام غيابك.")} />
      <AvailabilityEditor
        defaultValue={value}
        onSave={async () => {
          await wait(600);
        }}
      />
    </Frame>
  );
}

export function DashboardPage() {
  const ar = useAr();
  const rooms = useClinicRooms();
  const doctors = useClinicDoctors();
  const { entries, updatedAt } = useDemoQueue();
  const queuedAt = entries.filter((e) => e.status === "waiting").map((e) => e.queuedAt);
  return (
    <Frame wide>
      <Header title={tr(ar, "Front desk", "مكتب الاستقبال")} text={tr(ar, "Rooms, doctors and waiting patients right now.", "الغرف والأطباء والمرضى المنتظرون الآن.")} />
      <ClinicDashboard rooms={rooms} doctors={doctors} queuedAt={queuedAt} updatedAt={updatedAt} />
    </Frame>
  );
}
