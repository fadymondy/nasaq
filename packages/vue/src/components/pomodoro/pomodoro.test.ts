import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { NqBreakLockScreen, NqPomodoroCard, usePomodoro, type PomodoroController } from ".";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

const host = (opts: Parameters<typeof usePomodoro>[0] = {}) => {
  let p!: PomodoroController;
  const w = mount(
    defineComponent({
      setup() {
        p = usePomodoro(opts);
        return () => h(NqPomodoroCard, { pomodoro: p, tasks: [{ id: "a", title: "Write docs" }] });
      },
    }),
    { attachTo: document.body },
  );
  return { w, p: () => p };
};

describe("usePomodoro", () => {
  it("runs focus into a break and counts the session", async () => {
    vi.useFakeTimers();
    const events: string[] = [];
    const { p } = host({ config: { focusMs: 3000, shortBreakMs: 2000 }, onEvent: (e) => events.push(`${e.kind}:${e.phase}`) });
    expect(p().phase.value).toBe("focus");
    p().start();
    expect(p().status.value).toBe("running");
    vi.advanceTimersByTime(3100);
    expect(events).toEqual(["completed:focus"]);
    expect(p().phase.value).toBe("shortBreak");
    expect(p().completed.value).toBe(1);
    expect(p().onBreak.value).toBe(true);
    p().skip();
    expect(p().phase.value).toBe("focus");
    expect(p().onBreak.value).toBe(false);
  });
});

describe("NqPomodoroCard", () => {
  it("shows the phase, starts and stops", async () => {
    vi.useFakeTimers();
    const { w } = host();
    const card = w.find('[data-slot="pomodoro-card"]');
    expect(card.attributes("data-phase")).toBe("focus");
    expect(card.attributes("data-status")).toBe("idle");
    expect(w.find('[data-slot="timer-readout"]').text()).toBe("25:00");
    expect(w.text()).toContain("0 of 8 sessions");
    const start = w.findAll("button").find((b) => b.text() === "Start focus")!;
    await start.trigger("click");
    expect(card.attributes("data-status")).toBe("running");
    expect(w.text()).toContain("Pause");
    await w.findAll("button").find((b) => b.text() === "Stop")!.trigger("click");
    expect(card.attributes("data-status")).toBe("idle");
  });
});

describe("NqBreakLockScreen", () => {
  it("asks before skipping and then skips", async () => {
    const wrapper = mount(NqBreakLockScreen, { props: { open: true, phase: "shortBreak", seconds: 300, fraction: 1 }, attachTo: document.body });
    await flushPromises();
    const screen = () => document.body.querySelector('[data-slot="break-lock-screen"]') as HTMLElement;
    expect(screen()).not.toBeNull();
    expect(screen().textContent).toContain("Time for a short break");
    const btn = (label: string) => [...screen().querySelectorAll("button")].find((b) => b.textContent?.trim() === label)!;
    btn("Skip break").click();
    await flushPromises();
    expect(screen().getAttribute("data-confirming")).toBe("");
    expect(screen().textContent).toContain("Skip this break?");
    btn("Skip anyway").click();
    expect(wrapper.emitted("skip")).toHaveLength(1);
  });
});
