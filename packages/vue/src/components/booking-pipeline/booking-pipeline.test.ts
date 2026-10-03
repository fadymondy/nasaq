import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqBookingPipeline, NqBookingStatusBadge, BOOKING_STATUS_LABELS } from ".";

const history = [
  { status: "requested" as const, at: new Date(2030, 0, 1, 9), by: "Sara" },
  { status: "confirmed" as const, at: new Date(2030, 0, 1, 10) },
];

describe("NqBookingPipeline", () => {
  it("shows five stages, the allowed moves and the history", () => {
    const w = mount(NqBookingPipeline, { props: { status: "confirmed", history, onAdvance: async () => {} }, attachTo: document.body });
    expect(w.findAll('[data-slot="stepper-item"]')).toHaveLength(5);
    expect(w.find('[data-slot="stepper-item"][data-status="current"]').text()).toContain("Confirmed");
    const labels = w.findAll("button").map((b) => b.text());
    expect(labels).toEqual(expect.arrayContaining(["Check in", "Mark no-show", "Cancel booking"]));
    expect(w.findAll('[data-slot="timeline-item"]')).toHaveLength(2);
    expect(w.text()).toContain("by Sara");
    w.unmount();
  });

  it("calls onAdvance and shows an error result", async () => {
    const onAdvance = vi.fn(async () => ({ error: "Slot is gone" }));
    const w = mount(NqBookingPipeline, { props: { status: "confirmed", history, onAdvance }, attachTo: document.body });
    await w.findAll("button").find((b) => b.text() === "Check in")!.trigger("click");
    await flushPromises();
    expect(onAdvance).toHaveBeenCalledWith("checked_in");
    expect(w.find('[role="alert"]').text()).toBe("Slot is gone");
    w.unmount();
  });

  it("is read-only without onAdvance and marks where a cancelled booking stopped", () => {
    const w = mount(NqBookingPipeline, { props: { status: "cancelled", history: [...history, { status: "cancelled" as const, at: new Date(2030, 0, 2) }] }, attachTo: document.body });
    expect(w.find('[role="group"]').exists()).toBe(false);
    expect(w.find('[data-slot="stepper-item"][data-status="error"]').text()).toContain("Cancelled");
    w.unmount();
  });
});

describe("NqBookingStatusBadge", () => {
  it("names the status with an icon", () => {
    const w = mount(NqBookingStatusBadge, { props: { status: "no_show" } });
    expect(w.attributes("data-status")).toBe("no_show");
    expect(w.text()).toBe(BOOKING_STATUS_LABELS.en.no_show);
    expect(w.find("svg").exists()).toBe(true);
  });
});
