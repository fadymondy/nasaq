// The Blade pomodoro example (packages/php/examples/rendered/pomodoro.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { describe, expect, it, vi } from "vitest";
import { setup, tick } from "./_float-setup";

setup();
vi.setConfig({ testTimeout: 30000 });

// 20x clock and a long break, so a break can be inspected before it ends by itself.
async function open() {
  const html = readFileSync(resolve(process.cwd(), "../php/examples/rendered/pomodoro.html"), "utf8")
    .replace("\\u0022completed\\u0022:2", "\\u0022completed\\u0022:2,\\u0022speed\\u0022:20")
    .replace("\\u0022shortBreakMs\\u0022:10000", "\\u0022shortBreakMs\\u0022:600000");
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

// The clock is real time, so wait for the break instead of guessing how long a busy machine takes.
async function untilBreak() {
  for (let i = 0; i < 40 && card().dataset.phase !== "shortBreak"; i++) await tick(100);
  await tick(150);
}

const root = () => document.querySelector<HTMLElement>('[data-slot="pomodoro-root"]')!;
const card = () => document.querySelector<HTMLElement>('[data-slot="pomodoro-card"]')!;
const readout = () => card().querySelector<HTMLElement>('[data-slot="timer-readout"]')!;
const screen = () => document.querySelector<HTMLElement>('[data-slot="break-lock-screen"]')!;
const visible = (el: HTMLElement) => el.style.display !== "none";
const button = (scope: ParentNode, label: string) => [...scope.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === label)!;

describe("pomodoro (Blade example)", () => {
  it("renders the idle card: ring, dots, task picker and today's progress", async () => {
    await open();
    expect(card().dataset.phase).toBe("focus");
    expect(card().dataset.status).toBe("idle");
    expect(readout().textContent).toBe("00:20");
    expect(readout().getAttribute("role")).toBe("timer");
    expect([...card().querySelectorAll('[data-slot="cycle-dots"] > span')].map((d) => (d as HTMLElement).dataset.state)).toEqual(["todo", "todo", "todo", "todo"]);
    expect(card().textContent).toContain("Focus · Ready");
    expect(card().textContent).toContain("2 of 8 sessions");
    expect(card().querySelector('[data-slot="progress"]')!.getAttribute("aria-valuenow")).toBe("25");
    expect(card().querySelector<HTMLSelectElement>("select")!.value).toBe("t1");
    expect(visible(button(card(), "Start focus"))).toBe(true);
    expect(visible(button(card(), "Pause"))).toBe(false);
    expect(visible(button(card(), "Stop"))).toBe(false);
    expect(screen().style.display).toBe("none");
  });

  it("runs, pauses with a dashed ring, resumes and stops", async () => {
    await open();
    button(card(), "Start focus").click();
    await tick(250);
    expect(card().dataset.status).toBe("running");
    expect(readout().textContent).not.toBe("00:20");
    expect(visible(button(card(), "Pause"))).toBe(true);
    expect(visible(button(card(), "Stop"))).toBe(true);
    expect([...card().querySelectorAll('[data-slot="cycle-dots"] > span')].map((d) => (d as HTMLElement).dataset.state)[0]).toBe("current");
    button(card(), "Pause").click();
    await tick();
    expect(card().dataset.status).toBe("paused");
    expect(card().querySelector('[data-slot="timer-ring"]')!.hasAttribute("data-paused")).toBe(true);
    expect(card().querySelector('[data-slot="timer-ring-arc"]')!.getAttribute("stroke-dasharray")).toContain(" ");
    expect(card().textContent).toContain("Focus · Paused");
    const frozen = readout().textContent;
    await tick(150);
    expect(readout().textContent).toBe(frozen);
    expect(visible(button(card(), "Resume"))).toBe(true);
    button(card(), "Resume").click();
    await tick();
    expect(card().dataset.status).toBe("running");
    button(card(), "Stop").click();
    await tick();
    expect(card().dataset.status).toBe("idle");
    expect(readout().textContent).toBe("00:20");
  });

  it("opens the break screen when focus ends, and only confirming skips it", async () => {
    await open();
    const events: string[] = [];
    root().addEventListener("pomodoro-event", (e) => events.push(`${(e as CustomEvent).detail.kind}:${(e as CustomEvent).detail.phase}`));
    button(card(), "Start focus").click();
    await untilBreak();
    expect(events).toEqual(["completed:focus"]);
    expect(card().dataset.phase).toBe("shortBreak");
    expect(card().textContent).toContain("3 of 8 sessions");
    expect(visible(screen())).toBe(true);
    expect(screen().dataset.phase).toBe("shortBreak");
    expect(screen().textContent).toContain("Time for a short break");
    expect(screen().textContent).toContain("Focus sessions finished today: 3");
    expect(screen().querySelector('[data-slot="timer-readout"]')!.textContent).toMatch(/^\d\d:\d\d$/);
    expect(screen().querySelector('[data-slot="break-suggestion"]')!.textContent).toContain("Drink a glass of water");
    expect(screen().textContent).toContain("Next up: Write the release notes");

    // Another idea rotates the suggestion.
    screen().querySelector<HTMLElement>("[data-another-idea]")!.click();
    await tick();
    expect(screen().querySelector('[data-slot="break-suggestion"]')!.textContent).toContain("Rest your eyes");

    // Escape asks instead of closing; Escape again backs out.
    screen().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(screen().dataset.confirming).toBe("");
    expect(screen().textContent).toContain("Skip this break?");
    screen().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(screen().hasAttribute("data-confirming")).toBe(false);
    expect(card().dataset.phase).toBe("shortBreak");

    // Skip break asks, Keep resting returns, Skip anyway skips.
    screen().querySelector<HTMLElement>("[data-skip-break]")!.click();
    await tick();
    expect(screen().dataset.confirming).toBe("");
    button(screen(), "Keep resting").click();
    await tick();
    expect(screen().hasAttribute("data-confirming")).toBe(false);
    screen().querySelector<HTMLElement>("[data-skip-break]")!.click();
    await tick();
    screen().querySelector<HTMLElement>("[data-confirm-skip]")!.click();
    await tick(400);
    expect(events).toEqual(["completed:focus", "skipped:shortBreak"]);
    expect(card().dataset.phase).toBe("focus");
    expect(card().dataset.status).toBe("idle");
    expect(screen().style.display).toBe("none");
  });

  it("postpones a break into more focus time", async () => {
    await open();
    const events: string[] = [];
    root().addEventListener("pomodoro-event", (e) => events.push((e as CustomEvent).detail.kind));
    button(card(), "Start focus").click();
    await untilBreak();
    expect(card().dataset.phase).toBe("shortBreak");
    screen().querySelector<HTMLElement>("[data-postpone]")!.click();
    await tick(400);
    expect(events).toEqual(["completed", "postponed"]);
    expect(card().dataset.phase).toBe("focus");
    expect(card().dataset.status).toBe("running");
    expect(card().textContent).toContain("3 of 8 sessions");
    expect(screen().style.display).toBe("none");
  });

  it("reports a task change", async () => {
    await open();
    const picked = vi.fn();
    root().addEventListener("pomodoro-task-change", (e) => picked((e as CustomEvent).detail));
    const select = card().querySelector<HTMLSelectElement>("select")!;
    select.value = "t2";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(picked).toHaveBeenCalledWith({ id: "t2", title: "Review the booking flow" });
  });
});
