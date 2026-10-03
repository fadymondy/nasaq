// The Blade example (php/examples/log-viewer.blade.php) mounted under real Alpine: filters, search, selection, appended entries.
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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const rowsOf = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[role="listitem"]')];
const visibleText = (el: Element | null) => (el as HTMLElement | null)?.style.display === "none" ? "" : (el?.textContent ?? "");

describe("log-viewer (Blade example)", () => {
  it("renders the toolbar, level chips with counts, rows and the footer", async () => {
    const host = await mountHtml(rendered("log-viewer"));
    const root = host.querySelector<HTMLElement>('[data-slot="log-viewer"]')!;
    expect(root.dir).toBe("ltr");
    expect(root.hasAttribute("data-streaming")).toBe(true);
    expect(host.querySelector('[data-slot="log-viewer-list"]')!.getAttribute("role")).toBe("log");
    const chip = host.querySelector<HTMLElement>('button[data-level="error"]')!;
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    expect(chip.textContent).toContain("Error");
    expect(chip.textContent).toContain("1");
    const rows = rowsOf(host);
    expect(rows).toHaveLength(2);
    expect(rows[1]!.getAttribute("data-level")).toBe("error");
    expect(rows[1]!.textContent).toContain("ERROR");
    expect(rows[1]!.textContent).toContain("connection refused");
    expect(host.querySelector('[data-slot="log-viewer-footer"]')!.textContent).toContain("2 entries");
    expect(host.querySelector('[data-slot="log-viewer-footer"]')!.textContent).toContain("Live");
    expect(host.querySelector('[data-slot="log-viewer-detail"]')!.getAttribute("style")).toContain("display: none");
  });

  it("filters by level and search, highlights matches and resets", async () => {
    const host = await mountHtml(rendered("log-viewer"));
    host.querySelector<HTMLElement>('button[data-level="error"]')!.click();
    await tick();
    expect(host.querySelector('button[data-level="error"]')!.getAttribute("aria-pressed")).toBe("false");
    expect(rowsOf(host)).toHaveLength(1);
    expect(host.querySelector('[data-slot="log-viewer-footer"]')!.textContent).toContain("1 of 2 entries");

    const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = "listen";
    input.dispatchEvent(new Event("input"));
    await tick();
    expect(rowsOf(host)).toHaveLength(1);
    expect(host.querySelector("mark")!.textContent).toBe("listen");

    input.value = "zzz";
    input.dispatchEvent(new Event("input"));
    await tick();
    expect(rowsOf(host)).toHaveLength(0);
    const empty = host.querySelector('[data-slot="empty-state"]')!;
    expect(visibleText(empty)).toContain("No entries match");
    [...empty.querySelectorAll("button")].find((b) => b.textContent!.includes("Reset filters"))!.click();
    await tick();
    expect(rowsOf(host)).toHaveLength(2);
    expect(host.querySelector('button[data-level="error"]')!.getAttribute("aria-pressed")).toBe("true");
  });

  it("flags an invalid regular expression", async () => {
    const host = await mountHtml(rendered("log-viewer"));
    host.querySelector<HTMLElement>('button[aria-label="Use regular expression"]')!.click();
    const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = "(";
    input.dispatchEvent(new Event("input"));
    await tick();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(host.textContent).toContain("Invalid regular expression");
    expect(rowsOf(host)).toHaveLength(2);
  });

  it("selects a row with click and keys, shows the detail panel with fields and closes it with Escape", async () => {
    const host = await mountHtml(rendered("log-viewer"));
    const list = host.querySelector<HTMLElement>('[data-slot="log-viewer-list"]')!;
    rowsOf(host)[1]!.click();
    await tick();
    const detail = host.querySelector<HTMLElement>('[data-slot="log-viewer-detail"]')!;
    expect(detail.style.display).not.toBe("none");
    expect(detail.textContent).toContain("connection refused");
    expect(detail.textContent).toContain("host");
    expect(detail.textContent).toContain("db-1");
    expect(rowsOf(host)[1]!.hasAttribute("data-selected")).toBe(true);
    expect(rowsOf(host)[1]!.getAttribute("aria-current")).toBe("true");
    expect(list.getAttribute("aria-activedescendant")).toBe(rowsOf(host)[1]!.id);
    list.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    await tick();
    expect(rowsOf(host)[0]!.hasAttribute("data-selected")).toBe(true);
    list.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(detail.style.display).toBe("none");
  });

  it("appends entries and ends the stream on events, and can hide timestamps", async () => {
    const host = await mountHtml(rendered("log-viewer"));
    const root = host.querySelector<HTMLElement>('[data-slot="log-viewer"]')!;
    root.dispatchEvent(new CustomEvent("nq-log-write", { detail: { entries: [{ id: 3, time: Date.now(), level: "warn", message: "slow query" }] } }));
    root.dispatchEvent(new CustomEvent("nq-log-state", { detail: { streaming: false } }));
    await tick();
    expect(rowsOf(host)).toHaveLength(3);
    expect(host.querySelector('button[data-level="warn"]')!.textContent).toContain("1");
    expect(root.hasAttribute("data-streaming")).toBe(false);
    expect(host.querySelector('[data-slot="log-viewer-footer"]')!.textContent).toContain("3 entries");
    host.querySelector<HTMLElement>('button[aria-label="Show timestamps"]')!.click();
    await tick();
    const stamp = rowsOf(host)[0]!.querySelector<HTMLElement>("span")!;
    expect(stamp.style.display).toBe("none");
  });

  it("filters by time range, reports the change and resets with the filters", async () => {
    const host = await mountHtml(rendered("log-viewer"));
    const root = host.querySelector<HTMLElement>('[data-slot="log-viewer"]')!;
    const seen: { range: { id: string } | null; since: number | null }[] = [];
    root.addEventListener("nq-log-filter", (e) => seen.push((e as CustomEvent).detail));
    const select = host.querySelector<HTMLSelectElement>('[data-slot="log-viewer-range"] select')!;
    expect(select.getAttribute("aria-label")).toBe("Time range");
    expect(select.value).toBe("all");
    root.dispatchEvent(new CustomEvent("nq-log-write", { detail: { entries: [{ id: 3, time: Date.now() - 60_000, level: "info", message: "fresh one" }] } }));
    await tick();
    expect(rowsOf(host)).toHaveLength(3);
    select.value = "1h";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(rowsOf(host)).toHaveLength(1);
    expect(host.querySelector('[data-slot="log-viewer-footer"]')!.textContent).toContain("1 of 3 entries");
    expect(seen).toHaveLength(1);
    expect(seen[0]!.range!.id).toBe("1h");
    expect(seen[0]!.since).toBeGreaterThan(Date.now() - 3_700_000);
    root.querySelector<HTMLInputElement>('input[type="search"]')!.value = "zzz";
    root.querySelector<HTMLInputElement>('input[type="search"]')!.dispatchEvent(new Event("input"));
    await tick();
    const empty = host.querySelector('[data-slot="empty-state"]')!;
    [...empty.querySelectorAll("button")].find((b) => b.textContent!.includes("Reset filters"))!.click();
    await tick();
    expect(select.value).toBe("all");
    expect(rowsOf(host)).toHaveLength(3);
  });

  it("asks for older entries, shows loading, and prepends them", async () => {
    const host = await mountHtml(rendered("log-viewer"));
    const root = host.querySelector<HTMLElement>('[data-slot="log-viewer"]')!;
    let asked = 0;
    root.addEventListener("nq-log-older", () => asked++);
    const bar = () => host.querySelector<HTMLElement>('div.absolute [data-slot="log-viewer-older"]')!;
    expect(bar().textContent).toContain("Load older entries");
    [...bar().querySelectorAll("button")].find((b) => b.textContent!.includes("Load older entries"))!.click();
    await tick();
    expect(asked).toBe(1);
    expect(visibleText(bar().querySelector('[role="status"]'))).toContain("Loading older entries");
    root.dispatchEvent(new CustomEvent("nq-log-write", { detail: { entries: [{ id: 0, time: 1, level: "debug", message: "earlier" }], prepend: true } }));
    await tick();
    expect(rowsOf(host)).toHaveLength(3);
    expect(rowsOf(host)[0]!.textContent).toContain("earlier");
    expect(visibleText(bar().querySelector('[role="status"]'))).toBe("");
    root.dispatchEvent(new CustomEvent("nq-log-state", { detail: { hasOlder: false } }));
    await tick();
    expect(bar().parentElement!.style.display).toBe("none");
  });

  it("pauses the live tail, counts waiting entries and catches up on resume", async () => {
    const host = await mountHtml(rendered("log-viewer"));
    const root = host.querySelector<HTMLElement>('[data-slot="log-viewer"]')!;
    const live: boolean[] = [];
    root.addEventListener("nq-log-live", (e) => live.push((e as CustomEvent).detail.live));
    const button = host.querySelector<HTMLElement>('[data-slot="log-viewer-live"]')!;
    expect(button.getAttribute("aria-label")).toBe("Pause live tail");
    button.click();
    await tick();
    expect(live).toEqual([false]);
    expect(root.hasAttribute("data-paused")).toBe(true);
    expect(button.getAttribute("aria-label")).toBe("Resume live tail");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    root.dispatchEvent(new CustomEvent("nq-log-write", { detail: { entries: [{ id: 3, time: Date.now(), level: "info", message: "later" }] } }));
    await tick();
    expect(rowsOf(host)).toHaveLength(2);
    const footer = host.querySelector('[data-slot="log-viewer-footer"]')!;
    expect(footer.textContent).toContain("Paused");
    expect(footer.textContent).toContain("1 new entry");
    const resume = [...host.querySelectorAll("button")].find((b) => b.textContent!.includes("1 new entry") && b.style.display !== "none")!;
    resume.click();
    await tick();
    expect(live).toEqual([false, true]);
    expect(root.hasAttribute("data-paused")).toBe(false);
    expect(rowsOf(host)).toHaveLength(3);
  });
});
