// The Blade finops-cost example (packages/php/examples/rendered/finops-cost.html) under real Alpine.
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
  host.innerHTML = rendered("finops-cost");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host;
}

const rowsOf = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-row]")];
const act = (row: HTMLElement, action: string, id: string) => row.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action, row: { id } } }));
const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = (form: HTMLElement) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="finops-cost"]')!;
const servers = (host: HTMLElement) => rowsOf(host.querySelector<HTMLElement>('[data-slot="finops-servers"]')!);
const items = (host: HTMLElement) => rowsOf(host.querySelector<HTMLElement>('[data-slot="finops-items"]')!);
const openAdd = async (r: HTMLElement) => {
  [...r.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Add item"))!.click();
  await tick(80);
  return document.querySelector<HTMLElement>('[data-slot="finops-add-item"] form')!;
};

describe("finops-cost (Blade example)", () => {
  it("renders the tiles, the budget, the servers and the items", async () => {
    const host = await mount();
    const r = root(host);
    expect(r.textContent).toContain("Monthly total");
    expect(r.textContent).toContain("$59.90");
    expect(r.querySelector('[data-slot="finops-budget"]')!.textContent).toContain("$59.90 of $80.00");
    expect(servers(host)).toHaveLength(3);
    expect(items(host)).toHaveLength(2);
    const web = servers(host).find((x) => x.textContent?.includes("web-1"))!;
    expect(web.textContent).toContain("Could be smaller");
    expect(web.textContent).toContain("Move to CPX21 and save $6.90 a month.");
    expect(servers(host).find((x) => x.textContent?.includes("db-1"))!.textContent).toContain("Needs more room");
    expect(r.textContent).toContain("Cost by category");
  });

  it("adds an item: validates, fires add-item and adds the row", async () => {
    const host = await mount();
    const r = root(host);
    let got: Record<string, unknown> | undefined;
    r.addEventListener("add-item", (e) => {
      got = (e as CustomEvent).detail;
      (e as CustomEvent).detail.wait(Promise.resolve({ id: "i9" }));
    });
    const form = await openAdd(r);
    submit(form);
    await tick();
    expect(got).toBeUndefined();
    expect(form.textContent).toContain("Enter a name.");
    const inputs = [...form.querySelectorAll<HTMLInputElement>("input")];
    type(inputs[0]!, "CDN");
    type(inputs[2]!, "12.50");
    submit(form);
    await tick(80);
    expect(got).toMatchObject({ name: "CDN", amount: 12.5, period: "monthly", category: "" });
    expect(items(host)).toHaveLength(3);
  });

  it("shows a host error inside the dialog and keeps the rows", async () => {
    const host = await mount();
    const r = root(host);
    r.addEventListener("add-item", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Duplicate item" })));
    const form = await openAdd(r);
    const inputs = [...form.querySelectorAll<HTMLInputElement>("input")];
    type(inputs[0]!, "CDN");
    type(inputs[2]!, "5");
    submit(form);
    await tick(80);
    expect(form.textContent).toContain("Duplicate item");
    expect(items(host)).toHaveLength(2);
  });

  it("asks before removing, then fires remove-item and drops the row", async () => {
    const host = await mount();
    const r = root(host);
    let id: unknown;
    r.addEventListener("remove-item", (e) => {
      id = (e as CustomEvent).detail.id;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    const first = items(host)[0]!;
    act(first, "remove", "i1");
    await tick(80);
    expect(id).toBeUndefined();
    const confirm = [...document.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-action"]')].find((b) => b.textContent?.includes("Remove"))!;
    confirm.click();
    await tick(80);
    expect(id).toBe("i1");
    expect(items(host)).toHaveLength(1);
  });

  it("changes a plan from the row action and clears the hint", async () => {
    const host = await mount();
    const r = root(host);
    let detail: { id: string; plan: { name: string; monthlyPrice: number } } | undefined;
    r.addEventListener("change-plan", (e) => {
      detail = (e as CustomEvent).detail;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    act(servers(host).find((x) => x.textContent?.includes("web-1"))!, "change-plan", "s1");
    await tick(80);
    expect(detail?.id).toBe("s1");
    expect(detail?.plan).toEqual({ name: "CPX21", monthlyPrice: 8.5 });
    const web = servers(host).find((x) => x.textContent?.includes("web-1"))!;
    expect(web.textContent).toContain("CPX21");
    expect(web.textContent).toContain("Right size");
  });

  it("shows a failure above the tables when a plan change is rejected", async () => {
    const host = await mount();
    const r = root(host);
    r.addEventListener("change-plan", (e) => (e as CustomEvent).detail.wait(Promise.reject(new Error("x"))));
    act(servers(host).find((x) => x.textContent?.includes("web-1"))!, "change-plan", "s1");
    await tick(80);
    expect(r.textContent).toContain("That did not work. Try again.");
  });

  const tile = (host: HTMLElement, id: string) => host.querySelector<HTMLElement>(`[data-metric="${id}"] [data-slot="stat-card-value"]`)!.textContent!.trim();

  it("recomputes the tiles, the budget and the categories after an add and a remove", async () => {
    const host = await mount();
    const r = root(host);
    expect(tile(host, "total")).toBe("$59.90");
    expect(tile(host, "savings")).toBe("$6.90");
    r.addEventListener("add-item", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ id: "i9" })));
    r.addEventListener("remove-item", (e) => (e as CustomEvent).detail.wait(Promise.resolve()));
    const form = await openAdd(r);
    const inputs = [...form.querySelectorAll<HTMLInputElement>("input")];
    type(inputs[0]!, "CDN");
    type(inputs[1]!, "Network");
    type(inputs[2]!, "20");
    submit(form);
    await tick(80);
    expect(tile(host, "items")).toBe("$28.00");
    expect(tile(host, "total")).toBe("$79.90");
    const budget = r.querySelector('[data-slot="finops-budget"]')!;
    expect(budget.textContent).toContain("$79.90 of $80.00");
    expect(budget.textContent).toContain("Close to the budget.");
    expect(budget.querySelector('[data-slot="meter"]')!.getAttribute("data-tone")).toBe("warning");
    expect(host.textContent).toContain("Network");
    expect(host.querySelectorAll("[data-nq-ssr]")).toHaveLength(0);
    act(items(host).find((x) => x.textContent?.includes("CDN"))!, "remove", "i9");
    await tick(80);
    [...document.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-action"]')].find((b) => b.textContent?.includes("Remove"))!.click();
    await tick(80);
    expect(tile(host, "total")).toBe("$59.90");
    expect(host.textContent).not.toContain("Network");
    expect(budget.querySelector('[data-slot="meter"]')!.getAttribute("data-tone")).toBe("default");
  });

  it("updates the total, the savings and the vs-last-month change after a plan change", async () => {
    const host = await mount();
    const r = root(host);
    const delta = () => r.querySelector('[data-metric="total"] [data-slot="stat-card-delta"]')!.textContent!;
    expect(delta()).toContain("-14.4%");
    r.addEventListener("change-plan", (e) => (e as CustomEvent).detail.wait(Promise.resolve()));
    act(servers(host).find((x) => x.textContent?.includes("web-1"))!, "change-plan-0", "s1");
    await tick(80);
    expect(tile(host, "servers")).toBe("$45.00");
    expect(tile(host, "total")).toBe("$53.00");
    expect(tile(host, "savings")).toBe("$0.00");
    expect(delta()).toContain("-24.3%");
  });

  it("names the plan in the row menu", async () => {
    const html = rendered("finops-cost");
    expect(html).toContain("Switch to CPX21");
    expect(html).toContain("Switch to CPX51");
    expect(html).not.toContain("Change plan");
  });
});
