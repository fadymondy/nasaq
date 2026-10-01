import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NqRouteProgress, nextTrickle, useRouteProgress } from ".";

afterEach(() => vi.useRealTimers());

describe("nextTrickle", () => {
  it("slows down and never passes 94", () => {
    expect(nextTrickle(0)).toBe(10);
    expect(nextTrickle(30)).toBe(34);
    expect(nextTrickle(60)).toBe(62);
    expect(nextTrickle(90)).toBe(90.5);
    expect(nextTrickle(94)).toBe(94);
  });
});

describe("NqRouteProgress", () => {
  it("is an idle, hidden progressbar by default with the React classes", () => {
    const w = mount(NqRouteProgress);
    expect(w.attributes("role")).toBe("progressbar");
    expect(w.attributes("aria-label")).toBe("Loading");
    expect(w.attributes("aria-hidden")).toBe("true");
    expect(w.attributes("data-state")).toBe("idle");
    expect(w.classes()).toEqual(expect.arrayContaining(["fixed", "h-0.5", "opacity-0", "z-[60]"]));
    expect(w.find('[data-slot="route-progress-bar"]').classes()).toContain("bg-primary");
  });

  it("value pins the bar and hides itself at 100", async () => {
    const w = mount(NqRouteProgress, { props: { value: 40, tone: "success", placement: "absolute" } });
    expect(w.attributes("aria-valuenow")).toBe("40");
    expect(w.attributes("data-state")).toBe("active");
    expect(w.classes()).toContain("absolute");
    expect(w.find('[data-slot="route-progress-bar"]').attributes("style")).toContain("40%");
    expect(w.find('[data-slot="route-progress-bar"]').classes()).toContain("bg-nq-success");
    await w.setProps({ value: 100 });
    expect(w.attributes("data-state")).toBe("idle");
  });

  it("active starts, creeps and finishes", async () => {
    vi.useFakeTimers();
    const w = mount(NqRouteProgress, { props: { active: true } });
    expect(w.attributes("data-state")).toBe("active");
    expect(w.attributes("aria-valuenow")).toBe("6");
    vi.advanceTimersByTime(250);
    await nextTick();
    expect(w.attributes("aria-valuenow")).toBe("16");
    await w.setProps({ active: false });
    expect(w.attributes("aria-valuenow")).toBe("100");
    vi.advanceTimersByTime(300);
    await nextTick();
    expect(w.attributes("data-state")).toBe("idle");
    expect(w.attributes("aria-valuenow")).toBe("0");
  });
});

describe("useRouteProgress", () => {
  it("stays active until every job finished; the finisher is idempotent", async () => {
    const jobs = useRouteProgress();
    const a = jobs.start();
    const b = jobs.start();
    expect(jobs.active.value).toBe(true);
    a();
    a();
    expect(jobs.count.value).toBe(1);
    b();
    expect(jobs.active.value).toBe(false);
    await expect(jobs.run(Promise.resolve(7))).resolves.toBe(7);
    expect(jobs.count.value).toBe(0);
  });
});
