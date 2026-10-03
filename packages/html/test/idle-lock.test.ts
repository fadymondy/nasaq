// The Blade idle-lock example under real Alpine, with a fake clock.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});
beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] }));
afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
  vi.useRealTimers();
});

const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);
async function mountIdle() {
  const host = document.createElement("div");
  host.innerHTML = readFileSync(resolve(process.cwd(), "../php/examples/rendered/idle-lock.html"), "utf8");
  document.body.append(host);
  Alpine.initTree(host);
  await advance(30);
  return host;
}
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="idle-lock"]')!;
const warning = () => document.querySelector<HTMLElement>('[data-slot="idle-warning"]');
const warnButton = (text: string) => [...document.querySelectorAll<HTMLButtonElement>('[data-slot="idle-warning"] button')].find((b) => b.textContent!.includes(text))!;

describe("idle-lock (Blade example)", () => {
  it("renders the app, no warning and no lock screen", async () => {
    const host = await mountIdle();
    expect(root(host).hasAttribute("data-locked")).toBe(false);
    expect(host.querySelector('[data-slot="idle-lock-app"]')!.textContent).toContain("The app");
    expect(host.querySelector('[data-slot="idle-lock-app"]')!.hasAttribute("inert")).toBe(false);
    expect(host.querySelector('[data-slot="idle-lock-screen"]')).toBeNull();
  });

  it("warns with a countdown, then locks and emits why", async () => {
    const host = await mountIdle();
    let seen: unknown;
    root(host).addEventListener("nq-idle-lock-change", (e) => (seen = (e as CustomEvent).detail));
    await advance(570_000);
    expect(warning()!.getAttribute("role")).toBe("alertdialog");
    expect(warning()!.textContent).toContain("Still there?");
    expect(warning()!.querySelector('[role="timer"]')!.textContent).toBe("0:30");
    await advance(10_000);
    expect(warning()!.querySelector('[role="timer"]')!.textContent).toBe("0:20");
    expect(warning()!.querySelector('[role="progressbar"]')!.getAttribute("aria-valuenow")).toMatch(/^66./);
    await advance(20_000);
    expect(seen).toEqual({ locked: true, reason: "idle" });
    expect(root(host).getAttribute("data-locked")).toBe("");
    const app = host.querySelector('[data-slot="idle-lock-app"]')!;
    expect(app.hasAttribute("inert")).toBe(true);
    expect(app.getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelector('[data-slot="idle-lock-screen"] [data-slot="lock-screen"]')).not.toBeNull();
  });

  it("Stay signed in restarts the timer", async () => {
    const host = await mountIdle();
    await advance(580_000);
    warnButton("Stay signed in").click();
    await advance(300);
    await advance(300_000);
    expect(root(host).hasAttribute("data-locked")).toBe(false);
  });

  it("the Lock button locks as manual and the right password unlocks", async () => {
    const host = await mountIdle();
    let seen: unknown;
    root(host).addEventListener("nq-idle-lock-change", (e) => (seen = (e as CustomEvent).detail));
    [...host.querySelectorAll<HTMLButtonElement>('[data-slot="idle-lock-app"] button')].find((b) => b.textContent!.includes("Lock"))!.click();
    await advance(50);
    expect(seen).toEqual({ locked: true, reason: "manual" });
    const input = host.querySelector<HTMLInputElement>('[data-slot="idle-lock-screen"] input[type="password"]')!;
    input.value = "123456";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    host.querySelector('[data-slot="lock-screen-password"]')!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await advance(500);
    expect(seen).toEqual({ locked: false, reason: "manual" });
    expect(root(host).hasAttribute("data-locked")).toBe(false);
    expect(host.querySelector('[data-slot="idle-lock-screen"]')).toBeNull();
  });
});
