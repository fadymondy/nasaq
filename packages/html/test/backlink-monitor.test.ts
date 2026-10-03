// The Blade example (php/examples/backlink-monitor.blade.php) mounted under real Alpine: tiles, the links table, filters and the row actions.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { backlinkStatus, dailyLinkSeries, diffBacklinks, domainOf, isToxic, referringDomains, summarizeBacklinks } from "../src/alpine/backlink-monitor-logic";

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

const NOW = Date.parse("2026-09-29T09:00:00Z");
const tile = (host: HTMLElement, id: string) => host.querySelector<HTMLElement>(`[data-metric="${id}"] [data-slot="stat-card-value"]`)?.textContent?.trim();
const rows = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="table-row"][data-row]')];
const visible = (el: Element | null | undefined, sel: string) => [...(el?.querySelectorAll<HTMLElement>(sel) ?? [])].filter((e) => e.style.display !== "none").map((e) => e.textContent?.trim());
const rowFor = (host: HTMLElement, domain: string) => rows(host).find((r) => r.querySelector('[data-cell-col="source"]')?.textContent?.includes(domain));
const action = (host: HTMLElement, name: string, id: string) =>
  host.querySelector('[data-slot="data-table"]')!.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action: name, row: { id } } }));

describe("backlink maths", () => {
  it("classifies links and summarises them", () => {
    const links = [
      { id: "a", sourceUrl: "https://www.x.com/p", firstSeen: "2026-09-27", spamScore: 5 },
      { id: "b", sourceUrl: "https://y.org", firstSeen: "2026-07-01", spamScore: 80 },
      { id: "c", sourceUrl: "https://z.net", firstSeen: "2026-07-01", lostAt: "2026-09-20", spamScore: 10 },
    ];
    expect(backlinkStatus(links[0]!, NOW)).toBe("new");
    expect(backlinkStatus(links[2]!, NOW)).toBe("lost");
    expect(isToxic(links[1]!)).toBe(true);
    expect(isToxic({ ...links[1]!, disavowed: true })).toBe(false);
    expect(domainOf("https://www.X.com/a")).toBe("x.com");
    expect(referringDomains(links)).toBe(2);
    expect(summarizeBacklinks(links, NOW)).toMatchObject({ total: 3, active: 2, new: 1, lost: 1, toxic: 1 });
    expect(diffBacklinks(["a"], ["b"])).toEqual({ added: ["b"], removed: ["a"] });
    expect(dailyLinkSeries(links, 3, NOW).map((d) => d.gained)).toEqual([1, 0, 0]);
  });
});

describe("backlink-monitor (Blade example)", () => {
  it("shows the tiles and the table, newest link first", async () => {
    const host = await mountHtml(rendered("backlink-monitor"));
    expect(tile(host, "domains")).toBe("5");
    expect(tile(host, "active")).toBe("5");
    expect(tile(host, "new")).toBe("2");
    expect(tile(host, "lost")).toBe("1");
    expect(tile(host, "toxic")).toBe("1");
    expect(rows(host)).toHaveLength(6);
    expect(rows(host)[0]!.textContent).toContain("designweekly.com");
    expect(visible(rowFor(host, "designweekly.com"), '[data-cell-col="status"] [data-slot="status"]')).toEqual(["New"]);
    expect(rowFor(host, "old-directory.org")!.textContent).toContain("(no anchor)");
    expect(visible(rowFor(host, "cheap-pills-casino.biz"), '[data-cell-col="status"] [data-slot="badge"]')).toEqual(["Toxic"]);
    expect(visible(rowFor(host, "spammy-seo.example"), '[data-cell-col="status"] [data-slot="badge"]')).toEqual(["Disavowed"]);
    expect(visible(rowFor(host, "forum.webdesign.dev"), '[data-cell-col="status"] [data-slot="badge"]')).toEqual(["Nofollow"]);
  });

  it("draws the gained and lost chart", async () => {
    const host = await mountHtml(rendered("backlink-monitor"));
    expect(host.querySelector('[data-slot="time-series-panel"]')!.textContent).toContain("Links gained and lost");
  });

  it("searches the links", async () => {
    const host = await mountHtml(rendered("backlink-monitor"));
    const input = host.querySelector<HTMLInputElement>('[data-slot="data-table-search"] input')!;
    input.value = "arabicdev";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(rows(host)).toHaveLength(1);
  });

  it("offers Disavow on every link but a disavowed one, and Mark as safe on toxic links", async () => {
    const host = await mountHtml(rendered("backlink-monitor"));
    // The "⋯" button exists on every row; the menu content comes from the actions-key.
    expect(host.querySelectorAll('[data-slot="data-table-row-actions"]').length).toBe(6);
  });

  it("disavows through the host event and updates the row", async () => {
    const host = await mountHtml(rendered("backlink-monitor"));
    let detail: { ids: string[] } | undefined;
    host.addEventListener("disavow", (e) => {
      detail = (e as CustomEvent).detail;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    action(host, "disavow", "l4");
    await tick();
    expect(detail?.ids).toEqual(["l4"]);
    expect(visible(rowFor(host, "cheap-pills-casino.biz"), '[data-cell-col="status"] [data-slot="badge"]')).toEqual(["Disavowed"]);
    // Disavowed links are not toxic any more, so the tile drops.
    expect(tile(host, "toxic")).toBe("0");
  });

  it("marks a toxic link safe", async () => {
    const host = await mountHtml(rendered("backlink-monitor"));
    host.addEventListener("mark-safe", (e) => (e as CustomEvent).detail.wait(Promise.resolve()));
    action(host, "safe", "l4");
    await tick();
    expect(visible(rowFor(host, "cheap-pills-casino.biz"), '[data-cell-col="status"] [data-slot="badge"]')).toEqual([]);
    expect(tile(host, "toxic")).toBe("0");
  });

  it("shows the host's error and leaves the row alone", async () => {
    const host = await mountHtml(rendered("backlink-monitor"));
    host.addEventListener("disavow", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Search Console said no" })));
    action(host, "disavow", "l4");
    await tick();
    const alert = host.querySelector<HTMLElement>('[role="alert"]')!;
    expect(alert.textContent).toContain("Search Console said no");
    expect(alert.style.display).not.toBe("none");
    expect(tile(host, "toxic")).toBe("1");
  });

  it("shows the generic error when the host rejects", async () => {
    const host = await mountHtml(rendered("backlink-monitor"));
    host.addEventListener("disavow", (e) => (e as CustomEvent).detail.wait(Promise.reject(new Error("boom"))));
    action(host, "disavow", "l4");
    await tick();
    expect(host.querySelector<HTMLElement>('[role="alert"]')!.textContent).toContain("Could not save this");
  });
});
