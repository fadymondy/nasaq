import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { KioskBooking, QueueEntry } from "../waiting-screen";
import { NqCheckInKiosk, type CheckInResult } from ".";

const NOW = 1_800_000_000_000;
const MIN = 60_000;
const bookings: KioskBooking[] = [
  { id: "b1", code: "BK-7F3Q9K", phone: "0100 123 4567", name: "Layla", startsAt: NOW + 10 * MIN },
  { id: "b2", code: "BK-AAAAAA", phone: "0111 222 3333", name: "Omar", startsAt: NOW + 200 * MIN },
  { id: "b3", code: "BK-BBBBBB", phone: "0122 000 1111", name: "Hadi", startsAt: NOW + 20 * MIN },
  { id: "b4", code: "BK-CCCCCC", phone: "0122 000 1111", name: "Hadi Jr", startsAt: NOW + 30 * MIN },
];
const entry = { id: "e1", ticket: "A-021", number: 21, status: "waiting", priority: "normal", queuedAt: NOW, checkedInAt: NOW } as QueueEntry;
const ok = async (): Promise<CheckInResult> => ({ entry, position: 3, waitMinutes: 20 });

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
});

const mountIt = (props: Record<string, unknown> = {}, onCheckIn: unknown = vi.fn(ok)) =>
  mount(NqCheckInKiosk, { props: { bookings, onCheckIn: onCheckIn as never, now: NOW, ...props }, attachTo: document.body });

describe("NqCheckInKiosk", () => {
  it("checks in a scanned booking code and shows the ticket", async () => {
    const onCheckIn = vi.fn(ok);
    const w = mountIt({}, onCheckIn);
    expect(w.attributes("data-view")).toBe("input");
    await w.find("input").setValue("booking:BK-7F3Q9K");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onCheckIn).toHaveBeenCalledWith({ booking: bookings[0] });
    expect(w.attributes("data-view")).toBe("ticket");
    expect(w.find('[data-slot="kiosk-ticket"]').text()).toBe("A-021");
    expect(w.text()).toContain("2 people are ahead of you.");
    expect(w.text()).toContain("about 20 min");
  });

  it("types a phone number on the keypad and offers a walk-in when nothing matches", async () => {
    const onCheckIn = vi.fn(ok);
    const w = mountIt({ defaultMode: "phone" }, onCheckIn);
    for (const k of "0155500000") await w.findAll("button").find((b) => b.text() === k)!.trigger("click");
    expect(w.find("output").text()).toBe("0155500000");
    await w.findAll("button").find((b) => b.text().includes("Find my booking"))!.trigger("click");
    await flushPromises();
    expect(w.attributes("data-view")).toBe("message");
    expect(w.text()).toContain("We could not find a booking for that.");
    await w.findAll("button").find((b) => b.text().includes("Join the line"))!.trigger("click");
    await flushPromises();
    expect(onCheckIn).toHaveBeenCalledWith({ phone: "0155500000" });
    expect(w.attributes("data-view")).toBe("ticket");
  });

  it("asks which booking when a phone has two", async () => {
    const w = mountIt({ defaultMode: "phone" });
    for (const k of "0122000111".concat("1")) await w.findAll("button").find((b) => b.text() === k)!.trigger("click");
    await w.findAll("button").find((b) => b.text().includes("Find my booking"))!.trigger("click");
    await flushPromises();
    expect(w.attributes("data-view")).toBe("choose");
    expect(w.text()).toContain("Which one is yours?");

  });

  it("too early shows the opening time", async () => {
    const w = mountIt({});
    await w.find("input").setValue("booking:BK-AAAAAA");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("You can check in from");
  });

  it("a failed check-in shows the failure message and resets after the countdown", async () => {
    const w = mountIt({}, vi.fn(async () => ({ error: "Desk is closed" })));
    await w.find("input").setValue("booking:BK-7F3Q9K");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("Desk is closed");

    vi.useFakeTimers();
    const t = mountIt({ resetSeconds: 2 });
    await t.find("input").setValue("booking:BK-7F3Q9K");
    await t.find("form").trigger("submit");
    await vi.advanceTimersByTimeAsync(0);
    expect(t.attributes("data-view")).toBe("ticket");
    await vi.advanceTimersByTimeAsync(2100);
    expect(t.attributes("data-view")).toBe("input");
  });

  it("speaks Arabic", () => {
    document.documentElement.lang = "ar";
    expect(mountIt().text()).toContain("تسجيل الوصول");
  });
});
