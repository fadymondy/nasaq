// The Blade example (php/examples/waiting-screen.blade.php) under real Alpine: the live age ticks from the server's clock, a status flip to
// "called" vibrates once, and Leave the line dispatches nq-leave after the confirm.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  vi.useRealTimers();
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("waiting-screen");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("waiting-screen (Blade example)", () => {
  it("renders the ticket, place in line and estimate", async () => {
    const host = await mount();
    expect(host.querySelector('[data-slot="waiting-ticket"]')!.textContent).toBe("A-017");
    expect(host.textContent).toContain("2 people ahead of you");
    expect(host.textContent).toContain("About 10 min");
    expect(host.querySelector('[data-slot="queue-live"]')!.getAttribute("aria-label")).toBe("Connection: Live");
    expect(host.querySelector('[data-slot="queue-updated"]')!.textContent).toBe("Updated 12 s ago");
  });

  it("keeps the age moving from the server's clock, not the phone's", async () => {
    vi.useFakeTimers();
    const host = document.createElement("div");
    host.innerHTML = rendered("waiting-screen");
    document.body.append(host);
    Alpine.initTree(host);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(host.querySelector('[data-slot="queue-updated"]')!.textContent).toBe("Updated 22 s ago");
  });

  it("vibrates once when data-status turns to called", async () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="waiting-screen"]')!;
    root.setAttribute("data-status", "called");
    await tick();
    root.setAttribute("data-status", "serving");
    await tick();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith([200, 100, 200]);
    delete (navigator as unknown as { vibrate?: unknown }).vibrate;
  });

  it("opens a confirm dialog from Leave the line and dispatches nq-leave on confirm", async () => {
    const host = await mount();
    const left = vi.fn();
    document.addEventListener("nq-leave", left);
    const trigger = [...host.querySelectorAll("button")].find((b) => b.textContent!.includes("Leave the line"))!;
    trigger.click();
    await tick(80);
    expect(document.body.textContent).toContain("Leave the line?");
    expect(left).not.toHaveBeenCalled();
    const confirm = [...document.querySelectorAll("button")].find((b) => b.textContent!.trim() === "Yes, leave")!;
    confirm.click();
    await tick();
    expect(left).toHaveBeenCalledTimes(1);
    document.removeEventListener("nq-leave", left);
  });
});
