import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqCronBuilder, NqCronScheduleList } from ".";

const NOW = new Date("2026-03-02T08:00:00Z");

describe("NqCronBuilder", () => {
  it("reads the schedule in words and lists the next runs", () => {
    const w = mount(NqCronBuilder, { props: { defaultValue: "0 9 * * 1-5", now: NOW, timeZone: "UTC" } });
    expect(w.find('[data-slot="cron-builder"]').exists()).toBe(true);
    expect(w.find('[data-slot="cron-summary"]').text().length).toBeGreaterThan(0);
    expect(w.find('[data-slot="cron-summary"]').attributes("aria-live")).toBe("polite");
    expect(w.findAll('[data-slot="cron-next-runs"] li').length).toBe(5);
  });

  it("emits the cron and validity when a preset is pressed", async () => {
    const w = mount(NqCronBuilder, { props: { defaultValue: "0 9 * * 1-5", now: NOW } });
    const presets = w.findAll("button[aria-pressed]");
    expect(presets.length).toBeGreaterThan(1);
    await presets[1]!.trigger("click");
    await flushPromises();
    const ev = w.emitted("valueChange");
    expect(ev).toBeTruthy();
    expect(ev![0]![1]).toBe(true);
    expect(w.emitted("update:modelValue")).toBeTruthy();
  });
});

describe("NqCronScheduleList", () => {
  it("renders rows with statuses and an empty state", () => {
    const w = mount(NqCronScheduleList, {
      props: { now: NOW, schedules: [{ id: "1", name: "Weekly report", cron: "0 9 * * 1", enabled: true, lastRun: { at: NOW, status: "ok" } }] },
    });
    expect(w.find('[data-slot="cron-schedule-list"]').exists()).toBe(true);
    expect(w.text()).toContain("Weekly report");
    const e = mount(NqCronScheduleList, { props: { schedules: [] } });
    expect(e.find('[data-slot="cron-schedule-list"]').exists()).toBe(true);
  });
});
