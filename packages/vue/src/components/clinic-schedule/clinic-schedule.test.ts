import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqClinicSchedule, findOverlaps, minutesLate, nextAppointment, summariseAppointments, type ClinicAppointment } from ".";

const at = (h: number, m = 0) => new Date(2026, 8, 29, h, m);
const now = at(9, 0);
const list = (): ClinicAppointment[] => [
  { id: "a1", patient: "Layla", service: "Check-up", start: at(8), end: at(8, 30), status: "done" },
  { id: "a2", patient: "Omar", service: "Review", start: at(8, 30), end: at(9, 15), status: "in_visit", room: "2" },
  { id: "a3", patient: "Sara", service: "Follow-up", start: at(8, 45), end: at(9, 30), status: "checked_in", room: "2", followUp: true },
  { id: "a4", patient: "Hadi", service: "Consult", start: at(10), end: at(10, 45), status: "confirmed" },
  { id: "a5", patient: "Yara", service: "Check-up", start: new Date(2026, 8, 30, 9), end: new Date(2026, 8, 30, 10), status: "confirmed" },
];

describe("NqClinicSchedule", () => {
  it("shows the day timeline with the status word in each block and a summary", () => {
    const w = mount(NqClinicSchedule, { props: { appointments: list(), now }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("clinic-schedule");
    expect(w.find('[data-slot="scheduler"]').attributes("data-view")).toBe("day");
    const blocks = w.findAll('[data-slot="scheduler-event"]');
    expect(blocks).toHaveLength(4);
    expect(blocks[1]!.text()).toContain("Omar · In visit");
    expect(w.text()).toContain("Today at a glance");
    expect(w.text()).toContain("Booked time");
    w.unmount();
  });

  it("shows the visit in progress, the next patient with lateness and an overlap warning", () => {
    const w = mount(NqClinicSchedule, { props: { appointments: list(), now: at(9, 10) }, attachTo: document.body });
    expect(w.find('[data-slot="clinic-current"]').text()).toContain("Omar");
    const next = w.find('[data-slot="clinic-next"]');
    expect(next.text()).toContain("Sara");
    expect(next.text()).toContain("25 min late");
    expect(next.text()).toContain("Follow-up");
    expect(w.find('[data-slot="alert"]').text()).toContain("1 pair of appointments overlaps");
    w.unmount();
  });

  it("emits select from a block and from Open when a listener is attached", async () => {
    const picked: string[] = [];
    const w = mount(NqClinicSchedule, { props: { appointments: list(), now, onSelect: (a: ClinicAppointment) => picked.push(a.id) }, attachTo: document.body });
    await w.findAll('[data-slot="scheduler-event"]')[0]!.trigger("click");
    const open = w.findAll("button").filter((b) => b.text().startsWith("Open"));
    expect(open.length).toBe(2);
    await open[1]!.trigger("click");
    expect(picked).toEqual(["a1", "a3"]);
    w.unmount();
  });

  it("hides the Open buttons without a select listener and merges classes", () => {
    const w = mount(NqClinicSchedule, { props: { appointments: list(), now, class: "mt-4" }, attachTo: document.body });
    expect(w.findAll("button").some((b) => b.text().startsWith("Open"))).toBe(false);
    expect(w.classes()).toContain("mt-4");
    w.unmount();
  });

  it("says so when the chosen day is empty and follows v-model:date", async () => {
    const w = mount(NqClinicSchedule, { props: { appointments: list(), now, date: new Date(2026, 9, 5) }, attachTo: document.body });
    expect(w.text()).toContain("No appointments on this day.");
    expect(w.text()).toContain("No one is waiting.");
    await w.setProps({ date: new Date(2026, 8, 30) });
    expect(w.findAll('[data-slot="scheduler-event"]')).toHaveLength(1);
    w.unmount();
  });

  it("is right to left in Arabic", () => {
    document.documentElement.lang = "ar";
    const w = mount(NqClinicSchedule, { props: { appointments: list(), now }, attachTo: document.body });
    expect(w.text()).toContain("اليوم في لمحة");
    expect(w.find('[data-slot="scheduler"]').attributes("dir")).toBe("rtl");
    w.unmount();
    document.documentElement.lang = "en";
  });
});

describe("schedule math", () => {
  it("counts, picks the next, measures lateness and finds overlaps", () => {
    const day = list().slice(0, 4);
    const s = summariseAppointments(day);
    expect(s).toMatchObject({ total: 4, remaining: 2, bookedMinutes: 30 + 45 + 45 + 45 });
    expect(nextAppointment(day, at(9, 10))!.id).toBe("a3");
    expect(minutesLate(day[2]!, at(9, 10))).toBe(25);
    expect(findOverlaps(day)).toEqual([["a2", "a3"]]);
  });
});
