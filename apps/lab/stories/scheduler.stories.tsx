import { Scheduler, type SchedulerEvent, SlotPicker } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Collaboration/Scheduler", component: Scheduler } satisfies Meta<typeof Scheduler>;
export default meta;
type Story = StoryObj;

const TODAY = new Date(2026, 8, 29);
const at = (dayOffset: number, h: number, m = 0) => new Date(2026, 8, 29 + dayOffset, h, m);

const EVENTS: SchedulerEvent[] = [
  { id: "1", title: "Standup", start: at(0, 9), end: at(0, 9, 30), tone: "info" },
  { id: "2", title: "Design review", start: at(0, 10), end: at(0, 11, 30), tone: "brand" },
  { id: "3", title: "Client call", start: at(0, 10, 30), end: at(0, 11, 30), tone: "success" },
  { id: "4", title: "Vendor sync", start: at(0, 11), end: at(0, 12), tone: "warning" },
  { id: "5", title: "Lunch", start: at(0, 13), end: at(0, 14) },
  { id: "6", title: "Release", start: at(1, 15), end: at(1, 16, 30), tone: "danger" },
  { id: "7", title: "1:1", start: at(2, 9, 30), end: at(2, 10, 15), tone: "info" },
  { id: "8", title: "Workshop", start: at(3, 12), end: at(3, 15), tone: "brand" },
  { id: "9", title: "Planning", start: at(-2, 14), end: at(-2, 15, 30), tone: "success" },
  { id: "10", title: "Review", start: at(0, 15), end: at(0, 16) },
  { id: "11", title: "Retro", start: at(0, 16), end: at(0, 17), tone: "warning" },
];

const EVENTS_AR: SchedulerEvent[] = EVENTS.map((e, i) => ({
  ...e,
  title: ["اجتماع الفريق", "مراجعة التصميم", "مكالمة العميل", "متابعة المورّد", "الغداء", "الإصدار", "لقاء فردي", "ورشة عمل", "التخطيط", "مراجعة", "استعراض"][i] as string,
}));

function Demo({ events, locale, ...props }: { events: SchedulerEvent[]; locale?: string } & Partial<React.ComponentProps<typeof Scheduler>>) {
  const [last, setLast] = useState("");
  return (
    <div className="flex w-full max-w-5xl flex-col gap-2">
      <Scheduler
        events={events}
        locale={locale}
        today={TODAY}
        onSlotSelect={(s, e) => setLast(`slot ${s.toLocaleString(locale)} → ${e.toLocaleTimeString(locale)}`)}
        onEventClick={(e) => setLast(`event ${e.title}`)}
        {...props}
      />
      <p className="text-caption text-muted-foreground">{last || "Click a slot or an event."}</p>
    </div>
  );
}

/** Week view with overlapping events split into columns. Click a slot or an event. */
export const Week: Story = { render: () => <Demo events={EVENTS} /> };

export const Day: Story = { render: () => <Demo events={EVENTS} defaultView="day" /> };

/** Five events on one day: two chips, then "+3 more" opens a popover with all of them. */
export const Month: Story = { render: () => <Demo events={EVENTS} defaultView="month" /> };

/** 24-hour axis, Monday first, 30-minute slots over a longer day. */
export const Configured: Story = {
  render: () => <Demo events={EVENTS} hour12={false} weekStartsOn={1} workingHours={{ start: 7, end: 20 }} slotMinutes={60} />,
};

/** Arabic: day columns run right to left, chevrons mirror, week starts on Saturday. */
export const Arabic: Story = { render: () => <Demo events={EVENTS_AR} locale="ar-EG" /> };

export const ArabicMonth: Story = { render: () => <Demo events={EVENTS_AR} locale="ar-SA" defaultView="month" /> };

const SLOTS = [0, 1, 2, 4, 5].flatMap((d) =>
  [9, 9.5, 10, 11, 13.5, 14, 15, 16].map((h) => ({ start: at(d, Math.floor(h), (h % 1) * 60), disabled: d === 1 && h < 11 })),
);

function BookingDemo({ locale }: { locale?: string }) {
  const [value, setValue] = useState<Date | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <SlotPicker slots={SLOTS} locale={locale} today={TODAY} value={value} onValueChange={setValue} />
      <p className="text-caption text-muted-foreground">{value ? value.toLocaleString(locale) : "-"}</p>
    </div>
  );
}

/** Pick a day, then a time. Days with no free slot are disabled; the list is a radio group (arrows move and select). */
export const Booking: Story = { render: () => <BookingDemo /> };

export const BookingArabic: Story = { render: () => <BookingDemo locale="ar" /> };
