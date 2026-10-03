import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqClinicDashboard, type ClinicDoctor, type ClinicRoom } from ".";

// 2026-09-29 09:00 local time.
const NOW = new Date(2026, 8, 29, 9, 0, 0).getTime();
const rooms: ClinicRoom[] = [
  { id: "r1", name: "Room 1", status: "busy", doctorId: "d1", ticket: "A-014", since: NOW - 12 * 60000 },
  { id: "r2", name: "Room 2", status: "free" },
  { id: "r3", name: "Room 3", status: "closed" },
];
const doctors: ClinicDoctor[] = [
  { id: "d1", name: "Dr. Mona Saleh", specialty: "Family medicine", status: "in_visit", roomId: "r1", shift: { start: "08:00", end: "16:00" }, waiting: 3 },
  { id: "d2", name: "Dr. Karim Adel", specialty: "Pediatrics", status: "available", shift: { start: "13:00", end: "20:00" }, waiting: 0 },
  { id: "d3", name: "Dr. Off", specialty: "ENT", status: "off", waiting: 0 },
];
const queuedAt = [NOW - 5 * 60000, NOW - 15 * 60000];

afterEach(() => {
  document.documentElement.lang = "en";
});

const mountIt = (props: Record<string, unknown> = {}) => mount(NqClinicDashboard, { props: { rooms, doctors, queuedAt, now: NOW, ...props } });

describe("NqClinicDashboard", () => {
  it("shows the figures, rooms and only the doctors on duty", () => {
    const w = mountIt();
    expect(w.attributes("data-slot")).toBe("clinic-dashboard");
    expect(w.text()).toContain("Waiting now");
    expect(w.text()).toContain("15 min");
    expect(w.text()).toContain("50%");
    expect(w.findAll('[data-slot="clinic-room"]').map((r) => r.attributes("data-status"))).toEqual(["busy", "free", "closed"]);
    const docs = w.findAll('[data-slot="clinic-doctor"]');
    expect(docs).toHaveLength(1);
    expect(docs[0]!.text()).toContain("Dr. Mona Saleh");
    expect(docs[0]!.text()).toContain("3 waiting");
    expect(w.text()).toContain("A-014");
    expect(w.text()).toContain("12 min");
  });

  it("rooms and doctors are buttons only with a handler", async () => {
    expect(mountIt().find('button[data-slot="clinic-room"]').exists()).toBe(false);
    const onRoomSelect = vi.fn();
    const onDoctorSelect = vi.fn();
    const w = mountIt({ onRoomSelect, onDoctorSelect });
    await w.find('button[data-slot="clinic-room"]').trigger("click");
    await w.find('button[data-slot="clinic-doctor"]').trigger("click");
    expect(onRoomSelect).toHaveBeenCalledWith(rooms[0]);
    expect(onDoctorSelect).toHaveBeenCalledWith(doctors[0]);
  });

  it("explains empty lists and speaks Arabic", () => {
    const empty = mountIt({ rooms: [], doctors: [], queuedAt: [] });
    expect(empty.text()).toContain("No rooms set up.");
    expect(empty.text()).toContain("No doctor is on duty right now.");
    document.documentElement.lang = "ar";
    expect(mountIt().text()).toContain("العيادة اليوم");
  });
});
