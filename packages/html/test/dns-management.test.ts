// The Blade dns-management example (packages/php/examples/rendered/dns-management.html) under real Alpine.
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
  host.innerHTML = rendered("dns-management");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host;
}

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const submit = (form: HTMLElement) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
const rowsOf = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-row]")];

describe("dns-management (Blade example)", () => {
  it("renders the card and one table row per record", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="dns-management"]')!;
    expect(root.querySelector("h2")!.textContent).toBe("DNS records");
    const rows = rowsOf(root);
    expect(rows).toHaveLength(4);
    expect(rows[0]!.textContent).toContain("203.0.113.10");
    expect(rows[2]!.textContent).toContain("10 mail.example.com");
  });

  it("validates the form, then fires save and adds the record", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="dns-management"]')!;
    let input: Record<string, unknown> | undefined;
    root.addEventListener("save", (e) => {
      const d = (e as CustomEvent).detail;
      input = d.input;
      d.wait(Promise.resolve({ id: "r9" }));
    });
    root.querySelector<HTMLButtonElement>(":scope > [data-slot='card-header'] button")!.click();
    await tick(80);
    const form = slot("dns-record-form")!;
    expect(form).toBeTruthy();
    const [name, content] = [...form.querySelectorAll<HTMLInputElement>('[data-slot="input"]')];
    type(name!, "api");
    type(content!, "not-an-ip");
    await tick();
    submit(form);
    await tick();
    expect(input).toBeUndefined();
    expect(form.textContent).toContain("Enter a valid IPv4 address");

    type(content!, "198.51.100.7");
    await tick();
    submit(form);
    await tick(80);
    expect(input).toMatchObject({ type: "A", name: "api", content: "198.51.100.7", ttl: 1, proxied: false });
    expect(rowsOf(root)).toHaveLength(5);
  });

  it("shows a server error and keeps the form open", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="dns-management"]')!;
    root.addEventListener("save", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Zone is locked" })));
    root.querySelector<HTMLButtonElement>(":scope > [data-slot='card-header'] button")!.click();
    await tick(80);
    const form = slot("dns-record-form")!;
    const [name, content] = [...form.querySelectorAll<HTMLInputElement>('[data-slot="input"]')];
    type(name!, "api");
    type(content!, "198.51.100.7");
    await tick();
    submit(form);
    await tick(80);
    expect(form.textContent).toContain("Zone is locked");
    expect(rowsOf(root)).toHaveLength(4);
  });

  it("fires toggle-proxy from the table switch", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="dns-management"]')!;
    let detail: { id: string; proxied: boolean } | undefined;
    root.addEventListener("toggle-proxy", (e) => {
      const d = (e as CustomEvent).detail;
      detail = { id: d.id, proxied: d.proxied };
      d.wait(Promise.resolve());
    });
    rowsOf(root)[0]!.querySelector<HTMLButtonElement>('[role="switch"]')!.click();
    await tick(80);
    expect(detail).toEqual({ id: "r1", proxied: false });
  });
});
