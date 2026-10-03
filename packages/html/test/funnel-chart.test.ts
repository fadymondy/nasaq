// The Blade funnel-chart example (packages/php/examples/rendered/funnel-chart.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

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
  document.body.innerHTML = "";
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("funnel-chart");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host;
}

const rowsOf = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-row]")];
const act = (row: HTMLElement, action: string, id: string) => row.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: { id } } }));

describe("funnel-chart (Blade example)", () => {
  it("renders the steps, the biggest drop and the segment table", async () => {
    const host = await mount();
    const chart = host.querySelector<HTMLElement>('[data-slot="funnel-chart"]')!;
    expect(chart.querySelectorAll('[data-slot="funnel-step"]')).toHaveLength(4);
    expect(chart.querySelectorAll('[data-slot="funnel-gap"]')).toHaveLength(3);
    expect(chart.querySelector('[data-slot="funnel-overall"]')!.textContent).toContain("3.5%");
    expect(chart.textContent).toContain("Biggest drop");
    expect(chart.textContent).toContain("Source");
    expect(chart.textContent).toContain("Organic search");
    const bars = [...chart.querySelectorAll<HTMLElement>('[role="img"] > div')];
    expect(bars[0]!.getAttribute("style")).toContain("100%");
  });

  it("lists the funnels newest first with the conversion change", async () => {
    const host = await mount();
    const list = host.querySelector<HTMLElement>('[data-slot="funnel-list"]')!;
    const rows = rowsOf(list);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.textContent).toContain("Signup to paid");
    expect(rows[0]!.textContent).toContain("4 steps");
    expect(rows[0]!.textContent).toContain("3.5% (+0.4)");
    expect(rows[1]!.textContent).toContain("(-3.0)");
    expect(rows[2]!.textContent).toContain("1 step");
  });

  it("sorts the conversion column by its number, not its text", async () => {
    const host = await mount();
    const table = host.querySelector<HTMLElement>('[data-slot="funnel-list"] [data-slot="data-table"]')!;
    const dt = Alpine.$data(table) as {
      columns: { id: string; sortKey?: string }[];
      sortValue(row: Record<string, unknown>, col: { id: string; sortKey?: string }): unknown;
    };
    const col = dt.columns.find((c) => c.id === "conversion")!;
    expect(col.sortKey).toBe("conversionValue");
    // As text "100.0%" < "9.0%"; as numbers 1 > 0.09.
    const a = dt.sortValue({ conversion: "9.0%", conversionValue: 0.09 }, col) as number;
    const b = dt.sortValue({ conversion: "100.0%", conversionValue: 1 }, col) as number;
    expect(typeof a).toBe("number");
    expect(b).toBeGreaterThan(a);
    // The example's rows end up in numeric order when sorted by the column.
    const header = [...table.querySelectorAll<HTMLElement>("th button, [role=columnheader] button")].find((e) => e.textContent?.includes("Conversion"));
    header?.click();
    await tick(60);
    const order = rowsOf(table).map((r) => r.textContent!.match(/([0-9]+[.][0-9])%/)![1]);
    expect(order).toEqual(["3.5", "42.0", "80.0"]);
  });

  it("fires create, open and edit, and removes a deleted row", async () => {
    const host = await mount();
    const list = host.querySelector<HTMLElement>('[data-slot="funnel-list"]')!;
    const seen: string[] = [];
    list.addEventListener("create", () => seen.push("create"));
    list.addEventListener("open", (e) => seen.push(`open:${(e as CustomEvent).detail.id}`));
    list.addEventListener("edit", (e) => seen.push(`edit:${(e as CustomEvent).detail.id}`));
    list.addEventListener("delete", (e) => {
      seen.push(`delete:${(e as CustomEvent).detail.id}`);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    [...list.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("New funnel"))!.click();
    rowsOf(list)[0]!.click();
    act(rowsOf(list)[1]!, "edit", "f2");
    act(rowsOf(list)[1]!, "delete", "f2");
    await tick(80);
    expect(seen).toEqual(["create", "open:f1", "edit:f2", "delete:f2"]);
    expect(rowsOf(list)).toHaveLength(2);
  });

  it("shows an error from a failed duplicate and keeps the rows", async () => {
    const host = await mount();
    const list = host.querySelector<HTMLElement>('[data-slot="funnel-list"]')!;
    list.addEventListener("duplicate", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Nope" })));
    act(rowsOf(list)[0]!, "duplicate", "f1");
    await tick(80);
    expect(list.textContent).toContain("Nope");
    expect(rowsOf(list)).toHaveLength(3);
  });

  it("shows the generic error when the promise is rejected", async () => {
    const host = await mount();
    const list = host.querySelector<HTMLElement>('[data-slot="funnel-list"]')!;
    list.addEventListener("delete", (e) => (e as CustomEvent).detail.wait(Promise.reject(new Error("x"))));
    act(rowsOf(list)[0]!, "delete", "f1");
    await tick(80);
    expect(list.textContent).toContain("Could not do that. Try again.");
    expect(rowsOf(list)).toHaveLength(3);
  });
});
