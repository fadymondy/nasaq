import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
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
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("clinic-queue (Blade example)", () => {
  it("renders the cards and rows in call order", async () => {
    const host = await mount(rendered("clinic-queue"));
    const cards = [...host.querySelectorAll<HTMLElement>('[data-slot="clinic-queue-active"]')];
    expect(cards.map((c) => c.dataset.status)).toEqual(["serving", "called"]);
    const rows = [...host.querySelectorAll<HTMLElement>("[data-row]")];
    expect(rows.map((r) => r.dataset.ticket)).toEqual(["A-014", "A-015", "A-016", "A-017", "A-018"]);
  });

  it("Call next dispatches the action and blocks until the listener's promise settles", async () => {
    const host = await mount(rendered("clinic-queue"));
    const root = host.querySelector<HTMLElement>('[data-slot="clinic-queue"]')!;
    const seen: Array<[string, string | undefined]> = [];
    let finish!: () => void;
    root.addEventListener("nq-clinic-queue-action", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push([d.action, d.id]);
      d.promise = new Promise<void>((r) => (finish = r));
    });
    const next = [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.includes("Call next"))!;
    next.click();
    await tick();
    expect(seen).toEqual([["call-next", undefined]]);
    expect(next.disabled).toBe(true);
    finish();
    await tick();
    expect(next.disabled).toBe(false);
  });

  it("a card button sends that ticket and an error result shows the alert", async () => {
    const host = await mount(rendered("clinic-queue"));
    const root = host.querySelector<HTMLElement>('[data-slot="clinic-queue"]')!;
    const seen: Array<[string, string | undefined]> = [];
    root.addEventListener("nq-clinic-queue-action", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push([d.action, d.id]);
      d.promise = Promise.resolve({ error: "Room is busy" });
    });
    const start = [...host.querySelectorAll<HTMLButtonElement>('[data-slot="clinic-queue-active"] button')].find((b) => b.textContent!.trim() === "Start visit")!;
    start.click();
    await tick();
    expect(seen).toEqual([["start", "q2"]]);
    expect(host.textContent).toContain("Room is busy");
  });

  it("arrow keys move between rows", async () => {
    const host = await mount(rendered("clinic-queue"));
    const rows = [...host.querySelectorAll<HTMLElement>("[data-row]")];
    rows[0]!.focus();
    rows[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(document.activeElement).toBe(rows[1]);
    expect(rows[1]!.getAttribute("tabindex")).toBe("0");
  });
});
