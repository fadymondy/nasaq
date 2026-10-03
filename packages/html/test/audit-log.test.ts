// The Blade example (php/examples/audit-log.blade.php) mounted under real Alpine: rows, sort, search, facets, the details dialog and retention.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  vi.setConfig({ testTimeout: 30000 }); // the page is large and sibling test runs share the machine
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

const rowsOf = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="table-row"][data-row]')];
const search = async (host: HTMLElement, value: string) => {
  const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
  input.value = value;
  input.dispatchEvent(new Event("input"));
  await tick();
};

describe("audit-log (Blade example)", () => {
  it("renders the toolbar and a row per entry, newest first, with the system actor", async () => {
    const host = await mountHtml(rendered("audit-log"));
    const root = host.querySelector<HTMLElement>('[data-slot="audit-log"]')!;
    expect(root).toBeTruthy();
    const rows = rowsOf(host);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.textContent).toContain("System");
    expect(rows[0]!.textContent).toContain("API");
    expect(rows[1]!.textContent).toContain("Sara Alharbi");
    expect(rows[1]!.textContent).toContain("sara@example.com");
    expect(rows[1]!.textContent).toContain("Role changed");
    expect(rows[1]!.textContent).toContain("member.role_changed");
    expect(host.querySelector('input[type="search"]')!.getAttribute("placeholder")).toBe("Search actor, action or entity");
    const ip = host.querySelector<HTMLElement>('[data-col="ip"]')!;
    expect(ip.style.display).toBe("none");
    expect(host.querySelector('[data-col="when"]')!.getAttribute("aria-sort")).toBe("descending");
  });

  it("sorts from the header buttons", async () => {
    const host = await mountHtml(rendered("audit-log"));
    host.querySelector<HTMLElement>('[data-col="actor"] button')!.click();
    await tick();
    expect(host.querySelector('[data-col="actor"]')!.getAttribute("aria-sort")).toBe("ascending");
    expect(host.querySelector('[data-col="when"]')!.getAttribute("aria-sort")).toBe("none");
    expect(rowsOf(host)[0]!.textContent).toContain("Sara Alharbi");
  });

  it("searches and shows the no-match empty state, then clears the filters", async () => {
    const host = await mountHtml(rendered("audit-log"));
    await search(host, "sara");
    expect(rowsOf(host)).toHaveLength(1);
    await search(host, "zzzz");
    expect(rowsOf(host)).toHaveLength(0);
    const empty = [...host.querySelectorAll<HTMLElement>('[data-slot="table-body"]')].find((b) => b.textContent!.includes("No matching results"))!;
    expect(empty.style.display).not.toBe("none");
    [...empty.querySelectorAll("button")].find((b) => b.textContent!.includes("Clear filters"))!.click();
    await tick();
    expect(rowsOf(host)).toHaveLength(2);
  });

  it("filters by a facet from the menu", async () => {
    const host = await mountHtml(rendered("audit-log"));
    host.querySelector<HTMLElement>('[data-facet="channel"]')!.click();
    await tick(80);
    const item = [...document.body.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-checkbox-item"]')].find((i) => i.textContent!.trim() === "API")!;
    item.click();
    await tick(80);
    expect(rowsOf(host)).toHaveLength(1);
    expect(rowsOf(host)[0]!.textContent).toContain("System");
  });

  it("opens the details dialog with the before and after table", async () => {
    const host = await mountHtml(rendered("audit-log"));
    rowsOf(host)[1]!.click();
    await tick(100);
    const d = document.body.querySelector<HTMLElement>('[data-slot="audit-log-details"]')!;
    expect(d).toBeTruthy();
    expect(d.textContent).toContain("Role changed");
    expect(d.textContent).toContain("10.0.0.1");
    expect(d.querySelector("[data-slot=\"audit-changes\"]")!.getAttribute("role")).toBe("table");
    const kinds = [...d.querySelectorAll("[role=row][data-kind]")].map((r) => r.getAttribute("data-kind"));
    expect(kinds).toEqual(["added", "changed", "removed"]);
    expect(d.textContent).toContain("3 fields");
  });

  it("shows retention with the expiring warning and saves a change", async () => {
    const host = await mountHtml(rendered("audit-log"));
    const section = host.querySelector<HTMLElement>('[data-slot="audit-retention"]')!;
    expect(section.textContent).toContain("Retention");
    expect(section.textContent).toContain("2 entries are older than this and will be deleted.");
    const root = host.querySelector<HTMLElement>('[data-slot="audit-log"]')!;
    const seen: unknown[] = [];
    root.addEventListener("nq-audit-retention", (e) => seen.push((e as CustomEvent).detail.days));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = Alpine.$data(root) as any;
    data.retentionKey = "forever";
    await tick(80);
    expect(seen).toEqual([null]);
    expect(section.textContent).toContain("Retention updated.");
    expect(section.querySelector<HTMLElement>('[data-tone="warning"]')!.style.display).toBe("none");
  });
});
