// The Blade data-table example (packages/php/examples/rendered/data-table.html) under real Alpine.
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
  host.innerHTML = rendered("data-table");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const rowEls = (h: HTMLElement) => [...h.querySelectorAll<HTMLElement>("[data-row]")];
const keys = (h: HTMLElement) => rowEls(h).map((r) => r.querySelector("[data-cell-col=key]")!.textContent!.trim());
const sortBtn = (h: HTMLElement, name: string) => [...h.querySelectorAll<HTMLButtonElement>("[role=columnheader] button")].find((b) => b.textContent!.includes(name))!;

describe("data-table (Alpine)", () => {
  it("renders every row with the table slots", async () => {
    const h = await mount();
    expect(h.querySelector('[data-slot="data-table"]')).toBeTruthy();
    expect(keys(h)).toEqual(["MH-728", "MH-731", "MH-702"]);
  });

  it("sorts by a column and sets aria-sort", async () => {
    const h = await mount();
    sortBtn(h, "Key").click();
    await tick();
    expect(keys(h)).toEqual(["MH-702", "MH-728", "MH-731"]);
    expect(sortBtn(h, "Key").closest("[role=columnheader]")!.getAttribute("aria-sort")).toBe("ascending");
    sortBtn(h, "Key").click();
    await tick();
    expect(keys(h)).toEqual(["MH-731", "MH-728", "MH-702"]);
  });

  it("filters by search and shows the filtered empty state", async () => {
    const h = await mount();
    const q = h.querySelector<HTMLInputElement>('[data-slot="data-table-search"] input')!;
    q.value = "coupon";
    q.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(keys(h)).toEqual(["MH-728"]);
    q.value = "zzz";
    q.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(keys(h)).toEqual([]);
    expect(h.textContent).toContain("No matching results");
  });

  it("selects rows, shows the bulk bar and emits the selection", async () => {
    const h = await mount();
    const ids: string[][] = [];
    h.addEventListener("nq-data-table-selection", ((e: CustomEvent) => ids.push(e.detail.ids)) as unknown as EventListener);
    const bar = h.querySelector<HTMLElement>('[data-slot="data-table-bulk-actions"]')!;
    expect(bar.hidden).toBe(true);
    rowEls(h)[0]!.querySelector<HTMLButtonElement>('button[role="checkbox"]')!.click();
    await tick();
    expect(bar.hidden).toBe(false);
    expect(bar.textContent).toContain("1 selected");
    expect(rowEls(h)[0]!.getAttribute("data-state")).toBe("selected");
    expect(ids.at(-1)).toEqual(["MH-728"]);
    h.querySelector<HTMLButtonElement>("[data-slot=table-header] button[role=checkbox]")!.click();
    await tick();
    expect(bar.textContent).toContain("3 selected");
  });

  it("hides a column from the view menu state", async () => {
    const h = await mount();
    const root = h.querySelector<HTMLElement>('[data-slot="data-table"]')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(root) as any;
    data.shown.due = false;
    await tick();
    const th = h.querySelector<HTMLElement>('[role=columnheader][data-col="due"]')!;
    expect(th.style.display).toBe("none");
  });

  it("emits the row action event", async () => {
    const h = await mount();
    const seen: { action: string; row: { key: string } }[] = [];
    h.addEventListener("nq-data-table-action", ((e: CustomEvent) => seen.push(e.detail)) as unknown as EventListener);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(h.querySelector<HTMLElement>('[data-slot="data-table"]')!) as any;
    data.act("edit", data.pageRows[1]);
    expect(seen[0]!.action).toBe("edit");
    expect(seen[0]!.row.key).toBe("MH-731");
  });

  it("filters by the status facet", async () => {
    const h = await mount();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(h.querySelector<HTMLElement>('[data-slot="data-table"]')!) as any;
    data.facet["status|Done"] = true;
    await tick();
    expect(keys(h)).toEqual(["MH-702"]);
  });
});
