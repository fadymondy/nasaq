// The Blade example (php/examples/gamification.blade.php) mounted under real Alpine: filter, month paging, periods, claiming and the toast.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("gamification");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const visible = (el: Element) => (el as HTMLElement).style.display !== "none";

describe("gamification (alpine)", () => {
  it("filters the badge grid and selects a badge", async () => {
    const host = await mount();
    const grid = host.querySelector<HTMLElement>('[data-slot="badge-grid"]')!;
    const items = () => [...grid.querySelectorAll<HTMLElement>("ul > li")];
    expect(items().filter(visible)).toHaveLength(4);
    const earned = [...grid.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent?.startsWith("Earned"))!;
    earned.click();
    await tick();
    expect(items().filter(visible)).toHaveLength(1);
    const events: unknown[] = [];
    grid.addEventListener("nq-select", (e) => events.push((e as CustomEvent).detail));
    grid.querySelector<HTMLElement>('button[data-id="first"]')!.click();
    await tick();
    expect(events).toEqual([{ id: "first" }]);
    expect(grid.querySelector('button[data-id="first"]')!.getAttribute("aria-pressed")).toBe("true");
  });

  it("pages the streak calendar", async () => {
    const host = await mount();
    const cal = host.querySelector<HTMLElement>('[data-slot="streak-calendar"]')!;
    const events: unknown[] = [];
    cal.addEventListener("nq-month-change", (e) => events.push((e as CustomEvent).detail));
    expect(cal.querySelectorAll("[data-active]")).toHaveLength(6);
    cal.querySelector<HTMLElement>('button[aria-label="Previous month"]')!.click();
    await tick();
    expect(cal.querySelector("[x-ref=title]")?.textContent).toBe("August 2026");
    expect(cal.querySelectorAll("[data-active]")).toHaveLength(0);
    cal.querySelector<HTMLElement>('button[aria-label="Next month"]')!.click();
    cal.querySelector<HTMLElement>('button[aria-label="Next month"]')!.click();
    await tick();
    expect(cal.querySelector("[x-ref=title]")?.textContent).toBe("October 2026");
    expect(events).toEqual([{ month: "2026-08" }, { month: "2026-09" }, { month: "2026-10" }]);
  });

  it("reports the leaderboard period", async () => {
    const host = await mount();
    const board = host.querySelector<HTMLElement>('[data-slot="leaderboard"]')!;
    const events: unknown[] = [];
    board.addEventListener("nq-period-change", (e) => events.push((e as CustomEvent).detail));
    [...board.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent === "All time")!.click();
    await tick();
    expect(events).toEqual([{ id: "all" }]);
  });

  it("claims a reward, shows an error from the handler", async () => {
    const host = await mount();
    const card = host.querySelector<HTMLElement>('[data-slot="reward-card"]')!;
    const button = card.querySelector<HTMLButtonElement>("button")!;
    expect(button.disabled).toBe(false);
    card.addEventListener("nq-claim", (e) => {
      (e as CustomEvent).detail.wait = new Promise((r) => setTimeout(() => r({ error: "Out of stock" }), 20));
    });
    button.click();
    await new Promise((r) => setTimeout(r, 5));
    expect(button.disabled).toBe(true);
    await tick();
    expect(button.disabled).toBe(false);
    expect(card.querySelector('[role="alert"]')?.textContent).toBe("Out of stock");
    // The second reward is short of points: its button is disabled for good.
    const second = host.querySelectorAll<HTMLElement>('[data-slot="reward-card"]')[1]!;
    expect(second.querySelector<HTMLButtonElement>("button")!.disabled).toBe(true);
  });

  it("closes the unlock toast and reopens it", async () => {
    const host = await mount();
    const toast = host.querySelector<HTMLElement>('[data-slot="achievement-unlock-toast"]')!;
    const card = toast.querySelector<HTMLElement>("[data-rarity]")!;
    const events: string[] = [];
    toast.addEventListener("nq-close", () => events.push("close"));
    toast.addEventListener("nq-view", (e) => events.push(`view:${(e as CustomEvent).detail.id}`));
    expect(visible(card)).toBe(true);
    toast.querySelector<HTMLElement>("button[data-id]")!.click();
    toast.querySelector<HTMLElement>('button[aria-label="Dismiss"]')!.click();
    await tick();
    expect(visible(card)).toBe(false);
    expect(events).toEqual(["view:first", "close"]);
    toast.dispatchEvent(new CustomEvent("nq-open"));
    await tick();
    expect(visible(card)).toBe(true);
  });
});
