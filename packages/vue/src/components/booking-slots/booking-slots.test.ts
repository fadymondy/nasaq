import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqBookingSlots } from ".";

const now = new Date(2030, 0, 10, 8, 0);
const at = (h: number, state: "available" | "full" | "held" | "past") => {
  const start = new Date(2030, 0, 11, h, 0);
  return { start, end: new Date(start.getTime() + 1800000), state, remaining: state === "available" ? 1 : 0 };
};
const slots = [at(9, "available"), at(10, "full"), at(11, "held"), at(13, "available")];

describe("NqBookingSlots", () => {
  it("lists the first free day's times with their states", () => {
    const w = mount(NqBookingSlots, { props: { slots, now }, attachTo: document.body });
    const tiles = w.findAll('[data-slot="booking-slot"]');
    expect(tiles).toHaveLength(4);
    expect(tiles.map((t) => t.attributes("data-state"))).toEqual(["available", "full", "held", "available"]);
    expect(tiles[1]!.attributes("data-disabled")).toBeDefined();
    expect(w.text()).toContain("2 times available");
    w.unmount();
  });

  it("emits the chosen start and ignores unavailable times", async () => {
    const w = mount(NqBookingSlots, { props: { slots, now }, attachTo: document.body });
    const tiles = w.findAll('[data-slot="booking-slot"]');
    await tiles[1]!.trigger("click");
    expect(w.emitted("value-change")).toBeUndefined();
    await tiles[3]!.trigger("click");
    expect(w.emitted("value-change")![0]![0]).toEqual(slots[3]!.start);
    w.unmount();
  });

  it("offers the next free day when the day is full", () => {
    const full = [at(9, "full"), { ...at(9, "available"), start: new Date(2030, 0, 13, 9, 0), end: new Date(2030, 0, 13, 9, 30) }];
    const w = mount(NqBookingSlots, { props: { slots: full, now, defaultDay: new Date(2030, 0, 11) }, attachTo: document.body });
    expect(w.text()).toContain("This day is fully booked.");
    expect(w.text()).toContain("Go to the next day with a free time");
    w.unmount();
  });
});
