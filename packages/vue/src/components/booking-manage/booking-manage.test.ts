import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqBookingManage, NqBookingTicket } from ".";

const now = new Date(2030, 0, 1, 9, 0);
const booking = {
  id: "b1",
  code: "NQ-4821",
  status: "confirmed" as const,
  start: new Date(2030, 0, 5, 10, 0),
  end: new Date(2030, 0, 5, 10, 30),
  service: "Dental check-up",
  provider: "Dr. Omar",
  location: "Riyadh clinic",
  patient: "Huda",
  phone: "+966 50 123 4567",
  price: 60,
  payment: "visit" as const,
};
const slot = { start: new Date(2030, 0, 5, 13, 0), end: new Date(2030, 0, 5, 13, 30), state: "available" as const, remaining: 1 };
const policy = { cancelHours: 24, lateFeePercent: 50 };

describe("NqBookingTicket", () => {
  it("shows the details, the code and the calendar links", () => {
    const w = mount(NqBookingTicket, { props: { booking } });
    const card = w.find('[data-slot="booking-ticket"]');
    expect(card.attributes("data-status")).toBe("confirmed");
    expect(w.text()).toContain("NQ-4821");
    expect(w.text()).toContain("Pay at the visit");
    expect(w.text()).toContain("Download .ics");
    const link = w.find("a");
    expect(link.attributes("href")).toContain("calendar.google.com");
    expect(link.attributes("target")).toBe("_blank");
  });

  it("hides the calendar and the footer when asked and empty", () => {
    const w = mount(NqBookingTicket, { props: { booking, hideCalendar: true } });
    expect(w.text()).not.toContain("Download .ics");
    expect(w.find('[data-slot="card-footer"]').exists()).toBe(false);
  });
});

describe("NqBookingManage", () => {
  const mk = (extra: Record<string, unknown> = {}) =>
    mount(NqBookingManage, {
      props: { booking, policy, now, getSlots: async () => [slot], onReschedule: async () => {}, onCancel: async () => {}, ...extra },
      attachTo: document.body,
    });

  it("states the free cancellation window and offers both actions", () => {
    const w = mk();
    expect(w.find('[data-slot="booking-policy"]').text()).toContain("free up to 24 hours");
    const labels = w.findAll("button").map((b) => b.text());
    expect(labels).toEqual(expect.arrayContaining(["Reschedule", "Cancel booking"]));
    w.unmount();
  });

  it("says the cancel is late and what it costs", () => {
    const w = mk({ now: new Date(2030, 0, 5, 8, 0) });
    expect(w.find('[data-slot="booking-policy"]').text()).toContain("50%");
    w.unmount();
  });

  it("reschedules to the chosen time", async () => {
    const onReschedule = vi.fn(async () => {});
    const w = mk({ onReschedule });
    await w.findAll("button").find((b) => b.text() === "Reschedule")!.trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("Choose a new time");
    const move = () => [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Move my booking") as HTMLButtonElement;
    expect(move().disabled).toBe(true);
    (document.body.querySelector('[data-slot="booking-slot"]') as HTMLElement).click();
    await flushPromises();
    expect(move().disabled).toBe(false);
    move().click();
    await flushPromises();
    expect(onReschedule).toHaveBeenCalledWith(slot.start);
    w.unmount();
  });

  it("keeps the dialog open and shows the error from onReschedule", async () => {
    const w = mk({ onReschedule: async () => ({ error: "Slot is gone" }) });
    await w.findAll("button").find((b) => b.text() === "Reschedule")!.trigger("click");
    await flushPromises();
    (document.body.querySelector('[data-slot="booking-slot"]') as HTMLElement).click();
    await flushPromises();
    ([...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Move my booking") as HTMLElement).click();
    await flushPromises();
    expect(document.body.textContent).toContain("Slot is gone");
    expect(document.body.textContent).toContain("Choose a new time");
    w.unmount();
  });

  it("cancelled bookings show the note and no actions", () => {
    const w = mk({ booking: { ...booking, status: "cancelled" } });
    expect(w.findAll('[role="alert"]').some((a) => a.text().includes("was cancelled"))).toBe(true);
    expect(w.text()).not.toContain("Reschedule");
    expect(w.text()).not.toContain("Download .ics");
    w.unmount();
  });
});
