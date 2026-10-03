// The Blade pricing-table example (packages/php/examples/rendered/pricing-table.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

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
  host.innerHTML = rendered("pricing-table");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const table = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="pricing-table"]')!;
const visible = (el: Element) => (el as HTMLElement).style.display !== "none";
const toggles = (h: HTMLElement) => [...h.querySelectorAll<HTMLElement>('[data-slot="billing-period-switch"] [data-slot="toggle"]')];
const cards = (h: HTMLElement) => [...table(h).querySelectorAll<HTMLElement>('[data-slot="plan-card"]')];
const actionButton = (card: HTMLElement) => [...card.querySelectorAll<HTMLButtonElement>('button[data-slot="button"]')].at(-1)!;

describe("pricing-table (Blade example)", () => {
  it("renders three plan cards and the monthly price first", async () => {
    const h = await mount();
    expect(cards(h)).toHaveLength(3);
    const pro = cards(h)[1]!;
    const prices = [...pro.querySelectorAll('[data-slot="price"]')];
    expect(prices).toHaveLength(2);
    expect(visible(prices[0]!.parentElement!)).toBe(true);
    expect(visible(prices[1]!.parentElement!)).toBe(false);
    expect(pro.textContent).toContain("$15");
    expect(pro.textContent).toContain("Billed monthly");
  });

  it("switches to the yearly price and note without a round trip, and announces the period", async () => {
    const h = await mount();
    const seen: string[] = [];
    table(h).addEventListener("nq-period-change", (e) => seen.push((e as CustomEvent).detail.period));
    expect(toggles(h)).toHaveLength(2);
    toggles(h)[1]!.click();
    await tick();
    const pro = cards(h)[1]!;
    const prices = [...pro.querySelectorAll('[data-slot="price"]')];
    expect(visible(prices[0]!.parentElement!)).toBe(false);
    expect(visible(prices[1]!.parentElement!)).toBe(true);
    expect(pro.textContent).toContain("Billed $144 yearly");
    expect(seen).toEqual(["year"]);
    // Pressing the pressed toggle keeps the period.
    toggles(h)[1]!.click();
    await tick();
    expect(visible(prices[1]!.parentElement!)).toBe(true);
  });

  it("dispatches nq-plan-select and keeps the buttons busy until wait() settles", async () => {
    const h = await mount();
    let detail: { planId: string; period: string } | null = null;
    let release!: () => void;
    table(h).addEventListener("nq-plan-select", (e) => {
      const d = (e as CustomEvent).detail;
      detail = d;
      d.wait(new Promise<void>((r) => (release = r)));
    });
    const [, pro, ent] = cards(h);
    actionButton(pro!).click();
    await tick();
    expect(detail).toMatchObject({ planId: "pro", period: "month" });
    expect(actionButton(pro!).getAttribute("aria-busy")).toBe("true");
    expect(actionButton(pro!).disabled).toBe(true);
    expect(actionButton(ent!).disabled).toBe(true);
    release();
    await tick();
    expect(actionButton(pro!).disabled).toBe(false);
    expect(actionButton(pro!).getAttribute("aria-busy")).not.toBe("true");
  });

  it("selects a plan in the picker", async () => {
    const h = await mount();
    const radios = [...h.querySelectorAll<HTMLElement>('[role="radiogroup"] [role="radio"]')];
    expect(radios).toHaveLength(3);
    expect(radios[1]!.getAttribute("aria-checked")).toBe("true");
    radios[0]!.click();
    await tick();
    expect(radios[0]!.getAttribute("aria-checked")).toBe("true");
    expect(radios[1]!.getAttribute("aria-checked")).toBe("false");
  });

  it("renders the comparison table with checks, dashes and text values", async () => {
    const h = await mount();
    const rows = [...h.querySelectorAll('[data-slot="plan-comparison"] tbody tr')];
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(h.querySelector('[data-slot="plan-comparison"] caption')!.textContent).toBe("Plan comparison");
    expect(h.querySelector('[data-slot="plan-comparison"]')!.textContent).toContain("Unlimited");
  });
});
