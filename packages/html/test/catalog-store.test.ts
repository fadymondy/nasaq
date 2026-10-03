// The Blade catalog-store example (packages/php/examples/rendered/catalog-store.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const attr = (el: Element, name: string) => [...el.attributes].find((a) => a.name === name)?.value ?? null; // happy-dom getAttribute is stale for server-rendered attributes Alpine rewrites
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
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("catalog-store");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const shown = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLElement>('ul > li[data-id]')].filter((li) => li.style.display !== "none").map((li) => li.dataset.id);
const type = async (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};

describe("catalog-store (Blade example)", () => {
  it("renders every card, most popular first, and reports the result count", async () => {
    const host = await mount();
    expect(host.querySelector('[data-slot="catalog-store"]')).not.toBeNull();
    expect([...host.querySelectorAll('ul > li[data-id]')].map((li) => (li as HTMLElement).dataset.id)).toEqual(["b", "a", "c"]);
    expect(host.querySelector('[role="status"]')!.textContent).toBe("3 results");
  });

  it("filters by search and by category, and the chip counts follow the search", async () => {
    const host = await mount();
    const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
    await type(input, "csv");
    expect(shown(host)).toEqual(["c"]);
    expect(host.querySelector('[role="status"]')!.textContent).toBe("1 results");
    const chips = [...host.querySelectorAll<HTMLElement>('[data-slot="chip"]')];
    expect(chips[0]!.querySelector("bdi")!.textContent).toBe("1");
    await type(input, "");
    chips[2]!.click(); // Data
    await tick();
    expect(shown(host)).toEqual(["b", "c"]);
    expect(attr(chips[2]!, "aria-pressed")).toBe("true");
    chips[3]!.click(); // Installed
    await tick();
    expect(shown(host)).toEqual(["c"]);
  });

  it("sorts A to Z by reordering the cards", async () => {
    const host = await mount();
    const toggles = [...host.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];
    toggles[2]!.click();
    await tick();
    expect([...host.querySelectorAll('ul > li[data-id]')].map((li) => (li as HTMLElement).dataset.id)).toEqual(["b", "c", "a"]);
  });

  it("shows the empty state, and clearing the filters brings the cards back", async () => {
    const host = await mount();
    const empty = host.querySelector<HTMLElement>('[data-slot="empty-state"]')!;
    expect(empty.style.display).toBe("none");
    await type(host.querySelector<HTMLInputElement>('input[type="search"]')!, "zzzz");
    expect(shown(host)).toEqual([]);
    expect(empty.style.display).not.toBe("none");
    [...empty.querySelectorAll("button")].find((b) => b.textContent!.includes("Clear"))!.click();
    await tick();
    expect(shown(host)).toHaveLength(3);
  });

  it("installs from a card: fires nq-install, stays busy until wait() settles, then shows Open", async () => {
    const host = await mount();
    let resolveIt: () => void = () => {};
    let id = "";
    host.addEventListener("nq-install", ((e: CustomEvent) => {
      id = e.detail.id;
      e.detail.wait(new Promise<void>((r) => (resolveIt = r)));
    }) as EventListener);
    const card = host.querySelector<HTMLElement>('[data-slot="catalog-card"][data-item="a"]')!;
    const [install, open] = [...card.querySelectorAll<HTMLButtonElement>('[data-slot="install-button"]')];
    install!.click();
    await tick();
    expect(id).toBe("a");
    expect(attr(card, "data-state")).toBe("installing");
    expect(attr(install!, "aria-busy")).toBe("true");
    resolveIt();
    await tick();
    expect(attr(card, "data-state")).toBe("installed");
    expect(install!.style.display).toBe("none");
    expect(open!.style.display).not.toBe("none");
    expect(host.querySelector('[role="status"]')).not.toBeNull();
  });

  it("opens the detail sheet from a card and shows a failed install", async () => {
    const host = await mount();
    host.addEventListener("nq-install", ((e: CustomEvent) => e.detail.wait(Promise.resolve({ error: "Payment declined" }))) as EventListener);
    host.querySelector<HTMLElement>('[data-slot="catalog-card"][data-item="b"] h3 button')!.click();
    await tick();
    const sheet = document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!;
    expect(sheet).not.toBeNull();
    expect(sheet.querySelector('[data-slot="sheet-title"]')!.textContent).toBe("Charts Pro");
    expect(sheet.textContent).toContain("Official");
    const install = sheet.querySelector<HTMLButtonElement>('[data-slot="install-button"]')!;
    install.click();
    await tick(80);
    const alert = sheet.querySelector<HTMLElement>('[role="alert"]')!;
    expect(alert.textContent).toBe("Payment declined");
    expect(alert.style.display).not.toBe("none");
  });

  it("with select, a card fires nq-select instead of opening the sheet", async () => {
    const host = document.createElement("div");
    host.innerHTML = rendered("catalog-store").replace("&quot;select&quot;:false", "&quot;select&quot;:true").replace(/\\u0022select\\u0022:false/, '\\u0022select\\u0022:true');
    document.body.append(host);
    Alpine.initTree(host);
    await tick();
    let id = "";
    host.addEventListener("nq-select", ((e: CustomEvent) => (id = e.detail.id)) as EventListener);
    host.querySelector<HTMLElement>('[data-slot="catalog-card"][data-item="a"] h3 button')!.click();
    await tick();
    expect(id).toBe("a");
    expect(document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!.hasAttribute("data-closed")).toBe(true);
  });
});
