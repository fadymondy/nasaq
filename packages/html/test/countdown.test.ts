// The Blade countdown example (packages/php/examples/rendered/countdown.html) under real Alpine.
import { describe, expect, it, vi } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const readout = () => document.querySelector<HTMLElement>('[data-slot="timer-readout"]')!;
const ring = () => document.querySelector<HTMLElement>('[data-slot="timer-ring"]')!;
const arc = () => document.querySelector<SVGElement>('[data-slot="timer-ring-arc"]')!;
const dots = () => [...document.querySelectorAll<HTMLElement>('[data-slot="cycle-dots"] > span')].map((d) => d.dataset.state);
const button = (label: string) => [...document.querySelectorAll<HTMLElement>('[data-slot="button"]')].find((b) => b.textContent?.trim() === label)!;
const visible = (el: HTMLElement) => el.style.display !== "none";

describe("countdown (Blade example)", () => {
  it("renders the ring, readout and dots from the timer", async () => {
    await mount("countdown");
    expect(readout().textContent).toBe("25:00");
    expect(readout().getAttribute("role")).toBe("timer");
    expect(readout().getAttribute("datetime")).toBe("PT25M0S");
    expect(Number(arc().getAttribute("stroke-dashoffset"))).toBeCloseTo(0);
    expect(dots()).toEqual(["done", "todo", "todo", "todo"]);
    expect(document.querySelector('[data-slot="cycle-dots"]')!.getAttribute("aria-label")).toBe("1 of 4 focus sessions done in this set");
    expect(visible(button("Start"))).toBe(true);
    expect(visible(button("Pause"))).toBe(false);
  });

  it("counts down, pauses with a dashed arc, resumes and resets", async () => {
    await mount("countdown");
    button("Start").click();
    await tick(1200);
    expect(readout().textContent).toBe("24:59");
    expect(dots()).toEqual(["done", "current", "todo", "todo"]);
    expect(visible(button("Pause"))).toBe(true);
    expect(visible(button("Start"))).toBe(false);
    button("Pause").click();
    await tick();
    expect(ring().hasAttribute("data-paused")).toBe(true);
    expect(arc().getAttribute("stroke-dasharray")).toContain(" ");
    const frozen = readout().textContent;
    await tick(1100);
    expect(readout().textContent).toBe(frozen);
    expect(visible(button("Resume"))).toBe(true);
    button("Resume").click();
    await tick();
    expect(ring().hasAttribute("data-paused")).toBe(false);
    button("Reset").click();
    await tick();
    expect(readout().textContent).toBe("25:00");
    expect(dots()).toEqual(["done", "todo", "todo", "todo"]);
  });

  it("asks what to do with idle time when the person comes back", async () => {
    await mount("countdown");
    const real = Date.now();
    const spy = vi.spyOn(Date, "now").mockReturnValue(real + 10 * 60_000);
    window.dispatchEvent(new Event("keydown"));
    await tick(100);
    spy.mockRestore();
    const dialog = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    expect(dialog.getAttribute("role")).toBe("alertdialog");
    expect(dialog.hasAttribute("data-open")).toBe(true);
    expect(dialog.textContent).toContain("idle for 10 min");
    expect(dialog.textContent).toContain("Discard 10 min");
    const kept = vi.fn();
    document.querySelector('[data-slot="idle-time-prompt-root"]')!.addEventListener("idle-keep", kept);
    [...dialog.querySelectorAll("button")].find((b) => b.textContent?.includes("Keep the time"))!.click();
    await tick(100);
    expect(kept).toHaveBeenCalledOnce();
    expect(dialog.hasAttribute("data-open")).toBe(false);
  });
});
