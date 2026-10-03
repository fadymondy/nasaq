// The Blade example (php/examples/apm-panels.blade.php) mounted under real Alpine, plus the markup <x-nq::apm-panels.endpoint-table> and
// <x-nq::apm-panels.trace-list> emit, driven by nqApmEndpoints and nqApmTraces.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { rankEndpoints, type ApmEndpointRow } from "../src/alpine/apm-panels";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));

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

describe("apm-panels (Blade example)", () => {
  it("renders the latency percentiles with the target guide and a chart", async () => {
    const host = await mountHtml(rendered("apm-panels"));
    const root = host.querySelector<HTMLElement>('[data-slot="latency-percentiles"]')!;
    expect(root.querySelector("h3")?.textContent).toBe("Latency");
    const tiles = [...root.querySelectorAll<HTMLElement>("[data-percentile]")];
    expect(tiles.map((t) => t.dataset.percentile)).toEqual(["p50", "p95", "p99"]);
    expect(tiles[1]!.textContent).toContain("486 ms");
    expect(tiles[2]!.textContent).toContain("1.14 s");
    expect(root.querySelector('[data-slot="chart"]')?.getAttribute("aria-label")).toBe("Latency percentiles over time");
    expect(root.textContent).toContain("Target p95 500");
    expect(root.querySelectorAll('[data-slot="chart-dot"]')).toHaveLength(6);
  });
});

const endpoints = (rows: ApmEndpointRow[]) => `
  <div data-slot="endpoint-table" x-data='nqApmEndpoints(${JSON.stringify({ pageSize: 2, sort: { id: "p95", dir: "desc" }, rows, of: "of" })})'>
    <input type="search" x-model="query">
    <div role="columnheader" data-col="route" x-bind:aria-sort="ariaSort('route')"><button type="button" x-on:click="sortBy('route')">Endpoint</button></div>
    <div role="columnheader" data-col="p95" x-bind:aria-sort="ariaSort('p95')"><button type="button" x-on:click="sortBy('p95')">p95</button></div>
    ${rows.map((r, i) => `<div role="row" data-row-id="${r.id}" x-bind:style="rowStyle('${r.id}')" ${i >= 2 ? 'style="display: none"' : ""} x-on:click="pick('${r.id}')">${r.search}</div>`).join("")}
    <div data-empty x-show="shownCount === 0" style="display: none">none</div>
    <nav x-show="pageCount > 1"><span data-range x-text="rangeText()"></span><button type="button" data-prev x-on:click="setPage(page - 1)">prev</button><button type="button" data-next x-on:click="setPage(page + 1)">next</button></nav>
  </div>`;
const ROWS: ApmEndpointRow[] = [
  { id: "b", search: "POST /api/checkout", values: { route: "/api/checkout", p95: 1820 } },
  { id: "a", search: "GET /api/orders/:id", values: { route: "/api/orders/:id", p95: 410 } },
  { id: "c", search: "GET /api/users", values: { route: "/api/users", p95: 90 } },
];
const visible = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>("[data-row-id]")].filter((r) => r.style.display !== "none").sort((x, y) => Number(x.style.order) - Number(y.style.order)).map((r) => r.dataset.rowId);

describe("rankEndpoints", () => {
  it("filters by the search text and keeps ties in the given order", () => {
    expect(rankEndpoints(ROWS, "get", { id: "p95", dir: "desc" }).map((r) => r.id)).toEqual(["a", "c"]);
    expect(rankEndpoints(ROWS, "", { id: "route", dir: "asc" }).map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(rankEndpoints([{ ...ROWS[0]!, id: "x" }, { ...ROWS[0]!, id: "y" }], "", { id: "p95", dir: "desc" }).map((r) => r.id)).toEqual(["x", "y"]);
  });
});

describe("nqApmEndpoints", () => {
  it("shows the first page of the sorted rows and pages through the rest", async () => {
    const host = await mountHtml(endpoints(ROWS));
    expect(visible(host)).toEqual(["b", "a"]);
    expect(host.querySelector("[data-range]")?.textContent).toBe("1-2 of 3");
    host.querySelector<HTMLElement>("[data-next]")!.click();
    await tick();
    expect(visible(host)).toEqual(["c"]);
    expect(host.querySelector("[data-range]")?.textContent).toBe("3-3 of 3");
  });

  it("sorts by a column, flipping on the second click, and reports aria-sort", async () => {
    const host = await mountHtml(endpoints(ROWS));
    expect(host.querySelector('[data-col="p95"]')?.getAttribute("aria-sort")).toBe("descending");
    host.querySelector<HTMLElement>('[data-col="route"] button')!.click();
    await tick();
    expect(visible(host)).toEqual(["b", "a"]);
    expect(host.querySelector('[data-col="route"]')?.getAttribute("aria-sort")).toBe("ascending");
    expect(host.querySelector('[data-col="p95"]')?.getAttribute("aria-sort")).toBe("none");
    host.querySelector<HTMLElement>('[data-col="route"] button')!.click();
    await tick();
    expect(visible(host)).toEqual(["c", "a"]);
  });

  it("searches, shows the empty row when nothing matches, and dispatches nq-select for a clicked row", async () => {
    const host = await mountHtml(endpoints(ROWS));
    const input = host.querySelector<HTMLInputElement>("input")!;
    input.value = "users";
    input.dispatchEvent(new Event("input"));
    await tick();
    expect(visible(host)).toEqual(["c"]);
    const ids: string[] = [];
    host.firstElementChild!.addEventListener("nq-select", (e) => ids.push((e as CustomEvent).detail.id));
    host.querySelector<HTMLElement>('[data-row-id="c"]')!.click();
    expect(ids).toEqual(["c"]);
    input.value = "zzz";
    input.dispatchEvent(new Event("input"));
    await tick();
    expect(visible(host)).toEqual([]);
    expect((host.querySelector("[data-empty]") as HTMLElement).style.display).not.toBe("none");
  });
});

describe("nqApmTraces", () => {
  it("opens one trace's waterfall, closes it when chosen again, and dispatches nq-select", async () => {
    const host = await mountHtml(`
      <div x-data="nqApmTraces(null)">
        <button type="button" data-a x-bind:aria-pressed="String(selected === 'a')" x-on:click="toggle('a')">A</button>
        <button type="button" data-b x-bind:aria-pressed="String(selected === 'b')" x-on:click="toggle('b')">B</button>
        <section data-wa x-show="selected === 'a'" style="display: none">A spans</section>
        <section data-wb x-show="selected === 'b'" style="display: none">B spans</section>
      </div>`);
    const root = host.firstElementChild as HTMLElement;
    const ids: (string | null)[] = [];
    root.addEventListener("nq-select", (e) => ids.push((e as CustomEvent).detail.id));
    const show = (s: string) => (host.querySelector(s) as HTMLElement).style.display !== "none";
    expect(show("[data-wa]")).toBe(false);
    host.querySelector<HTMLElement>("[data-a]")!.click();
    await tick();
    expect(show("[data-wa]")).toBe(true);
    expect(host.querySelector("[data-a]")?.getAttribute("aria-pressed")).toBe("true");
    host.querySelector<HTMLElement>("[data-b]")!.click();
    await tick();
    expect(show("[data-wa]")).toBe(false);
    expect(show("[data-wb]")).toBe(true);
    host.querySelector<HTMLElement>("[data-b]")!.click();
    await tick();
    expect(show("[data-wb]")).toBe(false);
    expect(ids).toEqual(["a", "b", null]);
  });
});
