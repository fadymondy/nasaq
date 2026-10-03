import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { makeWeek, type Availability } from ".";
import { NqAvailabilityEditor } from ".";

const week = (): Availability => ({
  weekly: makeWeek([0, 1, 2, 3, 4], [{ start: "09:00", end: "17:00" }], [{ start: "13:00", end: "14:00" }]),
  vacations: [{ id: "v1", from: "2026-10-04", to: "2026-10-06", reason: "Conference" }],
});

describe("NqAvailabilityEditor", () => {
  it("shows the weekly total, the days and the vacation", () => {
    const w = mount(NqAvailabilityEditor, { props: { defaultValue: week() } });
    expect(w.attributes("data-slot")).toBe("availability-editor");
    expect(w.findAll('[data-slot="availability-day"]')).toHaveLength(7);
    expect(w.findAll('[data-slot="availability-day"][data-open]')).toHaveLength(5);
    expect(w.text()).toContain("35 h a week");
    expect(w.find('[data-slot="availability-vacation"]').text()).toContain("3 days");
    expect(w.find('[data-slot="availability-vacation"]').text()).toContain("Conference");
  });

  it("adds hours, flags an overlap and blocks saving", async () => {
    const onSave = vi.fn(async () => undefined);
    const w = mount(NqAvailabilityEditor, { props: { defaultValue: week(), onSave } });
    const saveBtn = () => w.findAll("button").find((b) => b.text() === "Save availability")!;
    expect(saveBtn().attributes("disabled")).toBeDefined();
    const day = w.find('[data-slot="availability-day"][data-open]');
    await day.findAll("button").find((b) => b.text() === "Add hours")!.trigger("click");
    // The new range starts where the last one ended (17:00) so it is valid; the Save button turns on.
    expect(saveBtn().attributes("disabled")).toBeUndefined();
    await saveBtn().trigger("click");
    await flushPromises();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(w.text()).toContain("Availability saved.");
  });

  it("removes a vacation and can discard changes", async () => {
    const w = mount(NqAvailabilityEditor, { props: { defaultValue: week() } });
    await w.find('[data-slot="availability-vacation"] button').trigger("click");
    expect(w.find('[data-slot="availability-vacation"]').exists()).toBe(false);
    expect(w.text()).toContain("No vacations planned.");
    await w.findAll("button").find((b) => b.text() === "Discard changes")!.trigger("click");
    expect(w.find('[data-slot="availability-vacation"]').exists()).toBe(true);
  });

  it("starts the week on Saturday", () => {
    const w = mount(NqAvailabilityEditor, { props: { defaultValue: week() } });
    expect(w.findAll('[data-slot="availability-day"]')[0]!.attributes("aria-label")).toBe("Saturday");
  });
});
