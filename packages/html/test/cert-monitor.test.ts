// The Blade cert-monitor example (packages/php/examples/rendered/cert-monitor.html) under real Alpine.
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
  host.innerHTML = rendered("cert-monitor");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host;
}

const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = (form: HTMLElement) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
const rowsOf = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-row]")];

describe("cert-monitor (Blade example)", () => {
  it("renders the card, the summary and the rows soonest first", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="certificate-monitor"]')!;
    expect(root.textContent).toContain("4 monitored, 3 need attention");
    const rows = rowsOf(root);
    expect(rows).toHaveLength(4);
    expect(rows[0]!.textContent).toContain("legacy.example.com");
    expect(rows[0]!.textContent).toContain("Expired 2 d ago");
    expect(rows[1]!.textContent).toContain("api.example.com");
    expect(rows[1]!.textContent).toContain("5 d");
    expect(rows[3]!.textContent).toContain("app.example.com");
  });

  it("renders the standalone days-left badges with their status", async () => {
    const host = await mount();
    const badges = [...host.querySelectorAll<HTMLElement>('[data-slot="days-left-badge"]')];
    expect(badges.map((b) => b.dataset.status)).toEqual(["valid", "expiring", "critical", "expired", "error"]);
    expect(badges[2]!.getAttribute("aria-label")).toBe("shop.example.com: 3 days left");
  });

  it("rejects an invalid host, then fires add with the lower-cased host and adds the row", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="certificate-monitor"]')!;
    let added: string | undefined;
    root.addEventListener("add", (e) => {
      const d = (e as CustomEvent).detail;
      added = d.host;
      d.wait(Promise.resolve({ id: "c9", validTo: "2026-12-28T09:00:00Z", autoRenew: true }));
    });
    const form = root.querySelector<HTMLElement>('[data-slot="certificate-add"]')!;
    const input = form.querySelector<HTMLInputElement>("input")!;
    type(input, "nope");
    submit(form);
    await tick();
    expect(form.textContent).toContain("Enter a hostname");
    expect(added).toBeUndefined();
    type(input, "New.Example.com");
    submit(form);
    await tick(80);
    expect(added).toBe("new.example.com");
    expect(rowsOf(root)).toHaveLength(5);
  });

  it("shows a server error above the table", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="certificate-monitor"]')!;
    root.addEventListener("add", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Already monitored" })));
    const form = root.querySelector<HTMLElement>('[data-slot="certificate-add"]')!;
    type(form.querySelector<HTMLInputElement>("input")!, "x.example.com");
    submit(form);
    await tick(80);
    expect(root.textContent).toContain("Already monitored");
    expect(rowsOf(root)).toHaveLength(4);
  });

  it("asks before stopping, then fires remove with the id and drops the row", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="certificate-monitor"]')!;
    let id: unknown;
    root.addEventListener("remove", (e) => {
      id = (e as CustomEvent).detail.id;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    const trigger = rowsOf(root)[1]!.querySelector<HTMLButtonElement>('[data-slot="data-table-row-actions"]')!;
    trigger.click();
    await tick(80);
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')].filter((i) => i.textContent?.includes("Stop monitoring"));
    const item = items.find((i) => i.closest<HTMLElement>('[data-slot="dropdown-menu-content"]')?.style.display !== "none") ?? items[1]!;
    item.click();
    await tick(80);
    expect(id).toBeUndefined();
    const confirm = [...document.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-action"]')].find((b) => b.textContent?.includes("Stop monitoring"))!;
    confirm.click();
    await tick(80);
    expect(id).toBe("c2");
    expect(rowsOf(root)).toHaveLength(3);
  });
});
