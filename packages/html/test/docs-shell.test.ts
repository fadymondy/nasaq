import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { docsShellIds, docsShellSectionIds, filterDocsShellTree } from "../src/alpine/docs-shell-logic";

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
  host.innerHTML = rendered("docs-shell");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="docs-shell"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: HTMLElement) => Alpine.$data(el) as Record<string, any>;

const nav = [
  { id: "intro", title: "Introduction" },
  { id: "guides", title: "Guides", children: [{ id: "install", title: "Installation" }, { id: "theme", title: "Theming" }] },
];

describe("docs-shell logic", () => {
  it("filters by every word and keeps the section of a match", () => {
    expect(filterDocsShellTree(nav, "install").map((n) => n.id)).toEqual(["guides"]);
    expect(filterDocsShellTree(nav, "install")[0]?.children?.map((n) => n.id)).toEqual(["install"]);
    expect(filterDocsShellTree(nav, "guides")[0]?.children).toHaveLength(2);
    expect(filterDocsShellTree(nav, "zzz")).toEqual([]);
    expect(filterDocsShellTree(nav, "")).toHaveLength(2);
  });

  it("lists ids and sections", () => {
    expect(docsShellIds(nav)).toEqual(["intro", "guides", "install", "theme"]);
    expect(docsShellSectionIds(nav)).toEqual(["guides"]);
  });
});

describe("nqDocsShell", () => {
  it("renders the page with sidebar, rail and pager", async () => {
    const host = await mount();
    expect(root(host).querySelector("h1")?.textContent).toBe("Introduction");
    expect(root(host).querySelectorAll("[data-slot='docs-sidebar'] [role='treeitem']").length).toBeGreaterThan(0);
    expect(root(host).querySelector("[data-slot='docs-toc'] a")?.textContent).toBe("Why");
    expect(root(host).querySelector("nav[aria-label='Previous and next pages']")?.textContent).toContain("Installation");
  });

  it("draws a tree badge as a real badge after the title, not as text", async () => {
    const host = await mount();
    const row = root(host).querySelector<HTMLElement>("[data-slot='docs-sidebar'] [data-node-id='install']")!;
    const badge = row.querySelector<HTMLElement>("[data-slot='badge']")!;
    expect(badge).not.toBeNull();
    expect(badge.textContent!.trim()).toBe("New");
    expect(badge.getAttribute("data-variant") ?? badge.className).toContain("info");
    expect(row.textContent).not.toContain("·");
    expect(row.querySelector("span[dir='auto']")!.textContent!.trim()).toBe("Installation");
    // A row without a badge has none.
    expect(root(host).querySelector("[data-slot='docs-sidebar'] [data-node-id='intro'] [data-slot='badge']")).toBeNull();
  });

  it("opens the drawer and closes it when navigating", async () => {
    const host = await mount();
    const d = data(root(host));
    d.drawer = true;
    await tick();
    expect(d.drawer).toBe(true);
    let id = "";
    root(host).addEventListener("nq-navigate", (e) => {
      id = (e as CustomEvent).detail.id;
      e.preventDefault();
    });
    d.visit("install");
    expect(id).toBe("install");
    expect(d.drawer).toBe(false);
  });

  it("fires nq-navigate from the pager link", async () => {
    const host = await mount();
    const seen: string[] = [];
    root(host).addEventListener("nq-navigate", (e) => {
      seen.push((e as CustomEvent).detail.id);
      e.preventDefault();
    });
    root(host).querySelector<HTMLElement>("nav[aria-label='Previous and next pages'] a")!.click();
    expect(seen).toEqual(["install"]);
  });

  it("filters the tree and shows the empty message", async () => {
    const host = await mount();
    const d = data(root(host));
    const input = root(host).querySelector<HTMLInputElement>("[data-slot='docs-sidebar'] input[type='search']")!;
    input.value = "zzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick(60);
    expect(d.term).toBe("zzz");
    expect(d.noMatch()).toBe(true);
    expect(d.noMatchText()).toBe("No pages match “zzz”.");
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick(60);
    expect(d.noMatch()).toBe(false);
  });
});
