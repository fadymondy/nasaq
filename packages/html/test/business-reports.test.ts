// The Blade example (php/examples/business-reports.blade.php) mounted under real Alpine: the pipeline view switch, the tables and the card menu.
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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("business reports", () => {
  it("switches the pipeline between the funnel and the table and says so", async () => {
    const host = await mountHtml(rendered("business-reports"));
    const report = host.querySelector<HTMLElement>('[data-slot="pipeline-report"]')!;
    const chart = report.querySelector('[data-view="chart"]');
    const table = report.querySelector('[data-view="table"]');
    expect(shown(table)).toBe(true);
    expect(shown(chart)).toBe(false);
    const seen: string[] = [];
    report.addEventListener("nq-view", (e) => seen.push((e as CustomEvent).detail.view));
    const toggle = (name: string) => [...report.querySelectorAll<HTMLElement>('[data-slot="toggle"]')].find((b) => b.textContent?.trim() === name)!;
    toggle("Chart").click();
    await tick();
    expect(shown(chart)).toBe(true);
    expect(shown(table)).toBe(false);
    expect(seen).toEqual(["chart"]);
    // Pressing the pressed toggle again keeps the view.
    toggle("Chart").click();
    await tick();
    expect(shown(chart)).toBe(true);
    expect(toggle("Chart").getAttribute("aria-pressed")).toBe("true");
  });

  it("lists the projects with a margin word and the stages in the table", async () => {
    const host = await mountHtml(rendered("business-reports"));
    const profit = host.querySelector<HTMLElement>('[data-slot="profitability-report"]')!;
    const rows = [...profit.querySelectorAll<HTMLElement>('[data-slot="table-row"][data-row]')];
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain("Website rebuild");
    expect(rows[0]!.textContent).toContain("$120,000");
    const badges = (row: HTMLElement) => [...row.querySelectorAll<HTMLElement>('[data-slot="badge"]')].filter((b) => b.style.display !== "none").map((b) => b.textContent?.trim());
    expect(badges(rows[0]!)).toEqual(["Healthy"]);
    expect(badges(rows[1]!)).toEqual(["Loss"]);
    const stages = host.querySelectorAll('[data-slot="pipeline-report"] [data-slot="table-row"][data-row]');
    expect(stages).toHaveLength(3);
  });

  it("opens the employee menu from the more button and dispatches the action", async () => {
    const host = await mountHtml(rendered("business-reports"));
    const card = host.querySelector<HTMLElement>('[data-slot="kpi-employee"]')!;
    expect(card.textContent).toContain("Ahead");
    const seen: unknown[] = [];
    host.addEventListener("nq-employee-action", (e) => seen.push((e as CustomEvent).detail));
    card.querySelector<HTMLElement>('button[aria-label="Actions for Sara"]')!.click();
    await tick(120);
    const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((i) => i.textContent?.includes("Open profile"));
    expect(item).toBeTruthy();
    item!.click();
    await tick();
    expect(seen).toEqual([{ action: "open", id: "e1" }]);
  });
});
