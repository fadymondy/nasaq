import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import { formatTimer, NqCycleDots, NqIdleTimePrompt, NqTimerReadout, NqTimerRing, remainingAt, startCountdown, tickCountdown, useCountdownTimer } from ".";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("countdown maths", () => {
  it("is drift-free and formats mm:ss", () => {
    const s = startCountdown(25 * 60_000, 1000);
    expect(remainingAt(s, 1000 + 60_000)).toBe(24 * 60_000);
    expect(tickCountdown(s, 1000 + 25 * 60_000).status).toBe("done");
    expect(formatTimer(1500)).toBe("25:00");
    expect(formatTimer(3725)).toBe("1:02:05");
  });
});

describe("useCountdownTimer", () => {
  it("runs, pauses, resumes and completes", () => {
    vi.useFakeTimers();
    const done = vi.fn();
    let timer!: ReturnType<typeof useCountdownTimer>;
    mount(
      defineComponent({
        setup() {
          timer = useCountdownTimer({ durationMs: 5000, onComplete: done });
          return () => null;
        },
      }),
    );
    expect(timer.status.value).toBe("idle");
    expect(timer.seconds.value).toBe(5);
    timer.start();
    vi.advanceTimersByTime(2000);
    expect(timer.status.value).toBe("running");
    expect(timer.seconds.value).toBe(3);
    timer.pause();
    vi.advanceTimersByTime(10_000);
    expect(timer.status.value).toBe("paused");
    expect(timer.seconds.value).toBe(3);
    timer.resume();
    vi.advanceTimersByTime(3100);
    expect(timer.status.value).toBe("done");
    expect(timer.seconds.value).toBe(0);
    expect(done).toHaveBeenCalledTimes(1);
  });
});

describe("NqTimerRing", () => {
  it("draws the arc from the fraction and dashes it while paused", () => {
    const w = mount(NqTimerRing, { props: { fraction: 0.25, size: 100, thickness: 10 }, slots: { default: "mid" } });
    expect(w.attributes("data-slot")).toBe("timer-ring");
    expect(w.attributes("data-tone")).toBe("primary");
    const arc = w.find('[data-slot="timer-ring-arc"]');
    const c = 2 * Math.PI * 45;
    expect(Number(arc.attributes("stroke-dashoffset"))).toBeCloseTo(c * 0.75, 3);
    expect(w.text()).toBe("mid");
    const paused = mount(NqTimerRing, { props: { fraction: 0.5, paused: true } });
    expect(paused.attributes("data-paused")).toBe("");
    expect(paused.find('[data-slot="timer-ring-arc"]').attributes("stroke-dashoffset")).toBe("0");
  });
});

describe("NqTimerReadout", () => {
  it("shows mm:ss left-to-right with a timer role", () => {
    const w = mount(NqTimerReadout, { props: { seconds: 1500 } });
    expect(w.text()).toBe("25:00");
    expect(w.attributes("role")).toBe("timer");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.attributes("datetime")).toBe("PT25M0S");
    expect(w.attributes("aria-label")).toBe("Timer");
  });
  it("names itself in Arabic", () => {
    const w = mount({ components: { NasaqProvider, NqTimerReadout }, template: '<NasaqProvider locale="ar"><NqTimerReadout :seconds="5" /></NasaqProvider>' });
    expect(w.find("time").attributes("aria-label")).toBe("المؤقّت");
  });
});

describe("NqCycleDots", () => {
  it("marks done, current and todo dots", () => {
    const w = mount(NqCycleDots, { props: { total: 4, done: 1, active: true } });
    const states = w.findAll("span").map((s) => s.attributes("data-state"));
    expect(states).toEqual(["done", "current", "todo", "todo"]);
    expect(w.attributes("aria-label")).toBe("1 of 4 focus sessions done in this set");
  });
});

describe("NqIdleTimePrompt", () => {
  it("is closed without an idle period and asks when there is one", async () => {
    const w = mount(NqIdleTimePrompt, { props: { idle: null }, attachTo: document.body });
    expect(document.body.querySelector('[data-slot="idle-time-prompt"]')).toBeNull();
    await w.setProps({ idle: { idleMs: 7 * 60_000, since: Date.now() - 7 * 60_000 } });
    await nextTick();
    const prompt = document.body.querySelector('[data-slot="idle-time-prompt"]');
    expect(prompt?.textContent).toContain("You were away");
    expect(prompt?.textContent).toContain("7 min");
    const keep = [...document.body.querySelectorAll("button")].find((b) => b.textContent?.includes("Keep the time"));
    keep?.click();
    expect(w.emitted("keep")).toHaveLength(1);
    w.unmount();
  });
});
