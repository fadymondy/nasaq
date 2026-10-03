// The Blade pagination example (packages/php/examples/rendered/pagination.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
  await tick(50);
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("pagination");
  document.body.append(host);
  Alpine.initTree(host);
  await tick(80);
  return host;
}

const nav = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="pagination"]')!;
const labels = (host: HTMLElement) => [...nav(host).querySelectorAll("li")].map((li) => li.textContent!.replace(/\s+/g, " ").trim());

describe("pagination (Blade example)", () => {
  it("hands the server-rendered pages to Alpine without duplicating them", async () => {
    const host = await mount();
    expect(nav(host).querySelectorAll("[data-ssr]")).toHaveLength(0);
    const current = nav(host).querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]!.textContent).toBe("3");
    expect(current[0]!.getAttribute("aria-label")).toBe("Page 3");
    expect(nav(host).querySelector('[data-slot="pagination-ellipsis"]')!.textContent).toContain("…");
    expect([...nav(host).querySelectorAll("button")].filter((b) => b.style.display !== "none")).toHaveLength(2 + 6);
  });

  it("next moves the page, fires page-change and re-renders the window", async () => {
    const host = await mount();
    const events: number[] = [];
    nav(host).addEventListener("page-change", (e) => events.push((e as CustomEvent).detail));
    (nav(host).querySelector('[aria-label="Next"]') as HTMLButtonElement).click();
    await tick();
    expect(events).toEqual([4]);
    expect(nav(host).querySelector('[aria-current="page"]')!.textContent).toBe("4");
    expect(labels(host).join("|")).toContain("24");
    nav(host).querySelector<HTMLButtonElement>('[aria-label="Page 24"]')!.click();
    await tick();
    expect(nav(host).querySelector('[aria-current="page"]')!.textContent).toBe("24");
    expect(nav(host).querySelector<HTMLButtonElement>('[aria-label="Next"]')!.disabled).toBe(true);
    expect(nav(host).querySelector('[data-slot="pagination-ellipsis"]')).not.toBeNull();
  });

  it("previous is disabled on the first page", async () => {
    const host = await mount();
    nav(host).querySelector<HTMLButtonElement>('[aria-label="Page 1"]')!.click();
    await tick();
    expect(nav(host).querySelector<HTMLButtonElement>('[aria-label="Previous"]')!.disabled).toBe(true);
  });

  it("the cursor pager and load-more render as buttons", async () => {
    const host = await mount();
    const pager = host.querySelector('[data-slot="cursor-pager"]')!;
    expect(pager.textContent).toContain("Showing 21–40 of 95");
    expect(host.querySelector('[data-slot="load-more"]')!.textContent!.trim()).toBe("Load more");
  });
});
