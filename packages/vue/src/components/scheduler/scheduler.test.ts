import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { layoutDayEvents, NqScheduler, NqSlotPicker, timeSlots, type SchedulerEvent } from ".";

const today = new Date(2026, 8, 29);
const events: SchedulerEvent[] = [
  { id: "1", title: "Design review", start: new Date(2026, 8, 29, 10, 0), end: new Date(2026, 8, 29, 11, 30), tone: "brand" },
  { id: "2", title: "Client call", start: new Date(2026, 8, 29, 10, 30), end: new Date(2026, 8, 29, 11, 0), tone: "success" },
];

describe("NqScheduler", () => {
  it("renders the week grid with events and reports clicks", async () => {
    const w = mount(NqScheduler, { props: { events, today, locale: "en", weekStartsOn: 0 } });
    expect(w.attributes("data-view")).toBe("week");
    expect(w.findAll('[data-slot="scheduler-event"]').length).toBe(2);
    expect(w.findAll('[data-slot="scheduler-slot"]').length).toBe(timeSlots({ start: 8, end: 18 }, 30).length * 7);
    await w.find('[data-slot="scheduler-event"]').trigger("click");
    expect(w.emitted("eventClick")![0]![0]).toMatchObject({ id: "1" });
    await w.find('[data-slot="scheduler-slot"]').trigger("click");
    expect(w.emitted("slotSelect")).toBeTruthy();
  });

  it("switches to month with chips and a +N more overflow", async () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ id: `m${i}`, title: `E${i}`, start: new Date(2026, 8, 29, 9 + i), end: new Date(2026, 8, 29, 10 + i) }));
    const w = mount(NqScheduler, { props: { events: many, today, defaultView: "month", locale: "en" } });
    expect(w.find('[data-slot="scheduler-day"][data-today]').exists()).toBe(true);
    expect(w.findAll('[data-slot="scheduler-chip"]').length).toBe(2);
    expect(w.text()).toContain("+3 more");
  });

  it("is right to left in Arabic", () => {
    const w = mount(NqScheduler, { props: { events, today, locale: "ar" } });
    expect(w.attributes("dir")).toBe("rtl");
    expect(w.text()).toContain("اليوم");
  });
});

describe("layout math", () => {
  it("splits overlapping events into columns", () => {
    const p = layoutDayEvents(events, today, 480, 1080);
    expect(p.map((x) => x.columns)).toEqual([2, 2]);
  });
});

describe("NqSlotPicker", () => {
  it("lists the day's times and emits the picked slot", async () => {
    const slots = [{ start: new Date(2026, 8, 30, 9, 0) }, { start: new Date(2026, 8, 30, 9, 30) }, { start: new Date(2026, 8, 30, 10, 0), disabled: true }];
    const w = mount(NqSlotPicker, { props: { slots, today, locale: "en" }, attachTo: document.body });
    const items = w.findAll('[data-slot="slot-picker-slot"]');
    expect(items.length).toBe(3);
    await items[1]!.trigger("click");
    await flushPromises();
    expect((w.emitted("update:modelValue")![0]![0] as Date).getTime()).toBe(slots[1]!.start.getTime());
    w.unmount();
  });
});
