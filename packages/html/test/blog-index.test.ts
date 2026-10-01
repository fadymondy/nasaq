import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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
  host.innerHTML = rendered("blog-index");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const slugs = (root: Element) => [...root.querySelectorAll<HTMLElement>("[data-post]")].filter(shown).map((e) => e.dataset.post);

describe("blog-index (Blade example)", () => {
  it("renders the featured post, the first page of the rest, filters and pagination", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="blog-index"]')!;
    expect(root.querySelector("h1")!.textContent).toBe("Blog");
    expect(shown(root.querySelector("[data-featured]"))).toBe(true);
    expect(root.querySelector('[data-featured] [data-slot="post-card"]')!.getAttribute("data-variant")).toBe("featured");
    expect(root.querySelector('[data-featured] h3 a')!.getAttribute("href")).toBe("/blog/tokens");
    expect(slugs(root)).toEqual(["rtl", "forms", "motion"]);
    expect(root.querySelector('[role="status"]')!.textContent).toBe("5 articles");
    expect(shown(root.querySelector('nav[data-slot="pagination"]'))).toBe(true);
    expect(root.querySelectorAll('[data-slot="chip-group"]')).toHaveLength(2);
  });

  it("goes to page 2, which has the remaining post and hides the featured one", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="blog-index"]')!;
    const pages: number[] = [];
    root.addEventListener("nq:page", (e) => pages.push((e as CustomEvent).detail.page));
    const two = [...root.querySelectorAll<HTMLElement>('nav[data-slot="pagination"] button')].find((b) => b.textContent === "2")!;
    two.click();
    await tick();
    expect(pages).toEqual([2]);
    expect(slugs(root)).toEqual(["tables"]);
    expect(shown(root.querySelector("[data-featured]"))).toBe(false);
  });

  it("filters by category chip: the featured post joins the list and the page resets", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="blog-index"]')!;
    const events: unknown[] = [];
    root.addEventListener("nq:filter", (e) => events.push((e as CustomEvent).detail));
    const chip = [...root.querySelectorAll<HTMLElement>('[data-slot="chip"]')].find((c) => c.dataset.value === "Design")!;
    chip.click();
    await tick();
    expect(chip.hasAttribute("data-selected")).toBe(true);
    expect(shown(root.querySelector("[data-featured]"))).toBe(false);
    expect(slugs(root)).toEqual(["tokens", "motion"]);
    expect(root.querySelector('[role="status"]')!.textContent).toBe("2 articles");
    expect(events).toEqual([{ query: "", category: "Design", tag: "" }]);
  });

  it("searches, shows the empty state and clears the filters", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="blog-index"]')!;
    const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    const empty = root.querySelector('[data-slot="empty-state"]');
    expect(shown(empty)).toBe(false);
    input.value = "zzzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(shown(empty)).toBe(true);
    expect(slugs(root)).toEqual([]);
    input.value = "tables";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(slugs(root)).toEqual(["tables"]);
    expect(root.querySelector('[role="status"]')!.textContent).toBe("1 article");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Alpine.$data(root) as any).clearFilters();
    await tick();
    expect(input.value).toBe("");
    expect(slugs(root)).toEqual(["rtl", "forms", "motion"]);
  });
});
