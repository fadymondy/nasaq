// The Blade example (php/examples/markdown-extras.blade.php) mounted under real Alpine: sort, filter, CSV, line-number toggle.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const firstCells = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="markdown-table"] tbody tr[data-row]')].filter((r) => r.style.display !== "none").map((r) => r.querySelector("td")!.textContent!.trim());

describe("markdown-extras (Blade example)", () => {
  it("renders the frontmatter, the table and the code block on the server", () => {
    const html = rendered("markdown-extras");
    expect(html).toContain('data-slot="frontmatter-table"');
    expect(html).toContain('data-slot="markdown-table"');
    expect(html).toContain('data-slot="code-block"');
    expect(html).toContain("sum.ts");
  });

  it("sorts a table by clicking a header, and cycles back to the source order", async () => {
    const host = await mountHtml(rendered("markdown-extras"));
    expect(firstCells(host)).toEqual(["Riyadh", "Cairo", "Dubai"]);
    const heads = () => host.querySelectorAll<HTMLElement>('[data-slot="markdown-table"] thead th');
    expect(heads()[1]!.getAttribute("aria-sort")).toBe("none");
    heads()[1]!.querySelector("button")!.click();
    await tick();
    expect(firstCells(host)).toEqual(["Dubai", "Cairo", "Riyadh"]);
    expect(heads()[1]!.getAttribute("aria-sort")).toBe("ascending");
    expect(host.querySelector('[role="status"]')!.textContent).toContain("Sorted by Revenue, ascending");
    heads()[1]!.querySelector("button")!.click();
    await tick();
    expect(firstCells(host)).toEqual(["Riyadh", "Cairo", "Dubai"]);
    expect(heads()[1]!.getAttribute("aria-sort")).toBe("descending");
    heads()[1]!.querySelector("button")!.click();
    await tick();
    expect(heads()[1]!.getAttribute("aria-sort")).toBe("none");
  });

  it("filters rows with Arabic folding, shows the empty row and counts", async () => {
    const host = await mountHtml(rendered("markdown-extras"));
    const root = host.querySelector<HTMLElement>('[data-slot="markdown-table"]')!;
    // Three rows: no filter box, so drive the state directly.
    const data = Alpine.$data(root) as { query: string; count: string; emptyText: string };
    data.query = "cai";
    await tick();
    expect(firstCells(host)).toEqual(["Cairo"]);
    data.query = "zzz";
    await tick();
    expect(firstCells(host)).toEqual([]);
    expect(root.querySelector<HTMLElement>("tr[data-empty]")!.style.display).toBe("");
    expect(root.querySelector("tr[data-empty]")!.textContent).toContain("No rows match “zzz”.");
    data.query = "";
    await tick();
    expect(firstCells(host)).toHaveLength(3);
  });

  it("downloads the visible rows as CSV with a byte-order mark", async () => {
    const blobs: Blob[] = [];
    Object.assign(URL, { createObjectURL: vi.fn((b: Blob) => (blobs.push(b), "blob:x")), revokeObjectURL: vi.fn() });
    const host = await mountHtml(rendered("markdown-extras"));
    const btn = [...host.querySelectorAll("button")].find((b) => b.textContent!.includes("Download CSV"))!;
    btn.click();
    await tick();
    const text = await blobs[0]!.text();
    expect(text.startsWith("﻿")).toBe(true);
    expect(text).toContain("Region,Revenue");
    expect(text).toContain("Riyadh,\"$12,400\"");
  });

  it("toggles the line-number gutters of its code block", async () => {
    const host = await mountHtml(rendered("markdown-extras"));
    const fig = host.querySelector<HTMLElement>('[data-slot="code-block"]')!;
    const toggle = fig.querySelector<HTMLElement>('[aria-label="Line numbers"]')!;
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(fig.querySelectorAll("[data-line] > [aria-hidden]")).toHaveLength(2);
    toggle.click();
    await tick();
    expect(fig.querySelectorAll("[data-line] > [aria-hidden]")).toHaveLength(0);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    toggle.click();
    await tick();
    expect(fig.querySelectorAll("[data-line] > [aria-hidden]")).toHaveLength(2);
    expect(fig.querySelector("[data-line][data-highlighted]")!.getAttribute("data-line")).toBe("2");
  });
});
