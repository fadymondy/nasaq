import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqDailySummary, addCivilDays, unclassifiedCount } from ".";

const summary = {
  date: "2026-09-29",
  waterMl: 2400,
  meals: { total: 5, safe: 3, unsafe: 1 },
  caffeine: { total: 2, clean: 1, sugar: 1 },
  shutdownViolations: 2,
  sleepMinutes: 432,
  source: "watch",
} as const;

describe("NqDailySummary", () => {
  it("renders the day with state attributes, tiles and the goal meter", () => {
    const w = mount(NqDailySummary, { props: { summary, waterGoalMl: 3000, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("daily-summary");
    expect(w.attributes("data-date")).toBe("2026-09-29");
    expect(w.classes()).toContain("extra");
    expect(w.attributes("aria-labelledby")).toBe(w.find("h2").attributes("id"));
    expect(w.find("h2").text()).toContain("September");
    expect(w.find('[data-slot="daily-summary-water"] [data-slot="meter"]').attributes("aria-valuenow")).toBe("2400");
    expect(w.findAll('[data-slot="daily-summary-tally"]')).toHaveLength(2);
    expect(w.text()).toContain("5 meals");
    expect(w.text()).toContain("Not classified");
    expect(w.text()).toContain("2 violations");
    expect(w.text()).toContain("Apple Watch");
  });

  it("says Not synced for a missing figure, never zero", () => {
    const w = mount(NqDailySummary, { props: { summary: { date: "2026-09-29", steps: 100 } } });
    expect(w.text()).toContain("Not synced");
    expect(w.find('[data-slot="daily-summary-water"]').text()).toContain("Not synced");
  });

  it("steps through days and stops at maxDate", async () => {
    const onDateChange = vi.fn();
    const w = mount(NqDailySummary, { props: { summary, maxDate: "2026-09-29", onDateChange } });
    const [prev, next] = w.findAll("header button");
    expect(next!.attributes("disabled")).toBeDefined();
    await prev!.trigger("click");
    expect(onDateChange).toHaveBeenCalledWith("2026-09-28");
    expect(mount(NqDailySummary, { props: { summary } }).findAll("header button")).toHaveLength(0);
  });

  it("shows loading, error with retry and the empty state", async () => {
    expect(mount(NqDailySummary, { props: { date: "2026-09-29", loading: true } }).find('[aria-busy="true"]').exists()).toBe(true);
    const onRetry = vi.fn();
    const err = mount(NqDailySummary, { props: { date: "2026-09-29", error: "Offline", onRetry } });
    expect(err.find('[data-slot="error-state"]').text()).toContain("Offline");
    await err.find('[data-slot="error-state"] button').trigger("click");
    expect(onRetry).toHaveBeenCalled();
    expect(mount(NqDailySummary, { props: { summary: { date: "2026-09-29" } } }).find('[data-slot="empty-state"]').exists()).toBe(true);
  });

  it("does the civil-date arithmetic across month ends", () => {
    expect(addCivilDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(unclassifiedCount(5, 3, 1)).toBe(1);
  });
});
