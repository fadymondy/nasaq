// The Blade example (php/examples/keyword-tracker.blade.php) mounted under real Alpine: tiles, distribution, movers, the keywords table, add / remove / refresh / edit and the competitors tab.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { averagePosition, bestPosition, competitorStats, difficultyBand, parseKeywordList, rankBucket, rankChange, rankDistribution, topMovers, visibilityShare } from "../src/alpine/keyword-tracker-logic";

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

/* eslint-disable @typescript-eslint/no-explicit-any */
const tile = (host: HTMLElement, id: string) => host.querySelector<HTMLElement>(`[data-metric="${id}"] [data-slot="num"]`)?.textContent?.trim();
const tables = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="data-table"]')];
const rows = (host: HTMLElement, i = 0) => [...tables(host)[i]!.querySelectorAll<HTMLElement>('[data-slot="table-row"][data-row]')];
const data = (host: HTMLElement) => Alpine.$data(host.querySelector<HTMLElement>('[data-slot="keyword-tracker"]')!) as Record<string, any>;
const action = (host: HTMLElement, name: string, id: string) =>
  tables(host)[0]!.dispatchEvent(new CustomEvent("nq-data-table-action", { bubbles: true, detail: { action: name, row: { id } } }));

describe("rank maths", () => {
  it("reads movement with lower as better", () => {
    expect(rankChange(8, 5)).toEqual({ direction: "up", delta: 3 });
    expect(rankChange(5, 8)).toEqual({ direction: "down", delta: -3 });
    expect(rankChange(null, 5).direction).toBe("new");
    expect(rankChange(5, null).direction).toBe("lost");
    expect(rankBucket(10)).toBe("top10");
    expect(rankDistribution([1, 5, 50, null])).toMatchObject({ top3: 1, top10: 1, top100: 1, unranked: 1, total: 4 });
    expect(averagePosition([2, 4, null])).toBe(3);
    expect(bestPosition([9, null, 4])).toBe(4);
    expect(visibilityShare([{ position: 1, volume: 100 }])).toBe(1);
    expect(difficultyBand(80)).toBe("hard");
    expect(parseKeywordList("Foo bar\nfoo  bar, baz;\n\n qux")).toEqual(["foo bar", "baz", "qux"]);
    expect(topMovers([{ id: "a", position: 2, previousPosition: 6 }, { id: "b", position: 9, previousPosition: 3 }], 3).gainers.map((k) => k.id)).toEqual(["a"]);
    expect(competitorStats({ k1: 3 }, [{ id: "k1", volume: 10 }], { k1: 5 }).ahead).toBe(1);
  });
});

describe("Blade keyword-tracker under Alpine", () => {
  it("shows the tiles, the distribution and the movers", async () => {
    const host = await mountHtml(rendered("keyword-tracker"));
    expect(tile(host, "tracked")).toBe("6");
    expect(tile(host, "avg")).toBe("7.4");
    expect(tile(host, "top10")).toBe("3");
    expect(host.querySelector('[data-metric="visibility"]')?.textContent).toContain("%");
    expect(host.querySelectorAll('[data-slot="rank-distribution"] li[data-bucket]')).toHaveLength(4);
    expect(host.querySelector('[data-slot="rank-distribution"] [role="img"]')?.getAttribute("aria-label")).toContain("Top 3: 2 keywords, 33%");
    const movers = host.querySelector('[data-slot="keyword-movers"]')!.textContent!;
    expect(movers).toContain("rtl react components");
    expect(movers).toContain("react rtl library");
    expect(host.querySelector('[data-slot="time-series-panel"]')).not.toBeNull();
  });

  it("lists the keywords by position with arrows, difficulty and features", async () => {
    const host = await mountHtml(rendered("keyword-tracker"));
    const rs = rows(host);
    expect(rs).toHaveLength(6);
    expect(rs[0]!.textContent).toContain("nasaq ui");
    expect(rs[5]!.textContent).toContain("Not in top 100");
    const k1 = rs.find((r) => r.textContent!.includes("rtl react components"))!;
    expect(k1.querySelector('[data-cell-col="position"] [data-direction="up"]')).not.toBeNull();
    expect(k1.querySelector('[data-cell-col="position"]')!.textContent).toContain("Up 3");
    expect(k1.querySelector('[data-cell-col="trend"] svg')).not.toBeNull();
    expect(k1.querySelector('[data-cell-col="features"]')!.textContent).toContain("People also ask");
    expect(k1.querySelector('[data-cell-col="difficulty"]')!.textContent).toContain("38 Medium");
    const k6 = rs.find((r) => r.textContent!.includes("design tokens guide"))!;
    expect(k6.querySelector('[data-cell-col="position"]')!.textContent).toContain("New");
  });

  it("opens an add dialog, validates and hands the keywords to the host", async () => {
    const host = await mountHtml(rendered("keyword-tracker"));
    const seen: any[] = [];
    host.addEventListener("add-keywords", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push({ keywords: d.keywords, location: d.location, device: d.device });
      d.wait(Promise.resolve({ keywords: [{ id: "k7", keyword: "alpha one", position: 30, previousPosition: null, volume: 100, difficulty: 10 }] }));
    });
    host.querySelector<HTMLElement>('[data-action="add"]')!.click();
    await tick();
    const d = data(host);
    expect(d.addOpen).toBe(true);
    await d.submitAdd();
    expect(d.addMsg).toBe("Add at least one keyword.");
    expect(seen).toHaveLength(0);
    d.addText = "alpha one\nbeta two, alpha one";
    await tick();
    expect(d.addCountText).toBe("2 keywords");
    expect(d.addLabel).toBe("Add 2 keywords");
    await d.submitAdd();
    await tick();
    expect(seen).toEqual([{ keywords: ["alpha one", "beta two"], location: "sa", device: "desktop" }]);
    expect(d.addOpen).toBe(false);
    expect(rows(host)).toHaveLength(7);
    expect(tile(host, "tracked")).toBe("7");
  });

  it("confirms before it stops tracking, then drops the rows", async () => {
    const host = await mountHtml(rendered("keyword-tracker"));
    const seen: string[][] = [];
    host.addEventListener("remove-keywords", (e) => {
      seen.push((e as CustomEvent).detail.ids);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    action(host, "remove", "k3");
    await tick();
    const d = data(host);
    expect(d.removeOpen).toBe(true);
    expect(d.removeTitle).toBe("Stop tracking this keyword?");
    expect(seen).toHaveLength(0);
    await d.confirmRemove();
    await tick();
    expect(seen).toEqual([["k3"]]);
    expect(rows(host)).toHaveLength(5);
    expect(tile(host, "tracked")).toBe("5");
  });

  it("shows an alert when a refresh fails, and when nobody can answer", async () => {
    const host = await mountHtml(rendered("keyword-tracker"));
    host.addEventListener("refresh-keywords", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Rate limited" })));
    host.querySelector<HTMLElement>('[data-action="refresh"]')!.click();
    await tick();
    expect([...host.querySelectorAll('[role="alert"]')].map((a) => a.textContent).join("")).toContain("Rate limited");
    host.addEventListener("refresh-keywords", (e) => (e as CustomEvent).detail.wait(Promise.reject(new Error("x"))));
    action(host, "refresh", "k1");
    await tick();
    expect(data(host).notice).toBe("Could not complete this. Try again.");
  });

  it("validates and saves an edited ranking URL", async () => {
    const host = await mountHtml(rendered("keyword-tracker"));
    const patches: unknown[] = [];
    host.addEventListener("update-keyword", (e) => {
      patches.push({ id: (e as CustomEvent).detail.id, patch: (e as CustomEvent).detail.patch });
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    const edit = (value: string) => {
      const detail: { row: { id: string }; column: string; value: string; promise?: Promise<unknown> } = { row: { id: "k4" }, column: "url", value };
      tables(host)[0]!.dispatchEvent(new CustomEvent("nq-data-table-edit", { bubbles: true, detail }));
      return detail.promise!;
    };
    expect(await edit("nope")).toEqual({ error: "/path or https://…" });
    expect(patches).toHaveLength(0);
    await edit(" /blog/new ");
    expect(patches).toEqual([{ id: "k4", patch: { url: "/blog/new" } }]);
    expect(data(host).keywords.find((k: { id: string }) => k.id === "k4").url).toBe("/blog/new");
  });

  it("compares the competitors", async () => {
    const host = await mountHtml(rendered("keyword-tracker"));
    expect(host.querySelectorAll('[role="tab"]')).toHaveLength(2);
    expect(rows(host, 1)).toHaveLength(2);
    expect(rows(host, 1)[0]!.textContent).toContain("You");
    expect(host.querySelector('[data-slot="competitor-comparison"]')!.textContent).toContain("3 keywords ahead of you");
    expect(rows(host, 2)).toHaveLength(6);
  });
});
