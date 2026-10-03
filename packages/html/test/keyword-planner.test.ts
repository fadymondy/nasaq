// The Blade example (php/examples/keyword-planner.blade.php) mounted under real Alpine: the keywords table, clusters, cannibalization and owner editing.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

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

const keywordCells = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-cell-col="keyword"]')].map((c) => c.textContent?.trim());
const statusOf = (host: HTMLElement, keyword: string) => {
  const row = [...host.querySelectorAll<HTMLElement>('[data-slot="table-row"][data-row]')].find((r) => r.querySelector('[data-cell-col="keyword"]')?.textContent?.trim() === keyword);
  return [...(row?.querySelectorAll<HTMLElement>('[data-cell-col="status"] [data-slot="status"]') ?? [])].find((s) => s.style.display !== "none")?.textContent?.trim();
};

describe("keyword-planner (Blade example)", () => {
  it("lists the keywords with their derived status", async () => {
    const host = await mountHtml(rendered("keyword-planner"));
    expect(keywordCells(host)).toHaveLength(4);
    expect(statusOf(host, "arabic design system")).toBe("Owned");
    expect(statusOf(host, "rtl react components")).toBe("Competing pages");
    expect(statusOf(host, "buy ui kit")).toBe("No owner");
  });

  it("groups related keywords into clusters", async () => {
    const host = await mountHtml(rendered("keyword-planner"));
    const clusters = host.querySelectorAll('[data-slot="keyword-cluster"]');
    expect(clusters.length).toBe(3);
    expect(clusters[0]!.textContent).toContain("arabic design system");
    expect(clusters[0]!.textContent).toContain("2 keywords");
  });

  it("lists the competing pages and keeps one when asked", async () => {
    const host = await mountHtml(rendered("keyword-planner"));
    const conflict = host.querySelector<HTMLElement>('[data-slot="keyword-conflict"]')!;
    expect(conflict.textContent).toContain("rtl react components");
    expect(conflict.textContent).toContain("/components");
    let assigned: { id: string; url: string } | undefined;
    host.addEventListener("nq-keyword-planner-assign", (e) => (assigned = (e as CustomEvent).detail));
    const keepButtons = [...conflict.querySelectorAll<HTMLButtonElement>("button")].filter((b) => b.style.display !== "none");
    keepButtons[0]!.click();
    await tick();
    expect(assigned).toMatchObject({ id: "k2", url: "/blog/rtl" });
    expect(statusOf(host, "rtl react components")).toBe("Competing pages");
  });

  it("rolls the owner back and shows an alert when the host refuses it", async () => {
    const host = await mountHtml(rendered("keyword-planner"));
    host.addEventListener("nq-keyword-planner-assign", (e) => ((e as CustomEvent).detail.promise = Promise.resolve({ error: "Nope" })));
    host.querySelector<HTMLElement>('[data-slot="keyword-conflict"] button:not([style*="display: none"])')!.click();
    await tick();
    const alert = host.querySelector<HTMLElement>('[role="alert"]')!;
    expect(alert.textContent).toContain("Nope");
    expect(alert.style.display).not.toBe("none");
  });

  it("clears an owner from the planner and re-derives the status", async () => {
    const host = await mountHtml(rendered("keyword-planner"));
    host.querySelector('[data-slot="data-table"]')!.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action: "clear", row: { id: "k1" } } }));
    await tick();
    expect(statusOf(host, "arabic design system")).toBe("No owner");
  });
});
