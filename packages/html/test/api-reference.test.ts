// The Blade api-reference example (packages/php/examples/rendered/api-reference.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

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
  host.innerHTML = rendered("api-reference");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>('[data-slot="api-reference"]')!;
}

const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const links = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-tool-link]")];
const visibleLinks = (root: HTMLElement) => links(root).filter((l) => l.closest("li")!.style.display !== "none").map((l) => l.dataset.toolLink);
const details = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-slot="api-tool"]')].filter((d) => shown(d)).map((d) => d.dataset.tool);

describe("api-reference (Blade example)", () => {
  it("starts on the first tool in the reference view", async () => {
    const root = await mount();
    expect(root.dataset.view).toBe("reference");
    expect(root.querySelector('[role="status"]')!.textContent).toBe("3 tools");
    expect(links(root)).toHaveLength(3);
    expect(links(root).map((l) => l.getAttribute("aria-current"))).toEqual(["true", null, null]);
    expect(details(root)).toEqual(["create_issue"]);
    expect(root.querySelector('[data-slot="api-tool"][data-tool="create_issue"]')!.textContent).toContain("issues:write");
    expect(root.querySelector('[data-slot="api-tool"][data-tool="create_issue"]')!.textContent).toContain("Short title.");
  });

  it("opens another tool from the list", async () => {
    const root = await mount();
    let picked: unknown;
    root.addEventListener("nq:select", (e) => (picked = (e as CustomEvent).detail));
    links(root)[1]!.click();
    await tick();
    expect(details(root)).toEqual(["list_issues"]);
    expect(links(root)[1]!.getAttribute("aria-current")).toBe("true");
    expect(picked).toEqual({ id: "list_issues" });
  });

  it("filters by search, category and access, and clears", async () => {
    const root = await mount();
    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    type(search, "drop");
    await tick();
    expect(visibleLinks(root)).toEqual([]);
    expect(root.querySelector('[role="status"]')!.textContent).toBe("0 tools");
    expect(shown(root.querySelector('[data-slot="empty-state"]'))).toBe(true);
    type(search, "delete project");
    await tick();
    expect(visibleLinks(root)).toEqual(["delete_project"]);

    type(search, "");
    await tick();
    const chip = [...root.querySelectorAll<HTMLElement>('[data-slot="chip"]')].find((c) => c.textContent!.trim() === "Projects")!;
    chip.click();
    await tick();
    expect(visibleLinks(root)).toEqual(["delete_project"]);

    const clear = [...root.querySelectorAll<HTMLElement>('[data-slot="empty-state"] button')][0]!;
    (clear as HTMLElement).click();
    await tick();
    expect(visibleLinks(root)).toHaveLength(3);

    const write = [...root.querySelectorAll<HTMLElement>('[data-slot="toggle"]')].find((b) => b.textContent!.trim() === "Changes data")!;
    write.click();
    await tick();
    expect(visibleLinks(root)).toEqual(["create_issue"]);
  });

  it("switches to the catalog and opens a card in the reference view", async () => {
    const root = await mount();
    const catalog = [...root.querySelectorAll<HTMLElement>('[data-slot="toggle"]')].find((b) => b.textContent!.trim() === "Catalog")!;
    catalog.click();
    await tick();
    expect(root.dataset.view).toBe("catalog");
    const cards = [...root.querySelectorAll<HTMLElement>("article[data-tool]")].filter((a) => a.closest("[data-slot='api-tool-catalog']"));
    expect(cards).toHaveLength(3);
    cards[2]!.querySelector("button")!.click();
    await tick();
    expect(root.dataset.view).toBe("reference");
    expect(details(root)).toEqual(["delete_project"]);
  });
});
