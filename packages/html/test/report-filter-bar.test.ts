// The Blade report-filter-bar example under real Alpine: the filter bar, saved views, report sheet and export menu
// (frozen clock 2026-09-29 09:00 UTC, zone Asia/Riyadh).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { mount, setup, tick } from "./_float-setup";
import {
  activeFilterCount,
  emptyReportFilters,
  reportFiltersFromQuery,
  reportFiltersToQuery,
  reportToMarkdown,
  savedViewMatches,
  uniqueViewName,
} from "../src/alpine/report-filter-bar-logic";

setup();
vi.setConfig({ testTimeout: 20000 });
const until = async (cond: () => boolean, ms = 3000) => {
  for (let waited = 0; waited < ms && !cond(); waited += 50) await tick(50);
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element) => (window as any).Alpine.$data(el);
const slot = (host: HTMLElement, name: string) => host.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
const clean = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
const chips = (host: HTMLElement) => [...slot(host, "report-filter-chips").querySelectorAll("li")].map((li) => clean(li.textContent));
const views = (host: HTMLElement) => [...slot(host, "saved-report-views").querySelectorAll<HTMLElement>(":scope > div > ul > li")];
const shown = (el: Element) => clean([...el.querySelectorAll("span")].filter((s) => s.style.display !== "none").map((s) => s.textContent).join(" "));
const button = (root: ParentNode, text: string) => [...root.querySelectorAll<HTMLElement>("button")].find((b) => clean(b.textContent).startsWith(text))!;

const FIELDS = [
  { id: "status", kind: "multi" as const, options: [{ value: "open", label: "Open" }, { value: "won", label: "Won" }] },
  { id: "owner", kind: "select" as const, options: [{ value: "sara", label: "Sara" }] },
];
const DEFAULTS = emptyReportFilters(FIELDS, { kind: "relative", preset: "30d" });

describe("report filter maths (html logic)", () => {
  it("keeps defaults out of the query and reads it back", () => {
    expect(reportFiltersToQuery(DEFAULTS, FIELDS, DEFAULTS)).toBe("");
    const state = { ...DEFAULTS, range: { kind: "relative" as const, preset: "7d" as const }, fields: { status: ["open", "won"], owner: ["sara"] } };
    const q = reportFiltersToQuery(state, FIELDS, DEFAULTS);
    expect(q).toContain("range=7d");
    expect(q).toContain("status=open&status=won");
    expect(reportFiltersFromQuery(q, FIELDS, DEFAULTS)).toEqual(state);
    expect(activeFilterCount(state, FIELDS, DEFAULTS)).toBe(3);
  });

  it("matches a saved view, names it uniquely and writes Markdown", () => {
    expect(savedViewMatches({ query: "status=open" }, { ...DEFAULTS, fields: { status: ["open"], owner: [] } }, FIELDS, DEFAULTS)).toBe(true);
    expect(uniqueViewName("Weekly", ["Weekly"])).toBe("Weekly (2)");
    const md = reportToMarkdown({ title: "R", sections: [{ heading: "T", table: { columns: ["A", "B|"], rows: [["x", 1]] } }] });
    expect(md).toContain("# R");
    expect(md).toContain("| A | B\\| |");
  });
});

describe("report filter bar (Blade example)", () => {
  it("server-renders the starting chips before Alpine starts, then Alpine takes over", async () => {
    const html = readFileSync(resolve(process.cwd(), "../php/examples/rendered/report-filter-bar.html"), "utf8");
    const doc = new DOMParser().parseFromString(html, "text/html");
    const ul = doc.querySelector('[data-slot="report-filter-chips"]')!;
    expect(ul.hasAttribute("x-cloak")).toBe(false);
    expect((ul as HTMLElement).style.display).not.toBe("none");
    expect([...ul.querySelectorAll("li[data-nq-ssr]")].map((li) => clean(li.textContent))).toEqual(["Status: Open"]);
    expect(ul.querySelector("button")!.getAttribute("aria-label")).toBe("Remove filter Status: Open");
    const host = await mount("report-filter-bar");
    expect(chips(host)).toEqual(["Status: Open"]);
    expect(host.querySelectorAll("[data-nq-ssr]")).toHaveLength(0);
  });

  it("renders the period, the fields, the applied chip and the reset", async () => {
    const host = await mount("report-filter-bar");
    const bar = slot(host, "report-filter-bar");
    expect(bar.getAttribute("role")).toBe("group");
    expect(bar.getAttribute("aria-label")).toBe("Report filters");
    const pressed = [...bar.querySelectorAll('[data-slot="toggle"][aria-pressed="true"]')].map((t) => clean(t.textContent));
    expect(pressed).toContain("30d");
    expect([...bar.querySelectorAll('[data-slot="report-filter-field"] > span')].map((s) => clean(s.textContent))).toEqual(["Status", "Owner", "Stage"]);
    expect(chips(host)).toEqual(["Status: Open"]);
    expect(clean(bar.querySelector('[x-text="activeText"]')!.textContent)).toBe("1 filter applied");
    expect(button(bar, "Reset filters").hasAttribute("disabled")).toBe(false);
    expect(slot(host, "report-sheet").textContent).toContain("Generated Sep 29, 2026, 12:00");
  });

  it("changes the period, fires filters-change and keeps the URL form", async () => {
    const host = await mount("report-filter-bar");
    const bar = slot(host, "report-filter-bar");
    const seen: { state: { range: unknown }; query: string }[] = [];
    bar.addEventListener("filters-change", (e) => seen.push((e as CustomEvent).detail));
    [...bar.querySelectorAll<HTMLElement>('[data-slot="toggle"]')].find((t) => clean(t.textContent) === "7d")!.click();
    await tick(60);
    expect(data(bar).state.range).toEqual({ kind: "relative", preset: "7d" });
    expect(data(host.firstElementChild!).filters.range).toEqual({ kind: "relative", preset: "7d" });
    expect(seen.at(-1)!.query).toBe("range=7d&status=open");
  });

  it("picks one value from the select, with All clearing it", async () => {
    const host = await mount("report-filter-bar");
    const bar = slot(host, "report-filter-bar");
    const owner = bar.querySelectorAll<HTMLElement>('[data-slot="report-filter-field"]')[1]!;
    expect(clean(owner.querySelector('[data-slot="select-value"]')!.textContent)).toBe("All");
    owner.querySelector<HTMLElement>('[data-slot="select-trigger"]')!.click();
    await tick(60);
    const item = [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')].find((i) => clean(i.textContent) === "Sara")!;
    item.click();
    await tick(60);
    expect(data(bar).state.fields.owner).toEqual(["sara"]);
    expect(clean(owner.querySelector('[data-slot="select-value"]')!.textContent)).toBe("Sara");
    expect(chips(host)).toEqual(["Status: Open", "Owner: Sara"]);
    expect(clean(bar.querySelector('[x-text="activeText"]')!.textContent)).toBe("2 filters applied");
  });

  it("ticks options of the multi filter and summarises them", async () => {
    const host = await mount("report-filter-bar");
    const bar = slot(host, "report-filter-bar");
    const status = bar.querySelectorAll<HTMLElement>('[data-slot="report-filter-field"]')[0]!;
    expect(clean(status.querySelector('[data-slot="popover-trigger"]')!.textContent)).toBe("Open");
    status.querySelector<HTMLElement>('[data-slot="popover-trigger"]')!.click();
    await tick(60);
    const boxes = [...document.querySelectorAll<HTMLElement>('[data-slot="popover-content"] [role="checkbox"]')];
    expect(boxes.map((b) => b.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    boxes[1]!.click();
    await tick(60);
    expect(data(bar).state.fields.status).toEqual(["open", "won"]);
    expect(clean(status.querySelector('[data-slot="popover-trigger"]')!.textContent)).toBe("2 selected");
    button(document.body, "Clear").click();
    await tick(60);
    expect(data(bar).state.fields.status).toEqual([]);
    expect(chips(host)).toEqual([]);
  });

  it("toggles the single-choice group and removes a chip", async () => {
    const host = await mount("report-filter-bar");
    const bar = slot(host, "report-filter-bar");
    const group = bar.querySelectorAll<HTMLElement>('[data-slot="report-filter-field"]')[2]!;
    const items = [...group.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];
    expect(items.map((i) => i.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
    items[2]!.click();
    await tick(60);
    expect(data(bar).state.fields.stage).toEqual(["late"]);
    expect(chips(host)).toEqual(["Status: Open", "Stage: Late"]);
    slot(host, "report-filter-chips").querySelector<HTMLElement>('button[aria-label="Remove filter Stage: Late"]')!.click();
    await tick(60);
    expect(data(bar).state.fields.stage).toEqual([]);
    expect(items.map((i) => i.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
  });

  it("resets to the defaults, picker and comparison included", async () => {
    const host = await mount("report-filter-bar");
    const bar = slot(host, "report-filter-bar");
    const picker = slot(host, "time-range-picker");
    [...bar.querySelectorAll<HTMLElement>('[data-slot="toggle"]')].find((t) => clean(t.textContent) === "24h")!.click();
    data(picker).compare = "previous";
    await tick(80);
    expect(data(bar).state.comparison).toBe("previous");
    expect(data(bar).state.range).toEqual({ kind: "relative", preset: "24h" });
    button(bar, "Reset filters").click();
    await tick(80);
    expect(data(bar).state.range).toEqual({ kind: "relative", preset: "30d" });
    expect(data(bar).state.comparison).toBe("none");
    expect(data(picker).compare).toBe("none");
    expect(data(picker).value).toEqual({ kind: "relative", preset: "30d" });
    expect(data(bar).state.fields.status).toEqual([]);
    expect(button(bar, "Reset filters").hasAttribute("disabled")).toBe(true);
  });
});

describe("saved report views (Blade example)", () => {
  it("lists the views and opens one, which then shows Changed once the filters move", async () => {
    const host = await mount("report-filter-bar");
    const root = slot(host, "saved-report-views");
    expect(root.getAttribute("aria-label")).toBe("Saved views");
    await until(() => views(host).length === 2);
    expect(views(host).map((li) => clean([...li.querySelector("button")!.querySelectorAll("span")].filter((s) => s.style.display !== "none").map((s) => s.textContent).join(" ")))).toEqual(["Weekly review", "Sara won Shared"]);
    button(views(host)[0]!, "Weekly review").click();
    await tick(80);
    expect(data(host.firstElementChild!).filters.range).toEqual({ kind: "relative", preset: "7d" });
    expect(data(host.firstElementChild!).filters.fields.status).toEqual(["open"]);
    expect(button(views(host)[0]!, "Weekly review").getAttribute("aria-pressed")).toBe("true");
    expect(shown(views(host)[0]!)).not.toContain("Changed");
    data(slot(host, "report-filter-bar")).setField("owner", ["sara"]);
    await tick(80);
    expect(shown(views(host)[0]!)).toContain("Changed");
    expect(button(root, "Update with current filters")).toBeTruthy();
    expect(button(root, "Save as new view")).toBeTruthy();
  });

  it("saves the current filters under a unique name and fires nq-view-save", async () => {
    const host = await mount("report-filter-bar");
    const root = slot(host, "saved-report-views");
    const saved: { name: string; query: string }[] = [];
    root.addEventListener("nq-view-save", (e) => saved.push({ name: (e as CustomEvent).detail.name, query: (e as CustomEvent).detail.query }));
    button(root, "Save").click();
    await tick(80);
    const dialog = document.querySelector<HTMLElement>('[data-slot="report-name-dialog"]')!;
    expect(dialog.textContent).toContain("Save this view");
    const input = dialog.querySelector<HTMLInputElement>("input")!;
    const save = button(dialog, "Save");
    expect(save.hasAttribute("disabled")).toBe(true);
    input.value = "Weekly review";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick(60);
    expect(save.hasAttribute("disabled")).toBe(false);
    dialog.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await until(() => views(host).length === 3);
    expect(saved).toEqual([{ name: "Weekly review (2)", query: "status=open" }]);
    expect(views(host).map((li) => shown(li.querySelector("button")!))).toContain("Weekly review (2)");
  });

  it("opens the actions menu from the button, renames through an event, and deletes after confirming", async () => {
    const host = await mount("report-filter-bar");
    const root = slot(host, "saved-report-views");
    const row = views(host)[0]!;
    const rename = vi.fn();
    root.addEventListener("nq-view-rename", (e) => {
      rename((e as CustomEvent).detail.name);
      (e as CustomEvent).detail.resolve();
    });
    row.querySelector<HTMLElement>('button[aria-label="Actions for Weekly review"]')!.click();
    await tick(80);
    const menu = [...document.querySelectorAll<HTMLElement>('[data-slot="context-menu-content"]')].find((m) => m.textContent!.includes("Rename"))!;
    expect([...menu.querySelectorAll('[data-slot="context-menu-item"]')].map((i) => clean(i.textContent))).toEqual([
      "Open view",
      "Rename",
      "Update with current filters",
      "Share",
      "Delete",
    ]);
    [...menu.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]')].find((i) => clean(i.textContent) === "Rename")!.click();
    await tick(80);
    const dialog = document.querySelector<HTMLElement>('[data-slot="report-name-dialog"]')!;
    const input = dialog.querySelector<HTMLInputElement>("input")!;
    expect(input.value).toBe("Weekly review");
    input.value = "Monday review";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick(60);
    dialog.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await until(() => clean(views(host)[0]!.textContent).startsWith("Monday review"));
    expect(rename).toHaveBeenCalledWith("Monday review");

    // delete
    views(host)[1]!.querySelector<HTMLElement>('button[aria-label="Actions for Sara won"]')!.click();
    await tick(80);
    const menu2 = [...document.querySelectorAll<HTMLElement>('[data-slot="context-menu-content"]')].find((m) => m.textContent!.includes("Stop sharing"))!;
    expect(menu2.textContent).toContain("Copy link");
    [...menu2.querySelectorAll<HTMLElement>('[data-slot="context-menu-item"]')].find((i) => clean(i.textContent) === "Delete")!.click();
    await tick(80);
    const confirm = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    expect(confirm.textContent).toContain("Delete \"Sara won\"?");
    button(confirm, "Delete").click();
    await until(() => views(host).length === 1);
    expect(views(host)).toHaveLength(1);
  });
});

describe("report export menu (Blade example)", () => {
  it("copies the report as Markdown", async () => {
    const host = await mount("report-filter-bar");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const exported: string[] = [];
    host.addEventListener("nq-report-export", (e) => exported.push((e as CustomEvent).detail.format));
    const trigger = slot(host, "report-export-menu");
    expect(clean(trigger.textContent)).toBe("Export");
    trigger.click();
    await tick(80);
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')];
    expect(items.map((i) => clean(i.textContent))).toEqual(["Print or save as PDF", "Download Markdown", "Copy as Markdown"]);
    items[2]!.click();
    await until(() => writeText.mock.calls.length > 0);
    expect(writeText.mock.calls[0]![0]).toContain("# Deals report");
    expect(writeText.mock.calls[0]![0]).toContain("| Sara | 12 |");
    await tick(60);
    expect(exported).toEqual(["copy"]);
    expect(clean(slot(host, "report-sheet").querySelector('[aria-live="polite"].sr-only')!.textContent)).toBe("Copied");
  });
});
