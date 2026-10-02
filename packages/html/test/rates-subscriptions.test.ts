// The Blade rates-subscriptions example (packages/php/examples/rendered/rates-subscriptions.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

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
  host.innerHTML = rendered("rates-subscriptions");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (h: HTMLElement, slot: string) => Alpine.$data(h.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!) as any;

describe("rates-subscriptions (Alpine)", () => {
  it("shows the current rate and the history newest first", async () => {
    const h = await mount();
    const d = data(h, "rate-schedule");
    expect(d.current.amount).toBe(9000);
    expect(d.segments.map((s: { rate: { id: string } }) => s.rate.id)).toEqual(["r2", "r1"]);
    const card = h.querySelector('[data-slot="rate-schedule"]')!;
    expect(card.textContent).toContain("$90.00");
    expect(card.querySelectorAll("ol > li")).toHaveLength(2);
    expect(card.querySelector("ol > li[data-current]")!.textContent).toContain("$90.00");
  });

  it("validates a new rate, then adds it locally and fires nq-rate-add", async () => {
    const h = await mount();
    const d = data(h, "rate-schedule");
    const events: unknown[] = [];
    h.querySelector('[data-slot="rate-schedule"]')!.addEventListener("nq-rate-add", (e) => events.push((e as CustomEvent).detail.amount));
    d.openAdd();
    await d.submit();
    expect(d.rates).toHaveLength(2);
    expect(d.amountBad).toBe(true);
    d.amount = 10000;
    d.from = "2026-10-15";
    await d.submit();
    expect(events).toEqual([10000]);
    expect(d.rates).toHaveLength(3);
    expect(d.adding).toBe(false);
    expect(d.upcoming.amount).toBe(10000);
  });

  it("keeps the dialog open with the message when a handler rejects", async () => {
    const h = await mount();
    const d = data(h, "rate-schedule");
    h.querySelector('[data-slot="rate-schedule"]')!.addEventListener("nq-rate-add", (e) => (e as CustomEvent).detail.reject("Nope"));
    d.openAdd();
    d.amount = 10000;
    d.from = "2026-10-15";
    await d.submit();
    expect(d.failed).toBe("Nope");
    expect(d.adding).toBe(true);
    expect(d.rates).toHaveLength(2);
  });

  it("pauses, resumes and cancels a subscription", async () => {
    const h = await mount();
    const d = data(h, "recurring-subscriptions");
    await d.setStatus(d.subs[0], "paused");
    expect(d.subs[0].status).toBe("paused");
    d.openCancel(d.subs[0]);
    await d.confirmCancel();
    expect(d.subs[0].status).toBe("cancelled");
    expect(d.cancelOpen).toBe(false);
    expect(h.querySelectorAll('[data-slot="recurring-subscriptions"] ul > li')).toHaveLength(2);
  });

  it("creates a subscription with a cron schedule and previews its charges", async () => {
    const h = await mount();
    const d = data(h, "recurring-subscriptions");
    d.openEditor();
    d.name = "Backups";
    d.amount = 500;
    d.custom = true;
    d.expr = "0 9 1 * *";
    expect(d.preview).toHaveLength(3);
    d.expr = "nope";
    expect(d.scheduleBad).toBe(true);
    d.expr = "0 9 1 * *";
    await d.submit();
    expect(d.subs).toHaveLength(3);
    expect(d.subs[2].schedule.kind).toBe("cron");
    expect(d.dialogOpen).toBe(false);
  });

  it("totals the monthly recurring of active subscriptions only", async () => {
    const h = await mount();
    const d = data(h, "billing-overview");
    expect(d.summary.mrr).toBe(5000);
    expect(d.summary.active).toBe(1);
    expect(h.querySelector('[data-slot="billing-overview"]')!.textContent).toContain("$50.00");
  });
});
