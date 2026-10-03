// The Blade domains-manager example (packages/php/examples/rendered/domains-manager.html) under real Alpine.
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
  host.innerHTML = rendered("domains-manager");
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

describe("domains-manager (Blade example)", () => {
  it("renders the card, the setup box, the rows and the chips", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="domains-manager"]')!;
    expect(root.querySelector('[data-slot="domains-setup"]')!.textContent).toContain("edge.example.com");
    expect(root.textContent).toContain("1 of 3 verified");
    const rows = rowsOf(root);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.textContent).toContain("shop.example.com");
    expect(rows[0]!.textContent).toContain("Primary");
    const chips = host.querySelectorAll<HTMLElement>('[data-slot="domain-chips"] > [data-slot="domain-chip"]');
    expect([...chips].map((c) => c.dataset.check)).toEqual(["verified", "pending", "failed"]);
  });

  it("rejects an invalid host and a duplicate, then fires add with the normalised host", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="domains-manager"]')!;
    let added: string | undefined;
    root.addEventListener("add", (e) => {
      const d = (e as CustomEvent).detail;
      added = d.host;
      d.wait(Promise.resolve({ id: "d9" }));
    });
    const form = root.querySelector<HTMLElement>('[data-slot="domains-add"]')!;
    const input = form.querySelector<HTMLInputElement>("input")!;
    type(input, "nope");
    submit(form);
    await tick();
    expect(form.textContent).toContain("Enter a full domain name");
    expect(added).toBeUndefined();
    type(input, "shop.example.com");
    submit(form);
    await tick();
    expect(form.textContent).toContain("already added");
    type(input, "HTTPS://New.Example.com/x");
    submit(form);
    await tick(80);
    expect(added).toBe("new.example.com");
    expect(rowsOf(root)).toHaveLength(4);
  });

  it("shows a server error under the field", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="domains-manager"]')!;
    root.addEventListener("add", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Domain belongs to another site" })));
    const form = root.querySelector<HTMLElement>('[data-slot="domains-add"]')!;
    type(form.querySelector<HTMLInputElement>("input")!, "new.example.com");
    submit(form);
    await tick(80);
    expect(form.textContent).toContain("Domain belongs to another site");
    expect(rowsOf(root)).toHaveLength(3);
  });

  it("asks before removing, then fires remove with the id and drops the row", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="domains-manager"]')!;
    let id: unknown;
    root.addEventListener("remove", (e) => {
      id = (e as CustomEvent).detail.id;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    const trigger = rowsOf(root)[1]!.querySelector<HTMLButtonElement>('[data-slot="data-table-row-actions"]')!;
    trigger.click();
    await tick(80);
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')].filter((i) => i.textContent?.includes("Remove"));
    const item = items.find((i) => i.closest<HTMLElement>('[data-slot="dropdown-menu-content"]')?.style.display !== "none") ?? items[1]!;
    item.click();
    await tick(80);
    expect(id).toBeUndefined();
    const confirm = [...document.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-action"]')].find((b) => b.textContent?.includes("Remove"))!;
    confirm.click();
    await tick(80);
    expect(id).toBe("d2");
    expect(rowsOf(root)).toHaveLength(2);
  });
});
